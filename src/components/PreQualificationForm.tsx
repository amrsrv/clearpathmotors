import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { DollarSign, CreditCard, User, Mail, Phone, Briefcase, Building, MapPin, Calendar, CheckSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { ProgressBar } from '../components/ProgressBar';
import { 
  Car, 
  DollarSign, 
  User, 
  Briefcase, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Home,
  Clock,
  Building,
  Wallet,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProcessingAnimation } from './ProcessingAnimation';
import { vehicles } from '../pages/Vehicles';

// Define the validation schema for each step
const stepValidationSchema = {
  1: z.object({
    vehicle_type: z.string().min(1, 'Please select a vehicle type'),
  }),
  2: z.object({
    desired_monthly_payment: z.string().min(1, 'Please enter your desired monthly payment'),
    down_payment_amount: z.string().optional(),
  }),
  3: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    date_of_birth: z.string().min(1, 'Date of birth is required'),
  }),
  4: z.object({
    employment_status: z.string().min(1, 'Please select your employment status'),
    employer_name: z.string().optional(),
    occupation: z.string().optional(),
    employment_duration_years: z.string().optional(),
    employment_duration_months: z.string().optional(),
    annual_income: z.string().min(1, 'Annual income is required'),
    other_income: z.string().optional(),
    collects_government_benefits: z.boolean().optional(),
    government_benefit_types: z.array(z.string()).optional(),
    government_benefit_other: z.string().optional(),
    has_driver_license: z.boolean().default(true),
  }),
  5: z.object({
    housing_status: z.string().min(1, 'Please select your housing status'),
    housing_payment: z.string().optional(),
    residence_duration_years: z.string().optional(),
    residence_duration_months: z.string().optional(),
    credit_score: z.string().min(1, 'Credit score is required'),
    has_debt_discharge_history: z.boolean().optional(),
    debt_discharge_type: z.string().optional(),
    debt_discharge_year: z.string().optional(),
    debt_discharge_status: z.string().optional(),
    debt_discharge_comments: z.string().optional(),
    amount_owed: z.string().optional(),
    trustee_name: z.string().optional(),
  }),
  6: z.object({
    preferred_contact_method: z.string().min(1, 'Please select your preferred contact method'),
    consent_soft_check: z.boolean().refine(val => val === true, {
      message: 'You must consent to a soft credit check',
    }),
    terms_accepted: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
};

interface PreQualificationFormProps {
  onComplete: (applicationId: string, tempUserId: string, formData: any) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Vehicle Information
    vehicle_type: '',
    
    // Financial Information
    desired_monthly_payment: '',
    down_payment_amount: '0',
    
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    
    // Employment Information
    employment_status: '',
    employer_name: '',
    occupation: '',
    employment_duration_years: '',
    employment_duration_months: '',
    annual_income: '',
    other_income: '0',
    collects_government_benefits: false,
    government_benefit_types: [] as string[],
    government_benefit_other: '',
    has_driver_license: true,
    
    // Additional Information
    housing_status: '',
    housing_payment: '',
    residence_duration_years: '',
    residence_duration_months: '',
    credit_score: '',
    has_debt_discharge_history: false,
    debt_discharge_type: '',
    debt_discharge_year: '',
    debt_discharge_status: '',
    debt_discharge_comments: '',
    amount_owed: '',
    trustee_name: '',
    
    // Account Information
    preferred_contact_method: 'email',
    consent_soft_check: false,
    terms_accepted: false,
    password: '',
    confirmPassword: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  
  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    trigger,
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(stepValidationSchema[currentStep as keyof typeof stepValidationSchema]),
    defaultValues: formData
  });

  // Watch values for conditional rendering
  const employmentStatus = watch('employment_status');
  const hasDebtDischargeHistory = watch('has_debt_discharge_history');
  const collectsGovernmentBenefits = watch('collects_government_benefits');
  const governmentBenefitTypes = watch('government_benefit_types');
  const debtDischargeType = watch('debt_discharge_type');
  const housingStatus = watch('housing_status');
  const hasDriverLicense = watch('has_driver_license');

  // Initialize tempUserId on component mount
  useEffect(() => {
    if (!tempUserId) {
      setTempUserId(uuidv4());
    }
  }, [tempUserId]);

  // Pre-fill form data if user is logged in
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          // Get user's email
          setValue('email', user.email || '');
          
          // Check if user has an existing application
          const { data: applicationData, error: applicationError } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (applicationError) {
            console.error('Error fetching user application:', applicationError);
            return;
          }
          
          if (applicationData) {
            // Pre-fill form with existing application data
            const newFormData = { ...formData };
            
            // Map application data to form fields
            Object.keys(newFormData).forEach(key => {
              if (key in applicationData && applicationData[key] !== null) {
                // Special handling for arrays
                if (Array.isArray(applicationData[key])) {
                  newFormData[key] = [...applicationData[key]];
                } 
                // Special handling for dates
                else if (key === 'date_of_birth' && applicationData[key]) {
                  newFormData[key] = new Date(applicationData[key]).toISOString().split('T')[0];
                }
                // Regular fields
                else {
                  newFormData[key] = applicationData[key].toString();
                }
                
                // Update react-hook-form values
                setValue(key as any, newFormData[key]);
              }
            });
            
            setFormData(newFormData);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    
    loadUserData();
  }, [user, setValue]);

  const onStepSubmit = async (data: any) => {
    try {
      // Update form data with current step data
      const updatedFormData = { ...formData, ...data };
      setFormData(updatedFormData);
      
      // If this is the final step, submit the form
      if (currentStep === 6) {
        await submitForm(updatedFormData);
      } else {
        // Move to the next step
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Error submitting step:', error);
      setError('An error occurred. Please try again.');
    }
  };

  const submitForm = async (data: any) => {
    if (!tempUserId) {
      setError('Session error. Please refresh the page and try again.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Format the data for Supabase
      const applicationData = {
        // Use user_id if logged in, otherwise use temp_user_id
        user_id: user?.id || null,
        temp_user_id: user?.id ? null : tempUserId,
        
        // Vehicle Information
        vehicle_type: data.vehicle_type,
        
        // Financial Information
        desired_monthly_payment: parseFloat(data.desired_monthly_payment),
        down_payment_amount: parseFloat(data.down_payment_amount || '0'),
        
        // Personal Information
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        
        // Employment Information
        employment_status: data.employment_status,
        employer_name: data.employer_name || null,
        occupation: data.occupation || null,
        employment_duration_years: data.employment_duration_years ? parseInt(data.employment_duration_years) : null,
        employment_duration_months: data.employment_duration_months ? parseInt(data.employment_duration_months) : null,
        annual_income: parseFloat(data.annual_income),
        other_income: parseFloat(data.other_income || '0'),
        collects_government_benefits: data.collects_government_benefits || false,
        government_benefit_types: data.government_benefit_types || [],
        government_benefit_other: data.government_benefit_other || null,
        has_driver_license: data.has_driver_license,
        
        // Additional Information
        housing_status: data.housing_status,
        housing_payment: data.housing_payment ? parseFloat(data.housing_payment) : null,
        residence_duration_years: data.residence_duration_years ? parseInt(data.residence_duration_years) : null,
        residence_duration_months: data.residence_duration_months ? parseInt(data.residence_duration_months) : null,
        credit_score: parseInt(data.credit_score),
        has_debt_discharge_history: data.has_debt_discharge_history || false,
        debt_discharge_type: data.debt_discharge_type || null,
        debt_discharge_year: data.debt_discharge_year ? parseInt(data.debt_discharge_year) : null,
        debt_discharge_status: data.debt_discharge_status || null,
        debt_discharge_comments: data.debt_discharge_comments || null,
        amount_owed: data.amount_owed ? parseFloat(data.amount_owed) : null,
        trustee_name: data.trustee_name || null,
        
        // Account Information
        preferred_contact_method: data.preferred_contact_method,
        consent_soft_check: data.consent_soft_check,
        terms_accepted: data.terms_accepted,
        
        // Application Status
        status: 'submitted',
        current_stage: 1
      };
      
      // Submit application to Supabase
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();
        
      if (applicationError) {
        throw applicationError;
      }
      
      // Create initial application stage
      const { error: stageError } = await supabase
        .from('application_stages')
        .insert([{
          application_id: application.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        }]);
        
      if (stageError) {
        console.error('Error creating application stage:', stageError);
        // Continue despite stage error
      }
      
      // Calculate loan amount range and interest rate based on credit score and income
      setIsProcessing(true);
      
      // Simulate processing delay
      setTimeout(async () => {
        try {
          // Calculate loan amount range (simplified algorithm)
          const creditScore = parseInt(data.credit_score);
          const annualIncome = parseFloat(data.annual_income);
          const monthlyIncome = annualIncome / 12;
          
          // Base calculations on credit score
          let interestRate = 0;
          let loanAmountMin = 0;
          let loanAmountMax = 0;
          
          if (creditScore >= 750) {
            interestRate = 4.99;
            loanAmountMin = monthlyIncome * 24;
            loanAmountMax = monthlyIncome * 48;
          } else if (creditScore >= 700) {
            interestRate = 5.99;
            loanAmountMin = monthlyIncome * 20;
            loanAmountMax = monthlyIncome * 40;
          } else if (creditScore >= 650) {
            interestRate = 7.99;
            loanAmountMin = monthlyIncome * 18;
            loanAmountMax = monthlyIncome * 36;
          } else if (creditScore >= 600) {
            interestRate = 9.99;
            loanAmountMin = monthlyIncome * 15;
            loanAmountMax = monthlyIncome * 30;
          } else if (creditScore >= 550) {
            interestRate = 12.99;
            loanAmountMin = monthlyIncome * 12;
            loanAmountMax = monthlyIncome * 24;
          } else {
            interestRate = 15.99;
            loanAmountMin = monthlyIncome * 10;
            loanAmountMax = monthlyIncome * 20;
          }
          
          // Round to nearest 1000
          loanAmountMin = Math.round(loanAmountMin / 1000) * 1000;
          loanAmountMax = Math.round(loanAmountMax / 1000) * 1000;
          
          // Ensure minimum loan amount
          loanAmountMin = Math.max(loanAmountMin, 5000);
          loanAmountMax = Math.max(loanAmountMax, 10000);
          
          // Cap maximum loan amount
          loanAmountMax = Math.min(loanAmountMax, 100000);
          
          // Update application with calculated values
          const { error: updateError } = await supabase
            .from('applications')
            .update({
              loan_amount_min: loanAmountMin,
              loan_amount_max: loanAmountMax,
              interest_rate: interestRate,
              loan_term: 60 // Default to 60 months
            })
            .eq('id', application.id);
            
          if (updateError) {
            console.error('Error updating application with loan details:', updateError);
          }
          
          // Call the onComplete callback with the application ID and form data
          onComplete(application.id, tempUserId, {
            ...data,
            loan_amount_min: loanAmountMin,
            loan_amount_max: loanAmountMax,
            interest_rate: interestRate
          });
          
        } catch (error) {
          console.error('Error processing application:', error);
          setError('An error occurred while processing your application. Please try again.');
          setIsProcessing(false);
          setIsSubmitting(false);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('An error occurred while submitting your application. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleStepClick = async (step: number) => {
    // Only allow going back to previous steps
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep) {
      // Validate current step before proceeding
      const isValid = await trigger();
      if (isValid) {
        // Update form data with current values
        const currentValues = watch();
        setFormData({ ...formData, ...currentValues });
        setCurrentStep(step + 1);
      }
    }
  };

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Vehicle Information</h2>
            <p className="text-gray-600">Let's start with the type of vehicle you're looking for.</p>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {['Car', 'SUV', 'Truck', 'Van'].map((type) => (
                  <div key={type} className="relative">
                    <input
                      type="radio"
                      id={type}
                      value={type}
                      className="peer sr-only"
                      {...register('vehicle_type')}
                    />
                    <label
                      htmlFor={type}
                      className="flex flex-col items-center justify-center p-4 bg-white border-2 rounded-lg cursor-pointer transition-colors peer-checked:border-[#3BAA75] peer-checked:bg-[#3BAA75]/5 hover:bg-gray-50"
                    >
                      <Car className="w-8 h-8 mb-2 text-gray-400 peer-checked:text-[#3BAA75]" />
                      <span className="font-medium">{type}</span>
                    </label>
                  </div>
                ))}
              </div>
              {errors.vehicle_type && (
                <p className="text-red-500 text-sm mt-1">{errors.vehicle_type.message as string}</p>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Financial Information</h2>
            <p className="text-gray-600">Tell us about your budget for this vehicle.</p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="desired_monthly_payment" className="block text-sm font-medium text-gray-700">
                  Desired Monthly Payment <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="desired_monthly_payment"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="500"
                    min="0"
                    step="50"
                    {...register('desired_monthly_payment')}
                  />
                </div>
                {errors.desired_monthly_payment && (
                  <p className="text-red-500 text-sm mt-1">{errors.desired_monthly_payment.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="down_payment_amount" className="block text-sm font-medium text-gray-700">
                  Down Payment Amount (if any)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="down_payment_amount"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="0"
                    min="0"
                    step="500"
                    {...register('down_payment_amount')}
                  />
                </div>
                {errors.down_payment_amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.down_payment_amount.message as string}</p>
                )}
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Personal Information</h2>
            <p className="text-gray-600">Tell us a bit about yourself.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="first_name"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="John"
                    {...register('first_name')}
                  />
                </div>
                {errors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.first_name.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="last_name"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="Doe"
                    {...register('last_name')}
                  />
                </div>
                {errors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.last_name.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="john.doe@example.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="(123) 456-7890"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message as string}</p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="date_of_birth"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    {...register('date_of_birth')}
                  />
                </div>
                {errors.date_of_birth && (
                  <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message as string}</p>
                )}
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Employment Information</h2>
            <p className="text-gray-600">Tell us about your employment situation.</p>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="employment_status"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                  {...register('employment_status')}
                >
                  <option value="">Select employment status</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                      {vehicles.map((vehicle) => (
                        <button
                          key={vehicle.type}
                          type="button"
                          onClick={() => handleVehicleTypeSelect(vehicle.type)}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            formData.vehicleType === vehicle.type 
                              ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
                              : 'border-gray-200 hover:border-[#3BAA75]/50'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <img 
                              src={vehicle.image} 
                              alt={vehicle.type} 
                              className="w-32 h-24 object-contain mb-2" 
                            />
                            <span className="font-medium">{vehicle.type}</span>
                            <span className="text-sm text-gray-500">{vehicle.description}</span>
                          </div>
                        </button>
                      ))}
                          type="number"
                          className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                          placeholder="Years"
                          min="0"
                          {...register('employment_duration_years')}
                        />
                      </div>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                          placeholder="Months"
                          min="0"
                          max="11"
                          {...register('employment_duration_months')}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Self-employed fields - removed business name and occupation title */}
              {employmentStatus === 'self_employed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    How long have you been self-employed?
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-4">
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                        placeholder="Years"
                        min="0"
                        {...register('employment_duration_years')}
                      />
                    </div>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                        placeholder="Months"
                        min="0"
                        max="11"
                        {...register('employment_duration_months')}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="annual_income" className="block text-sm font-medium text-gray-700">
                  Annual Income <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="annual_income"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="50000"
                    min="0"
                    step="1000"
                    {...register('annual_income')}
                  />
                </div>
                {errors.annual_income && (
                  <p className="text-red-500 text-sm mt-1">{errors.annual_income.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="other_income" className="block text-sm font-medium text-gray-700">
                  Other Income (if any)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="other_income"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="0"
                    min="0"
                    step="1000"
                    {...register('other_income')}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center">
                  <input
                    id="collects_government_benefits"
                    type="checkbox"
                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    {...register('collects_government_benefits')}
                  />
                  <label htmlFor="collects_government_benefits" className="ml-2 block text-sm text-gray-700">
                    I receive government benefits
                  </label>
                </div>
              </div>
              
              {collectsGovernmentBenefits && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select all that apply
                  </label>
                  <div className="mt-2 space-y-2">
                    {['ontario_works', 'odsp', 'cpp', 'ei', 'child_tax_benefit', 'other'].map((benefit) => (
                      <div key={benefit} className="flex items-center">
                        <input
                          id={benefit}
                          type="checkbox"
                          value={benefit}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          {...register('government_benefit_types')}
                        />
                        <label htmlFor={benefit} className="ml-2 block text-sm text-gray-700">
                          {benefit === 'ontario_works' && 'Ontario Works'}
                          {benefit === 'odsp' && 'ODSP'}
                          {benefit === 'cpp' && 'CPP'}
                          {benefit === 'ei' && 'EI'}
                          {benefit === 'child_tax_benefit' && 'Child Tax Benefit'}
                          {benefit === 'other' && 'Other'}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {governmentBenefitTypes.includes('other') && (
                    <div className="mt-2">
                      <label htmlFor="government_benefit_other" className="block text-sm font-medium text-gray-700">
                        Please specify other benefit
                      </label>
                      <input
                        type="text"
                        id="government_benefit_other"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                        {...register('government_benefit_other')}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <div className="flex items-center">
                  <input
                    id="has_driver_license"
                    type="checkbox"
                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    checked={hasDriverLicense}
                    {...register('has_driver_license')}
                  />
                  <label htmlFor="has_driver_license" className="ml-2 block text-sm text-gray-700">
                    I have a valid driver's license
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Uncheck if you do not have a valid driver's license
                </p>
              </div>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Additional Information</h2>
            <p className="text-gray-600">A few more details to help us find the best financing options for you.</p>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="housing_status" className="block text-sm font-medium text-gray-700">
                  Housing Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="housing_status"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                  {...register('housing_status')}
                >
                  <option value="">Select housing status</option>
                  <option value="own">Own</option>
                  <option value="rent">Rent</option>
                  <option value="live_with_parents">Live with Parents</option>
                  <option value="other">Other</option>
                </select>
                {errors.housing_status && (
                  <p className="text-red-500 text-sm mt-1">{errors.housing_status.message as string}</p>
                )}
              </div>
              
              {(housingStatus === 'own' || housingStatus === 'rent') && (
                <div>
                  <label htmlFor="housing_payment" className="block text-sm font-medium text-gray-700">
                    Monthly Housing Payment
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="housing_payment"
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                      placeholder="1500"
                      min="0"
                      {...register('housing_payment')}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  How long have you lived at your current address?
                </label>
                <div className="mt-1 grid grid-cols-2 gap-4">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                      placeholder="Years"
                      min="0"
                      {...register('residence_duration_years')}
                    />
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                      placeholder="Months"
                      min="0"
                      max="11"
                      {...register('residence_duration_months')}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="credit_score" className="block text-sm font-medium text-gray-700">
                  Estimated Credit Score <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="credit_score"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="650"
                    min="300"
                    max="900"
                    {...register('credit_score')}
                  />
                </div>
                {errors.credit_score && (
                  <p className="text-red-500 text-sm mt-1">{errors.credit_score.message as string}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  If you don't know your exact score, please provide your best estimate.
                </p>
              </div>
              
              <div>
                <div className="flex items-center">
                  <input
                    id="has_debt_discharge_history"
                    type="checkbox"
                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    {...register('has_debt_discharge_history')}
                  />
                  <label htmlFor="has_debt_discharge_history" className="ml-2 block text-sm text-gray-700">
                    I have a history of bankruptcy, consumer proposal, or debt settlement
                  </label>
                </div>
              </div>
              
              {hasDebtDischargeHistory && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  <div>
                    <label htmlFor="debt_discharge_type" className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      id="debt_discharge_type"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                      {...register('debt_discharge_type')}
                    >
                      <option value="">Select type</option>
                      <option value="bankruptcy">Bankruptcy</option>
                      <option value="consumer_proposal">Consumer Proposal</option>
                      <option value="division_1_proposal">Division 1 Proposal</option>
                      <option value="informal_settlement">Informal Settlement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="debt_discharge_year" className="block text-sm font-medium text-gray-700">
                      Year
                    </label>
                    <input
                      type="number"
                      id="debt_discharge_year"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                      placeholder="2020"
                      min="1980"
                      max={new Date().getFullYear()}
                      {...register('debt_discharge_year')}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="debt_discharge_status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="debt_discharge_status"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                      {...register('debt_discharge_status')}
                    >
                      <option value="">Select status</option>
                      <option value="active">Active</option>
                      <option value="discharged">Discharged</option>
                      <option value="not_sure">Not Sure</option>
                    </select>
                  </div>
                  
                  {debtDischargeType && (
                    <>
                      <div>
                        <label htmlFor="amount_owed" className="block text-sm font-medium text-gray-700">
                          Amount Owed
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            id="amount_owed"
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                            placeholder="10000"
                            min="0"
                            {...register('amount_owed')}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="trustee_name" className="block text-sm font-medium text-gray-700">
                          Trustee Name (if applicable)
                        </label>
                        <input
                          type="text"
                          id="trustee_name"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                          {...register('trustee_name')}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="debt_discharge_comments" className="block text-sm font-medium text-gray-700">
                          Additional Comments
                        </label>
                        <textarea
                          id="debt_discharge_comments"
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                          placeholder="Any additional details about your situation..."
                          {...register('debt_discharge_comments')}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Create Your Account</h2>
            <p className="text-gray-600">Set up your account to track your application and get updates.</p>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="preferred_contact_method" className="block text-sm font-medium text-gray-700">
                  Preferred Contact Method <span className="text-red-500">*</span>
                </label>
                <select
                  id="preferred_contact_method"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                  {...register('preferred_contact_method')}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                </select>
                {errors.preferred_contact_method && (
                  <p className="text-red-500 text-sm mt-1">{errors.preferred_contact_method.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="john.doe@example.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] sm:text-sm"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message as string}</p>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="consent_soft_check"
                      type="checkbox"
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                      {...register('consent_soft_check')}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="consent_soft_check" className="font-medium text-gray-700">
                      Consent to Soft Credit Check <span className="text-red-500">*</span>
                    </label>
                    <p className="text-gray-500">
                      I consent to a soft credit check which will not affect my credit score.
                    </p>
                    {errors.consent_soft_check && (
                      <p className="text-red-500 text-sm mt-1">{errors.consent_soft_check.message as string}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms_accepted"
                      type="checkbox"
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                      {...register('terms_accepted')}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms_accepted" className="font-medium text-gray-700">
                      Terms and Conditions <span className="text-red-500">*</span>
                    </label>
                    <p className="text-gray-500">
                      I agree to the <a href="/terms" target="_blank" className="text-[#3BAA75] hover:underline">Terms and Conditions</a> and <a href="/privacy" target="_blank" className="text-[#3BAA75] hover:underline">Privacy Policy</a>.
                    </p>
                    {errors.terms_accepted && (
                      <p className="text-red-500 text-sm mt-1">{errors.terms_accepted.message as string}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isProcessing) {
    return <ProcessingAnimation onComplete={() => setIsProcessing(false)} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <ProgressBar 
        currentStep={currentStep} 
        totalSteps={6} 
        onStepClick={handleStepClick}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onStepSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
        
        <div className="mt-8 flex justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75]"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </button>
          ) : (
            <div></div> // Empty div to maintain layout
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#3BAA75] hover:bg-[#2D8259] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                {currentStep === 6 ? 'Creating Account...' : 'Submitting...'}
              </>
            ) : (
              <>
                {currentStep === 6 ? 'Create Account' : 'Continue'}
                <ChevronRight className="h-5 w-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};