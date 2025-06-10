console.log('PreQualificationform is rendering');
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, Calendar, MapPin, Building, Briefcase, DollarSign, 
  Home, Car, CreditCard, FileText, CheckCircle, AlertCircle, ChevronRight,
  ChevronLeft, Info, Heart, Shield, HelpCircle, ArrowRight
} from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import CurrencyInput from 'react-currency-input-field';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
console.log('Initial currentStep:', currentStep); 

// Define government benefit programs
const GOVERNMENT_PROGRAMS = [
  { id: 'ccb', name: 'Canada Child Benefit (CCB)' },
  { id: 'oas', name: 'Old Age Security (OAS)' },
  { id: 'gis', name: 'Guaranteed Income Supplement (GIS)' },
  { id: 'ei', name: 'Employment Insurance (EI)' },
  { id: 'cpp', name: 'Canada Pension Plan (CPP)' },
  { id: 'cwb', name: 'Canada Workers Benefit (CWB)' },
  { id: 'gst', name: 'GST/HST Credit' },
  { id: 'odsp', name: 'Ontario Disability Support Program (ODSP)' },
  { id: 'ow', name: 'Ontario Works' },
  { id: 'vad', name: 'Veterans Affairs Disability Pension' },
  { id: 'other', name: 'Other Disability or Government Program' }
];

// Define form steps
const FORM_STEPS = [
  'Personal Information',
  'Employment & Income',
  'Housing Information',
  'Financing Details',
  'Government Benefits',
  'Financial Challenges',
  'Contact Preferences',
  'Review & Submit'
];

// Input classes for consistent styling
const inputClasses = "appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm";
const selectClasses = "appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm";

interface PreQualificationFormProps {
  onComplete?: (applicationId: string) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    maritalStatus: '',
    dependents: '',
    
    // Employment & Income
    employmentStatus: '',
    employerName: '',
    occupation: '',
    employmentDuration: '',
    monthlyIncome: '',
    otherIncome: '',
    
    // Housing Information
    housingStatus: '',
    housingPayment: '',
    residenceDuration: '',
    
    // Desired Financing Details
    desiredLoanAmount: '',
    vehicleType: '',
    downPaymentAmount: '',
    hasDriverLicense: false,
    
    // Government & Disability Benefits
    collectsGovernmentBenefits: false,
    selectedPrograms: [] as string[],
    programAmounts: {} as Record<string, string>,
    otherProgramName: '',
    
    // Debt Discharge / Financial Challenges
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: '',
    debtDischargeStatus: '',
    debtDischargeComments: '',
    
    // Contact Preferences
    preferredContactMethod: 'email',
    
    // Consent & Agreements
    consentSoftCheck: false,
    termsAccepted: false
  });
  
  // Prefill form with user data if available
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (error) throw error;
          
          if (data) {
            // Prefill form with existing data
            setFormData(prev => ({
              ...prev,
              firstName: data.first_name || '',
              lastName: data.last_name || '',
              email: data.email || user.email || '',
              phone: data.phone || '',
              address: data.address || '',
              city: data.city || '',
              province: data.province || '',
              postalCode: data.postal_code || '',
              employmentStatus: data.employment_status || '',
              monthlyIncome: data.monthly_income ? data.monthly_income.toString() : '',
              vehicleType: data.vehicle_type || ''
            }));
          } else if (user.email) {
            // Just set the email if we have it
            setFormData(prev => ({
              ...prev,
              email: user.email || ''
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    }
  }, [user]);
  
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
    setError('');
  };
  
  const handleProgramSelection = (programId: string, checked: boolean) => {
    setFormData(prev => {
      const updatedPrograms = checked
        ? [...prev.selectedPrograms, programId]
        : prev.selectedPrograms.filter(id => id !== programId);
        
      return {
        ...prev,
        selectedPrograms: updatedPrograms
      };
    });
  };
  
  const handleProgramAmount = (programId: string, value: string | undefined) => {
    setFormData(prev => ({
      ...prev,
      programAmounts: {
        ...prev.programAmounts,
        [programId]: value || ''
      }
    }));
  };
  
  const validateStep = () => {
    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || 
            !formData.email || !formData.phone || !formData.address || 
            !formData.city || !formData.province || !formData.postalCode) {
          setError('Please fill in all required fields');
          return false;
        }
        
        // Validate email format
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        
        // Validate phone format (simple validation)
        if (!/^\+?1?\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
          setError('Please enter a valid phone number');
          return false;
        }
        
        // Validate date of birth (must be at least 18 years old)
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (age < 18 || (age === 18 && monthDiff < 0)) {
          setError('You must be at least 18 years old to apply');
          return false;
        }
        
        // Validate postal code format (Canadian)
        if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(formData.postalCode)) {
          setError('Please enter a valid Canadian postal code (e.g., A1A 1A1)');
          return false;
        }
        break;
        
      case 2: // Employment & Income
        if (!formData.employmentStatus || !formData.occupation || 
            !formData.employmentDuration || !formData.monthlyIncome) {
          setError('Please fill in all required fields');
          return false;
        }
        
        // Validate employer name for employed people
        if (formData.employmentStatus === 'employed' && !formData.employerName) {
          setError('Please provide your employer name');
          return false;
        }
        
        // Validate income is a number
        if (isNaN(Number(formData.monthlyIncome.replace(/[^0-9.-]+/g, '')))) {
          setError('Please enter a valid monthly income amount');
          return false;
        }
        break;
        
      case 3: // Housing Information
        if (!formData.housingStatus || !formData.housingPayment || !formData.residenceDuration) {
          setError('Please fill in all required fields');
          return false;
        }
        
        // Validate housing payment is a number
        if (isNaN(Number(formData.housingPayment.replace(/[^0-9.-]+/g, '')))) {
          setError('Please enter a valid housing payment amount');
          return false;
        }
        break;
        
      case 4: // Desired Financing Details
        if (!formData.desiredLoanAmount || !formData.vehicleType) {
          setError('Please fill in all required fields');
          return false;
        }
        
        // Validate loan amount is a number
        if (isNaN(Number(formData.desiredLoanAmount.replace(/[^0-9.-]+/g, '')))) {
          setError('Please enter a valid loan amount');
          return false;
        }
        
        // Validate down payment is a number if provided
        if (formData.downPaymentAmount && isNaN(Number(formData.downPaymentAmount.replace(/[^0-9.-]+/g, '')))) {
          setError('Please enter a valid down payment amount');
          return false;
        }
        break;
        
      case 5: // Government Benefits
        if (formData.collectsGovernmentBenefits) {
          if (formData.selectedPrograms.length === 0) {
            setError('Please select at least one government program');
            return false;
          }
          
          // Validate all selected programs have amounts
          for (const programId of formData.selectedPrograms) {
            if (!formData.programAmounts[programId]) {
              setError('Please enter monthly amounts for all selected programs');
              return false;
            }
          }
          
          // Validate "Other" program has a name if selected
          if (formData.selectedPrograms.includes('other') && !formData.otherProgramName) {
            setError('Please specify the name of the other program');
            return false;
          }
        }
        break;
        
      case 6: // Financial Challenges
        if (formData.hasDebtDischargeHistory) {
          if (!formData.debtDischargeType || !formData.debtDischargeYear || !formData.debtDischargeStatus) {
            setError('Please fill in all required fields about your debt discharge history');
            return false;
          }
          
          // Validate year is a number between 1900 and current year
          const year = Number(formData.debtDischargeYear);
          if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
            setError('Please enter a valid year for your debt discharge');
            return false;
          }
        }
        break;
        
      case 7: // Contact Preferences
        if (!formData.preferredContactMethod) {
          setError('Please select your preferred contact method');
          return false;
        }
        break;
        
      case 8: // Review & Submit
        if (!formData.consentSoftCheck || !formData.termsAccepted) {
          setError('You must agree to the terms and consent to a soft credit check to proceed');
          return false;
        }
        break;
    }
    
    setError('');
    return true;
  };
  
  const nextStep = () => {
    if (validateStep()) {
      // Skip government benefits step if not collecting benefits
      if (currentStep === 4 && !formData.collectsGovernmentBenefits) {
        setCurrentStep(6);
      }
      // Skip financial challenges step if no debt history
      else if (currentStep === 5 && !formData.hasDebtDischargeHistory) {
        setCurrentStep(7);
      }
      else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };
  
  const prevStep = () => {
    // Handle skipped steps when going back
    if (currentStep === 6 && !formData.collectsGovernmentBenefits) {
      setCurrentStep(4);
    }
    else if (currentStep === 7 && !formData.hasDebtDischargeHistory && formData.collectsGovernmentBenefits) {
      setCurrentStep(5);
    }
    else if (currentStep === 7 && !formData.hasDebtDischargeHistory && !formData.collectsGovernmentBenefits) {
      setCurrentStep(4);
    }
    else {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Format the data for database storage
      const formattedData = {
        // Personal Information
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        marital_status: formData.maritalStatus,
        dependents: formData.dependents ? parseInt(formData.dependents) : null,
        
        // Employment & Income
        employment_status: formData.employmentStatus,
        employer_name: formData.employerName,
        occupation: formData.occupation,
        employment_duration: formData.employmentDuration,
        monthly_income: parseFloat(formData.monthlyIncome.replace(/[^0-9.-]+/g, '')),
        annual_income: parseFloat(formData.monthlyIncome.replace(/[^0-9.-]+/g, '')) * 12,
        other_income: formData.otherIncome ? parseFloat(formData.otherIncome.replace(/[^0-9.-]+/g, '')) : 0,
        
        // Housing Information
        housing_status: formData.housingStatus,
        housing_payment: parseFloat(formData.housingPayment.replace(/[^0-9.-]+/g, '')),
        residence_duration: formData.residenceDuration,
        
        // Desired Financing Details
        desired_loan_amount: parseFloat(formData.desiredLoanAmount.replace(/[^0-9.-]+/g, '')),
        vehicle_type: formData.vehicleType,
        down_payment_amount: formData.downPaymentAmount ? parseFloat(formData.downPaymentAmount.replace(/[^0-9.-]+/g, '')) : 0,
        has_driver_license: formData.hasDriverLicense,
        
        // Government & Disability Benefits
        collects_government_benefits: formData.collectsGovernmentBenefits,
        disability_programs: formData.collectsGovernmentBenefits ? 
          formData.selectedPrograms.map(programId => {
            const program = GOVERNMENT_PROGRAMS.find(p => p.id === programId);
            return {
              id: programId,
              name: program?.name || '',
              name_other: programId === 'other' ? formData.otherProgramName : null,
              amount: parseFloat(formData.programAmounts[programId]?.replace(/[^0-9.-]+/g, '') || '0')
            };
          }) : null,
        
        // Debt Discharge / Financial Challenges
        has_debt_discharge_history: formData.hasDebtDischargeHistory,
        debt_discharge_type: formData.hasDebtDischargeHistory ? formData.debtDischargeType : null,
        debt_discharge_year: formData.hasDebtDischargeHistory && formData.debtDischargeYear ? 
          parseInt(formData.debtDischargeYear) : null,
        debt_discharge_status: formData.hasDebtDischargeHistory ? formData.debtDischargeStatus : null,
        debt_discharge_comments: formData.hasDebtDischargeHistory ? formData.debtDischargeComments : null,
        
        // Contact Preferences
        preferred_contact_method: formData.preferredContactMethod,
        
        // Consent & Agreements
        consent_soft_check: formData.consentSoftCheck,
        terms_accepted: formData.termsAccepted,
        
        // Status and stage
        status: 'pending_documents',
        current_stage: 3, // Set to "Pending Documents" stage
        
        // User ID if authenticated
        user_id: user?.id || null,
        
        // Generate a temp user ID if not authenticated
        temp_user_id: !user?.id ? crypto.randomUUID() : null
      };
      
      // Insert application into database
      const { data, error } = await supabase
        .from('applications')
        .insert(formattedData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Create initial application stage
      await supabase
        .from('application_stages')
        .insert({
          application_id: data.id,
          stage_number: 3, // Pending Documents stage
          status: 'active',
          notes: 'Application submitted successfully. Please upload required documents.'
        });
        
      // Create welcome notification for authenticated users
      if (user?.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Application Submitted Successfully',
            message: 'Your application has been received. Please upload the required documents to proceed with your application.',
            read: false
          });
      }
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete(data.id);
      }
      
      // Show success message
      toast.success('Application submitted successfully!');
      
      // Redirect to appropriate page
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/create-account', {
          state: {
            formData,
            applicationId: data.id,
            tempUserId: formattedData.temp_user_id
          }
        });
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setError(error.message || 'An error occurred while submitting your application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate total steps based on conditional sections
  const totalSteps = 8;
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={totalSteps}
          labels={FORM_STEPS}
        />
      </div>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100">
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
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Personal Information
                    </h2>
                    <p className="text-gray-600">Tell us about yourself</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        First Name*
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
                        Last Name*
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
                        Email*
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
                        Phone Number*
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
                        Date of Birth*
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
                      <p className="text-xs text-gray-500 mt-1">
                        You must be at least 18 years old to apply
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Marital Status
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Heart className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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
                        Address*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        City*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Province*
                      </label>
                      <div className="relative group">
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          className={selectClasses}
                          required
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Postal Code*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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
                  </div>
                </div>
              )}

              {/* Step 2: Employment & Income */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Employment & Income
                    </h2>
                    <p className="text-gray-600">Tell us about your work and income</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Employment Status*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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
                          <option value="retired">Retired</option>
                          <option value="student">Student</option>
                        </select>
                      </div>
                    </div>

                    {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {formData.employmentStatus === 'employed' ? 'Employer Name*' : 'Business Name'}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                          </div>
                          <input
                            type="text"
                            name="employerName"
                            value={formData.employerName}
                            onChange={handleInputChange}
                            className={inputClasses}
                            placeholder={formData.employmentStatus === 'employed' ? 'ABC Company' : 'Your Business Name'}
                            required={formData.employmentStatus === 'employed'}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Occupation / Job Title*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed' 
                          ? 'Employment Duration*' 
                          : 'Duration in Current Status*'}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Monthly Income*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <CurrencyInput
                          name="monthlyIncome"
                          value={formData.monthlyIncome}
                          onValueChange={(value) => handleCurrencyInput(value, 'monthlyIncome')}
                          prefix="$"
                          groupSeparator=","
                          decimalSeparator="."
                          className={inputClasses}
                          placeholder="5,000"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Other Monthly Income
                        </label>
                        <Info
                          className="h-4 w-4 text-gray-400 cursor-help"
                          data-tooltip-id="other-income-tooltip"
                          data-tooltip-content="Include any additional income such as part-time work, investments, rental income, etc."
                        />
                        <Tooltip id="other-income-tooltip" />
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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
                </div>
              )}

              {/* Step 3: Housing Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Housing Information
                    </h2>
                    <p className="text-gray-600">Tell us about your living situation</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Housing Status*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Home className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Monthly Housing Payment*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        How Long at Current Address*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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
                </div>
              )}

              {/* Step 4: Desired Financing Details */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Financing Details
                    </h2>
                    <p className="text-gray-600">Tell us about the vehicle you want to finance</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Desired Loan Amount*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Vehicle Type*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Car className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <select
                          name="vehicleType"
                          value={formData.vehicleType}
                          onChange={handleInputChange}
                          className={selectClasses}
                          required
                        >
                          <option value="">Select Vehicle Type</option>
                          <option value="Car">Car</option>
                          <option value="SUV">SUV</option>
                          <option value="Truck">Truck</option>
                          <option value="Van">Van</option>
                          <option value="Motorcycle">Motorcycle</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Down Payment Amount
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
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

                    <div className="space-y-2">
                      <div className="flex items-center h-full pt-8">
                        <input
                          type="checkbox"
                          id="hasDriverLicense"
                          name="hasDriverLicense"
                          checked={formData.hasDriverLicense}
                          onChange={(e) => setFormData(prev => ({ ...prev, hasDriverLicense: e.target.checked }))}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        />
                        <label htmlFor="hasDriverLicense" className="ml-2 block text-sm text-gray-700">
                          I have a valid driver's license
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="collectsGovernmentBenefits"
                          name="collectsGovernmentBenefits"
                          checked={formData.collectsGovernmentBenefits}
                          onChange={(e) => setFormData(prev => ({ ...prev, collectsGovernmentBenefits: e.target.checked }))}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        />
                        <label htmlFor="collectsGovernmentBenefits" className="ml-2 block text-sm text-gray-700">
                          I collect government or disability benefits
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">
                        If checked, we'll ask for details in the next step
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="hasDebtDischargeHistory"
                          name="hasDebtDischargeHistory"
                          checked={formData.hasDebtDischargeHistory}
                          onChange={(e) => setFormData(prev => ({ ...prev, hasDebtDischargeHistory: e.target.checked }))}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        />
                        <label htmlFor="hasDebtDischargeHistory" className="ml-2 block text-sm text-gray-700">
                          I have a history of bankruptcy, consumer proposal, or debt settlement
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">
                        If checked, we'll ask for details in a later step
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Government & Disability Benefits */}
              {currentStep === 5 && formData.collectsGovernmentBenefits && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Government & Disability Benefits
                    </h2>
                    <p className="text-gray-600">Tell us about the benefits you receive</p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-700">
                          Select all government or disability benefits you receive and enter the monthly amount for each.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          This information helps us better understand your financial situation and may improve your approval odds.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {GOVERNMENT_PROGRAMS.map((program) => (
                      <div key={program.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            id={`program-${program.id}`}
                            checked={formData.selectedPrograms.includes(program.id)}
                            onChange={(e) => handleProgramSelection(program.id, e.target.checked)}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor={`program-${program.id}`} className="ml-2 block text-sm text-gray-700">
                            {program.name}
                          </label>
                        </div>
                        
                        {formData.selectedPrograms.includes(program.id) && (
                          <div className="sm:w-1/3">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                              </div>
                              <CurrencyInput
                                id={`amount-${program.id}`}
                                value={formData.programAmounts[program.id] || ''}
                                onValueChange={(value) => handleProgramAmount(program.id, value)}
                                prefix="$"
                                groupSeparator=","
                                decimalSeparator="."
                                className={inputClasses}
                                placeholder="Monthly Amount"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {formData.selectedPrograms.includes('other') && (
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Please specify the other program:
                        </label>
                        <input
                          type="text"
                          name="otherProgramName"
                          value={formData.otherProgramName}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          placeholder="Program Name"
                          required={formData.selectedPrograms.includes('other')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Debt Discharge / Financial Challenges */}
              {currentStep === 6 && formData.hasDebtDischargeHistory && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Financial Challenges
                    </h2>
                    <p className="text-gray-600">Tell us about your debt discharge history</p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-700">
                          Your honesty helps us find the right financing solution for your situation.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Many of our lenders work with clients who have had financial challenges in the past.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Type of Debt Discharge*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Shield className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Year of Debt Discharge*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
                        <input
                          type="number"
                          name="debtDischargeYear"
                          value={formData.debtDischargeYear}
                          onChange={handleInputChange}
                          min="1900"
                          max={new Date().getFullYear()}
                          className={inputClasses}
                          placeholder={new Date().getFullYear().toString()}
                          required={formData.hasDebtDischargeHistory}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Current Status*
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FileText className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                        </div>
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

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Additional Comments
                      </label>
                      <textarea
                        name="debtDischargeComments"
                        value={formData.debtDischargeComments}
                        onChange={handleInputChange}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Any additional details you'd like to share..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Contact Preferences */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Contact Preferences
                    </h2>
                    <p className="text-gray-600">How would you like us to contact you?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Preferred Contact Method*
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'email', label: 'Email', icon: <Mail className="h-5 w-5" /> },
                          { id: 'phone', label: 'Phone Call', icon: <Phone className="h-5 w-5" /> },
                          { id: 'sms', label: 'Text Message (SMS)', icon: <MessageSquare className="h-5 w-5" /> }
                        ].map((method) => (
                          <div
                            key={method.id}
                            className={`
                              border-2 rounded-lg p-4 cursor-pointer transition-colors
                              ${formData.preferredContactMethod === method.id
                                ? 'border-[#3BAA75] bg-[#3BAA75]/5'
                                : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
                              }
                            `}
                            onClick={() => setFormData(prev => ({ ...prev, preferredContactMethod: method.id }))}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                id={`contact-${method.id}`}
                                name="preferredContactMethod"
                                value={method.id}
                                checked={formData.preferredContactMethod === method.id}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                              />
                              <label htmlFor={`contact-${method.id}`} className="ml-3 flex items-center cursor-pointer">
                                <span className="mr-2 text-[#3BAA75]">{method.icon}</span>
                                <span>{method.label}</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        We respect your privacy and will only contact you regarding your application. 
                        You can update your contact preferences at any time from your account settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Review & Submit */}
              {currentStep === 8 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Review & Submit
                    </h2>
                    <p className="text-gray-600">Please review your information before submitting</p>
                  </div>

                  <div className="space-y-6">
                    {/* Personal Information Summary */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <User className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Name:</span>
                          <span className="ml-2 text-gray-900">{formData.firstName} {formData.lastName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 text-gray-900">{formData.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2 text-gray-900">{formData.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date of Birth:</span>
                          <span className="ml-2 text-gray-900">{formData.dateOfBirth}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Address:</span>
                          <span className="ml-2 text-gray-900">
                            {formData.address}, {formData.city}, {formData.province} {formData.postalCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Employment & Income Summary */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Briefcase className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Employment & Income
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className="ml-2 text-gray-900">
                            {formData.employmentStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        {formData.employerName && (
                          <div>
                            <span className="text-gray-500">Employer:</span>
                            <span className="ml-2 text-gray-900">{formData.employerName}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Occupation:</span>
                          <span className="ml-2 text-gray-900">{formData.occupation}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-2 text-gray-900">
                            {formData.employmentDuration?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Monthly Income:</span>
                          <span className="ml-2 text-gray-900">{formData.monthlyIncome}</span>
                        </div>
                        {formData.otherIncome && (
                          <div>
                            <span className="text-gray-500">Other Income:</span>
                            <span className="ml-2 text-gray-900">{formData.otherIncome}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Housing Summary */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Home className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Housing Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className="ml-2 text-gray-900">
                            {formData.housingStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Monthly Payment:</span>
                          <span className="ml-2 text-gray-900">{formData.housingPayment}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration at Address:</span>
                          <span className="ml-2 text-gray-900">
                            {formData.residenceDuration?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financing Details Summary */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Car className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Financing Details
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Loan Amount:</span>
                          <span className="ml-2 text-gray-900">{formData.desiredLoanAmount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Vehicle Type:</span>
                          <span className="ml-2 text-gray-900">{formData.vehicleType}</span>
                        </div>
                        {formData.downPaymentAmount && (
                          <div>
                            <span className="text-gray-500">Down Payment:</span>
                            <span className="ml-2 text-gray-900">{formData.downPaymentAmount}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Driver's License:</span>
                          <span className="ml-2 text-gray-900">{formData.hasDriverLicense ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Government Benefits Summary (if applicable) */}
                    {formData.collectsGovernmentBenefits && formData.selectedPrograms.length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                          Government Benefits
                        </h3>
                        <div className="space-y-2 text-sm">
                          {formData.selectedPrograms.map(programId => {
                            const program = GOVERNMENT_PROGRAMS.find(p => p.id === programId);
                            return (
                              <div key={programId} className="flex justify-between">
                                <span className="text-gray-700">
                                  {programId === 'other' ? formData.otherProgramName : program?.name}:
                                </span>
                                <span className="font-medium">{formData.programAmounts[programId]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Debt Discharge Summary (if applicable) */}
                    {formData.hasDebtDischargeHistory && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-amber-50">
                        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                          Financial Challenges
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-700">Type:</span>
                            <span className="ml-2 text-gray-900">
                              {formData.debtDischargeType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-700">Year:</span>
                            <span className="ml-2 text-gray-900">{formData.debtDischargeYear}</span>
                          </div>
                          <div>
                            <span className="text-gray-700">Status:</span>
                            <span className="ml-2 text-gray-900">
                              {formData.debtDischargeStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          {formData.debtDischargeComments && (
                            <div className="col-span-2">
                              <span className="text-gray-700">Comments:</span>
                              <span className="ml-2 text-gray-900">{formData.debtDischargeComments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Preferences Summary */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Phone className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Contact Preferences
                      </h3>
                      <div className="text-sm">
                        <span className="text-gray-500">Preferred Method:</span>
                        <span className="ml-2 text-gray-900">
                          {formData.preferredContactMethod === 'email' ? 'Email' : 
                           formData.preferredContactMethod === 'phone' ? 'Phone Call' : 'Text Message (SMS)'}
                        </span>
                      </div>
                    </div>

                    {/* Consent & Agreements */}
                    <div className="space-y-4 pt-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="consentSoftCheck"
                            name="consentSoftCheck"
                            type="checkbox"
                            checked={formData.consentSoftCheck}
                            onChange={(e) => setFormData(prev => ({ ...prev, consentSoftCheck: e.target.checked }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="consentSoftCheck" className="font-medium text-gray-700">
                            Consent to Soft Credit Check
                          </label>
                          <p className="text-gray-500">
                            I authorize Clearpath Motors to perform a soft credit check, which will not affect my credit score,
                            to determine my pre-qualification status.
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
                            onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="termsAccepted" className="font-medium text-gray-700">
                            Terms & Conditions
                          </label>
                          <p className="text-gray-500">
                            I have read and agree to the <a href="/terms" target="_blank" className="text-[#3BAA75] hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-[#3BAA75] hover:underline">Privacy Policy</a>.
                          </p>
                        </div>
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
                className="flex items-center px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
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
      </div>
    </div>
  );
};