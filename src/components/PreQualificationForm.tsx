import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  Car, 
  Truck, 
  DollarSign, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building, 
  Home, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  Send
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ProgressBar } from './ProgressBar';
import { vehicles } from '../pages/Vehicles';

interface PreQualificationFormProps {
  onComplete: (applicationId: string) => void;
}

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // Vehicle Selection
    vehicleType: '',
    
    // Monthly Budget
    desiredMonthlyPayment: 500,
    
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    dateOfBirth: '',
    
    // Employment & Income
    employmentStatus: 'employed',
    employerName: '',
    occupation: '',
    employmentDuration: '',
    annualIncome: '',
    otherIncome: '',
    
    // Housing Information
    housingStatus: 'rent',
    housingPayment: '',
    residenceDuration: '',
    
    // Government Benefits
    collectsGovernmentBenefits: false,
    disabilityPrograms: [] as string[],
    
    // Debt Discharge
    hasDebtDischargeHistory: false,
    debtDischargeType: 'bankruptcy',
    debtDischargeYear: '',
    debtDischargeStatus: 'discharged',
    debtDischargeComments: '',
    
    // Contact Preferences
    preferredContactMethod: 'email',
    
    // Review & Submit
    hasDriverLicense: false,
    consentSoftCheck: false,
    termsAccepted: false
  });

  const totalSteps = 9;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setFormData(prev => ({ ...prev, [field]: parseInt(e.target.value) }));
  };

  const handleVehicleSelect = (type: string) => {
    setFormData(prev => ({ ...prev, vehicleType: type }));
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    setError(null);
    
    switch (step) {
      case 1: // Vehicle Selection
        if (!formData.vehicleType) {
          setError('Please select a vehicle type');
          return false;
        }
        break;
      case 2: // Monthly Budget
        if (!formData.desiredMonthlyPayment) {
          setError('Please set your desired monthly payment');
          return false;
        }
        break;
      case 3: // Personal Information
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
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
        break;
      case 4: // Employment & Income
        if (!formData.employmentStatus || !formData.annualIncome) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.employmentStatus === 'employed' && (!formData.employerName || !formData.occupation)) {
          setError('Please provide your employer name and occupation');
          return false;
        }
        break;
      case 5: // Housing Information
        if (!formData.housingStatus || !formData.housingPayment) {
          setError('Please fill in all required fields');
          return false;
        }
        break;
      case 8: // Contact Preferences
        if (!formData.preferredContactMethod) {
          setError('Please select a preferred contact method');
          return false;
        }
        break;
      case 9: // Review & Submit
        if (!formData.consentSoftCheck || !formData.termsAccepted) {
          setError('Please agree to the terms and consent to the soft credit check');
          return false;
        }
        break;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate a temporary user ID for anonymous submissions
      const tempUserId = uuidv4();
      
      // Calculate loan amount range based on monthly payment
      const monthlyPayment = formData.desiredMonthlyPayment;
      const interestRate = 5.99; // Default interest rate
      const term = 60; // Default term in months
      
      const monthlyRate = interestRate / 1200;
      const denominator = monthlyRate * Math.pow(1 + monthlyRate, term);
      const numerator = Math.pow(1 + monthlyRate, term) - 1;
      const loanAmount = (monthlyPayment * numerator) / denominator;
      
      // Create application in Supabase
      const { data: application, error: insertError } = await supabase
        .from('applications')
        .insert({
          // Vehicle Selection
          vehicle_type: formData.vehicleType,
          
          // Monthly Budget
          desired_monthly_payment: formData.desiredMonthlyPayment,
          
          // Loan Calculation
          loan_amount_min: Math.round(loanAmount * 0.8),
          loan_amount_max: Math.round(loanAmount * 1.2),
          interest_rate: interestRate,
          loan_term: term,
          
          // Personal Information
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postalCode,
          date_of_birth: formData.dateOfBirth || null,
          
          // Employment & Income
          employment_status: formData.employmentStatus,
          employer_name: formData.employerName,
          occupation: formData.occupation,
          employment_duration: formData.employmentDuration,
          annual_income: parseFloat(formData.annualIncome) || 0,
          other_income: parseFloat(formData.otherIncome) || 0,
          
          // Housing Information
          housing_status: formData.housingStatus,
          housing_payment: parseFloat(formData.housingPayment) || 0,
          residence_duration: formData.residenceDuration,
          
          // Government Benefits
          collects_government_benefits: formData.collectsGovernmentBenefits,
          disability_programs: formData.disabilityPrograms.length > 0 ? formData.disabilityPrograms : null,
          
          // Debt Discharge
          has_debt_discharge_history: formData.hasDebtDischargeHistory,
          debt_discharge_type: formData.hasDebtDischargeHistory ? formData.debtDischargeType : null,
          debt_discharge_year: formData.hasDebtDischargeHistory ? parseInt(formData.debtDischargeYear) || null : null,
          debt_discharge_status: formData.hasDebtDischargeHistory ? formData.debtDischargeStatus : null,
          debt_discharge_comments: formData.hasDebtDischargeHistory ? formData.debtDischargeComments : null,
          
          // Contact Preferences
          preferred_contact_method: formData.preferredContactMethod,
          
          // Other
          has_driver_license: formData.hasDriverLicense,
          consent_soft_check: formData.consentSoftCheck,
          terms_accepted: formData.termsAccepted,
          
          // For anonymous submissions
          temp_user_id: tempUserId,
          
          // Status
          status: 'submitted',
          current_stage: 1
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Create initial application stage
      await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });
      
      // Navigate to account creation page
      navigate('/create-account', { 
        state: { 
          applicationId: application.id,
          tempUserId,
          formData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email
          }
        } 
      });
      
      // Call the onComplete callback
      onComplete(application.id);
      
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setError(error.message || 'An error occurred while submitting your application');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: // Vehicle Selection
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">What type of vehicle are you looking for?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.type}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-all
                    ${formData.vehicleType === vehicle.type 
                      ? 'border-[#3BAA75] bg-[#3BAA75]/5 shadow-md' 
                      : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleVehicleSelect(vehicle.type)}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 rounded-lg mb-3">
                      <img 
                        src={vehicle.image} 
                        alt={vehicle.type} 
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="font-medium text-gray-900">{vehicle.type}</h3>
                    <p className="text-sm text-gray-500">{vehicle.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 2: // Monthly Budget
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">What's your monthly budget?</h2>
            <p className="text-gray-600 mb-6">
              Drag the slider to set your preferred monthly payment amount.
            </p>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-center mb-8">
                <span className="text-4xl font-bold text-[#3BAA75]">
                  ${formData.desiredMonthlyPayment}
                </span>
                <p className="text-gray-500 mt-1">per month</p>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  value={formData.desiredMonthlyPayment}
                  onChange={(e) => handleSliderChange(e, 'desiredMonthlyPayment')}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>$200</span>
                  <span>$2,000</span>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Based on a 60-month term with an interest rate of 5.99%, 
                  a ${formData.desiredMonthlyPayment} monthly payment could finance approximately:
                </p>
                <p className="text-lg font-semibold text-[#3BAA75] mt-2">
                  ${Math.round(formData.desiredMonthlyPayment * 40)} - ${Math.round(formData.desiredMonthlyPayment * 48)}
                </p>
              </div>
            </div>
          </div>
        );
      
      case 3: // Personal Information
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Tell us about yourself</h2>
            
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
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
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
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
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
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
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
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
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
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="A1A 1A1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
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
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 4: // Employment & Income
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Employment & Income</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['employed', 'self_employed', 'unemployed'].map((status) => (
                    <div
                      key={status}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-colors
                        ${formData.employmentStatus === status 
                          ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
                          : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
                        }
                      `}
                      onClick={() => setFormData(prev => ({ ...prev, employmentStatus: status }))}
                    >
                      <div className="flex items-center">
                        <div className="mr-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.employmentStatus === status ? 'border-[#3BAA75]' : 'border-gray-300'
                          }`}>
                            {formData.employmentStatus === status && (
                              <div className="w-3 h-3 rounded-full bg-[#3BAA75]"></div>
                            )}
                          </div>
                        </div>
                        <span className="font-medium">
                          {status === 'employed' ? 'Employed' : 
                           status === 'self_employed' ? 'Self-Employed' : 
                           'Unemployed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.employmentStatus === 'employed' ? 'Employer Name' : 'Business Name'}
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
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Occupation
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
                          className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How long have you been employed?
                      </label>
                      <select
                        name="employmentDuration"
                        value={formData.employmentDuration}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        <option value="">Select Duration</option>
                        <option value="less_than_3_months">Less than 3 months</option>
                        <option value="3_to_6_months">3-6 months</option>
                        <option value="6_to_12_months">6-12 months</option>
                        <option value="1_to_2_years">1-2 years</option>
                        <option value="2_to_5_years">2-5 years</option>
                        <option value="more_than_5_years">More than 5 years</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Income (if any)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="otherIncome"
                      value={formData.otherIncome}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 5: // Housing Information
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Housing Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Housing Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { value: 'own', label: 'Own' },
                    { value: 'rent', label: 'Rent' },
                    { value: 'live_with_parents', label: 'Live with Parents' },
                    { value: 'other', label: 'Other' }
                  ].map((status) => (
                    <div
                      key={status.value}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-colors
                        ${formData.housingStatus === status.value 
                          ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
                          : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
                        }
                      `}
                      onClick={() => setFormData(prev => ({ ...prev, housingStatus: status.value }))}
                    >
                      <div className="flex items-center">
                        <div className="mr-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.housingStatus === status.value ? 'border-[#3BAA75]' : 'border-gray-300'
                          }`}>
                            {formData.housingStatus === status.value && (
                              <div className="w-3 h-3 rounded-full bg-[#3BAA75]"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Home className="h-5 w-5 mr-2 text-gray-500" />
                          <span className="font-medium">{status.label}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Housing Payment <span className="text-red-500">*</span>
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
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How long at current residence?
                  </label>
                  <select
                    name="residenceDuration"
                    value={formData.residenceDuration}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="">Select Duration</option>
                    <option value="less_than_6_months">Less than 6 months</option>
                    <option value="6_to_12_months">6-12 months</option>
                    <option value="1_to_2_years">1-2 years</option>
                    <option value="2_to_5_years">2-5 years</option>
                    <option value="more_than_5_years">More than 5 years</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 6: // Government Benefits
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Government & Disability Benefits</h2>
            <p className="text-gray-600 mb-6">
              If applicable, please provide information about any government benefits you receive.
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="collectsGovernmentBenefits"
                    name="collectsGovernmentBenefits"
                    checked={formData.collectsGovernmentBenefits}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                  />
                  <label htmlFor="collectsGovernmentBenefits" className="ml-2 block text-sm text-gray-900">
                    I receive government or disability benefits
                  </label>
                </div>
              </div>
              
              {formData.collectsGovernmentBenefits && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    Please select all that apply:
                  </p>
                  
                  <div className="space-y-2">
                    {[
                      'ODSP (Ontario Disability Support Program)',
                      'CPP-D (Canada Pension Plan Disability)',
                      'OAS (Old Age Security)',
                      'GIS (Guaranteed Income Supplement)',
                      'Workers Compensation',
                      'Veterans Benefits',
                      'Other Government Assistance'
                    ].map((program) => (
                      <div key={program} className="flex items-center">
                        <input
                          type="checkbox"
                          id={program.replace(/\s+/g, '_').toLowerCase()}
                          name="disabilityPrograms"
                          value={program}
                          checked={formData.disabilityPrograms.includes(program)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                disabilityPrograms: [...prev.disabilityPrograms, program]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                disabilityPrograms: prev.disabilityPrograms.filter(p => p !== program)
                              }));
                            }
                          }}
                          className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                        />
                        <label htmlFor={program.replace(/\s+/g, '_').toLowerCase()} className="ml-2 block text-sm text-gray-900">
                          {program}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      This information helps us find the best financing options for your situation. 
                      Many lenders have special programs for individuals receiving government benefits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 7: // Debt Discharge
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Financial History</h2>
            <p className="text-gray-600 mb-6">
              Please provide information about any past financial challenges. Being honest helps us find the right financing solution for you.
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="hasDebtDischargeHistory"
                    name="hasDebtDischargeHistory"
                    checked={formData.hasDebtDischargeHistory}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                  />
                  <label htmlFor="hasDebtDischargeHistory" className="ml-2 block text-sm text-gray-900">
                    I have previously filed for bankruptcy, consumer proposal, or other debt settlement
                  </label>
                </div>
              </div>
              
              {formData.hasDebtDischargeHistory && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      name="debtDischargeType"
                      value={formData.debtDischargeType}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    >
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
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="YYYY"
                      min="1980"
                      max={new Date().getFullYear()}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="debtDischargeStatus"
                      value={formData.debtDischargeStatus}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    >
                      <option value="active">Active/Ongoing</option>
                      <option value="discharged">Discharged/Completed</option>
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
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      rows={3}
                      placeholder="Any additional details that might help us understand your situation..."
                    />
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Being transparent about your financial history helps us match you with the right lenders. 
                      Many of our lending partners specialize in helping people rebuild their credit after financial challenges.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 8: // Contact Preferences
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Contact Preferences</h2>
            <p className="text-gray-600 mb-6">
              How would you prefer we contact you about your application?
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'email', label: 'Email', icon: <Mail className="h-5 w-5" /> },
                  { value: 'phone', label: 'Phone Call', icon: <Phone className="h-5 w-5" /> },
                  { value: 'sms', label: 'Text Message', icon: <Send className="h-5 w-5" /> }
                ].map((method) => (
                  <div
                    key={method.value}
                    className={`
                      border-2 rounded-lg p-4 cursor-pointer transition-colors
                      ${formData.preferredContactMethod === method.value 
                        ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
                        : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => setFormData(prev => ({ ...prev, preferredContactMethod: method.value }))}
                  >
                    <div className="flex items-center">
                      <div className="mr-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.preferredContactMethod === method.value ? 'border-[#3BAA75]' : 'border-gray-300'
                        }`}>
                          {formData.preferredContactMethod === method.value && (
                            <div className="w-3 h-3 rounded-full bg-[#3BAA75]"></div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-2 text-gray-500">
                          {method.icon}
                        </div>
                        <span className="font-medium">{method.label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      We respect your privacy and will only contact you regarding your application. 
                      You can update your contact preferences at any time.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="hasDriverLicense"
                    name="hasDriverLicense"
                    checked={formData.hasDriverLicense}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                  />
                  <label htmlFor="hasDriverLicense" className="ml-2 block text-sm text-gray-900">
                    I have a valid driver's license
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 9: // Review & Submit
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Review & Submit</h2>
            <p className="text-gray-600 mb-6">
              Please review your information before submitting your application.
            </p>
            
            <div className="bg-gray-50 p-6 rounded-lg space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Vehicle Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vehicle Type:</span>
                      <span className="font-medium">{formData.vehicleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monthly Budget:</span>
                      <span className="font-medium">${formData.desiredMonthlyPayment}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{formData.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Employment Status:</span>
                      <span className="font-medium">
                        {formData.employmentStatus === 'employed' ? 'Employed' : 
                         formData.employmentStatus === 'self_employed' ? 'Self-Employed' : 
                         'Unemployed'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Annual Income:</span>
                      <span className="font-medium">${formData.annualIncome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Housing Status:</span>
                      <span className="font-medium">
                        {formData.housingStatus === 'own' ? 'Own' : 
                         formData.housingStatus === 'rent' ? 'Rent' : 
                         formData.housingStatus === 'live_with_parents' ? 'Live with Parents' : 
                         'Other'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Housing Payment:</span>
                      <span className="font-medium">${formData.housingPayment}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Government Benefits:</span>
                      <span className="font-medium">{formData.collectsGovernmentBenefits ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Debt Discharge History:</span>
                      <span className="font-medium">{formData.hasDebtDischargeHistory ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="consentSoftCheck"
                  name="consentSoftCheck"
                  checked={formData.consentSoftCheck}
                  onChange={handleChange}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                  required
                />
                <label htmlFor="consentSoftCheck" className="ml-2 block text-sm text-gray-900">
                  I consent to a soft credit check (this will not affect my credit score)
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                  required
                />
                <label htmlFor="termsAccepted" className="ml-2 block text-sm text-gray-900">
                  I agree to the <a href="/terms" className="text-[#3BAA75] hover:underline" target="_blank">Terms of Service</a> and <a href="/privacy" className="text-[#3BAA75] hover:underline" target="_blank">Privacy Policy</a>
                </label>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
      <form onSubmit={handleSubmit}>
        {/* Progress Bar */}
        <div className="mb-8">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />
        </div>
        
        {/* Error Message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center"
            >
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className={`px-6 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors ${
              step === 1 ? 'invisible' : ''
            }`}
          >
            <div className="flex items-center">
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </div>
          </button>
          
          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg font-medium hover:bg-[#2D8259] transition-colors"
            >
              <div className="flex items-center">
                Next
                <ChevronRight className="h-5 w-5 ml-1" />
              </div>
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg font-medium hover:bg-[#2D8259] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Submit Application
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </>
                )}
              </div>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};