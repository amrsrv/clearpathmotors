import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Truck, Sun as Suv, Bus, DollarSign, User, Mail, Phone, Calendar, MapPin, Building, Briefcase, CreditCard, Home, Clock, AlertCircle, CheckCircle, ArrowRight, HelpCircle, MessageSquare, Wallet, Shield } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import CurrencyInput from 'react-currency-input-field';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface PreQualificationFormProps {
  onComplete: (applicationId: string) => void;
}

const vehicleTypes = [
  {
    type: "Car",
    icon: <Car className="h-12 w-12 text-[#3BAA75]" />,
    description: "Sedans & Coupes"
  },
  {
    type: "Truck",
    icon: <Truck className="h-12 w-12 text-[#3BAA75]" />,
    description: "Pickup Trucks"
  },
  {
    type: "SUV",
    icon: <Suv className="h-12 w-12 text-[#3BAA75]" />,
    description: "Sport Utility Vehicles"
  },
  {
    type: "Van",
    icon: <Bus className="h-12 w-12 text-[#3BAA75]" />,
    description: "Minivans & Cargo Vans"
  }
];

const creditScoreRates = {
  excellent: { rate: 4.99, score: 800 },
  good: { rate: 6.99, score: 720 },
  fair: { rate: 8.99, score: 650 },
  poor: { rate: 11.99, score: 580 },
  unknown: { rate: 8.99, score: 650 }
};

const creditScoreMapping = {
  excellent: 800, // 750+
  good: 720,     // 700-749
  fair: 650,     // 650-699
  poor: 580,     // Below 650
  unknown: 650   // Default score for unknown
};

const inputClasses = "appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm";
const selectClasses = "appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm";

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(9);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Vehicle Selection
    vehicleType: searchParams.get('vehicle') || '',
    
    // Monthly Budget
    desiredMonthlyPayment: searchParams.get('budget') || '',
    
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    
    // Address Information
    address: '',
    city: '',
    province: '',
    postalCode: '',
    
    // Employment & Income
    employmentStatus: '',
    employerName: '',
    occupation: '',
    employmentDuration: '',
    annualIncome: '',
    monthlyIncome: '',
    otherIncome: '0',
    
    // Housing Information
    housingStatus: '',
    housingPayment: '',
    residenceDuration: '',
    
    // Government & Disability Benefits
    collectsGovernmentBenefits: false,
    disabilityPrograms: {},
    
    // Debt Discharge / Financial Challenges
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: '',
    debtDischargeStatus: '',
    debtDischargeComments: '',
    
    // Credit Information
    creditScore: '',
    
    // Contact Preferences
    preferredContactMethod: '',
    
    // Consent
    consentSoftCheck: false,
    termsAccepted: false
  });

  // Prefill form data if user is logged in
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Check if user has existing applications
          const { data: applications, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) throw error;
          
          if (applications && applications.length > 0) {
            const app = applications[0];
            
            // Prefill form with data from most recent application
            setFormData(prev => ({
              ...prev,
              firstName: app.first_name || '',
              lastName: app.last_name || '',
              email: app.email || user.email || '',
              phone: app.phone || '',
              address: app.address || '',
              city: app.city || '',
              province: app.province || '',
              postalCode: app.postal_code || '',
              employmentStatus: app.employment_status || '',
              annualIncome: app.annual_income ? app.annual_income.toString() : '',
              creditScore: app.credit_score ? 
                (app.credit_score >= 750 ? 'excellent' : 
                 app.credit_score >= 700 ? 'good' : 
                 app.credit_score >= 650 ? 'fair' : 'poor') : '',
              desiredMonthlyPayment: app.desired_monthly_payment ? app.desired_monthly_payment.toString() : '',
              vehicleType: app.vehicle_type || searchParams.get('vehicle') || '',
              employerName: app.employer_name || '',
              occupation: app.occupation || '',
              employmentDuration: app.employment_duration || '',
              otherIncome: app.other_income ? app.other_income.toString() : '0',
              housingStatus: app.housing_status || '',
              housingPayment: app.housing_payment ? app.housing_payment.toString() : '',
              residenceDuration: app.residence_duration || '',
              collectsGovernmentBenefits: app.collects_government_benefits || false,
              disabilityPrograms: app.disability_programs || {},
              hasDebtDischargeHistory: app.has_debt_discharge_history || false,
              debtDischargeType: app.debt_discharge_type || '',
              debtDischargeYear: app.debt_discharge_year ? app.debt_discharge_year.toString() : '',
              debtDischargeStatus: app.debt_discharge_status || '',
              debtDischargeComments: app.debt_discharge_comments || '',
              preferredContactMethod: app.preferred_contact_method || ''
            }));
          } else {
            // Just set the email if no applications exist
            setFormData(prev => ({
              ...prev,
              email: user.email || ''
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, [user, searchParams]);

  // Calculate monthly income when annual income changes
  useEffect(() => {
    if (formData.annualIncome) {
      const annual = Number(formData.annualIncome.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(annual)) {
        const monthly = Math.round(annual / 12);
        setFormData(prev => ({
          ...prev,
          monthlyIncome: monthly.toString()
        }));
      }
    }
  }, [formData.annualIncome]);

  const calculateLoanRange = (monthlyPayment: number, rate: number, term: number = 60) => {
    const monthlyRate = rate / 1200;
    const denominator = monthlyRate * Math.pow(1 + monthlyRate, term);
    const numerator = Math.pow(1 + monthlyRate, term) - 1;
    const maxLoanAmount = (monthlyPayment * numerator) / denominator;
    
    return {
      min: Math.floor(maxLoanAmount * 0.9),
      max: Math.floor(maxLoanAmount * 1.1),
      rate
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
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
    
    setError('');
  };

  const handleCurrencyInput = (value: string | undefined, name: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value || ''
    }));
    setError('');
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Vehicle Selection
        if (!formData.vehicleType) {
          setError('Please select a vehicle type');
          return false;
        }
        break;
        
      case 2: // Monthly Budget
        if (!formData.desiredMonthlyPayment) {
          setError('Please enter your desired monthly payment');
          return false;
        }
        break;
        
      case 3: // Personal Information
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.dateOfBirth) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (!/^\+?1?\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
          setError('Please enter a valid phone number');
          return false;
        }
        
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 18) {
          setError('You must be at least 18 years old to apply');
          return false;
        }
        break;
        
      case 4: // Address Information
        if (!formData.address || !formData.city || !formData.province || !formData.postalCode) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(formData.postalCode)) {
          setError('Please enter a valid postal code (e.g., A1A 1A1)');
          return false;
        }
        break;
        
      case 5: // Employment & Income
        if (!formData.employmentStatus) {
          setError('Please select your employment status');
          return false;
        }
        if (!formData.annualIncome) {
          setError('Please enter your annual income');
          return false;
        }
        if (formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') {
          if (!formData.employerName || !formData.occupation || !formData.employmentDuration) {
            setError('Please fill in all employment details');
            return false;
          }
        }
        break;
        
      case 6: // Housing Information
        if (!formData.housingStatus) {
          setError('Please select your housing status');
          return false;
        }
        if (!formData.housingPayment) {
          setError('Please enter your monthly housing payment');
          return false;
        }
        if (!formData.residenceDuration) {
          setError('Please enter how long you have lived at your current address');
          return false;
        }
        break;
        
      case 7: // Government & Disability Benefits
        // This step is optional, so no validation needed
        break;
        
      case 8: // Debt Discharge / Financial Challenges
        if (formData.hasDebtDischargeHistory) {
          if (!formData.debtDischargeType || !formData.debtDischargeYear || !formData.debtDischargeStatus) {
            setError('Please fill in all debt discharge details');
            return false;
          }
        }
        break;
        
      case 9: // Contact Preferences & Consent
        if (!formData.preferredContactMethod) {
          setError('Please select your preferred contact method');
          return false;
        }
        if (!formData.consentSoftCheck) {
          setError('Please consent to a soft credit check');
          return false;
        }
        if (!formData.termsAccepted) {
          setError('Please accept the terms and conditions');
          return false;
        }
        break;
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const formatPostalCode = (postalCode: string): string => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = postalCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Insert space after the third character if length is 6
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const monthlyPayment = Number(formData.desiredMonthlyPayment.replace(/[^0-9.-]+/g, ''));
      const creditScoreInfo = creditScoreRates[formData.creditScore as keyof typeof creditScoreRates] || creditScoreRates.unknown;
      const loanRange = calculateLoanRange(monthlyPayment, creditScoreInfo.rate);
      
      // Map the credit score string to its numerical value
      const numericalCreditScore = creditScoreMapping[formData.creditScore as keyof typeof creditScoreMapping] || 650;
      
      // Format postal code
      const formattedPostalCode = formatPostalCode(formData.postalCode);
      
      // Generate a temp user ID for anonymous users
      const tempUserId = !user ? uuidv4() : null;
      
      // Prepare application data
      const applicationData = {
        user_id: user?.id || null,
        temp_user_id: tempUserId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formattedPostalCode,
        employment_status: formData.employmentStatus,
        employer_name: formData.employerName,
        occupation: formData.occupation,
        employment_duration: formData.employmentDuration,
        annual_income: Number(formData.annualIncome.replace(/[^0-9.-]+/g, '')),
        monthly_income: Number(formData.monthlyIncome.replace(/[^0-9.-]+/g, '')),
        other_income: Number(formData.otherIncome.replace(/[^0-9.-]+/g, '')),
        credit_score: numericalCreditScore,
        vehicle_type: formData.vehicleType,
        desired_monthly_payment: monthlyPayment,
        loan_amount_min: loanRange.min,
        loan_amount_max: loanRange.max,
        interest_rate: loanRange.rate,
        loan_term: 60,
        housing_status: formData.housingStatus,
        housing_payment: Number(formData.housingPayment.replace(/[^0-9.-]+/g, '')),
        residence_duration: formData.residenceDuration,
        collects_government_benefits: formData.collectsGovernmentBenefits,
        disability_programs: formData.disabilityPrograms,
        has_debt_discharge_history: formData.hasDebtDischargeHistory,
        debt_discharge_type: formData.debtDischargeType || null,
        debt_discharge_year: formData.debtDischargeYear ? Number(formData.debtDischargeYear) : null,
        debt_discharge_status: formData.debtDischargeStatus || null,
        debt_discharge_comments: formData.debtDischargeComments || null,
        preferred_contact_method: formData.preferredContactMethod,
        consent_soft_check: formData.consentSoftCheck,
        terms_accepted: formData.termsAccepted,
        status: 'submitted',
        current_stage: 1
      };
      
      // Save application to Supabase
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();
        
      if (applicationError) {
        throw applicationError;
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
        
      // Create welcome notification if user is logged in
      if (user) {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Application Submitted',
            message: 'Your application has been submitted successfully. We will review it shortly.',
            read: false
          });
      }
      
      // If user is logged in, redirect to dashboard
      if (user) {
        toast.success('Application submitted successfully!');
        onComplete(application.id);
      } else {
        // If user is not logged in, redirect to create account page
        navigate('/create-account', {
          state: {
            formData,
            applicationId: application.id,
            tempUserId
          }
        });
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setError('An error occurred while submitting your application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative overflow-hidden">
      <div className="absolute inset-0 animated-gradient opacity-30" />
      <div className="absolute inset-0 animated-dots opacity-20" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100"
      >
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={totalSteps} 
        />
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg"
              >
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Step 1: Vehicle Selection */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Select Your Vehicle Type
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    {vehicleTypes.map((vehicle) => (
                      <button
                        key={vehicle.type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, vehicleType: vehicle.type }))}
                        className={`
                          relative overflow-hidden rounded-xl border-2 p-4 transition-all
                          ${formData.vehicleType === vehicle.type
                            ? 'border-[#3BAA75] bg-[#3BAA75]/5'
                            : 'border-gray-200 hover:border-[#3BAA75]/50'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="mb-4">
                            {vehicle.icon}
                          </div>
                          <div className="text-center">
                            <h3 className="font-medium text-gray-900">{vehicle.type}</h3>
                            <p className="text-sm text-gray-500">{vehicle.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Monthly Budget */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Set Your Monthly Budget
                  </h2>
                  <p className="text-center text-gray-600">
                    Drag the slider to set your desired monthly payment amount
                  </p>
                  
                  <div className="mt-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desired Monthly Payment
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="200"
                        max="2000"
                        step="50"
                        value={Number(formData.desiredMonthlyPayment.replace(/[^0-9.-]+/g, '')) || 500}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          desiredMonthlyPayment: e.target.value 
                        }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                      />
                      <div className="mt-2 text-lg font-semibold text-[#3BAA75] text-center">
                        ${Number(formData.desiredMonthlyPayment.replace(/[^0-9.-]+/g, '')) || 500}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#3BAA75]/5 rounded-lg p-6 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <HelpCircle className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">How this helps you</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Setting a monthly budget helps us find the right financing options that fit comfortably within your budget. We'll use this to calculate your pre-qualification amount.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Personal Information */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Personal Information
                    </h2>
                    <p className="text-gray-600">Tell us a bit about yourself</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="John"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Date of Birth
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          max={new Date().toISOString().split('T')[0]}
                          className={inputClasses}
                          required
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        You must be at least 18 years old to apply
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Address Information */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Address Information
                  </h2>
                  <p className="text-center text-gray-600">
                    Please provide your current residential address
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Street Address
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={inputClasses}
                        placeholder="123 Main St"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="Toronto"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Province
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          className={selectClasses}
                          required
                        >
                          <option value="">Select Province</option>
                          <option value="ON">Ontario</option>
                          <option value="BC">British Columbia</option>
                          <option value="AB">Alberta</option>
                          <option value="MB">Manitoba</option>
                          <option value="NB">New Brunswick</option>
                          <option value="NL">Newfoundland and Labrador</option>
                          <option value="NS">Nova Scotia</option>
                          <option value="PE">Prince Edward Island</option>
                          <option value="QC">Quebec</option>
                          <option value="SK">Saskatchewan</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Postal Code
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="A1A 1A1"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Format: A1A 1A1</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Employment & Income */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Employment & Income
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employment Status
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        name="employmentStatus"
                        value={formData.employmentStatus}
                        onChange={handleInputChange}
                        className={selectClasses}
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="employed">Employed</option>
                        <option value="self_employed">Self Employed</option>
                        <option value="unemployed">Unemployed</option>
                      </select>
                    </div>
                  </div>

                  {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {formData.employmentStatus === 'employed' ? 'Employer Name' : 'Business Name'}
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="employerName"
                            value={formData.employerName}
                            onChange={handleInputChange}
                            className={inputClasses}
                            placeholder={formData.employmentStatus === 'employed' ? 'ABC Company' : 'Your Business Name'}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Occupation / Job Title
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Briefcase className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="occupation"
                            value={formData.occupation}
                            onChange={handleInputChange}
                            className={inputClasses}
                            placeholder="Software Developer"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          How Long Have You Been Employed Here?
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Clock className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            name="employmentDuration"
                            value={formData.employmentDuration}
                            onChange={handleInputChange}
                            className={selectClasses}
                            required
                          >
                            <option value="">Select Duration</option>
                            <option value="less_than_6_months">Less than 6 months</option>
                            <option value="6_months_to_1_year">6 months to 1 year</option>
                            <option value="1_to_2_years">1 to 2 years</option>
                            <option value="2_to_5_years">2 to 5 years</option>
                            <option value="more_than_5_years">More than 5 years</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Annual Income
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <CurrencyInput
                          name="annualIncome"
                          value={formData.annualIncome}
                          onValueChange={(value) => handleCurrencyInput(value, 'annualIncome')}
                          prefix="$"
                          groupSeparator=","
                          decimalSeparator="."
                          className={inputClasses}
                          placeholder="60,000"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Monthly Income
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <CurrencyInput
                          name="monthlyIncome"
                          value={formData.monthlyIncome}
                          onValueChange={(value) => handleCurrencyInput(value, 'monthlyIncome')}
                          prefix="$"
                          groupSeparator=","
                          decimalSeparator="."
                          className={`${inputClasses} bg-gray-50`}
                          placeholder="5,000"
                          disabled
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Calculated from annual income</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Other Monthly Income (Optional)
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <CurrencyInput
                        name="otherIncome"
                        value={formData.otherIncome}
                        onValueChange={(value) => handleCurrencyInput(value || '0', 'otherIncome')}
                        prefix="$"
                        groupSeparator=","
                        decimalSeparator="."
                        className={inputClasses}
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Include alimony, child support, rental income, etc.</p>
                  </div>
                </div>
              )}

              {/* Step 6: Housing Information */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Housing Information
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Housing Status
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Home className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        name="housingStatus"
                        value={formData.housingStatus}
                        onChange={handleInputChange}
                        className={selectClasses}
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="own">Own</option>
                        <option value="rent">Rent</option>
                        <option value="live_with_parents">Live with Parents</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monthly Housing Payment
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <CurrencyInput
                        name="housingPayment"
                        value={formData.housingPayment}
                        onValueChange={(value) => handleCurrencyInput(value, 'housingPayment')}
                        prefix="$"
                        groupSeparator=","
                        decimalSeparator="."
                        className={inputClasses}
                        placeholder="1,500"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.housingStatus === 'own' ? 'Mortgage payment' : 
                       formData.housingStatus === 'rent' ? 'Rent payment' : 
                       'Housing contribution'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      How Long at Current Address?
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        name="residenceDuration"
                        value={formData.residenceDuration}
                        onChange={handleInputChange}
                        className={selectClasses}
                        required
                      >
                        <option value="">Select Duration</option>
                        <option value="less_than_6_months">Less than 6 months</option>
                        <option value="6_months_to_1_year">6 months to 1 year</option>
                        <option value="1_to_2_years">1 to 2 years</option>
                        <option value="2_to_5_years">2 to 5 years</option>
                        <option value="more_than_5_years">More than 5 years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Government & Disability Benefits */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Government & Disability Benefits
                  </h2>
                  <p className="text-center text-gray-600">
                    This information helps us better understand your financial situation
                  </p>
                  
                  <div className="bg-[#3BAA75]/5 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Why we ask</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Government benefits are considered stable income sources by many lenders. Sharing this information may improve your approval odds and loan terms.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="collectsGovernmentBenefits"
                      name="collectsGovernmentBenefits"
                      type="checkbox"
                      checked={formData.collectsGovernmentBenefits}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    />
                    <label htmlFor="collectsGovernmentBenefits" className="ml-2 block text-sm text-gray-900">
                      I receive government or disability benefits
                    </label>
                  </div>
                  
                  {formData.collectsGovernmentBenefits && (
                    <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">
                        Select all that apply:
                      </p>
                      
                      {['CPP', 'OAS', 'ODSP', 'Ontario Works', 'Child Benefits', 'Other'].map((program) => (
                        <div key={program} className="flex items-center">
                          <input
                            id={`program-${program}`}
                            type="checkbox"
                            checked={!!(formData.disabilityPrograms as any)?.[program]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                disabilityPrograms: {
                                  ...(prev.disabilityPrograms as any),
                                  [program]: checked
                                }
                              }));
                            }}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor={`program-${program}`} className="ml-2 block text-sm text-gray-900">
                            {program}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-center text-sm text-gray-500 mt-4">
                    This step is optional. Click "Continue" to proceed.
                  </div>
                </div>
              )}

              {/* Step 8: Debt Discharge / Financial Challenges */}
              {currentStep === 8 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Financial History
                  </h2>
                  <p className="text-center text-gray-600">
                    Please share any past financial challenges
                  </p>
                  
                  <div className="bg-[#3BAA75]/5 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Shield className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Why we ask</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Being upfront about past financial challenges helps us match you with the right lenders. Many of our lenders specialize in helping people rebuild their credit after bankruptcy or consumer proposals.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="hasDebtDischargeHistory"
                      name="hasDebtDischargeHistory"
                      type="checkbox"
                      checked={formData.hasDebtDischargeHistory}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    />
                    <label htmlFor="hasDebtDischargeHistory" className="ml-2 block text-sm text-gray-900">
                      I have filed for bankruptcy, consumer proposal, or other debt settlement in the past
                    </label>
                  </div>
                  
                  {formData.hasDebtDischargeHistory && (
                    <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Type
                        </label>
                        <div className="mt-1 relative">
                          <select
                            name="debtDischargeType"
                            value={formData.debtDischargeType}
                            onChange={handleInputChange}
                            className={selectClasses}
                            required={formData.hasDebtDischargeHistory}
                          >
                            <option value="">Select Type</option>
                            <option value="bankruptcy">Bankruptcy</option>
                            <option value="consumer_proposal">Consumer Proposal</option>
                            <option value="informal_settlement">Informal Settlement</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Year
                        </label>
                        <div className="mt-1 relative">
                          <select
                            name="debtDischargeYear"
                            value={formData.debtDischargeYear}
                            onChange={handleInputChange}
                            className={selectClasses}
                            required={formData.hasDebtDischargeHistory}
                          >
                            <option value="">Select Year</option>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                            <option value="older">Earlier than {new Date().getFullYear() - 9}</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <div className="mt-1 relative">
                          <select
                            name="debtDischargeStatus"
                            value={formData.debtDischargeStatus}
                            onChange={handleInputChange}
                            className={selectClasses}
                            required={formData.hasDebtDischargeHistory}
                          >
                            <option value="">Select Status</option>
                            <option value="active">Active / In Progress</option>
                            <option value="discharged">Discharged / Completed</option>
                            <option value="not_sure">Not Sure</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Additional Comments (Optional)
                        </label>
                        <div className="mt-1">
                          <textarea
                            name="debtDischargeComments"
                            value={formData.debtDischargeComments}
                            onChange={handleInputChange}
                            rows={3}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm"
                            placeholder="Any additional details you'd like to share..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center text-sm text-gray-500 mt-4">
                    This step is optional. Click "Continue" to proceed.
                  </div>
                </div>
              )}

              {/* Step 9: Contact Preferences & Consent */}
              {currentStep === 9 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 text-center">
                    Final Details
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Credit Score Range
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        name="creditScore"
                        value={formData.creditScore}
                        onChange={handleInputChange}
                        className={selectClasses}
                        required
                      >
                        <option value="">Select Range</option>
                        <option value="excellent">Excellent (750+)</option>
                        <option value="good">Good (700-749)</option>
                        <option value="fair">Fair (650-699)</option>
                        <option value="poor">Below 650</option>
                        <option value="unknown">I don't know</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Preferred Contact Method
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        name="preferredContactMethod"
                        value={formData.preferredContactMethod}
                        onChange={handleInputChange}
                        className={selectClasses}
                        required
                      >
                        <option value="">Select Preference</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone Call</option>
                        <option value="sms">Text Message (SMS)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <input
                        id="consentSoftCheck"
                        name="consentSoftCheck"
                        type="checkbox"
                        checked={formData.consentSoftCheck}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        required
                      />
                      <label htmlFor="consentSoftCheck" className="ml-2 block text-sm text-gray-900">
                        I consent to a soft credit check (this will not affect my credit score)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="termsAccepted"
                        name="termsAccepted"
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        required
                      />
                      <label htmlFor="termsAccepted" className="ml-2 block text-sm text-gray-900">
                        I agree to the <a href="/terms" className="text-[#3BAA75] hover:underline" target="_blank">Terms of Service</a> and <a href="/privacy" className=\"text-[#3BAA75] hover:underline" target="_blank">Privacy Policy</a>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <motion.button
                type="button"
                onClick={nextStep}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="relative ml-auto flex items-center justify-center px-6 py-2 text-white bg-gradient-to-r from-[#3BAA75] to-[#2D8259] rounded-lg hover:from-[#2D8259] hover:to-[#1F5F3F] transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl"
              >
                <span className="relative z-10 flex items-center font-medium">
                  Continue
                  <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300  ${isHovered ? 'translate-x-1' : ''}`} />
                </span>
                {isHovered && (
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{ filter: "blur(8px)" }}
                  />
                )}
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                disabled={isLoading}
                className="relative ml-auto flex items-center justify-center px-6 py-2 text-white bg-gradient-to-r from-[#3BAA75] to-[#2D8259] rounded-lg hover:from-[#2D8259] hover:to-[#1F5F3F] transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center font-medium">
                  {isLoading ? 'Processing...' : 'Submit Application'}
                  <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                </span>
                {isHovered && (
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{ filter: "blur(8px)" }}
                  />
                )}
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};