import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { ProgressBar } from './ProgressBar';
import { ProcessingAnimation } from './ProcessingAnimation';
import { 
  Car, 
  DollarSign, 
  CreditCard, 
  User, 
  MapPin, 
  Briefcase, 
  FileText, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Home,
  Building,
  Clock,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

// Define validation schemas for each step
const stepValidationSchema = {
  1: z.object({
    vehicleType: z.string().min(1, 'Please select a vehicle type'),
  }),
  2: z.object({
    monthlyBudget: z.string().min(1, 'Please enter your monthly budget'),
    downPayment: z.string(),
    creditScore: z.string().min(1, 'Please select your credit score range'),
  }),
  3: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid phone number is required').refine(
      (val) => /^\+?1?\d{10,}$/.test(val.replace(/\D/g, '')),
      'Please enter a valid phone number'
    ),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    province: z.string().min(1, 'Province is required'),
    postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Valid postal code is required'),
  }),
  4: z.object({
    employmentStatus: z.string().min(1, 'Please select your employment status'),
    annualIncome: z.string().min(1, 'Annual income is required'),
    employerName: z.string().optional(),
    occupation: z.string().optional(),
    employmentDurationYears: z.string(),
    employmentDurationMonths: z.string(),
    housingStatus: z.string().min(1, 'Please select your housing status'),
    housingPayment: z.string(),
    residenceDurationYears: z.string(),
    residenceDurationMonths: z.string(),
    hasDriverLicense: z.boolean().default(true),
  }),
  5: z.object({
    collectsGovernmentBenefits: z.boolean().optional(),
    governmentBenefitTypes: z.array(z.string()).optional(),
    governmentBenefitOther: z.string().optional(),
    hasDebtDischargeHistory: z.boolean().optional(),
    debtDischargeType: z.string().optional(),
    debtDischargeYear: z.string().optional(),
    debtDischargeStatus: z.string().optional(),
    amountOwed: z.string().optional(),
    trusteeName: z.string().optional(),
    debtDischargeComments: z.string().optional(),
    consentSoftCheck: z.boolean().refine(val => val === true, {
      message: 'You must consent to a soft credit check',
    }),
    termsAccepted: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  }),
  6: z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),
};

interface PreQualificationFormProps {
  onComplete: (applicationId: string, tempUserId: string, formData: any) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Vehicle Information
    vehicleType: '',
    
    // Step 2: Financial Information
    monthlyBudget: '',
    downPayment: '0',
    creditScore: '',
    
    // Step 3: Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    
    // Step 4: Employment Information
    employmentStatus: '',
    annualIncome: '',
    employerName: '',
    occupation: '',
    employmentDurationYears: '0',
    employmentDurationMonths: '0',
    housingStatus: '',
    housingPayment: '0',
    residenceDurationYears: '0',
    residenceDurationMonths: '0',
    hasDriverLicense: true,
    
    // Step 5: Additional Information
    collectsGovernmentBenefits: false,
    governmentBenefitTypes: [] as string[],
    governmentBenefitOther: '',
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: '',
    debtDischargeStatus: '',
    amountOwed: '',
    trusteeName: '',
    debtDischargeComments: '',
    consentSoftCheck: false,
    termsAccepted: false,
    
    // Step 6: Account Creation
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Parse query parameters for pre-filled data
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const vehicleParam = searchParams.get('vehicle');
    const budgetParam = searchParams.get('budget');
    const amountParam = searchParams.get('amount');
    const termParam = searchParams.get('term');
    const rateParam = searchParams.get('rate');
    
    const updatedFormData = { ...formData };
    
    if (vehicleParam) {
      updatedFormData.vehicleType = vehicleParam;
    }
    
    if (budgetParam) {
      updatedFormData.monthlyBudget = budgetParam;
    }
    
    if (amountParam) {
      // This would be used for loan amount calculation
    }
    
    if (termParam) {
      // This would be used for loan term
    }
    
    if (rateParam) {
      // This would be used for interest rate
    }
    
    setFormData(updatedFormData);
  }, [location.search]);

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (user && user.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  const validateStep = (step: number) => {
    try {
      const schema = stepValidationSchema[step as keyof typeof stepValidationSchema];
      
      // Extract only the fields relevant to the current step
      const stepData: any = {};
      Object.keys(formData).forEach(key => {
        if (key in schema.shape) {
          stepData[key] = formData[key as keyof typeof formData];
        }
      });
      
      schema.parse(stepData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0].toString();
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleMultiCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    
    setFormData(prev => {
      const currentValues = prev.governmentBenefitTypes || [];
      
      if (checked) {
        return {
          ...prev,
          [name]: [...currentValues, value]
        };
      } else {
        return {
          ...prev,
          [name]: currentValues.filter(v => v !== value)
        };
      }
    });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      window.scrollTo(0, 0);
    } else if (step === currentStep + 1) {
      handleNext();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate a temporary user ID for anonymous users
      const tempUserId = uuidv4();
      
      // Calculate loan amount range based on monthly budget
      const monthlyBudget = parseFloat(formData.monthlyBudget);
      const downPayment = parseFloat(formData.downPayment) || 0;
      const creditScoreRange = formData.creditScore;
      
      // Determine interest rate based on credit score
      let interestRate = 5.99;
      if (creditScoreRange === '750+') {
        interestRate = 4.99;
      } else if (creditScoreRange === '700-749') {
        interestRate = 5.49;
      } else if (creditScoreRange === '650-699') {
        interestRate = 5.99;
      } else if (creditScoreRange === '600-649') {
        interestRate = 7.99;
      } else if (creditScoreRange === '550-599') {
        interestRate = 9.99;
      } else if (creditScoreRange === 'below-550') {
        interestRate = 12.99;
      }
      
      // Calculate loan amount range
      const monthlyRate = interestRate / 1200;
      const term = 60; // 5 years
      
      // Formula: A = P * [r(1+r)^n] / [(1+r)^n - 1]
      // Solving for P: P = A * [(1+r)^n - 1] / [r(1+r)^n]
      const numerator = Math.pow(1 + monthlyRate, term) - 1;
      const denominator = monthlyRate * Math.pow(1 + monthlyRate, term);
      
      const maxLoanAmount = Math.round((monthlyBudget * numerator) / denominator);
      const minLoanAmount = Math.round(maxLoanAmount * 0.7);
      
      // Determine credit score number from range
      let creditScore = 650;
      if (creditScoreRange === '750+') {
        creditScore = 750;
      } else if (creditScoreRange === '700-749') {
        creditScore = 725;
      } else if (creditScoreRange === '650-699') {
        creditScore = 675;
      } else if (creditScoreRange === '600-649') {
        creditScore = 625;
      } else if (creditScoreRange === '550-599') {
        creditScore = 575;
      } else if (creditScoreRange === 'below-550') {
        creditScore = 525;
      }
      
      // Show processing animation
      setIsProcessing(true);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create application in database
      const { data: application, error } = await supabase
        .from('applications')
        .insert({
          // User identification
          user_id: user?.id || null,
          temp_user_id: !user ? tempUserId : null,
          
          // Vehicle information
          vehicle_type: formData.vehicleType,
          
          // Financial information
          desired_monthly_payment: parseFloat(formData.monthlyBudget),
          down_payment: downPayment,
          loan_amount_min: minLoanAmount,
          loan_amount_max: maxLoanAmount,
          interest_rate: interestRate,
          loan_term: term,
          credit_score: creditScore,
          
          // Personal information
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postalCode,
          
          // Employment information
          employment_status: formData.employmentStatus,
          annual_income: parseFloat(formData.annualIncome),
          employer_name: formData.employmentStatus === 'self_employed' ? null : formData.employerName,
          occupation: formData.employmentStatus === 'self_employed' ? null : formData.occupation,
          employment_duration_years: parseInt(formData.employmentDurationYears),
          employment_duration_months: parseInt(formData.employmentDurationMonths),
          
          // Housing information
          housing_status: formData.housingStatus,
          housing_payment: parseFloat(formData.housingPayment) || 0,
          residence_duration_years: parseInt(formData.residenceDurationYears),
          residence_duration_months: parseInt(formData.residenceDurationMonths),
          
          // Additional information
          has_driver_license: formData.hasDriverLicense,
          collects_government_benefits: formData.collectsGovernmentBenefits,
          government_benefit_types: formData.governmentBenefitTypes.length > 0 ? formData.governmentBenefitTypes : null,
          government_benefit_other: formData.governmentBenefitOther || null,
          has_debt_discharge_history: formData.hasDebtDischargeHistory,
          debt_discharge_type: formData.debtDischargeType || null,
          debt_discharge_year: formData.debtDischargeYear ? parseInt(formData.debtDischargeYear) : null,
          debt_discharge_status: formData.debtDischargeStatus || null,
          amount_owed: formData.amountOwed ? parseFloat(formData.amountOwed) : null,
          trustee_name: formData.trusteeName || null,
          debt_discharge_comments: formData.debtDischargeComments || null,
          
          // Consent
          consent_soft_check: formData.consentSoftCheck,
          terms_accepted: formData.termsAccepted,
          
          // Application status
          status: 'submitted',
          current_stage: 1
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Create initial application stage
      await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });
      
      // If user is not logged in and provided password, create account
      if (!user && formData.password && currentStep === 6) {
        try {
          // Sign up with Supabase Auth
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                role: 'customer'
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          });
          
          if (signUpError) {
            throw signUpError;
          }
          
          if (authData?.user) {
            // Update the application with the new user_id
            await supabase
              .from('applications')
              .update({
                user_id: authData.user.id,
                temp_user_id: null
              })
              .eq('id', application.id);
          }
        } catch (signUpError) {
          console.error('Error signing up:', signUpError);
          // Continue with the flow even if sign-up fails
          // The user can sign up later using the temp user ID
        }
      }
      
      // Call the onComplete callback with the application ID and temp user ID
      onComplete(
        application.id, 
        !user ? tempUserId : '', 
        {
          ...formData,
          loanRange: {
            min: minLoanAmount,
            max: maxLoanAmount,
            rate: interestRate
          },
          term: term
        }
      );
      
    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({
        submit: 'An error occurred while submitting your application. Please try again.'
      });
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  // Render different form steps based on currentStep
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Vehicle Information</h2>
            <p className="text-gray-600">Tell us about the type of vehicle you're looking for.</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
              >
                <option value="">Select vehicle type</option>
                <option value="Car">Car</option>
                <option value="SUV">SUV</option>
                <option value="Truck">Truck</option>
                <option value="Van">Van</option>
              </select>
              {errors.vehicleType && (
                <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Financial Information</h2>
            <p className="text-gray-600">Help us understand your budget and financial situation.</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desired Monthly Payment <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="monthlyBudget"
                  value={formData.monthlyBudget}
                  onChange={handleChange}
                  placeholder="500"
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                />
              </div>
              {errors.monthlyBudget && (
                <p className="mt-1 text-sm text-red-600">{errors.monthlyBudget}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Down Payment
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="downPayment"
                  value={formData.downPayment}
                  onChange={handleChange}
                  placeholder="0"
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                />
              </div>
              {errors.downPayment && (
                <p className="mt-1 text-sm text-red-600">{errors.downPayment}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Score Range <span className="text-red-500">*</span>
              </label>
              <select
                name="creditScore"
                value={formData.creditScore}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
              >
                <option value="">Select credit score range</option>
                <option value="750+">Excellent (750+)</option>
                <option value="700-749">Very Good (700-749)</option>
                <option value="650-699">Good (650-699)</option>
                <option value="600-649">Fair (600-649)</option>
                <option value="550-599">Poor (550-599)</option>
                <option value="below-550">Very Poor (Below 550)</option>
                <option value="no-score">No Credit Score</option>
              </select>
              {errors.creditScore && (
                <p className="mt-1 text-sm text-red-600">{errors.creditScore}</p>
              )}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Personal Information</h2>
            <p className="text-gray-600">Tell us about yourself so we can tailor our offer to you.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    placeholder="(123) 456-7890"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  placeholder="123 Main St"
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province <span className="text-red-500">*</span>
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                >
                  <option value="">Select province</option>
                  <option value="AB">Alberta</option>
                  <option value="BC">British Columbia</option>
                  <option value="MB">Manitoba</option>
                  <option value="NB">New Brunswick</option>
                  <option value="NL">Newfoundland and Labrador</option>
                  <option value="NS">Nova Scotia</option>
                  <option value="NT">Northwest Territories</option>
                  <option value="NU">Nunavut</option>
                  <option value="ON">Ontario</option>
                  <option value="PE">Prince Edward Island</option>
                  <option value="QC">Quebec</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="YT">Yukon</option>
                </select>
                {errors.province && (
                  <p className="mt-1 text-sm text-red-600">{errors.province}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  placeholder="A1A 1A1"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
                )}
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Employment & Housing</h2>
            <p className="text-gray-600">Tell us about your employment and housing situation.</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Status <span className="text-red-500">*</span>
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
              >
                <option value="">Select employment status</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
              </select>
              {errors.employmentStatus && (
                <p className="mt-1 text-sm text-red-600">{errors.employmentStatus}</p>
              )}
            </div>
            
            {formData.employmentStatus && formData.employmentStatus !== 'unemployed' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Income <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="annualIncome"
                      value={formData.annualIncome}
                      onChange={handleChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="50000"
                    />
                  </div>
                  {errors.annualIncome && (
                    <p className="mt-1 text-sm text-red-600">{errors.annualIncome}</p>
                  )}
                </div>
                
                {formData.employmentStatus === 'employed' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employer Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="employerName"
                          value={formData.employerName}
                          onChange={handleChange}
                          className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="occupation"
                          value={formData.occupation}
                          onChange={handleChange}
                          className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How long have you been {formData.employmentStatus === 'employed' ? 'with this employer' : 'self-employed'}?
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <select
                        name="employmentDurationYears"
                        value={formData.employmentDurationYears}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      >
                        <option value="0">0 Years</option>
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years</option>
                        <option value="4">4 Years</option>
                        <option value="5">5 Years</option>
                        <option value="6">6 Years</option>
                        <option value="7">7 Years</option>
                        <option value="8">8 Years</option>
                        <option value="9">9 Years</option>
                        <option value="10">10+ Years</option>
                      </select>
                    </div>
                    <div>
                      <select
                        name="employmentDurationMonths"
                        value={formData.employmentDurationMonths}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      >
                        <option value="0">0 Months</option>
                        <option value="1">1 Month</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="4">4 Months</option>
                        <option value="5">5 Months</option>
                        <option value="6">6 Months</option>
                        <option value="7">7 Months</option>
                        <option value="8">8 Months</option>
                        <option value="9">9 Months</option>
                        <option value="10">10 Months</option>
                        <option value="11">11 Months</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Housing Status <span className="text-red-500">*</span>
              </label>
              <select
                name="housingStatus"
                value={formData.housingStatus}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
              >
                <option value="">Select housing status</option>
                <option value="own">Own</option>
                <option value="rent">Rent</option>
                <option value="live_with_parents">Live with Parents</option>
                <option value="other">Other</option>
              </select>
              {errors.housingStatus && (
                <p className="mt-1 text-sm text-red-600">{errors.housingStatus}</p>
              )}
            </div>
            
            {formData.housingStatus && formData.housingStatus !== 'live_with_parents' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Housing Payment
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="housingPayment"
                    value={formData.housingPayment}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    placeholder="1200"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How long have you lived at your current address?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    name="residenceDurationYears"
                    value={formData.residenceDurationYears}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="0">0 Years</option>
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="4">4 Years</option>
                    <option value="5">5 Years</option>
                    <option value="6">6 Years</option>
                    <option value="7">7 Years</option>
                    <option value="8">8 Years</option>
                    <option value="9">9 Years</option>
                    <option value="10">10+ Years</option>
                  </select>
                </div>
                <div>
                  <select
                    name="residenceDurationMonths"
                    value={formData.residenceDurationMonths}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="0">0 Months</option>
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="4">4 Months</option>
                    <option value="5">5 Months</option>
                    <option value="6">6 Months</option>
                    <option value="7">7 Months</option>
                    <option value="8">8 Months</option>
                    <option value="9">9 Months</option>
                    <option value="10">10 Months</option>
                    <option value="11">11 Months</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="hasDriverLicense"
                  name="hasDriverLicense"
                  checked={formData.hasDriverLicense}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    hasDriverLicense: e.target.checked
                  }))}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                />
                <label htmlFor="hasDriverLicense" className="ml-2 block text-sm font-medium text-gray-700">
                  I have a valid driver's license
                </label>
              </div>
              <p className="text-xs text-gray-500">Uncheck if you do not have a valid driver's license</p>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Additional Information</h2>
            <p className="text-gray-600">A few more details to help us find the best options for you.</p>
            
            <div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="collectsGovernmentBenefits"
                  name="collectsGovernmentBenefits"
                  checked={formData.collectsGovernmentBenefits}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    collectsGovernmentBenefits: e.target.checked
                  }))}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                />
                <label htmlFor="collectsGovernmentBenefits" className="ml-2 block text-sm font-medium text-gray-700">
                  I collect government benefits
                </label>
              </div>
            </div>
            
            {formData.collectsGovernmentBenefits && (
              <div className="pl-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select all that apply:
                  </label>
                  <div className="space-y-2">
                    {['ontario_works', 'odsp', 'cpp', 'ei', 'child_tax_benefit', 'other'].map((benefit) => (
                      <div key={benefit} className="flex items-center">
                        <input
                          type="checkbox"
                          id={benefit}
                          name="governmentBenefitTypes"
                          value={benefit}
                          checked={formData.governmentBenefitTypes.includes(benefit)}
                          onChange={handleMultiCheckboxChange}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        />
                        <label htmlFor={benefit} className="ml-2 block text-sm text-gray-700">
                          {benefit === 'ontario_works' && 'Ontario Works'}
                          {benefit === 'odsp' && 'ODSP (Ontario Disability Support Program)'}
                          {benefit === 'cpp' && 'CPP (Canada Pension Plan)'}
                          {benefit === 'ei' && 'EI (Employment Insurance)'}
                          {benefit === 'child_tax_benefit' && 'Child Tax Benefit'}
                          {benefit === 'other' && 'Other'}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {formData.governmentBenefitTypes.includes('other') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Please specify other benefit:
                    </label>
                    <input
                      type="text"
                      name="governmentBenefitOther"
                      value={formData.governmentBenefitOther}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="hasDebtDischargeHistory"
                  name="hasDebtDischargeHistory"
                  checked={formData.hasDebtDischargeHistory}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    hasDebtDischargeHistory: e.target.checked
                  }))}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                />
                <label htmlFor="hasDebtDischargeHistory" className="ml-2 block text-sm font-medium text-gray-700">
                  I have filed for bankruptcy, consumer proposal, or debt settlement in the past
                </label>
              </div>
            </div>
            
            {formData.hasDebtDischargeHistory && (
              <div className="pl-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of Debt Discharge
                  </label>
                  <select
                    name="debtDischargeType"
                    value={formData.debtDischargeType}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="">Select type</option>
                    <option value="bankruptcy">Bankruptcy</option>
                    <option value="consumer_proposal">Consumer Proposal</option>
                    <option value="division_1_proposal">Division 1 Proposal</option>
                    <option value="informal_settlement">Informal Debt Settlement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year of Filing
                  </label>
                  <select
                    name="debtDischargeYear"
                    value={formData.debtDischargeYear}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                    <option value={new Date().getFullYear() - 11}>Earlier than {new Date().getFullYear() - 10}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Status
                  </label>
                  <select
                    name="debtDischargeStatus"
                    value={formData.debtDischargeStatus}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="">Select status</option>
                    <option value="active">Active (Still in process)</option>
                    <option value="discharged">Discharged (Completed)</option>
                    <option value="not_sure">Not Sure</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Owed (if active)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="amountOwed"
                      value={formData.amountOwed}
                      onChange={handleChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trustee Name (if applicable)
                  </label>
                  <input
                    type="text"
                    name="trusteeName"
                    value={formData.trusteeName}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Comments
                  </label>
                  <textarea
                    name="debtDischargeComments"
                    value={formData.debtDischargeComments}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    placeholder="Any additional details about your debt discharge..."
                  />
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="consentSoftCheck"
                  name="consentSoftCheck"
                  checked={formData.consentSoftCheck}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    consentSoftCheck: e.target.checked
                  }))}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                />
                <label htmlFor="consentSoftCheck" className="ml-2 block text-sm text-gray-700">
                  I consent to a soft credit check to determine my pre-qualification status. This will not affect my credit score. <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.consentSoftCheck && (
                <p className="mt-1 text-sm text-red-600">{errors.consentSoftCheck}</p>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    termsAccepted: e.target.checked
                  }))}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                />
                <label htmlFor="termsAccepted" className="ml-2 block text-sm text-gray-700">
                  I agree to the <a href="/terms" target="_blank" className="text-[#3BAA75] hover:underline">Terms of Service</a> and <a href="/privacy" target=\"_blank" className="text-[#3BAA75] hover:underline">Privacy Policy</a>. <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="mt-1 text-sm text-red-600">{errors.termsAccepted}</p>
              )}
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Create Your Account</h2>
            <p className="text-gray-600">Set up your account to track your application and get updates.</p>
            
            {user ? (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-green-700">
                    You're already signed in as {user.email}. Click "Submit" to complete your application.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      readOnly
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 pr-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 pr-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Why create an account?</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Track your application status</li>
                        <li>Receive important updates</li>
                        <li>Upload required documents</li>
                        <li>Communicate with our team</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6">
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={6} 
          onStepClick={handleStepClick}
        />
        
        <form onSubmit={(e) => {
          e.preventDefault();
          handleNext();
        }}>
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
          
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{errors.submit}</span>
            </div>
          )}
          
          <div className="mt-8 flex justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </button>
            ) : (
              <div></div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  {currentStep === 6 ? 'Creating Account...' : 'Processing...'}
                </>
              ) : (
                <>
                  {currentStep === 6 ? (user ? 'Submit' : 'Create Account') : 'Continue'}
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};