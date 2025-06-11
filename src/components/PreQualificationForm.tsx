import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { ProcessingAnimation } from './ProcessingAnimation';
import CurrencyInput from 'react-currency-input-field';
import { 
  User, 
  Mail, 
  Phone, 
  DollarSign, 
  CreditCard, 
  Briefcase, 
  Car, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Home,
  MapPin,
  Building,
  Clock,
  X,
  Check,
  HelpCircle,
  Info
} from 'lucide-react';

interface PreQualificationFormProps {
  onComplete: (applicationId: string, tempUserId: string, formData: any) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGovBenefitsModal, setShowGovBenefitsModal] = useState(false);
  const [showBankruptcyModal, setShowBankruptcyModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
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
    residenceDurationYears: '0',
    residenceDurationMonths: '0',
    
    // Housing Information
    housingStatus: 'rent',
    housingPayment: '',
    
    // Employment Information
    employmentStatus: 'employed',
    employerName: '',
    occupation: '',
    employmentDurationYears: '0',
    employmentDurationMonths: '0',
    annualIncome: '',
    otherIncome: '',
    
    // Government Benefits
    collectsGovernmentBenefits: false,
    governmentBenefitTypes: {
      ontario_works: false,
      odsp: false,
      cpp: false,
      ei: false,
      child_tax_benefit: false,
      other: false
    },
    governmentBenefitOther: '',
    
    // Credit Information
    creditScore: '',
    hasDriverLicense: false,
    
    // Bankruptcy/Consumer Proposal
    hasDebtDischargeHistory: false,
    debtDischargeType: 'bankruptcy',
    debtDischargeStatus: 'active',
    debtDischargeYear: '',
    amountOwed: '',
    trusteeName: '',
    debtDischargeComments: '',
    
    // Vehicle Preferences
    vehicleType: '',
    desiredMonthlyPayment: '',
    downPayment: '0',
    
    // Contact Preferences
    preferredContactMethod: 'email',
    
    // Terms and Consent
    consentSoftCheck: false,
    termsAccepted: false
  });

  // Prefill form with user data if available
  useEffect(() => {
    if (user) {
      // Try to get user's existing application
      const fetchUserApplication = async () => {
        try {
          const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error) {
            console.error('Error fetching user application:', error);
            return;
          }

          if (data) {
            // Prefill form with existing application data
            setFormData({
              firstName: data.first_name || '',
              lastName: data.last_name || '',
              email: data.email || user.email || '',
              phone: data.phone || '',
              dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '',
              address: data.address || '',
              city: data.city || '',
              province: data.province || '',
              postalCode: data.postal_code || '',
              residenceDurationYears: data.residence_duration_years?.toString() || '0',
              residenceDurationMonths: data.residence_duration_months?.toString() || '0',
              housingStatus: data.housing_status || 'rent',
              housingPayment: data.housing_payment?.toString() || '',
              employmentStatus: data.employment_status || 'employed',
              employerName: data.employer_name || '',
              occupation: data.occupation || '',
              employmentDurationYears: data.employment_duration_years?.toString() || '0',
              employmentDurationMonths: data.employment_duration_months?.toString() || '0',
              annualIncome: data.annual_income?.toString() || '',
              otherIncome: data.other_income?.toString() || '',
              collectsGovernmentBenefits: data.collects_government_benefits || false,
              governmentBenefitTypes: data.government_benefit_types || {
                ontario_works: false,
                odsp: false,
                cpp: false,
                ei: false,
                child_tax_benefit: false,
                other: false
              },
              governmentBenefitOther: data.government_benefit_other || '',
              creditScore: data.credit_score?.toString() || '',
              hasDriverLicense: data.has_driver_license || false,
              hasDebtDischargeHistory: data.has_debt_discharge_history || false,
              debtDischargeType: data.debt_discharge_type || 'bankruptcy',
              debtDischargeStatus: data.debt_discharge_status || 'active',
              debtDischargeYear: data.debt_discharge_year?.toString() || '',
              amountOwed: data.amount_owed?.toString() || '',
              trusteeName: data.trustee_name || '',
              debtDischargeComments: data.debt_discharge_comments || '',
              vehicleType: data.vehicle_type || '',
              desiredMonthlyPayment: data.desired_monthly_payment?.toString() || '',
              downPayment: data.down_payment?.toString() || '0',
              preferredContactMethod: data.preferred_contact_method || 'email',
              consentSoftCheck: data.consent_soft_check || false,
              termsAccepted: false
            });
          } else if (user.email) {
            // Just set the email if no application exists
            setFormData(prev => ({
              ...prev,
              email: user.email || ''
            }));
          }
        } catch (error) {
          console.error('Error in fetchUserApplication:', error);
        }
      };

      fetchUserApplication();
    }
  }, [user]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowGovBenefitsModal(false);
        setShowBankruptcyModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      if (name.startsWith('governmentBenefitTypes.')) {
        const benefitType = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          governmentBenefitTypes: {
            ...prev.governmentBenefitTypes,
            [benefitType]: checked
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    setError(null);
  };

  const handleCurrencyChange = (value: string | undefined, name: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value || ''
    }));
    setError(null);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: // Vehicle Type
        if (!formData.vehicleType) {
          setError('Please select a vehicle type');
          return false;
        }
        return true;

      case 2: // Monthly Payment
        if (!formData.desiredMonthlyPayment || parseFloat(formData.desiredMonthlyPayment) <= 0) {
          setError('Please enter a valid monthly payment amount');
          return false;
        }
        return true;

      case 3: // Financial Information
        if (!formData.employmentStatus) {
          setError('Please select your employment status');
          return false;
        }
        
        if (formData.employmentStatus !== 'unemployed' && !formData.employerName) {
          setError('Please enter your employer name');
          return false;
        }
        
        if (formData.employmentStatus !== 'unemployed' && !formData.occupation) {
          setError('Please enter your occupation');
          return false;
        }
        
        if (!formData.annualIncome || parseFloat(formData.annualIncome) < 0) {
          setError('Please enter a valid annual income');
          return false;
        }
        
        if (!formData.housingStatus) {
          setError('Please select your housing status');
          return false;
        }
        
        if ((formData.housingStatus === 'rent' || formData.housingStatus === 'own') && 
            (!formData.housingPayment || parseFloat(formData.housingPayment) <= 0)) {
          setError('Please enter a valid housing payment amount');
          return false;
        }
        
        return true;

      case 4: // Government Benefits
        // No validation needed, just checking if they collect benefits
        return true;

      case 5: // Bankruptcy/Consumer Proposal
        // No validation needed, just checking if they have bankruptcy history
        return true;

      case 6: // Personal Information
        if (!formData.firstName) {
          setError('Please enter your first name');
          return false;
        }
        
        if (!formData.lastName) {
          setError('Please enter your last name');
          return false;
        }
        
        if (!formData.email) {
          setError('Please enter your email address');
          return false;
        }
        
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        
        if (!formData.phone) {
          setError('Please enter your phone number');
          return false;
        }
        
        if (!/^\+?1?\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
          setError('Please enter a valid phone number');
          return false;
        }
        
        if (!formData.address) {
          setError('Please enter your address');
          return false;
        }
        
        if (!formData.city) {
          setError('Please enter your city');
          return false;
        }
        
        if (!formData.province) {
          setError('Please select your province');
          return false;
        }
        
        if (!formData.postalCode) {
          setError('Please enter your postal code');
          return false;
        }
        
        if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(formData.postalCode)) {
          setError('Please enter a valid postal code (e.g. A1A 1A1)');
          return false;
        }
        
        return true;

      case 7: // Review & Submit
        if (!formData.consentSoftCheck) {
          setError('Please consent to a soft credit check');
          return false;
        }
        
        if (!formData.termsAccepted) {
          setError('Please accept the terms and conditions');
          return false;
        }
        
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      // Special handling for conditional steps
      if (step === 3 && !formData.collectsGovernmentBenefits) {
        // Skip government benefits step
        setStep(5);
      } else if (step === 4 && !formData.hasDebtDischargeHistory) {
        // Skip bankruptcy step
        setStep(6);
      } else {
        setStep(prev => prev + 1);
      }
      setError(null);
    }
  };

  const handleBack = () => {
    // Special handling for conditional steps
    if (step === 6 && !formData.hasDebtDischargeHistory) {
      // Skip back to government benefits question
      setStep(4);
    } else if (step === 5 && !formData.collectsGovernmentBenefits) {
      // Skip back to financial information
      setStep(3);
    } else {
      setStep(prev => prev - 1);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(step)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Format data for Supabase
      const tempUserId = uuidv4(); // Generate a temporary ID for anonymous users
      
      // Format government benefit types for storage
      const selectedBenefitTypes = Object.entries(formData.governmentBenefitTypes)
        .filter(([_, isSelected]) => isSelected)
        .map(([type]) => type);
      
      const applicationData = {
        // Personal Information
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth || null,
        
        // Address Information
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        residence_duration_years: parseInt(formData.residenceDurationYears) || 0,
        residence_duration_months: parseInt(formData.residenceDurationMonths) || 0,
        
        // Housing Information
        housing_status: formData.housingStatus,
        housing_payment: formData.housingPayment ? parseFloat(formData.housingPayment) : null,
        
        // Employment Information
        employment_status: formData.employmentStatus,
        employer_name: formData.employerName,
        occupation: formData.occupation,
        employment_duration_years: parseInt(formData.employmentDurationYears) || 0,
        employment_duration_months: parseInt(formData.employmentDurationMonths) || 0,
        annual_income: parseFloat(formData.annualIncome.replace(/,/g, '')) || 0,
        monthly_income: (parseFloat(formData.annualIncome.replace(/,/g, '')) || 0) / 12,
        other_income: parseFloat(formData.otherIncome.replace(/,/g, '')) || 0,
        
        // Government Benefits
        collects_government_benefits: formData.collectsGovernmentBenefits,
        government_benefit_types: formData.collectsGovernmentBenefits ? selectedBenefitTypes : null,
        government_benefit_other: formData.governmentBenefitOther || null,
        
        // Credit Information
        credit_score: formData.creditScore ? parseInt(formData.creditScore) : null,
        has_driver_license: formData.hasDriverLicense,
        
        // Bankruptcy/Consumer Proposal
        has_debt_discharge_history: formData.hasDebtDischargeHistory,
        debt_discharge_type: formData.hasDebtDischargeHistory ? formData.debtDischargeType : null,
        debt_discharge_status: formData.hasDebtDischargeHistory ? formData.debtDischargeStatus : null,
        debt_discharge_year: formData.debtDischargeYear ? parseInt(formData.debtDischargeYear) : null,
        amount_owed: formData.amountOwed ? parseFloat(formData.amountOwed.replace(/,/g, '')) : null,
        trustee_name: formData.trusteeName || null,
        debt_discharge_comments: formData.debtDischargeComments || null,
        
        // Vehicle Preferences
        vehicle_type: formData.vehicleType,
        desired_monthly_payment: parseFloat(formData.desiredMonthlyPayment.replace(/,/g, '')) || 0,
        down_payment: parseFloat(formData.downPayment.replace(/,/g, '')) || 0,
        
        // Contact Preferences
        preferred_contact_method: formData.preferredContactMethod,
        
        // Terms and Consent
        consent_soft_check: formData.consentSoftCheck,
        terms_accepted: formData.termsAccepted,
        
        // Calculate loan range based on monthly payment
        loan_amount_min: calculateLoanAmount(parseFloat(formData.desiredMonthlyPayment.replace(/,/g, '')) * 0.8, 5.99, 60),
        loan_amount_max: calculateLoanAmount(parseFloat(formData.desiredMonthlyPayment.replace(/,/g, '')) * 1.2, 5.99, 60),
        interest_rate: 5.99,
        loan_term: 60,
        
        // Set user_id for authenticated users, temp_user_id for anonymous users
        user_id: user?.id || null,
        temp_user_id: user?.id ? null : tempUserId,
        
        // Application status
        status: 'pending_documents',
        current_stage: 1
      };

      // Insert application into Supabase
      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create initial application stage
      await supabase
        .from('application_stages')
        .insert({
          application_id: data.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });

      // Create notification for authenticated users
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

      // Simulate processing time
      setTimeout(() => {
        setIsProcessing(false);
        
        // Navigate to qualification results page
        if (user) {
          // Authenticated users go to dashboard
          navigate('/dashboard');
        } else {
          // Anonymous users go to create account page
          onComplete(data.id, tempUserId, {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            employmentStatus: formData.employmentStatus,
            annualIncome: formData.annualIncome,
            creditScore: formData.creditScore,
            desiredMonthlyPayment: formData.desiredMonthlyPayment
          });
        }
      }, 3000);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setIsProcessing(false);
      setError(error.message || 'An error occurred while submitting your application');
    }
  };

  // Helper function to calculate loan amount from monthly payment
  const calculateLoanAmount = (monthlyPayment: number, interestRate: number, term: number): number => {
    const monthlyRate = interestRate / 1200;
    const numerator = monthlyPayment * (1 - Math.pow(1 + monthlyRate, -term));
    const loanAmount = numerator / monthlyRate;
    return Math.round(loanAmount);
  };

  if (isProcessing) {
    return <ProcessingAnimation />;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Get Pre-Qualified</h2>
          <div className="text-sm text-gray-500">Step {step} of 7</div>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-[#3BAA75] rounded-full transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center"
            >
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* Step 1: Vehicle Type */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">What type of vehicle are you looking for?</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Car', 'SUV', 'Truck', 'Van'].map((type) => (
                  <div
                    key={type}
                    onClick={() => setFormData({ ...formData, vehicleType: type })}
                    className={`
                      cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                      ${formData.vehicleType === type 
                        ? 'border-[#3BAA75] shadow-md transform scale-105' 
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                      <Car className={`h-12 w-12 ${formData.vehicleType === type ? 'text-[#3BAA75]' : 'text-gray-400'}`} />
                    </div>
                    <div className="p-3 text-center">
                      <div className={`font-medium ${formData.vehicleType === type ? 'text-[#3BAA75]' : 'text-gray-700'}`}>
                        {type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Monthly Payment */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">What's your ideal monthly car payment?</h3>
              
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>$100</span>
                  <span>$5,000</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={formData.desiredMonthlyPayment || '500'}
                  onChange={(e) => setFormData({
                    ...formData,
                    desiredMonthlyPayment: e.target.value
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="desiredMonthlyPayment" className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Payment Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <CurrencyInput
                    id="desiredMonthlyPayment"
                    name="desiredMonthlyPayment"
                    value={formData.desiredMonthlyPayment}
                    onValueChange={(value) => handleCurrencyChange(value, 'desiredMonthlyPayment')}
                    prefix="$"
                    placeholder="Enter amount"
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12 text-lg font-medium"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="downPayment" className="block text-sm font-medium text-gray-700 mb-1">
                  Down Payment (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <CurrencyInput
                    id="downPayment"
                    name="downPayment"
                    value={formData.downPayment}
                    onValueChange={(value) => handleCurrencyChange(value || '0', 'downPayment')}
                    prefix="$"
                    placeholder="0"
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Financial Information */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">Financial Information</h3>
              
              <div className="mb-6">
                <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="employmentStatus"
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-Employed</option>
                    <option value="student">Student</option>
                    <option value="retired">Retired</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                </div>
              </div>

              {formData.employmentStatus !== 'unemployed' && (
                <>
                  <div className="mb-6">
                    <label htmlFor="employerName" className="block text-sm font-medium text-gray-700 mb-1">
                      Employer Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="employerName"
                        name="employerName"
                        value={formData.employerName}
                        onChange={handleChange}
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                      Occupation
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="occupation"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleChange}
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Job Title"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time at Current Job
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Clock className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            id="employmentDurationYears"
                            name="employmentDurationYears"
                            value={formData.employmentDurationYears}
                            onChange={handleChange}
                            className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            {[...Array(21).keys()].map(i => (
                              <option key={i} value={i}>{i} {i === 1 ? 'Year' : 'Years'}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Clock className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            id="employmentDurationMonths"
                            name="employmentDurationMonths"
                            value={formData.employmentDurationMonths}
                            onChange={handleChange}
                            className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            {[...Array(12).keys()].map(i => (
                              <option key={i} value={i}>{i} {i === 1 ? 'Month' : 'Months'}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mb-6">
                <label htmlFor="annualIncome" className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Income
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
                    prefix="$"
                    placeholder="60,000"
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="otherIncome" className="block text-sm font-medium text-gray-700 mb-1">
                  Other Monthly Income (Optional)
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
                    prefix="$"
                    placeholder="0"
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="housingStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Housing Status
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Home className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="housingStatus"
                    name="housingStatus"
                    value={formData.housingStatus}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="own">Own</option>
                    <option value="rent">Rent</option>
                    <option value="live_with_parents">Live with Parents</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {(formData.housingStatus === 'own' || formData.housingStatus === 'rent') && (
                <div className="mb-6">
                  <label htmlFor="housingPayment" className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly {formData.housingStatus === 'own' ? 'Mortgage' : 'Rent'} Payment
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
                      prefix="$"
                      placeholder="1,500"
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time at Current Residence
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="residenceDurationYears"
                        name="residenceDurationYears"
                        value={formData.residenceDurationYears}
                        onChange={handleChange}
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        {[...Array(21).keys()].map(i => (
                          <option key={i} value={i}>{i} {i === 1 ? 'Year' : 'Years'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="residenceDurationMonths"
                        name="residenceDurationMonths"
                        value={formData.residenceDurationMonths}
                        onChange={handleChange}
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        {[...Array(12).keys()].map(i => (
                          <option key={i} value={i}>{i} {i === 1 ? 'Month' : 'Months'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="creditScore" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Credit Score (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="creditScore"
                    name="creditScore"
                    value={formData.creditScore}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="">Select Credit Score Range</option>
                    <option value="800">Excellent (800+)</option>
                    <option value="740">Very Good (740-799)</option>
                    <option value="670">Good (670-739)</option>
                    <option value="580">Fair (580-669)</option>
                    <option value="520">Poor (520-579)</option>
                    <option value="500">Very Poor (Below 520)</option>
                    <option value="0">I don't know</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    id="hasDriverLicense"
                    name="hasDriverLicense"
                    type="checkbox"
                    checked={formData.hasDriverLicense}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="hasDriverLicense" className="ml-2 block text-sm text-gray-700">
                    I have a valid driver's license
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    id="collectsGovernmentBenefits"
                    name="collectsGovernmentBenefits"
                    type="checkbox"
                    checked={formData.collectsGovernmentBenefits}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="collectsGovernmentBenefits" className="ml-2 block text-sm text-gray-700">
                    I currently receive government financial support
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    id="hasDebtDischargeHistory"
                    name="hasDebtDischargeHistory"
                    type="checkbox"
                    checked={formData.hasDebtDischargeHistory}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="hasDebtDischargeHistory" className="ml-2 block text-sm text-gray-700">
                    I have filed for bankruptcy or a consumer proposal
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Government Benefits */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">Government Financial Support</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Please select all government benefits you currently receive. This helps us match you with the right financing options.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="ontario_works"
                    name="governmentBenefitTypes.ontario_works"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.ontario_works}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="ontario_works" className="ml-2 block text-sm text-gray-700">
                    Ontario Works (OW)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="odsp"
                    name="governmentBenefitTypes.odsp"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.odsp}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="odsp" className="ml-2 block text-sm text-gray-700">
                    Ontario Disability Support Program (ODSP)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="cpp"
                    name="governmentBenefitTypes.cpp"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.cpp}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="cpp" className="ml-2 block text-sm text-gray-700">
                    Canada Pension Plan (CPP)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="ei"
                    name="governmentBenefitTypes.ei"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.ei}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="ei" className="ml-2 block text-sm text-gray-700">
                    Employment Insurance (EI)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="child_tax_benefit"
                    name="governmentBenefitTypes.child_tax_benefit"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.child_tax_benefit}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="child_tax_benefit" className="ml-2 block text-sm text-gray-700">
                    Child Tax Benefit
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="other_benefit"
                    name="governmentBenefitTypes.other"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.other}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="other_benefit" className="ml-2 block text-sm text-gray-700">
                    Other
                  </label>
                </div>
                
                {formData.governmentBenefitTypes.other && (
                  <div className="ml-6 mt-2">
                    <input
                      type="text"
                      id="governmentBenefitOther"
                      name="governmentBenefitOther"
                      value={formData.governmentBenefitOther}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Please specify"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 5: Bankruptcy/Consumer Proposal */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">Bankruptcy or Consumer Proposal Information</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    This information helps us find the right financing options for your situation. Many of our lenders work with clients who have had past financial challenges.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="debtDischargeType" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="debtDischargeType"
                  name="debtDischargeType"
                  value={formData.debtDischargeType}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="bankruptcy">Bankruptcy</option>
                  <option value="consumer_proposal">Consumer Proposal</option>
                  <option value="division_1_proposal">Division 1 Proposal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label htmlFor="debtDischargeStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="debtDischargeStatus"
                  name="debtDischargeStatus"
                  value={formData.debtDischargeStatus}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="active">Active</option>
                  <option value="discharged">Discharged</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label htmlFor="debtDischargeYear" className="block text-sm font-medium text-gray-700 mb-1">
                  Year Filed
                </label>
                <select
                  id="debtDischargeYear"
                  name="debtDischargeYear"
                  value={formData.debtDischargeYear}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="">Select Year</option>
                  {[...Array(20)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
              
              <div className="mb-6">
                <label htmlFor="amountOwed" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Owed
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <CurrencyInput
                    id="amountOwed"
                    name="amountOwed"
                    value={formData.amountOwed}
                    onValueChange={(value) => handleCurrencyChange(value, 'amountOwed')}
                    prefix="$"
                    placeholder="Enter amount"
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="trusteeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Trustee Name (Optional)
                </label>
                <input
                  type="text"
                  id="trusteeName"
                  name="trusteeName"
                  value={formData.trusteeName}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="Enter trustee name"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="debtDischargeComments" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="debtDischargeComments"
                  name="debtDischargeComments"
                  value={formData.debtDischargeComments}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="Any additional information about your situation"
                ></textarea>
              </div>
            </motion.div>
          )}

          {/* Step 6: Personal Information */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="John"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Home className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="123 Main St"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Toronto"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="province"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    >
                      <option value="">Select Province</option>
                      <option value="AB">Alberta</option>
                      <option value="BC">British Columbia</option>
                      <option value="MB">Manitoba</option>
                      <option value="NB">New Brunswick</option>
                      <option value="NL">Newfoundland and Labrador</option>
                      <option value="NS">Nova Scotia</option>
                      <option value="ON">Ontario</option>
                      <option value="PE">Prince Edward Island</option>
                      <option value="QC">Quebec</option>
                      <option value="SK">Saskatchewan</option>
                      <option value="NT">Northwest Territories</option>
                      <option value="NU">Nunavut</option>
                      <option value="YT">Yukon</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="A1A 1A1"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Format: A1A 1A1</p>
              </div>

              <div className="mb-6">
                <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Contact Method
                </label>
                <div className="relative">
                  <select
                    id="preferredContactMethod"
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 7: Review & Submit */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-6">Review & Submit</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{formData.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date of Birth</p>
                    <p className="font-medium">{formData.dateOfBirth || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Address Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium">{formData.address}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">City</p>
                    <p className="font-medium">{formData.city}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Province</p>
                    <p className="font-medium">{formData.province}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Postal Code</p>
                    <p className="font-medium">{formData.postalCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Housing Status</p>
                    <p className="font-medium">{formData.housingStatus.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Financial Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Employment Status</p>
                    <p className="font-medium">{formData.employmentStatus.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Annual Income</p>
                    <p className="font-medium">${formData.annualIncome}</p>
                  </div>
                  {formData.employmentStatus !== 'unemployed' && (
                    <>
                      <div>
                        <p className="text-gray-500">Employer</p>
                        <p className="font-medium">{formData.employerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Occupation</p>
                        <p className="font-medium">{formData.occupation}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Vehicle Preferences</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Vehicle Type</p>
                    <p className="font-medium">{formData.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Monthly Payment</p>
                    <p className="font-medium">${formData.desiredMonthlyPayment}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Down Payment</p>
                    <p className="font-medium">${formData.downPayment}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="consentSoftCheck"
                      name="consentSoftCheck"
                      type="checkbox"
                      checked={formData.consentSoftCheck}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="consentSoftCheck" className="font-medium text-gray-700">
                      I consent to a soft credit check
                    </label>
                    <p className="text-gray-500">
                      This will not affect your credit score and helps us provide accurate pre-qualification results.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="termsAccepted"
                      name="termsAccepted"
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="termsAccepted" className="font-medium text-gray-700">
                      I agree to the terms and conditions
                    </label>
                    <p className="text-gray-500">
                      By checking this box, you agree to our{' '}
                      <a href="/terms" className="text-[#3BAA75] hover:text-[#2D8259]" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-[#3BAA75] hover:text-[#2D8259]" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75]"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </button>
          ) : (
            <div></div> // Empty div to maintain layout
          )}

          {step < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#3BAA75] hover:bg-[#2D8259] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75]"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-1" />
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#3BAA75] hover:bg-[#2D8259] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75]"
            >
              Submit Application
              <CheckCircle className="h-5 w-5 ml-1" />
            </button>
          )}
        </div>
      </form>

      {/* Government Benefits Modal */}
      <AnimatePresence>
        {showGovBenefitsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Government Financial Support</h3>
                <button
                  onClick={() => setShowGovBenefitsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <input
                    id="modal_ontario_works"
                    name="governmentBenefitTypes.ontario_works"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.ontario_works}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="modal_ontario_works" className="ml-2 block text-sm text-gray-700">
                    Ontario Works (OW)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="modal_odsp"
                    name="governmentBenefitTypes.odsp"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.odsp}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="modal_odsp" className="ml-2 block text-sm text-gray-700">
                    Ontario Disability Support Program (ODSP)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="modal_cpp"
                    name="governmentBenefitTypes.cpp"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.cpp}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="modal_cpp" className="ml-2 block text-sm text-gray-700">
                    Canada Pension Plan (CPP)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="modal_ei"
                    name="governmentBenefitTypes.ei"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.ei}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="modal_ei" className="ml-2 block text-sm text-gray-700">
                    Employment Insurance (EI)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="modal_child_tax_benefit"
                    name="governmentBenefitTypes.child_tax_benefit"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.child_tax_benefit}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="modal_child_tax_benefit" className="ml-2 block text-sm text-gray-700">
                    Child Tax Benefit
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="modal_other_benefit"
                    name="governmentBenefitTypes.other"
                    type="checkbox"
                    checked={formData.governmentBenefitTypes.other}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] border-gray-300 rounded focus:ring-[#3BAA75]"
                  />
                  <label htmlFor="modal_other_benefit" className="ml-2 block text-sm text-gray-700">
                    Other
                  </label>
                </div>
                
                {formData.governmentBenefitTypes.other && (
                  <div className="ml-6 mt-2">
                    <input
                      type="text"
                      id="modal_governmentBenefitOther"
                      name="governmentBenefitOther"
                      value={formData.governmentBenefitOther}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Please specify"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGovBenefitsModal(false)}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bankruptcy Modal */}
      <AnimatePresence>
        {showBankruptcyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Bankruptcy or Consumer Proposal</h3>
                <button
                  onClick={() => setShowBankruptcyModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="modal_debtDischargeType" className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="modal_debtDischargeType"
                    name="debtDischargeType"
                    value={formData.debtDischargeType}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="bankruptcy">Bankruptcy</option>
                    <option value="consumer_proposal">Consumer Proposal</option>
                    <option value="division_1_proposal">Division 1 Proposal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="modal_debtDischargeStatus" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="modal_debtDischargeStatus"
                    name="debtDischargeStatus"
                    value={formData.debtDischargeStatus}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="active">Active</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="modal_debtDischargeYear" className="block text-sm font-medium text-gray-700 mb-1">
                    Year Filed
                  </label>
                  <select
                    id="modal_debtDischargeYear"
                    name="debtDischargeYear"
                    value={formData.debtDischargeYear}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="">Select Year</option>
                    {[...Array(20)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="modal_amountOwed" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Owed
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <CurrencyInput
                      id="modal_amountOwed"
                      name="amountOwed"
                      value={formData.amountOwed}
                      onValueChange={(value) => handleCurrencyChange(value, 'amountOwed')}
                      prefix="$"
                      placeholder="Enter amount"
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="modal_trusteeName" className="block text-sm font-medium text-gray-700 mb-1">
                    Trustee Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="modal_trusteeName"
                    name="trusteeName"
                    value={formData.trusteeName}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="Enter trustee name"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowBankruptcyModal(false)}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};