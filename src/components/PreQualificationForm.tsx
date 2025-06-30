import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { ProgressBar } from './ProgressBar';
import { ProcessingAnimation } from './ProcessingAnimation';
import { vehicles } from '../pages/Vehicles';
import { Slider } from '@/components/ui/slider';
import { 
  Car, 
  DollarSign, 
  CreditCard, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Home, 
  AlertCircle,
  Building,
  Clock,
  FileText,
  Cpu
} from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { z } from 'zod';

interface PreQualificationFormProps {
  onComplete: (applicationId: string, tempUserId: string, formData: any) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempUserId] = useState(uuidv4());
  
  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Vehicle Type
    vehicleType: searchParams.get('vehicle') || '',
    
    // Step 2: Financial Information
    desiredMonthlyPayment: searchParams.get('budget') ? parseInt(searchParams.get('budget')!) : 500,
    creditScore: '',
    
    // Step 3: Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    housingStatus: '',
    housingPayment: '',
    residenceDurationYears: '',
    residenceDurationMonths: '',
    
    // Step 4: Employment Information
    employmentStatus: 'employed',
    employerName: '',
    occupation: '',
    employmentDurationYears: '',
    employmentDurationMonths: '',
    annualIncome: '',
    otherIncome: '',
    
    // Step 5: Additional Information
    hasDriverLicense: false,
    collects_government_benefits: false,
    government_benefit_types: [] as string[],
    government_benefit_other: '',
    government_benefit_amount: '',
    has_debt_discharge_history: false,
    debt_discharge_type: '',
    debt_discharge_status: '',
    debt_discharge_year: '',
    amount_owed: '',
    trustee_name: '',
    
    // Step 6: Account Creation
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Consent
    consentToSoftCheck: false,
    termsAccepted: false
  });

  // Validation schema for each step
  const stepValidationSchema = {
    1: z.object({
      vehicleType: z.string().min(1, 'Please select a vehicle type')
    }),
    2: z.object({
      desiredMonthlyPayment: z.number().min(100, 'Monthly payment must be at least $100').max(2000, 'Monthly payment cannot exceed $2000'),
      creditScore: z.string().refine(val => {
        const num = parseInt(val);
        return !isNaN(num) && num >= 300 && num <= 900;
      }, 'Credit score must be between 300 and 900')
    }),
    3: z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      dateOfBirth: z.string().min(1, 'Date of birth is required'),
      address: z.string().min(1, 'Address is required'),
      city: z.string().min(1, 'City is required'),
      province: z.string().min(1, 'Province is required'),
      postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Please enter a valid postal code'),
      housingStatus: z.string().min(1, 'Housing status is required'),
      housingPayment: z.string().optional(),
      residenceDurationYears: z.string().optional(),
      residenceDurationMonths: z.string().optional()
    }),
    4: z.object({
      employmentStatus: z.string().min(1, 'Please select your employment status'),
      employerName: z.string().optional(),
      occupation: z.string().optional(),
      employmentDurationYears: z.string().optional(),
      employmentDurationMonths: z.string().optional(),
      annualIncome: z.string().refine(val => {
        const num = parseFloat(val.replace(/[^0-9.]/g, ''));
        return !isNaN(num) && num > 0;
      }, 'Please enter a valid annual income'),
      otherIncome: z.string().optional()
    }),
    5: z.object({
      hasDriverLicense: z.boolean().optional(),
      collects_government_benefits: z.boolean().optional(),
      government_benefit_types: z.array(z.string()).optional(),
      government_benefit_other: z.string().optional(),
      government_benefit_amount: z.string().optional(),
      has_debt_discharge_history: z.boolean().optional(),
      debt_discharge_type: z.string().optional(),
      debt_discharge_status: z.string().optional(),
      debt_discharge_year: z.string().optional(),
      amount_owed: z.string().optional(),
      trustee_name: z.string().optional(),
      consentToSoftCheck: z.boolean().refine(val => val === true, 'You must consent to a soft credit check'),
      termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
    }),
    6: z.object({
      email: z.string().email('Please enter a valid email address'),
      phone: z.string().min(10, 'Please enter a valid phone number'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string().min(8, 'Please confirm your password')
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    })
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError(null);
  };

  // Handle slider change for monthly payment
  const handleSliderChange = (value: number[]) => {
    if (value && value.length > 0) {
      setFormData(prev => ({
        ...prev,
        desiredMonthlyPayment: value[0]
      }));
    }
    setError(null);
  };

  // Handle currency input changes
  const handleCurrencyChange = (value: string | undefined, name: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [name]: value || '' 
    }));
    setError(null);
  };

  // Handle radio button changes
  const handleRadioChange = (name: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset related fields when changing radio buttons
    if (name === 'collects_government_benefits' && !value) {
      setFormData(prev => ({ 
        ...prev, 
        government_benefit_types: [],
        government_benefit_other: '',
        government_benefit_amount: ''
      }));
    }
    
    if (name === 'has_debt_discharge_history' && !value) {
      setFormData(prev => ({ 
        ...prev, 
        debt_discharge_type: '',
        debt_discharge_status: '',
        debt_discharge_year: '',
        amount_owed: '',
        trustee_name: ''
      }));
    }
    
    setError(null);
  };

  // Handle multi-select changes for government benefits
  const handleBenefitTypeChange = (type: string) => {
    setFormData(prev => {
      const currentTypes = [...prev.government_benefit_types];
      
      if (currentTypes.includes(type)) {
        // Remove the type if it's already selected
        return {
          ...prev,
          government_benefit_types: currentTypes.filter(t => t !== type)
        };
      } else {
        // Add the type if it's not already selected
        return {
          ...prev,
          government_benefit_types: [...currentTypes, type]
        };
      }
    });
    
    setError(null);
  };

  // Validate current step
  const validateStep = () => {
    try {
      const schema = stepValidationSchema[currentStep as keyof typeof stepValidationSchema];
      
      // Create an object with only the fields for the current step
      const stepData: any = {};
      Object.keys(schema.shape).forEach(key => {
        stepData[key] = formData[key as keyof typeof formData];
      });
      
      // Additional validation for step 5
      if (currentStep === 5) {
        // Validate government benefits fields if selected
        if (formData.collects_government_benefits) {
          if (formData.government_benefit_types.length === 0) {
            throw new Error('Please select at least one government benefit type');
          }
          if (!formData.government_benefit_amount) {
            throw new Error('Please enter the amount you receive from government benefits');
          }
        }
        
        // Validate bankruptcy/consumer proposal fields if selected
        if (formData.has_debt_discharge_history) {
          if (!formData.debt_discharge_type) {
            throw new Error('Please select the type of debt discharge');
          }
          if (!formData.debt_discharge_status) {
            throw new Error('Please select the status of your debt discharge');
          }
          if (!formData.debt_discharge_year) {
            throw new Error('Please enter the year of your debt discharge');
          }
          if (formData.debt_discharge_status === 'active' && !formData.amount_owed) {
            throw new Error('Please enter the amount owed');
          }
        }
      }
      
      schema.parse(stepData);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Validation failed. Please check your inputs.');
      }
      return false;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      } else {
        handleSubmit();
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsProcessing(true);
      
      // Calculate loan amount range based on monthly payment
      const monthlyPayment = formData.desiredMonthlyPayment;
      const interestRate = 5.99; // Default interest rate
      const term = 60; // Default term in months
      
      // Calculate loan amount using the formula: PV = PMT * ((1 - (1 + r)^-n) / r)
      const monthlyRate = interestRate / 1200;
      const loanAmount = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -term)) / monthlyRate);
      
      // Set loan range with +/- 20%
      const loanMin = Math.round(loanAmount * 0.8);
      const loanMax = Math.round(loanAmount * 1.2);
      
      // Parse numeric values
      const annualIncomeValue = formData.annualIncome ? parseFloat(formData.annualIncome.replace(/[^0-9.]/g, '')) : 0;
      const otherIncomeValue = formData.otherIncome ? parseFloat(formData.otherIncome.replace(/[^0-9.]/g, '')) : 0;
      const housingPaymentValue = formData.housingPayment ? parseFloat(formData.housingPayment.replace(/[^0-9.]/g, '')) : 0;
      const governmentBenefitAmountValue = formData.government_benefit_amount ? parseFloat(formData.government_benefit_amount.replace(/[^0-9.]/g, '')) : 0;
      const amountOwedValue = formData.amount_owed ? parseFloat(formData.amount_owed.replace(/[^0-9.]/g, '')) : 0;
      
      // Create application in Supabase
      const { data: application, error } = await supabase
        .from('applications')
        .insert({
          temp_user_id: tempUserId,
          status: 'pending_documents',
          current_stage: 1,
          
          // Personal Information
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          
          // Address Information
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postalCode,
          housing_status: formData.housingStatus,
          housing_payment: housingPaymentValue,
          residence_duration_years: formData.residenceDurationYears ? parseInt(formData.residenceDurationYears) : null,
          residence_duration_months: formData.residenceDurationMonths ? parseInt(formData.residenceDurationMonths) : null,
          
          // Employment Information
          employment_status: formData.employmentStatus,
          employer_name: formData.employerName,
          occupation: formData.occupation,
          employment_duration_years: formData.employmentDurationYears ? parseInt(formData.employmentDurationYears) : null,
          employment_duration_months: formData.employmentDurationMonths ? parseInt(formData.employmentDurationMonths) : null,
          annual_income: annualIncomeValue,
          monthly_income: annualIncomeValue / 12,
          other_income: otherIncomeValue,
          
          // Financial Information
          credit_score: parseInt(formData.creditScore),
          vehicle_type: formData.vehicleType,
          desired_monthly_payment: formData.desiredMonthlyPayment,
          loan_amount_min: loanMin,
          loan_amount_max: loanMax,
          interest_rate: interestRate,
          loan_term: term,
          
          // Additional Information
          has_driver_license: formData.hasDriverLicense,
          collects_government_benefits: formData.collects_government_benefits,
          government_benefit_types: formData.government_benefit_types.length > 0 ? formData.government_benefit_types : null,
          government_benefit_other: formData.government_benefit_other || null,
          has_debt_discharge_history: formData.has_debt_discharge_history,
          debt_discharge_type: formData.debt_discharge_type || null,
          debt_discharge_status: formData.debt_discharge_status || null,
          debt_discharge_year: formData.debt_discharge_year ? parseInt(formData.debt_discharge_year) : null,
          amount_owed: amountOwedValue || null,
          trustee_name: formData.trustee_name || null,
          
          // Consent
          consent_soft_check: formData.consentToSoftCheck,
          terms_accepted: formData.termsAccepted
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create initial application stage
      await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });
      
      // Wait a moment to simulate processing
      setTimeout(() => {
        setIsProcessing(false);
        
        // Call the onComplete callback with the application ID and temp user ID
        onComplete(application.id, tempUserId, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        });
        
        // Navigate to results page
        navigate('/qualification-results', {
          state: {
            fromApproval: true,
            applicationId: application.id,
            tempUserId: tempUserId,
            loanRange: {
              min: loanMin,
              max: loanMax,
              rate: interestRate
            },
            vehicleType: formData.vehicleType,
            monthlyBudget: formData.desiredMonthlyPayment,
            originalFormData: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              password: formData.password
            }
          }
        });
      }, 3000);
    } catch (err) {
      setIsProcessing(false);
      console.error('Error submitting application:', err);
      setError('An error occurred while submitting your application. Please try again.');
    }
  };

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">What type of vehicle are you looking for?</h2>
              <p className="text-base md:text-lg text-gray-600">Select the type of vehicle you're interested in financing.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {vehicles.map((vehicle) => (
                <motion.div
                  key={vehicle.type}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    border-2 rounded-md p-3 md:p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-[#3BAA75]
                    flex flex-col items-center text-center
                    ${formData.vehicleType === vehicle.type 
                      ? 'border-[#3BAA75] bg-[#3BAA75]/5 shadow-md' 
                      : 'border-gray-200'
                    }
                  `}
                  onClick={() => setFormData({ ...formData, vehicleType: vehicle.type })}
                >
                  <div className="w-full h-24 md:h-32 mb-3 rounded-md overflow-hidden">
                    <img 
                      src={vehicle.image} 
                      alt={vehicle.type} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="font-medium text-gray-800">{vehicle.type}</h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">{vehicle.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Financial Information</h2>
              <p className="text-base md:text-lg text-gray-600">Help us understand your budget and credit situation.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's your ideal monthly car payment?
                </label>
                <div className="space-y-4">
                  <Slider
                    value={[formData.desiredMonthlyPayment]}
                    onValueChange={handleSliderChange}
                    min={100}
                    max={2000}
                    step={50}
                    showTooltip
                    tooltipContent={(value) => `$${value}`}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>$100</span>
                    <span>$2000</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-[#3BAA75]">${formData.desiredMonthlyPayment}</span>
                    <span className="text-gray-500 text-sm ml-1">per month</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="creditScore" className="block text-sm font-medium text-gray-700 mb-2">
                  What's your credit score?
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="creditScore"
                    name="creditScore"
                    min="300"
                    max="900"
                    value={formData.creditScore}
                    onChange={handleChange}
                    placeholder="Enter your credit score (300-900)"
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Don't know your score? Enter your best estimate.</p>
              </div>
            </div>
          </motion.div>
        );
      
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Personal Information</h2>
              <p className="text-base md:text-lg text-gray-600">Tell us a bit about yourself.</p>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  >
                    <option value="">Select</option>
                    <option value="AB">Alberta</option>
                    <option value="BC">British Columbia</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="NU">Nunavut</option>
                    <option value="ON">Ontario</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="QC">Quebec</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="YT">Yukon</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    placeholder="A1A 1A1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="housingStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Housing Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="housingStatus"
                  name="housingStatus"
                  value={formData.housingStatus}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  required
                >
                  <option value="">Select</option>
                  <option value="own">Own</option>
                  <option value="rent">Rent</option>
                  <option value="live_with_parents">Live with parents</option>
                  <option value="subsidized_housing">Subsidized housing</option>
                  <option value="military">Military housing</option>
                  <option value="student">Student housing</option>
                </select>
              </div>
              
              {(formData.housingStatus === 'own' || formData.housingStatus === 'rent') && (
                <div>
                  <label htmlFor="housingPayment" className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Housing Payment
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <CurrencyInput
                      id="housingPayment"
                      name="housingPayment"
                      value={formData.housingPayment}
                      onValueChange={(value) => handleCurrencyChange(value, 'housingPayment')}
                      placeholder="Enter monthly payment"
                      prefix="$"
                      groupSeparator=","
                      decimalSeparator="."
                      className="w-full p-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="residenceDurationYears" className="block text-sm font-medium text-gray-700 mb-1">
                    Years at Current Address
                  </label>
                  <select
                    id="residenceDurationYears"
                    name="residenceDurationYears"
                    value={formData.residenceDurationYears}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {Array.from({ length: 21 }, (_, i) => (
                      <option key={i} value={i}>{i} {i === 1 ? 'year' : 'years'}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="residenceDurationMonths" className="block text-sm font-medium text-gray-700 mb-1">
                    Months at Current Address
                  </label>
                  <select
                    id="residenceDurationMonths"
                    name="residenceDurationMonths"
                    value={formData.residenceDurationMonths}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{i} {i === 1 ? 'month' : 'months'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        );
      
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Employment Information</h2>
              <p className="text-base md:text-lg text-gray-600">Tell us about your employment situation.</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="employmentStatus"
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  >
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="student">Student</option>
                    <option value="retired">Retired</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
                <>
                  <div>
                    <label htmlFor="employerName" className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.employmentStatus === 'self_employed' ? 'Business Name' : 'Employer Name'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="employerName"
                        name="employerName"
                        value={formData.employerName}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                      Occupation / Job Title
                    </label>
                    <input
                      type="text"
                      id="occupation"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="employmentDurationYears" className="block text-sm font-medium text-gray-700 mb-1">
                        Years at Current Job
                      </label>
                      <select
                        id="employmentDurationYears"
                        name="employmentDurationYears"
                        value={formData.employmentDurationYears}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      >
                        <option value="">Select</option>
                        {Array.from({ length: 21 }, (_, i) => (
                          <option key={i} value={i}>{i} {i === 1 ? 'year' : 'years'}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="employmentDurationMonths" className="block text-sm font-medium text-gray-700 mb-1">
                        Months at Current Job
                      </label>
                      <select
                        id="employmentDurationMonths"
                        name="employmentDurationMonths"
                        value={formData.employmentDurationMonths}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      >
                        <option value="">Select</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>{i} {i === 1 ? 'month' : 'months'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <label htmlFor="annualIncome" className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Income <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <CurrencyInput
                    id="annualIncome"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onValueChange={(value) => handleCurrencyChange(value, 'annualIncome')}
                    placeholder="Enter your annual income"
                    prefix="$"
                    groupSeparator=","
                    decimalSeparator="."
                    className="w-full p-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="otherIncome" className="block text-sm font-medium text-gray-700 mb-1">
                  Other Income (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <CurrencyInput
                    id="otherIncome"
                    name="otherIncome"
                    value={formData.otherIncome}
                    onValueChange={(value) => handleCurrencyChange(value, 'otherIncome')}
                    placeholder="Enter any additional income"
                    prefix="$"
                    groupSeparator=","
                    decimalSeparator="."
                    className="w-full p-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Include any additional sources of income such as part-time work, investments, etc.</p>
              </div>
            </div>
          </motion.div>
        );
      
      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Additional Information</h2>
              <p className="text-base md:text-lg text-gray-600">Help us understand your financial situation better.</p>
            </div>
            
            <div className="space-y-6">
              {/* Driver's License */}
              <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Do you have a valid driver's license?</p>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.hasDriverLicense === true}
                        onChange={() => setFormData(prev => ({ ...prev, hasDriverLicense: true }))}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75]"
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.hasDriverLicense === false}
                        onChange={() => setFormData(prev => ({ ...prev, hasDriverLicense: false }))}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75]"
                      />
                      <span className="ml-2 text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Government Benefits Section */}
              <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Government Benefits</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Do you collect any government benefits?</p>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.collects_government_benefits === true}
                          onChange={() => handleRadioChange('collects_government_benefits', true)}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75]"
                        />
                        <span className="ml-2 text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.collects_government_benefits === false}
                          onChange={() => handleRadioChange('collects_government_benefits', false)}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75]"
                        />
                        <span className="ml-2 text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>
                  
                  {formData.collects_government_benefits && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Which benefits do you receive? (Select all that apply)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { id: 'ontario_works', label: 'Ontario Works' },
                            { id: 'odsp', label: 'ODSP' },
                            { id: 'cpp', label: 'CPP' },
                            { id: 'ei', label: 'EI' },
                            { id: 'child_tax_benefit', label: 'Child Tax Benefit' },
                            { id: 'other', label: 'Other' }
                          ].map(benefit => (
                            <label key={benefit.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.government_benefit_types.includes(benefit.id)}
                                onChange={() => handleBenefitTypeChange(benefit.id)}
                                className="h-4 w-4 rounded text-[#3BAA75] focus:ring-[#3BAA75]"
                              />
                              <span className="ml-2 text-sm text-gray-700">{benefit.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {formData.government_benefit_types.includes('other') && (
                        <div>
                          <label htmlFor="government_benefit_other" className="block text-sm font-medium text-gray-700 mb-1">
                            Please specify other benefit
                          </label>
                          <input
                            type="text"
                            id="government_benefit_other"
                            name="government_benefit_other"
                            value={formData.government_benefit_other}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                          />
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="government_benefit_amount" className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly benefit amount
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                          </div>
                          <CurrencyInput
                            id="government_benefit_amount"
                            name="government_benefit_amount"
                            value={formData.government_benefit_amount}
                            onValueChange={(value) => handleCurrencyChange(value, 'government_benefit_amount')}
                            placeholder="Enter monthly amount"
                            prefix="$"
                            groupSeparator=","
                            decimalSeparator="."
                            className="w-full p-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bankruptcy/Consumer Proposal Section */}
              <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Debt Discharge History</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Have you ever filed for bankruptcy or a consumer proposal?</p>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.has_debt_discharge_history === true}
                          onChange={() => handleRadioChange('has_debt_discharge_history', true)}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75]"
                        />
                        <span className="ml-2 text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.has_debt_discharge_history === false}
                          onChange={() => handleRadioChange('has_debt_discharge_history', false)}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75]"
                        />
                        <span className="ml-2 text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>
                  
                  {formData.has_debt_discharge_history && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                      <div>
                        <label htmlFor="debt_discharge_type" className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          id="debt_discharge_type"
                          name="debt_discharge_type"
                          value={formData.debt_discharge_type}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        >
                          <option value="">Select type</option>
                          <option value="bankruptcy">Bankruptcy</option>
                          <option value="consumer_proposal">Consumer Proposal</option>
                          <option value="informal_settlement">Informal Settlement</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="debt_discharge_status" className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          id="debt_discharge_status"
                          name="debt_discharge_status"
                          value={formData.debt_discharge_status}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        >
                          <option value="">Select status</option>
                          <option value="active">Active</option>
                          <option value="discharged">Discharged</option>
                          <option value="not_sure">Not Sure</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="debt_discharge_year" className="block text-sm font-medium text-gray-700 mb-1">
                          Year
                        </label>
                        <input
                          type="number"
                          id="debt_discharge_year"
                          name="debt_discharge_year"
                          value={formData.debt_discharge_year}
                          onChange={handleChange}
                          min="1980"
                          max={new Date().getFullYear()}
                          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                          placeholder="YYYY"
                        />
                      </div>
                      
                      {formData.debt_discharge_status === 'active' && (
                        <>
                          <div>
                            <label htmlFor="amount_owed" className="block text-sm font-medium text-gray-700 mb-1">
                              Amount Owed
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                              </div>
                              <CurrencyInput
                                id="amount_owed"
                                name="amount_owed"
                                value={formData.amount_owed}
                                onValueChange={(value) => handleCurrencyChange(value, 'amount_owed')}
                                placeholder="Enter amount owed"
                                prefix="$"
                                groupSeparator=","
                                decimalSeparator="."
                                className="w-full p-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label htmlFor="trustee_name" className="block text-sm font-medium text-gray-700 mb-1">
                              Trustee Name
                            </label>
                            <input
                              type="text"
                              id="trustee_name"
                              name="trustee_name"
                              value={formData.trustee_name}
                              onChange={handleChange}
                              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              placeholder="Enter trustee name"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Consent Section */}
              <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Consent</h3>
                <div className="space-y-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentToSoftCheck"
                      checked={formData.consentToSoftCheck}
                      onChange={(e) => setFormData(prev => ({ ...prev, consentToSoftCheck: e.target.checked }))}
                      className="h-5 w-5 mt-0.5 rounded text-[#3BAA75] focus:ring-[#3BAA75]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I consent to a soft credit check, which will not affect my credit score. This allows Clearpath Motors to provide me with accurate pre-qualification options.
                    </span>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                      className="h-5 w-5 mt-0.5 rounded text-[#3BAA75] focus:ring-[#3BAA75]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to the <a href="/terms" target="_blank" className="text-[#3BAA75] hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-[#3BAA75] hover:underline">Privacy Policy</a>. I understand that my information will be used to process my application and may be shared with lenders and dealerships in Clearpath's network.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        );
      
      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Create Your Account</h2>
              <p className="text-base md:text-lg text-gray-600">Set up your account to track your application progress.</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  minLength={8}
                  required
                />
              </div>
              
              <div className="bg-[#3BAA75]/5 p-4 rounded-lg border border-[#3BAA75]/20">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#3BAA75] mr-2" />
                  Application Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Vehicle Type:</span> {formData.vehicleType}</p>
                  <p><span className="font-medium">Monthly Payment:</span> ${formData.desiredMonthlyPayment}</p>
                  <p><span className="font-medium">Credit Score:</span> {formData.creditScore}</p>
                  <p><span className="font-medium">Annual Income:</span> {formData.annualIncome}</p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {isProcessing ? (
        <ProcessingAnimation />
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 lg:p-8">
          {/* Progress Bar */}
          <ProgressBar 
            currentStep={currentStep} 
            totalSteps={6} 
            onStepClick={(step) => {
              // Only allow going back to previous steps
              if (step < currentStep) {
                setCurrentStep(step);
              }
            }}
          />
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg transition-colors ${
                currentStep === 1
                  ? 'opacity-0 pointer-events-none'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
            
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
            >
              {currentStep === 6 ? 'Submit' : 'Next'}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};