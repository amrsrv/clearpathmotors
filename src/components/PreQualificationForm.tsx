import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { ProgressBar } from './ProgressBar';
import { ProcessingAnimation } from './ProcessingAnimation';
import { 
  FileText, 
  Cpu, 
  Car, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Home,
  Briefcase,
  DollarSign,
  CreditCard,
  Shield,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PreQualificationFormProps {
  onComplete?: (applicationId: string, tempUserId: string, formData: any) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Vehicle Information
    vehicleType: '',
    desiredLoanAmount: 25000,
    downPaymentAmount: 0,
    
    // Financial Information
    employmentStatus: '',
    annualIncome: '',
    monthlyIncome: '',
    creditScore: 650,
    
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
    
    // Employment Details
    employerName: '',
    occupation: '',
    employmentDurationYears: 0,
    employmentDurationMonths: 0,
    otherIncome: 0,
    
    // Housing Information
    housingStatus: '',
    housingPayment: 0,
    residenceDurationYears: 0,
    residenceDurationMonths: 0,
    
    // Additional Information
    maritalStatus: '',
    dependents: 0,
    hasDriverLicense: true,
    collectsGovernmentBenefits: false,
    governmentBenefitTypes: [],
    governmentBenefitOther: '',
    
    // Debt Discharge History
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: new Date().getFullYear(),
    debtDischargeStatus: '',
    debtDischargeComments: '',
    amountOwed: 0,
    trusteeName: '',
    
    // Contact Preferences
    preferredContactMethod: 'email',
    
    // Consent
    consentSoftCheck: false,
    termsAccepted: false,
    
    // Account Creation (for non-authenticated users)
    password: '',
    confirmPassword: ''
  });

  const totalSteps = 6;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user makes changes
    if (error) {
      setError(null);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1: // Vehicle Information
        if (!formData.vehicleType) return 'Please select a vehicle type';
        if (formData.desiredLoanAmount <= 0) return 'Please enter a valid loan amount';
        return null;
        
      case 2: // Financial Information
        if (!formData.employmentStatus) return 'Please select your employment status';
        if (!formData.annualIncome || parseFloat(formData.annualIncome.toString()) <= 0) 
          return 'Please enter your annual income';
        return null;
        
      case 3: // Personal Information
        if (!formData.firstName) return 'First name is required';
        if (!formData.lastName) return 'Last name is required';
        if (!formData.email) return 'Email is required';
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) 
          return 'Please enter a valid email address';
        if (!formData.phone) return 'Phone number is required';
        if (!/^\+?1?\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) 
          return 'Please enter a valid phone number';
        if (!formData.dateOfBirth) return 'Date of birth is required';
        return null;
        
      case 4: // Address and Employment
        if (!formData.address) return 'Address is required';
        if (!formData.city) return 'City is required';
        if (!formData.province) return 'Province is required';
        if (!formData.postalCode) return 'Postal code is required';
        if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(formData.postalCode)) 
          return 'Please enter a valid postal code';
        
        if (formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') {
          if (!formData.employerName) return 'Employer name is required';
          if (!formData.occupation) return 'Occupation is required';
          if (formData.employmentDurationYears === 0 && formData.employmentDurationMonths === 0) 
            return 'Please enter your employment duration';
        }
        
        if (!formData.housingStatus) return 'Housing status is required';
        if ((formData.housingStatus === 'own' || formData.housingStatus === 'rent') && 
            formData.housingPayment <= 0) 
          return 'Please enter your housing payment';
        return null;
        
      case 5: // Additional Information
        if (!formData.maritalStatus) return 'Marital status is required';
        
        if (formData.hasDebtDischargeHistory) {
          if (!formData.debtDischargeType) return 'Please select a debt discharge type';
          if (!formData.debtDischargeStatus) return 'Please select a debt discharge status';
          if (formData.debtDischargeStatus === 'active' && formData.amountOwed <= 0) 
            return 'Please enter the amount owed';
        }
        
        if (!formData.preferredContactMethod) return 'Please select a preferred contact method';
        return null;
        
      case 6: // Consent and Account
        if (!formData.consentSoftCheck) return 'You must consent to a soft credit check';
        if (!formData.termsAccepted) return 'You must accept the terms and conditions';
        
        // Only validate password fields if user is not logged in
        if (!user) {
          if (!formData.password) return 'Password is required';
          if (formData.password.length < 8) return 'Password must be at least 8 characters';
          if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
        }
        return null;
        
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Generate a temporary user ID for non-authenticated users
      const tempUserId = !user ? uuidv4() : null;
      
      // Calculate loan range based on income and credit score
      const annualIncome = parseFloat(formData.annualIncome.toString());
      const creditScore = formData.creditScore;
      
      // Simple algorithm to determine loan range and interest rate
      let minLoanAmount = Math.round(annualIncome * 0.5);
      let maxLoanAmount = Math.round(annualIncome * 0.8);
      let interestRate = 9.99;
      
      // Adjust based on credit score
      if (creditScore >= 750) {
        maxLoanAmount = Math.round(annualIncome * 1.0);
        interestRate = 4.99;
      } else if (creditScore >= 700) {
        maxLoanAmount = Math.round(annualIncome * 0.9);
        interestRate = 5.99;
      } else if (creditScore >= 650) {
        maxLoanAmount = Math.round(annualIncome * 0.8);
        interestRate = 6.99;
      } else if (creditScore >= 600) {
        maxLoanAmount = Math.round(annualIncome * 0.7);
        interestRate = 7.99;
      } else if (creditScore >= 550) {
        maxLoanAmount = Math.round(annualIncome * 0.6);
        interestRate = 8.99;
      }
      
      // Ensure minimum loan amount is at least $5,000
      minLoanAmount = Math.max(minLoanAmount, 5000);
      
      // Ensure maximum loan amount is at least $10,000
      maxLoanAmount = Math.max(maxLoanAmount, 10000);
      
      // Ensure minimum is less than maximum
      if (minLoanAmount >= maxLoanAmount) {
        minLoanAmount = Math.round(maxLoanAmount * 0.7);
      }
      
      // Calculate monthly payment (simple calculation for 60 months)
      const loanAmount = formData.desiredLoanAmount;
      const monthlyRate = interestRate / 1200;
      const term = 60; // 5 years
      
      const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                            (Math.pow(1 + monthlyRate, term) - 1);
      
      // Prepare application data for Supabase
      const applicationData = {
        user_id: user?.id || null,
        temp_user_id: tempUserId,
        status: 'pending_documents',
        current_stage: 1,
        
        // Vehicle Information
        vehicle_type: formData.vehicleType,
        desired_loan_amount: formData.desiredLoanAmount,
        down_payment_amount: formData.downPaymentAmount,
        
        // Loan Calculation Results
        loan_amount_min: minLoanAmount,
        loan_amount_max: maxLoanAmount,
        interest_rate: interestRate,
        loan_term: term,
        desired_monthly_payment: Math.round(monthlyPayment),
        
        // Financial Information
        employment_status: formData.employmentStatus,
        annual_income: annualIncome,
        monthly_income: annualIncome / 12,
        credit_score: creditScore,
        
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
        
        // Employment Details
        employer_name: formData.employerName,
        occupation: formData.occupation,
        employment_duration_years: formData.employmentDurationYears,
        employment_duration_months: formData.employmentDurationMonths,
        other_income: formData.otherIncome,
        
        // Housing Information
        housing_status: formData.housingStatus,
        housing_payment: formData.housingPayment,
        residence_duration_years: formData.residenceDurationYears,
        residence_duration_months: formData.residenceDurationMonths,
        
        // Additional Information
        marital_status: formData.maritalStatus,
        dependents: formData.dependents,
        has_driver_license: formData.hasDriverLicense,
        collects_government_benefits: formData.collectsGovernmentBenefits,
        government_benefit_types: formData.governmentBenefitTypes.length > 0 ? formData.governmentBenefitTypes : null,
        government_benefit_other: formData.governmentBenefitOther,
        
        // Debt Discharge History
        has_debt_discharge_history: formData.hasDebtDischargeHistory,
        debt_discharge_type: formData.debtDischargeType || null,
        debt_discharge_year: formData.debtDischargeYear || null,
        debt_discharge_status: formData.debtDischargeStatus || null,
        debt_discharge_comments: formData.debtDischargeComments,
        amount_owed: formData.amountOwed,
        trustee_name: formData.trusteeName,
        
        // Contact Preferences
        preferred_contact_method: formData.preferredContactMethod,
        
        // Consent
        consent_soft_check: formData.consentSoftCheck,
        terms_accepted: formData.termsAccepted
      };
      
      // Insert application into Supabase
      const { data: application, error: insertError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Failed to submit application: ${insertError.message}`);
      }
      
      // Create initial application stage
      const { error: stageError } = await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });
      
      if (stageError) {
        console.error('Error creating application stage:', stageError);
        // Continue despite stage error
      }
      
      // Create welcome notification for authenticated users
      if (user) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Application Submitted',
            message: 'Your application has been submitted successfully. We will review it shortly.',
            read: false
          });
        
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Continue despite notification error
        }
      }
      
      // Wait a bit to simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete(application.id, tempUserId || '', {
          ...formData,
          applicationId: application.id
        });
      } else {
        // Default behavior if no callback provided
        if (user) {
          // Redirect to dashboard for authenticated users
          navigate('/dashboard');
        } else {
          // Redirect to qualification results for non-authenticated users
          navigate('/qualification-results', {
            state: {
              fromApproval: true,
              applicationId: application.id,
              tempUserId,
              loanRange: {
                min: minLoanAmount,
                max: maxLoanAmount,
                rate: interestRate
              },
              vehicleType: formData.vehicleType,
              monthlyBudget: Math.round(monthlyPayment),
              originalFormData: formData
            }
          });
        }
      }
      
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setError(error.message || 'An error occurred while submitting your application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Car className="w-12 h-12 text-[#3BAA75] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Vehicle Information</h2>
              <p className="text-gray-600">Tell us about the vehicle you're looking for</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type *
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => updateFormData('vehicleType', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                required
              >
                <option value="">Select vehicle type</option>
                <option value="Car">Car</option>
                <option value="SUV">SUV</option>
                <option value="Truck">Truck</option>
                <option value="Van">Van</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desired Loan Amount *
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.desiredLoanAmount}
                  onChange={(e) => updateFormData('desiredLoanAmount', parseFloat(e.target.value) || 0)}
                  className="pl-8 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  min="5000"
                  step="1000"
                  required
                />
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="1000"
                  value={formData.desiredLoanAmount}
                  onChange={(e) => updateFormData('desiredLoanAmount', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$5,000</span>
                  <span>$100,000</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Down Payment Amount
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.downPaymentAmount}
                  onChange={(e) => updateFormData('downPaymentAmount', parseFloat(e.target.value) || 0)}
                  className="pl-8 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  min="0"
                  step="500"
                />
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="w-12 h-12 text-[#3BAA75] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Financial Information</h2>
              <p className="text-gray-600">Tell us about your financial situation</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Status *
              </label>
              <select
                value={formData.employmentStatus}
                onChange={(e) => updateFormData('employmentStatus', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                required
              >
                <option value="">Select employment status</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Income *
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.annualIncome}
                  onChange={(e) => updateFormData('annualIncome', e.target.value)}
                  className="pl-8 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  min="0"
                  step="1000"
                  placeholder="50000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Credit Score
              </label>
              <div className="mt-2">
                <input
                  type="range"
                  min="300"
                  max="900"
                  step="10"
                  value={formData.creditScore}
                  onChange={(e) => updateFormData('creditScore', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">300</span>
                  <span className="text-sm font-medium">{formData.creditScore}</span>
                  <span className="text-xs text-gray-500">900</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Good</span>
                  <span>Excellent</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 text-[#3BAA75] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-gray-600">Tell us about yourself</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                />
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-[#3BAA75] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Address & Employment</h2>
              <p className="text-gray-600">Tell us where you live and work</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                placeholder="123 Main St"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="Toronto"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province *
                </label>
                <select
                  value={formData.province}
                  onChange={(e) => updateFormData('province', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
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
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code *
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => updateFormData('postalCode', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                placeholder="A1A 1A1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Housing Status *
              </label>
              <select
                value={formData.housingStatus}
                onChange={(e) => updateFormData('housingStatus', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                required
              >
                <option value="">Select housing status</option>
                <option value="own">Own</option>
                <option value="rent">Rent</option>
                <option value="live_with_parents">Live with Parents</option>
                <option value="other">Other</option>
              </select>
            </div>

            {(formData.housingStatus === 'own' || formData.housingStatus === 'rent') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly {formData.housingStatus === 'own' ? 'Mortgage' : 'Rent'} Payment *
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.housingPayment}
                    onChange={(e) => updateFormData('housingPayment', parseFloat(e.target.value) || 0)}
                    className="pl-8 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    min="0"
                    step="100"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How long have you lived at your current address? *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Years</label>
                  <input
                    type="number"
                    value={formData.residenceDurationYears}
                    onChange={(e) => updateFormData('residenceDurationYears', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    min="0"
                    max="99"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Months</label>
                  <input
                    type="number"
                    value={formData.residenceDurationMonths}
                    onChange={(e) => updateFormData('residenceDurationMonths', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    min="0"
                    max="11"
                  />
                </div>
              </div>
            </div>

            {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employer Name *
                  </label>
                  <div className="relative mt-1">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      value={formData.employerName}
                      onChange={(e) => updateFormData('employerName', e.target.value)}
                      className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occupation *
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => updateFormData('occupation', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How long have you been with this employer? *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Years</label>
                      <input
                        type="number"
                        value={formData.employmentDurationYears}
                        onChange={(e) => updateFormData('employmentDurationYears', parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        min="0"
                        max="99"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Months</label>
                      <input
                        type="number"
                        value={formData.employmentDurationMonths}
                        onChange={(e) => updateFormData('employmentDurationMonths', parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        min="0"
                        max="11"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 text-[#3BAA75] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Additional Information</h2>
              <p className="text-gray-600">Help us understand your situation better</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marital Status *
              </label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => updateFormData('maritalStatus', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                required
              >
                <option value="">Select marital status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="separated">Separated</option>
                <option value="widowed">Widowed</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Dependents
              </label>
              <input
                type="number"
                value={formData.dependents}
                onChange={(e) => updateFormData('dependents', parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                min="0"
                max="20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasDriverLicense"
                checked={formData.hasDriverLicense}
                onChange={(e) => updateFormData('hasDriverLicense', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
              />
              <label htmlFor="hasDriverLicense" className="text-sm font-medium text-gray-700">
                I have a valid driver's license
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="collectsGovernmentBenefits"
                  checked={formData.collectsGovernmentBenefits}
                  onChange={(e) => updateFormData('collectsGovernmentBenefits', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                />
                <label htmlFor="collectsGovernmentBenefits" className="text-sm font-medium text-gray-700">
                  I collect government benefits
                </label>
              </div>

              {formData.collectsGovernmentBenefits && (
                <div className="ml-6 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select all that apply:
                  </label>
                  {['ontario_works', 'odsp', 'cpp', 'ei', 'child_tax_benefit', 'other'].map((benefit) => (
                    <div key={benefit} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={benefit}
                        checked={formData.governmentBenefitTypes.includes(benefit)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData('governmentBenefitTypes', [...formData.governmentBenefitTypes, benefit]);
                          } else {
                            updateFormData('governmentBenefitTypes', formData.governmentBenefitTypes.filter(b => b !== benefit));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                      />
                      <label htmlFor={benefit} className="text-sm text-gray-700">
                        {benefit === 'ontario_works' ? 'Ontario Works' :
                         benefit === 'odsp' ? 'ODSP' :
                         benefit === 'cpp' ? 'CPP' :
                         benefit === 'ei' ? 'EI' :
                         benefit === 'child_tax_benefit' ? 'Child Tax Benefit' :
                         'Other'}
                      </label>
                    </div>
                  ))}
                  
                  {formData.governmentBenefitTypes.includes('other') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Please specify:
                      </label>
                      <input
                        type="text"
                        value={formData.governmentBenefitOther}
                        onChange={(e) => updateFormData('governmentBenefitOther', e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasDebtDischargeHistory"
                  checked={formData.hasDebtDischargeHistory}
                  onChange={(e) => updateFormData('hasDebtDischargeHistory', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                />
                <label htmlFor="hasDebtDischargeHistory" className="text-sm font-medium text-gray-700">
                  I have a history of bankruptcy, consumer proposal, or debt settlement
                </label>
              </div>

              {formData.hasDebtDischargeHistory && (
                <div className="ml-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.debtDischargeType}
                      onChange={(e) => updateFormData('debtDischargeType', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="bankruptcy">Bankruptcy</option>
                      <option value="consumer_proposal">Consumer Proposal</option>
                      <option value="informal_settlement">Informal Settlement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year *
                    </label>
                    <input
                      type="number"
                      value={formData.debtDischargeYear}
                      onChange={(e) => updateFormData('debtDischargeYear', parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      min="1980"
                      max={new Date().getFullYear()}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.debtDischargeStatus}
                      onChange={(e) => updateFormData('debtDischargeStatus', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      required
                    >
                      <option value="">Select status</option>
                      <option value="active">Active</option>
                      <option value="discharged">Discharged</option>
                      <option value="not_sure">Not Sure</option>
                    </select>
                  </div>

                  {formData.debtDischargeStatus === 'active' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount Still Owed *
                        </label>
                        <div className="relative mt-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">$</span>
                          <input
                            type="number"
                            value={formData.amountOwed}
                            onChange={(e) => updateFormData('amountOwed', parseFloat(e.target.value) || 0)}
                            className="pl-8 w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trustee or Administrator Name
                        </label>
                        <input
                          type="text"
                          value={formData.trusteeName}
                          onChange={(e) => updateFormData('trusteeName', e.target.value)}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Comments
                    </label>
                    <textarea
                      value={formData.debtDischargeComments}
                      onChange={(e) => updateFormData('debtDischargeComments', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Contact Method *
              </label>
              <select
                value={formData.preferredContactMethod}
                onChange={(e) => updateFormData('preferredContactMethod', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                required
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">Text Message (SMS)</option>
              </select>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-[#3BAA75] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Consent & Account</h2>
              <p className="text-gray-600">Final steps to complete your application</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="consentSoftCheck"
                  checked={formData.consentSoftCheck}
                  onChange={(e) => updateFormData('consentSoftCheck', e.target.checked)}
                  className="h-5 w-5 mt-0.5 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                />
                <label htmlFor="consentSoftCheck" className="text-sm text-gray-700">
                  I consent to a soft credit check being performed. This will not affect my credit score and helps determine my pre-qualification options. *
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={(e) => updateFormData('termsAccepted', e.target.checked)}
                  className="h-5 w-5 mt-0.5 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                />
                <label htmlFor="termsAccepted" className="text-sm text-gray-700">
                  I have read and agree to the <a href="/terms" className=\"text-[#3BAA75] hover:underline">Terms of Service</a> and <a href="/privacy" className="text-[#3BAA75] hover:underline">Privacy Policy</a>. I understand that submitting this application does not guarantee loan approval. *
                </label>
              </div>
            </div>

            {!user && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Create Your Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create an account to track your application status and access exclusive features.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      minLength={8}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 8 characters
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• We'll review your application within 24 hours</li>
                <li>• You'll receive a pre-qualification decision via your preferred contact method</li>
                <li>• If pre-qualified, we'll help you find the perfect vehicle</li>
                <li>• Our team will guide you through the final approval process</li>
              </ul>
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          <ProgressBar 
            currentStep={currentStep} 
            totalSteps={totalSteps} 
            onStepClick={(step) => {
              // Only allow going back to previous steps
              if (step < currentStep) {
                setCurrentStep(step);
              }
            }} 
          />

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-700">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
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

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg font-medium hover:bg-[#2D8259] transition-colors flex items-center gap-2 group"
                >
                  Next Step
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg font-medium hover:bg-[#2D8259] transition-colors flex items-center gap-2"
                >
                  Submit Application
                  <CheckCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PreQualificationForm;