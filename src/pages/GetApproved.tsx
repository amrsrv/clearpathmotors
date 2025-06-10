import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, 
  DollarSign, 
  Building, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Briefcase, 
  Calculator, 
  Calendar, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  Home, 
  Clock, 
  FileText, 
  HelpCircle, 
  Users, 
  Heart, 
  Accessibility, 
  BellRing, 
  Shield, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import CurrencyInput from 'react-currency-input-field';
import { ProgressBar } from '../components/ProgressBar';
import { vehicles } from './Vehicles';
import { supabase } from '../lib/supabaseClient';
import { ProcessingAnimation } from '../components/ProcessingAnimation';

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

const GetApproved = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    maritalStatus: '',
    dependents: '',
    
    // Address Information
    address: '',
    city: '',
    province: '',
    postalCode: '',
    housingStatus: '',
    housingPayment: '',
    residenceDuration: '',
    
    // Employment Information
    employmentStatus: '',
    employerName: '',
    occupation: '',
    employmentDuration: '',
    annualIncome: '',
    monthlyIncome: '',
    otherIncome: '',
    
    // Financial Information
    creditScore: '',
    desiredMonthlyPayment: '',
    desiredLoanAmount: '',
    downPaymentAmount: '',
    hasDriverLicense: false,
    collectsGovernmentBenefits: false,
    disabilityPrograms: '',
    
    // Debt History
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: '',
    debtDischargeStatus: '',
    debtDischargeComments: '',
    
    // Preferences
    preferredContactMethod: 'email',
    consentSoftCheck: false,
    termsAccepted: false
  });

  // Expanded sections for collapsible content
  const [expandedSections, setExpandedSections] = useState({
    governmentBenefits: false,
    debtHistory: false
  });

  useEffect(() => {
    if (formData.annualIncome) {
      const annual = Number(formData.annualIncome.replace(/[^0-9.-]+/g, ''));
      const monthly = Math.round(annual / 12);
      setFormData(prev => ({
        ...prev,
        monthlyIncome: monthly.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!validateForm()) return;

      setIsLoading(true);
      setIsProcessing(true);
      
      const monthlyPayment = Number(formData.desiredMonthlyPayment.replace(/[^0-9.-]+/g, ''));
      const creditScoreInfo = creditScoreRates[formData.creditScore as keyof typeof creditScoreRates];
      const loanRange = calculateLoanRange(monthlyPayment, creditScoreInfo.rate);

      // Map the credit score string to its numerical value
      const numericalCreditScore = creditScoreMapping[formData.creditScore as keyof typeof creditScoreMapping];

      // Generate a temp user ID for anonymous users
      const tempUserId = crypto.randomUUID();

      // Prepare data for Supabase
      const applicationData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        marital_status: formData.maritalStatus || null,
        dependents: formData.dependents ? parseInt(formData.dependents) : null,
        
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        housing_status: formData.housingStatus || null,
        housing_payment: formData.housingPayment ? Number(formData.housingPayment.replace(/[^0-9.-]+/g, '')) : null,
        residence_duration: formData.residenceDuration || null,
        
        employment_status: formData.employmentStatus,
        employer_name: formData.employerName || null,
        occupation: formData.occupation || null,
        employment_duration: formData.employmentDuration || null,
        annual_income: Number(formData.annualIncome.replace(/[^0-9.-]+/g, '')),
        monthly_income: Number(formData.monthlyIncome.replace(/[^0-9.-]+/g, '')),
        other_income: formData.otherIncome ? Number(formData.otherIncome.replace(/[^0-9.-]+/g, '')) : 0,
        
        credit_score: numericalCreditScore,
        vehicle_type: selectedVehicle,
        desired_monthly_payment: monthlyPayment,
        desired_loan_amount: formData.desiredLoanAmount ? Number(formData.desiredLoanAmount.replace(/[^0-9.-]+/g, '')) : null,
        down_payment_amount: formData.downPaymentAmount ? Number(formData.downPaymentAmount.replace(/[^0-9.-]+/g, '')) : 0,
        loan_amount_min: loanRange.min,
        loan_amount_max: loanRange.max,
        interest_rate: loanRange.rate,
        loan_term: 60,
        
        has_driver_license: formData.hasDriverLicense,
        collects_government_benefits: formData.collectsGovernmentBenefits,
        disability_programs: formData.disabilityPrograms ? JSON.parse(`{"details": "${formData.disabilityPrograms}"}`) : null,
        
        has_debt_discharge_history: formData.hasDebtDischargeHistory,
        debt_discharge_type: formData.debtDischargeType || null,
        debt_discharge_year: formData.debtDischargeYear ? parseInt(formData.debtDischargeYear) : null,
        debt_discharge_status: formData.debtDischargeStatus || null,
        debt_discharge_comments: formData.debtDischargeComments || null,
        
        preferred_contact_method: formData.preferredContactMethod,
        consent_soft_check: formData.consentSoftCheck,
        terms_accepted: formData.termsAccepted,
        
        status: 'submitted',
        current_stage: 1,
        temp_user_id: tempUserId
      };

      // Save application with temp user ID and numerical credit score
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (applicationError) throw applicationError;

      // Create initial application stage
      await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });

      // Simulate processing time
      setTimeout(() => {
        setIsProcessing(false);
        
        // Redirect to qualification results page
        navigate('/qualification-results', {
          state: {
            loanRange,
            vehicleType: selectedVehicle,
            monthlyBudget: monthlyPayment,
            originalFormData: formData,
            applicationId: application.id,
            tempUserId,
            fromApproval: true
          }
        });
      }, 3500);

    } catch (error: any) {
      console.error('Error processing application:', error);
      setError('An error occurred while processing your application. Please try again.');
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    // Step 1: Vehicle Selection
    if (currentStep === 1 && !selectedVehicle) {
      setError('Please select a vehicle type');
      return false;
    }

    // Step 2: Personal Information
    if (currentStep === 2) {
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
      
      if (!formData.maritalStatus) {
        setError('Please select your marital status');
        return false;
      }
    }

    // Step 3: Address Information
    if (currentStep === 3) {
      if (!formData.address || !formData.city || !formData.province || !formData.postalCode) {
        setError('Please fill in all required address fields');
        return false;
      }
      
      if (!formData.housingStatus) {
        setError('Please select your housing status');
        return false;
      }
      
      if ((formData.housingStatus === 'own' || formData.housingStatus === 'rent') && !formData.housingPayment) {
        setError('Please enter your monthly housing payment');
        return false;
      }
      
      if (!formData.residenceDuration) {
        setError('Please select how long you have lived at your current address');
        return false;
      }
    }

    // Step 4: Employment Information
    if (currentStep === 4) {
      if (!formData.employmentStatus) {
        setError('Please select your employment status');
        return false;
      }
      
      if (formData.employmentStatus !== 'unemployed') {
        if (!formData.employerName) {
          setError('Please enter your employer name');
          return false;
        }
        
        if (!formData.occupation) {
          setError('Please enter your occupation');
          return false;
        }
        
        if (!formData.employmentDuration) {
          setError('Please select your employment duration');
          return false;
        }
      }
      
      if (!formData.annualIncome) {
        setError('Please enter your annual income');
        return false;
      }
    }

    // Step 5: Financial Information
    if (currentStep === 5) {
      if (!formData.creditScore) {
        setError('Please select your credit score range');
        return false;
      }
      
      if (!formData.desiredMonthlyPayment) {
        setError('Please enter your desired monthly payment');
        return false;
      }
      
      if (formData.hasDebtDischargeHistory) {
        if (!formData.debtDischargeType) {
          setError('Please select your debt discharge type');
          return false;
        }
        
        if (!formData.debtDischargeYear) {
          setError('Please enter the year of your debt discharge');
          return false;
        }
        
        if (!formData.debtDischargeStatus) {
          setError('Please select your debt discharge status');
          return false;
        }
      }
    }

    // Step 6: Preferences & Consent
    if (currentStep === 6) {
      if (!formData.preferredContactMethod) {
        setError('Please select your preferred contact method');
        return false;
      }
      
      if (!formData.consentSoftCheck) {
        setError('You must consent to a soft credit check to proceed');
        return false;
      }
      
      if (!formData.termsAccepted) {
        setError('You must accept the terms and conditions to proceed');
        return false;
      }
    }

    setError('');
    return true;
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
  };

  const nextStep = () => {
    if (validateForm()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  if (isProcessing) {
    return <ProcessingAnimation onComplete={() => setIsProcessing(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Pre-Qualified Today
          </h1>
          <p className="text-xl text-gray-600">
            Quick approval process with rates from 4.99%
          </p>
        </motion.div>
        
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={6} 
          labels={['Vehicle', 'Personal Info', 'Address', 'Employment', 'Financial', 'Consent']}
          onStepClick={(step) => {
            // Only allow going back to previous steps
            if (step < currentStep) {
              setCurrentStep(step);
              window.scrollTo(0, 0);
            }
          }}
        />
        
        <div className="w-full flex">
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 animated-gradient opacity-30" />
            <div className="absolute inset-0 animated-dots opacity-20" />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100"
            >
              <form onSubmit={handleSubmit} className="space-y-8">
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
                          {vehicles.map((vehicle) => (
                            <button
                              key={vehicle.type}
                              type="button"
                              onClick={() => setSelectedVehicle(vehicle.type)}
                              className={`
                                relative overflow-hidden rounded-xl border-2 p-4 transition-all
                                ${selectedVehicle === vehicle.type
                                  ? 'border-[#3BAA75] bg-[#3BAA75]/5'
                                  : 'border-gray-200 hover:border-[#3BAA75]/50'
                                }
                              `}
                            >
                              <div className="aspect-square mb-4 rounded-lg overflow-hidden">
                                <img
                                  src={vehicle.image}
                                  alt={vehicle.type}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="text-center">
                                <h3 className="font-medium text-gray-900">{vehicle.type}</h3>
                                <p className="text-sm text-gray-500">{vehicle.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Personal Information */}
                    {currentStep === 2 && (
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

                          <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Marital Status
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                              {['single', 'married', 'divorced', 'widowed', 'separated', 'other'].map((status) => (
                                <div 
                                  key={status}
                                  className={`
                                    border rounded-lg p-3 text-center cursor-pointer transition-colors
                                    ${formData.maritalStatus === status 
                                      ? 'border-[#3BAA75] bg-[#3BAA75]/5 text-[#3BAA75]' 
                                      : 'border-gray-200 hover:border-[#3BAA75]/50 text-gray-700'
                                    }
                                  `}
                                  onClick={() => setFormData({...formData, maritalStatus: status})}
                                >
                                  <span className="capitalize">{status}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-700">
                                Number of Dependents
                              </label>
                              <span className="text-lg font-medium text-[#3BAA75]">
                                {formData.dependents || '0'}
                              </span>
                            </div>
                            <input
                              type="range"
                              name="dependents"
                              min="0"
                              max="10"
                              value={formData.dependents || '0'}
                              onChange={handleInputChange}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>0</span>
                              <span>5</span>
                              <span>10+</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Address Information */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Address Information
                        </h2>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              className={inputClasses}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className={inputClasses}
                                required
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Province
                            </label>
                            <div className="relative">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Postal Code
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                name="postalCode"
                                value={formData.postalCode}
                                onChange={handleInputChange}
                                className={inputClasses}
                                required
                                placeholder="A1A 1A1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Housing Status
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['own', 'rent', 'live_with_parents', 'other'].map((status) => (
                              <div 
                                key={status}
                                className={`
                                  border rounded-lg p-3 text-center cursor-pointer transition-colors
                                  ${formData.housingStatus === status 
                                    ? 'border-[#3BAA75] bg-[#3BAA75]/5 text-[#3BAA75]' 
                                    : 'border-gray-200 hover:border-[#3BAA75]/50 text-gray-700'
                                  }
                                `}
                                onClick={() => setFormData({...formData, housingStatus: status})}
                              >
                                <Home className="h-5 w-5 mx-auto mb-1" />
                                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {(formData.housingStatus === 'own' || formData.housingStatus === 'rent') && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Monthly Housing Payment
                            </label>
                            <div className="relative">
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
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            How long have you lived at this address?
                          </label>
                          <div className="relative">
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
                              <option value="Less than 1 year">Less than 1 year</option>
                              <option value="1-2 years">1-2 years</option>
                              <option value="2-3 years">2-3 years</option>
                              <option value="3-5 years">3-5 years</option>
                              <option value="5+ years">5+ years</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Employment Information */}
                    {currentStep === 4 && (
                      <div className="space-y-8">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Employment Information
                        </h2>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Employment Status
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { value: 'employed', label: 'Employed' },
                              { value: 'self_employed', label: 'Self Employed' },
                              { value: 'unemployed', label: 'Unemployed' }
                            ].map((status) => (
                              <div 
                                key={status.value}
                                className={`
                                  border rounded-lg p-3 text-center cursor-pointer transition-colors
                                  ${formData.employmentStatus === status.value 
                                    ? 'border-[#3BAA75] bg-[#3BAA75]/5 text-[#3BAA75]' 
                                    : 'border-gray-200 hover:border-[#3BAA75]/50 text-gray-700'
                                  }
                                `}
                                onClick={() => setFormData({...formData, employmentStatus: status.value})}
                              >
                                <Briefcase className="h-5 w-5 mx-auto mb-1" />
                                <span>{status.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {formData.employmentStatus && formData.employmentStatus !== 'unemployed' && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
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
                                    onChange={handleInputChange}
                                    className={inputClasses}
                                    placeholder="Company Name"
                                    required
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Occupation / Job Title
                                </label>
                                <div className="relative">
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
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                How long have you been with this employer?
                              </label>
                              <div className="relative">
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
                                  <option value="Less than 3 months">Less than 3 months</option>
                                  <option value="3-6 months">3-6 months</option>
                                  <option value="6-12 months">6-12 months</option>
                                  <option value="1-2 years">1-2 years</option>
                                  <option value="2-5 years">2-5 years</option>
                                  <option value="5+ years">5+ years</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Annual Income
                            </label>
                            <div className="relative">
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
                                placeholder="45,000"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Monthly Income
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                name="monthlyIncome"
                                value={formData.monthlyIncome}
                                readOnly
                                className={`${inputClasses} bg-gray-50 text-gray-500`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              Other Monthly Income (Optional)
                            </label>
                            <Info
                              className="h-4 w-4 text-gray-400 cursor-help"
                              data-tooltip-id="other-income-tooltip"
                              data-tooltip-content="Include income from sources like child support, alimony, rental properties, etc."
                            />
                            <Tooltip id="other-income-tooltip" />
                          </div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <CurrencyInput
                              name="otherIncome"
                              value={formData.otherIncome}
                              onValueChange={(value) => handleCurrencyInput(value, 'otherIncome')}
                              prefix="$"
                              groupSeparator=","
                              decimalSeparator="."
                              className={inputClasses}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Financial Information */}
                    {currentStep === 5 && (
                      <div className="space-y-8">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Financial Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Credit Score Range
                              </label>
                              <Info
                                className="h-4 w-4 text-gray-400 cursor-help"
                                data-tooltip-id="credit-score-tooltip"
                                data-tooltip-content="Your credit score helps determine your interest rate. Don't worry if it's not perfect - we work with all credit situations!"
                              />
                              <Tooltip id="credit-score-tooltip" />
                            </div>
                            <div className="relative">
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
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Desired Monthly Payment
                              </label>
                              <Info
                                className="h-4 w-4 text-gray-400 cursor-help"
                                data-tooltip-id="payment-tooltip"
                                data-tooltip-content="This helps us find a loan amount that fits your budget. We'll work to get you the best rate possible."
                              />
                              <Tooltip id="payment-tooltip" />
                            </div>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calculator className="h-5 w-5 text-gray-400" />
                              </div>
                              <CurrencyInput
                                name="desiredMonthlyPayment"
                                value={formData.desiredMonthlyPayment}
                                onValueChange={(value) => handleCurrencyInput(value, 'desiredMonthlyPayment')}
                                prefix="$"
                                groupSeparator=","
                                decimalSeparator="."
                                className={inputClasses}
                                placeholder="500"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Desired Loan Amount (Optional)
                              </label>
                              <Info
                                className="h-4 w-4 text-gray-400 cursor-help"
                                data-tooltip-id="loan-amount-tooltip"
                                data-tooltip-content="If you have a specific loan amount in mind, enter it here. Otherwise, we'll calculate based on your monthly payment."
                              />
                              <Tooltip id="loan-amount-tooltip" />
                            </div>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                              </div>
                              <CurrencyInput
                                name="desiredLoanAmount"
                                value={formData.desiredLoanAmount}
                                onValueChange={(value) => handleCurrencyInput(value, 'desiredLoanAmount')}
                                prefix="$"
                                groupSeparator=","
                                decimalSeparator="."
                                className={inputClasses}
                                placeholder="25,000"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Down Payment Amount (Optional)
                              </label>
                              <Info
                                className="h-4 w-4 text-gray-400 cursor-help"
                                data-tooltip-id="down-payment-tooltip"
                                data-tooltip-content="A larger down payment can help secure better rates and lower monthly payments."
                              />
                              <Tooltip id="down-payment-tooltip" />
                            </div>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                              </div>
                              <CurrencyInput
                                name="downPaymentAmount"
                                value={formData.downPaymentAmount}
                                onValueChange={(value) => handleCurrencyInput(value, 'downPaymentAmount')}
                                prefix="$"
                                groupSeparator=","
                                decimalSeparator="."
                                className={inputClasses}
                                placeholder="2,000"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              id="hasDriverLicense"
                              name="hasDriverLicense"
                              type="checkbox"
                              checked={formData.hasDriverLicense}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            />
                            <label htmlFor="hasDriverLicense" className="ml-2 block text-sm text-gray-700">
                              I have a valid driver's license
                            </label>
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
                            <label htmlFor="collectsGovernmentBenefits" className="ml-2 block text-sm text-gray-700">
                              I collect government benefits
                            </label>
                            <button
                              type="button"
                              onClick={() => toggleSection('governmentBenefits')}
                              className="ml-2 text-[#3BAA75]"
                            >
                              {expandedSections.governmentBenefits ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <AnimatePresence>
                            {formData.collectsGovernmentBenefits && expandedSections.governmentBenefits && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-6 pt-2">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Please specify which programs (Optional)
                                    </label>
                                    <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Accessibility className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <textarea
                                        name="disabilityPrograms"
                                        value={formData.disabilityPrograms}
                                        onChange={handleInputChange}
                                        className={`${inputClasses} h-20 py-2`}
                                        placeholder="E.g., ODSP, CPP Disability, etc."
                                      />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex items-center">
                            <input
                              id="hasDebtDischargeHistory"
                              name="hasDebtDischargeHistory"
                              type="checkbox"
                              checked={formData.hasDebtDischargeHistory}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            />
                            <label htmlFor="hasDebtDischargeHistory" className="ml-2 block text-sm text-gray-700">
                              I have a history of bankruptcy, consumer proposal, or debt settlement
                            </label>
                            <button
                              type="button"
                              onClick={() => toggleSection('debtHistory')}
                              className="ml-2 text-[#3BAA75]"
                            >
                              {expandedSections.debtHistory ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <AnimatePresence>
                            {formData.hasDebtDischargeHistory && expandedSections.debtHistory && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-6 pt-2 space-y-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                      {['bankruptcy', 'consumer_proposal', 'informal_settlement', 'other'].map((type) => (
                                        <div 
                                          key={type}
                                          className={`
                                            border rounded-lg p-3 text-center cursor-pointer transition-colors
                                            ${formData.debtDischargeType === type 
                                              ? 'border-[#3BAA75] bg-[#3BAA75]/5 text-[#3BAA75]' 
                                              : 'border-gray-200 hover:border-[#3BAA75]/50 text-gray-700'
                                            }
                                          `}
                                          onClick={() => setFormData({...formData, debtDischargeType: type})}
                                        >
                                          <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Year
                                    </label>
                                    <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <input
                                        type="number"
                                        name="debtDischargeYear"
                                        value={formData.debtDischargeYear}
                                        onChange={handleInputChange}
                                        min="1980"
                                        max={new Date().getFullYear()}
                                        className={inputClasses}
                                        placeholder={new Date().getFullYear().toString()}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Status
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                      {['active', 'discharged', 'not_sure'].map((status) => (
                                        <div 
                                          key={status}
                                          className={`
                                            border rounded-lg p-3 text-center cursor-pointer transition-colors
                                            ${formData.debtDischargeStatus === status 
                                              ? 'border-[#3BAA75] bg-[#3BAA75]/5 text-[#3BAA75]' 
                                              : 'border-gray-200 hover:border-[#3BAA75]/50 text-gray-700'
                                            }
                                          `}
                                          onClick={() => setFormData({...formData, debtDischargeStatus: status})}
                                        >
                                          <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Additional Comments (Optional)
                                    </label>
                                    <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileText className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <textarea
                                        name="debtDischargeComments"
                                        value={formData.debtDischargeComments}
                                        onChange={handleInputChange}
                                        className={`${inputClasses} h-20 py-2`}
                                        placeholder="Any additional details about your situation..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {/* Step 6: Preferences & Consent */}
                    {currentStep === 6 && (
                      <div className="space-y-8">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Preferences & Consent
                        </h2>

                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Preferred Contact Method
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { value: 'email', icon: <Mail className="h-5 w-5 mx-auto mb-1" />, label: 'Email' },
                              { value: 'phone', icon: <Phone className="h-5 w-5 mx-auto mb-1" />, label: 'Phone' },
                              { value: 'sms', icon: <MessageSquare className="h-5 w-5 mx-auto mb-1" />, label: 'SMS' }
                            ].map((method) => (
                              <div 
                                key={method.value}
                                className={`
                                  border rounded-lg p-3 text-center cursor-pointer transition-colors
                                  ${formData.preferredContactMethod === method.value 
                                    ? 'border-[#3BAA75] bg-[#3BAA75]/5 text-[#3BAA75]' 
                                    : 'border-gray-200 hover:border-[#3BAA75]/50 text-gray-700'
                                  }
                                `}
                                onClick={() => setFormData({...formData, preferredContactMethod: method.value})}
                              >
                                {method.icon}
                                <span>{method.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id="consentSoftCheck"
                                name="consentSoftCheck"
                                type="checkbox"
                                checked={formData.consentSoftCheck}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                                required
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor="consentSoftCheck" className="font-medium text-gray-700">
                                Credit Check Consent
                              </label>
                              <p className="text-gray-500">
                                I consent to Clearpath Motors performing a soft credit check, which will not affect my credit score.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id="termsAccepted"
                                name="termsAccepted"
                                type="checkbox"
                                checked={formData.termsAccepted}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                                required
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor="termsAccepted" className="font-medium text-gray-700">
                                Terms & Conditions
                              </label>
                              <p className="text-gray-500">
                                I agree to the <Link to="/terms" className="text-[#3BAA75] hover:underline" target="_blank">Terms of Service</Link> and <Link to="/privacy" className="text-[#3BAA75] hover:underline" target="_blank">Privacy Policy</Link>.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#3BAA75]/5 p-6 rounded-lg border border-[#3BAA75]/20">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <Shield className="h-6 w-6 text-[#3BAA75]" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">Your Information is Secure</h3>
                              <p className="mt-1 text-sm text-gray-600">
                                We use bank-level encryption to protect your personal information. Your data is never sold to third parties and is only used to process your application.
                              </p>
                            </div>
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
                  
                  {currentStep < 6 ? (
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

          {/* Right Column - Image */}
          <div className="hidden lg:block w-1/2 bg-cover bg-center" style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80)'
          }}>
            <div className="h-full w-full bg-gradient-to-br from-[#3BAA75]/90 to-[#2D8259]/90 backdrop-blur-sm flex items-center justify-center p-12">
              <div className="max-w-md text-white">
                <h2 className="text-4xl font-bold mb-6">Get Pre-Qualified Today</h2>
                <p className="text-lg mb-8">Join thousands of satisfied drivers who found their perfect car financing solution with Clearpath Motors.</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <span>95% approval rate</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <span>No impact on credit score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <span>Instant decision</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-16">
        <div className="bg-[#3BAA75]/5 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Create Your Account
              </h2>
              <p className="text-gray-600 mb-6">
                Save your progress and get exclusive benefits:
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>Track your application status</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>Save your information for later</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>Get instant updates on your application</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center md:text-left">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-[#3BAA75] text-white rounded-lg text-lg font-semibold hover:bg-[#2D8259] transition-colors shadow-lg hover:shadow-xl"
              >
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <p className="mt-4 text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-[#3BAA75] hover:text-[#2D8259] font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetApproved;