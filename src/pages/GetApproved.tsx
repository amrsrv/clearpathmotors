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
  Heart
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import CurrencyInput from 'react-currency-input-field';
import { ProgressBar } from '../components/ProgressBar';
import { vehicles } from './Vehicles';
import { supabase } from '../lib/supabaseClient';

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
    
    // Address & Housing
    address: '',
    city: '',
    province: '',
    postalCode: '',
    housingStatus: '',
    housingPayment: '',
    residenceDuration: '',
    
    // Employment & Financial
    employmentStatus: '',
    employerName: '',
    occupation: '',
    employmentDuration: '',
    annualIncome: '',
    monthlyIncome: '',
    otherIncome: '',
    creditScore: '',
    desiredMonthlyPayment: '',
    desiredLoanAmount: '',
    downPaymentAmount: '',
    
    // Additional Information
    hasDriverLicense: false,
    collectsGovernmentBenefits: false,
    disabilityPrograms: '',
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: '',
    debtDischargeStatus: '',
    debtDischargeComments: '',
    
    // Consent
    preferredContactMethod: '',
    consentSoftCheck: false,
    termsAccepted: false
  });

  useEffect(() => {
    if (formData.annualIncome) {
      const monthly = Math.round(Number(formData.annualIncome.replace(/[^0-9.-]+/g, '')) / 12);
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
      
      const monthlyPayment = Number(formData.desiredMonthlyPayment.replace(/[^0-9.-]+/g, ''));
      const creditScoreInfo = creditScoreRates[formData.creditScore as keyof typeof creditScoreRates];
      const loanRange = calculateLoanRange(monthlyPayment, creditScoreInfo.rate);

      // Map the credit score string to its numerical value
      const numericalCreditScore = creditScoreMapping[formData.creditScore as keyof typeof creditScoreMapping];

      // Generate a temp user ID for anonymous users
      const tempUserId = crypto.randomUUID();

      // Prepare application data
      const applicationData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        marital_status: formData.maritalStatus || null,
        dependents: formData.dependents ? Number(formData.dependents) : null,
        
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
        
        has_driver_license: formData.hasDriverLicense,
        collects_government_benefits: formData.collectsGovernmentBenefits,
        disability_programs: formData.collectsGovernmentBenefits && formData.disabilityPrograms ? 
          JSON.stringify({ details: formData.disabilityPrograms }) : null,
        has_debt_discharge_history: formData.hasDebtDischargeHistory,
        debt_discharge_type: formData.hasDebtDischargeHistory ? formData.debtDischargeType : null,
        debt_discharge_year: formData.hasDebtDischargeHistory && formData.debtDischargeYear ? 
          Number(formData.debtDischargeYear) : null,
        debt_discharge_status: formData.hasDebtDischargeHistory ? formData.debtDischargeStatus : null,
        debt_discharge_comments: formData.hasDebtDischargeHistory ? formData.debtDischargeComments : null,
        
        preferred_contact_method: formData.preferredContactMethod || null,
        consent_soft_check: formData.consentSoftCheck,
        terms_accepted: formData.termsAccepted,
        
        loan_amount_min: loanRange.min,
        loan_amount_max: loanRange.max,
        interest_rate: loanRange.rate,
        loan_term: 60,
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

      // Redirect to create account page
      navigate('/create-account', {
        state: {
          formData,
          applicationId: application.id,
          tempUserId
        }
      });

    } catch (error: any) {
      console.error('Error processing application:', error);
      setError('An error occurred while processing your application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (currentStep === 1 && !selectedVehicle) {
      setError('Please select a vehicle type');
      return false;
    }

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
    }

    if (currentStep === 3) {
      if (!formData.address || !formData.city || !formData.province || !formData.postalCode) {
        setError('Please fill in all required address fields');
        return false;
      }
      
      // Canadian postal code validation (A1A 1A1 format)
      const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      if (!postalCodeRegex.test(formData.postalCode)) {
        setError('Please enter a valid Canadian postal code (e.g., A1A 1A1)');
        return false;
      }
      
      if (!formData.housingStatus) {
        setError('Please select your housing status');
        return false;
      }
    }

    if (currentStep === 4) {
      if (!formData.employmentStatus) {
        setError('Please select your employment status');
        return false;
      }
      if (!formData.annualIncome) {
        setError('Please enter your annual income');
        return false;
      }
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
        if (!formData.debtDischargeStatus) {
          setError('Please select your debt discharge status');
          return false;
        }
      }
    }

    if (currentStep === 5) {
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
    }
  };

  const handleSignUp = () => {
    navigate('/signup', {
      state: {
        formData,
        fromGetApproved: true
      }
    });
  };

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
          totalSteps={5} 
          labels={['Vehicle', 'Personal Info', 'Address & Housing', 'Employment & Financial', 'Consent']}
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

                          <div className="space-y-2">
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

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Marital Status
                            </label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                              </div>
                              <select
                                name="maritalStatus"
                                value={formData.maritalStatus}
                                onChange={handleInputChange}
                                className={selectClasses}
                              >
                                <option value="">Select Status</option>
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                                <option value="divorced">Divorced</option>
                                <option value="widowed">Widowed</option>
                                <option value="separated">Separated</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Number of Dependents
                            </label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                              </div>
                              <input
                                type="number"
                                name="dependents"
                                value={formData.dependents}
                                onChange={handleInputChange}
                                min="0"
                                max="20"
                                className={inputClasses}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Preferred Contact Method
                            </label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                              </div>
                              <select
                                name="preferredContactMethod"
                                value={formData.preferredContactMethod}
                                onChange={handleInputChange}
                                className={selectClasses}
                              >
                                <option value="">Select Preferred Method</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                                <option value="sms">SMS</option>
                              </select>
                            </div>
                          </div>

                          <div className="md:col-span-2 flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="hasDriverLicense"
                              name="hasDriverLicense"
                              checked={formData.hasDriverLicense}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            />
                            <label htmlFor="hasDriverLicense" className="text-sm text-gray-700">
                              I have a valid driver's license
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Address & Housing */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Address & Housing Information
                        </h2>
                        
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
                                required
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Province
                            </label>
                            <div className="mt-1 relative">
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
                                required
                                placeholder="A1A 1A1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                placeholder="1,200"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Time at Current Residence
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
                              >
                                <option value="">Select Duration</option>
                                <option value="Less than 1 year">Less than 1 year</option>
                                <option value="1-2 years">1-2 years</option>
                                <option value="3-5 years">3-5 years</option>
                                <option value="5+ years">5+ years</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Employment & Financial */}
                    {currentStep === 4 && (
                      <div className="space-y-8">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Employment & Financial Information
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

                        {formData.employmentStatus && formData.employmentStatus !== 'unemployed' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Employer Name
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
                                  placeholder="Company Name"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Occupation
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
                                  placeholder="Job Title"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Time at Current Job
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
                                >
                                  <option value="">Select Duration</option>
                                  <option value="Less than 3 months">Less than 3 months</option>
                                  <option value="3-12 months">3-12 months</option>
                                  <option value="1-3 years">1-3 years</option>
                                  <option value="3-5 years">3-5 years</option>
                                  <option value="5+ years">5+ years</option>
                                </select>
                              </div>
                            </div>
                          </div>
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
                              <input
                                type="text"
                                name="monthlyIncome"
                                value={formData.monthlyIncome}
                                readOnly
                                className={`${inputClasses} bg-gray-50 text-gray-500`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Other Monthly Income
                            </label>
                            <div className="mt-1 relative">
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
                            <p className="text-xs text-gray-500 mt-1">
                              Include any additional income sources (e.g., alimony, benefits)
                            </p>
                          </div>

                          <div>
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
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
                            <div className="mt-1 relative">
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
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Desired Loan Amount
                            </label>
                            <div className="mt-1 relative">
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

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Down Payment Amount
                            </label>
                            <div className="mt-1 relative">
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
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="collectsGovernmentBenefits"
                              name="collectsGovernmentBenefits"
                              checked={formData.collectsGovernmentBenefits}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            />
                            <label htmlFor="collectsGovernmentBenefits" className="text-sm text-gray-700">
                              I receive government benefits or disability income
                            </label>
                          </div>

                          {formData.collectsGovernmentBenefits && (
                            <div className="ml-7">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Please specify which programs
                              </label>
                              <textarea
                                name="disabilityPrograms"
                                value={formData.disabilityPrograms}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                rows={2}
                                placeholder="e.g., ODSP, CPP Disability, etc."
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="hasDebtDischargeHistory"
                              name="hasDebtDischargeHistory"
                              checked={formData.hasDebtDischargeHistory}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            />
                            <label htmlFor="hasDebtDischargeHistory" className="text-sm text-gray-700">
                              I have a history of bankruptcy, consumer proposal, or debt settlement
                            </label>
                          </div>

                          {formData.hasDebtDischargeHistory && (
                            <div className="ml-7 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                  </label>
                                  <select
                                    name="debtDischargeType"
                                    value={formData.debtDischargeType}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                  >
                                    <option value="">Select Type</option>
                                    <option value="bankruptcy">Bankruptcy</option>
                                    <option value="consumer_proposal">Consumer Proposal</option>
                                    <option value="informal_settlement">Informal Settlement</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Year
                                  </label>
                                  <input
                                    type="number"
                                    name="debtDischargeYear"
                                    value={formData.debtDischargeYear}
                                    onChange={handleInputChange}
                                    min="1980"
                                    max={new Date().getFullYear()}
                                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                    placeholder={new Date().getFullYear().toString()}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Status
                                </label>
                                <select
                                  name="debtDischargeStatus"
                                  value={formData.debtDischargeStatus}
                                  onChange={handleInputChange}
                                  className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                >
                                  <option value="">Select Status</option>
                                  <option value="active">Active</option>
                                  <option value="discharged">Discharged</option>
                                  <option value="not_sure">Not Sure</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Additional Comments
                                </label>
                                <textarea
                                  name="debtDischargeComments"
                                  value={formData.debtDischargeComments}
                                  onChange={handleInputChange}
                                  className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                  rows={2}
                                  placeholder="Any additional details about your situation..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 5: Consent */}
                    {currentStep === 5 && (
                      <div className="space-y-8">
                        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                          Final Steps
                        </h2>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Consent & Terms
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex items-center h-5 mt-1">
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
                              <div>
                                <label htmlFor="consentSoftCheck" className="text-sm font-medium text-gray-700">
                                  Consent to Soft Credit Check
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                  I authorize Clearpath Motors to obtain a soft credit report to determine my pre-qualification status. 
                                  I understand this will not affect my credit score.
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                              <div className="flex items-center h-5 mt-1">
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
                              <div>
                                <label htmlFor="termsAccepted" className="text-sm font-medium text-gray-700">
                                  Terms & Conditions
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                  I agree to the <Link to="/terms" className="text-[#3BAA75] hover:underline" target="_blank">Terms of Service</Link> and 
                                  <Link to="/privacy" className="text-[#3BAA75] hover:underline" target="_blank"> Privacy Policy</Link>. 
                                  I consent to receive communications from Clearpath Motors regarding my application.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-[#3BAA75]/5 p-6 rounded-lg border border-[#3BAA75]/20">
                          <div className="flex items-center gap-3 mb-4">
                            <Shield className="h-5 w-5 text-[#3BAA75]" />
                            <h3 className="text-lg font-medium text-gray-900">
                              Your Information is Secure
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            We use bank-level encryption to protect your personal information. Your data is never sold to third parties and is only used to process your application.
                          </p>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                            <p className="text-sm text-gray-600">
                              Submitting this form will not affect your credit score
                            </p>
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
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  
                  {currentStep < 5 ? (
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
              <motion.button
                onClick={handleSignUp}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex items-center justify-center px-8 py-4 bg-[#3BAA75] text-white rounded-lg text-lg font-semibold hover:bg-[#2D8259] transition-colors shadow-lg hover:shadow-xl"
              >
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
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