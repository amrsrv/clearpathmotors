import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Calendar, CalendarDays, DollarSign, FileText, Home, User, Briefcase, CreditCard, Car, Phone, Mail, MapPin, Shield, CheckCircle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface FormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  maritalStatus: string;
  dependents: number;
  
  // Employment Information
  employmentStatus: string;
  employerName: string;
  occupation: string;
  employmentDurationYears: number;
  employmentDurationMonths: number;
  monthlyIncome: number;
  otherIncome: number;
  
  // Housing Information
  housingStatus: string;
  housingPayment: number;
  residenceDurationYears: number;
  residenceDurationMonths: number;
  
  // Financial Information
  creditScore: number;
  desiredLoanAmount: number;
  downPaymentAmount: number;
  hasDriverLicense: boolean;
  collectsGovernmentBenefits: boolean;
  governmentBenefitTypes: string[];
  governmentBenefitOther: string;
  
  // Debt Discharge History
  hasDebtDischargeHistory: boolean;
  debtDischargeType: string;
  debtDischargeYear: number;
  debtDischargeStatus: string;
  debtDischargeComments: string;
  amountOwed: number;
  trusteeName: string;
  
  // Contact Preferences
  preferredContactMethod: string;
  consentSoftCheck: boolean;
  termsAccepted: boolean;
  
  // Account Creation
  password: string;
  confirmPassword: string;
}

interface PreQualificationFormProps {
  onComplete?: (applicationId: string, tempUserId: string, formData: FormData) => Promise<void>;
}

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } }
};

const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    maritalStatus: '',
    dependents: 0,
    employmentStatus: '',
    employerName: '',
    occupation: '',
    employmentDurationYears: 0,
    employmentDurationMonths: 0,
    monthlyIncome: 0,
    otherIncome: 0,
    housingStatus: '',
    housingPayment: 0,
    residenceDurationYears: 0,
    residenceDurationMonths: 0,
    creditScore: 650,
    desiredLoanAmount: 25000,
    downPaymentAmount: 0,
    hasDriverLicense: false,
    collectsGovernmentBenefits: false,
    governmentBenefitTypes: [],
    governmentBenefitOther: '',
    hasDebtDischargeHistory: false,
    debtDischargeType: '',
    debtDischargeYear: new Date().getFullYear(),
    debtDischargeStatus: '',
    debtDischargeComments: '',
    amountOwed: 0,
    trusteeName: '',
    preferredContactMethod: '',
    consentSoftCheck: false,
    termsAccepted: false,
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const totalSteps = 7;

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field if it exists
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
          newErrors.email = 'Invalid email address';
        }
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.province) newErrors.province = 'Province is required';
        if (!formData.postalCode) newErrors.postalCode = 'Postal code is required';
        break;
        
      case 2: // Employment Information
        if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
        if (formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') {
          if (!formData.employerName) newErrors.employerName = 'Employer name is required';
          if (!formData.occupation) newErrors.occupation = 'Occupation is required';
        }
        if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Monthly income is required';
        break;
        
      case 3: // Housing Information
        if (!formData.housingStatus) newErrors.housingStatus = 'Housing status is required';
        if (formData.housingStatus === 'own' || formData.housingStatus === 'rent') {
          if (!formData.housingPayment) newErrors.housingPayment = 'Housing payment is required';
        }
        break;
        
      case 4: // Financial Information
        // Credit score and desired loan amount have defaults, so no validation needed
        break;
        
      case 5: // Debt Discharge History
        if (formData.hasDebtDischargeHistory) {
          if (!formData.debtDischargeType) newErrors.debtDischargeType = 'Discharge type is required';
          if (!formData.debtDischargeStatus) newErrors.debtDischargeStatus = 'Discharge status is required';
          if (formData.debtDischargeStatus === 'active') {
            if (!formData.amountOwed) newErrors.amountOwed = 'Amount owed is required';
          }
        }
        break;
        
      case 6: // Contact Preferences
        if (!formData.preferredContactMethod) newErrors.preferredContactMethod = 'Contact method is required';
        break;
        
      case 7: // Consent & Terms
        if (!formData.consentSoftCheck) newErrors.consentSoftCheck = 'You must consent to a soft credit check';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms of service';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        break;
    }
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    
    try {
      // In a real implementation, you would submit the form data to your backend
      // For now, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a fake application ID and temp user ID
      const applicationId = `app-${Math.random().toString(36).substring(2, 10)}`;
      const tempUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
      
      // Call the onComplete callback if provided
      if (onComplete) {
        await onComplete(applicationId, tempUserId, formData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setValidationErrors({
        submit: 'An error occurred while submitting your application. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <User className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-gray-600 mt-2">Let's start with your basic information</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName" className={validationErrors.firstName ? "text-red-500" : ""}>
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Enter your first name"
                  required
                  className={validationErrors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.firstName && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName" className={validationErrors.lastName ? "text-red-500" : ""}>
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Enter your last name"
                  required
                  className={validationErrors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.lastName && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className={validationErrors.email ? "text-red-500" : ""}>
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className={validationErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone" className={validationErrors.phone ? "text-red-500" : ""}>
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                  className={validationErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.phone && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="dateOfBirth" className={validationErrors.dateOfBirth ? "text-red-500" : ""}>
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                required
                className={validationErrors.dateOfBirth ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {validationErrors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.dateOfBirth}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address" className={validationErrors.address ? "text-red-500" : ""}>
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="123 Main Street"
                required
                className={validationErrors.address ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {validationErrors.address && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="city" className={validationErrors.city ? "text-red-500" : ""}>
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="Toronto"
                  required
                  className={validationErrors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.city && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.city}</p>
                )}
              </div>
              <div>
                <Label htmlFor="province" className={validationErrors.province ? "text-red-500" : ""}>
                  Province <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.province} 
                  onValueChange={(value) => updateFormData('province', value)}
                >
                  <SelectTrigger 
                    id="province"
                    className={validationErrors.province ? "border-red-500 focus-visible:ring-red-500" : ""}
                  >
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON">Ontario</SelectItem>
                    <SelectItem value="BC">British Columbia</SelectItem>
                    <SelectItem value="AB">Alberta</SelectItem>
                    <SelectItem value="MB">Manitoba</SelectItem>
                    <SelectItem value="SK">Saskatchewan</SelectItem>
                    <SelectItem value="QC">Quebec</SelectItem>
                    <SelectItem value="NB">New Brunswick</SelectItem>
                    <SelectItem value="NS">Nova Scotia</SelectItem>
                    <SelectItem value="PE">Prince Edward Island</SelectItem>
                    <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                    <SelectItem value="YT">Yukon</SelectItem>
                    <SelectItem value="NT">Northwest Territories</SelectItem>
                    <SelectItem value="NU">Nunavut</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.province && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.province}</p>
                )}
              </div>
              <div>
                <Label htmlFor="postalCode" className={validationErrors.postalCode ? "text-red-500" : ""}>
                  Postal Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => updateFormData('postalCode', e.target.value)}
                  placeholder="M5V 3A8"
                  required
                  className={validationErrors.postalCode ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.postalCode && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.postalCode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="maritalStatus" className={validationErrors.maritalStatus ? "text-red-500" : ""}>
                  Marital Status <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.maritalStatus} 
                  onValueChange={(value) => updateFormData('maritalStatus', value)}
                >
                  <SelectTrigger 
                    id="maritalStatus"
                    className={validationErrors.maritalStatus ? "border-red-500 focus-visible:ring-red-500" : ""}
                  >
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="separated">Separated</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.maritalStatus && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.maritalStatus}</p>
                )}
              </div>
              <div>
                <Label htmlFor="dependents">
                  Number of Dependents
                </Label>
                <Input
                  id="dependents"
                  type="number"
                  min="0"
                  value={formData.dependents}
                  onChange={(e) => updateFormData('dependents', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <Briefcase className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Employment Information</h2>
              <p className="text-gray-600 mt-2">Tell us about your employment situation</p>
            </div>

            <div>
              <Label htmlFor="employmentStatus" className={validationErrors.employmentStatus ? "text-red-500" : ""}>
                Employment Status <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.employmentStatus} 
                onValueChange={(value) => updateFormData('employmentStatus', value)}
              >
                <SelectTrigger 
                  id="employmentStatus"
                  className={validationErrors.employmentStatus ? "border-red-500 focus-visible:ring-red-500" : ""}
                >
                  <SelectValue placeholder="Select employment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.employmentStatus && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.employmentStatus}</p>
              )}
            </div>

            {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
              <>
                <div>
                  <Label htmlFor="employerName" className={validationErrors.employerName ? "text-red-500" : ""}>
                    Employer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employerName"
                    value={formData.employerName}
                    onChange={(e) => updateFormData('employerName', e.target.value)}
                    placeholder="Company name"
                    required
                    className={validationErrors.employerName ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.employerName && (
                    <p className="mt-1 text-xs text-red-500">{validationErrors.employerName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="occupation" className={validationErrors.occupation ? "text-red-500" : ""}>
                    Occupation <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => updateFormData('occupation', e.target.value)}
                    placeholder="Your job title"
                    required
                    className={validationErrors.occupation ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.occupation && (
                    <p className="mt-1 text-xs text-red-500">{validationErrors.occupation}</p>
                  )}
                </div>

                <div>
                  <Label>Employment Duration <span className="text-red-500">*</span></Label>
                  <div className="grid grid-cols-2 gap-6 mt-2">
                    <div>
                      <Label htmlFor="employmentYears">Years</Label>
                      <Input
                        id="employmentYears"
                        type="number"
                        min="0"
                        value={formData.employmentDurationYears}
                        onChange={(e) => updateFormData('employmentDurationYears', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="employmentMonths">Months</Label>
                      <Input
                        id="employmentMonths"
                        type="number"
                        min="0"
                        max="11"
                        value={formData.employmentDurationMonths}
                        onChange={(e) => updateFormData('employmentDurationMonths', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="monthlyIncome" className={validationErrors.monthlyIncome ? "text-red-500" : ""}>
                Monthly Income <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input
                  id="monthlyIncome"
                  type="number"
                  min="0"
                  value={formData.monthlyIncome}
                  onChange={(e) => updateFormData('monthlyIncome', parseFloat(e.target.value) || 0)}
                  placeholder="5000"
                  required
                  className={`pl-10 ${validationErrors.monthlyIncome ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
              {validationErrors.monthlyIncome && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.monthlyIncome}</p>
              )}
            </div>

            <div>
              <Label htmlFor="otherIncome">
                Other Monthly Income
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input
                  id="otherIncome"
                  type="number"
                  min="0"
                  value={formData.otherIncome}
                  onChange={(e) => updateFormData('otherIncome', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-10"
                />
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <Home className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Housing Information</h2>
              <p className="text-gray-600 mt-2">Tell us about your living situation</p>
            </div>

            <div>
              <Label htmlFor="housingStatus" className={validationErrors.housingStatus ? "text-red-500" : ""}>
                Housing Status <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.housingStatus} 
                onValueChange={(value) => updateFormData('housingStatus', value)}
              >
                <SelectTrigger 
                  id="housingStatus"
                  className={validationErrors.housingStatus ? "border-red-500 focus-visible:ring-red-500" : ""}
                >
                  <SelectValue placeholder="Select housing status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="live_with_parents">Live with Parents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.housingStatus && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.housingStatus}</p>
              )}
            </div>

            {(formData.housingStatus === 'own' || formData.housingStatus === 'rent') && (
              <div>
                <Label htmlFor="housingPayment" className={validationErrors.housingPayment ? "text-red-500" : ""}>
                  Monthly {formData.housingStatus === 'own' ? 'Mortgage' : 'Rent'} Payment <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                  <Input
                    id="housingPayment"
                    type="number"
                    min="0"
                    value={formData.housingPayment}
                    onChange={(e) => updateFormData('housingPayment', parseFloat(e.target.value) || 0)}
                    placeholder="1500"
                    required
                    className={`pl-10 ${validationErrors.housingPayment ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                {validationErrors.housingPayment && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.housingPayment}</p>
                )}
              </div>
            )}

            <div>
              <Label>How long have you lived at your current address? <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div>
                  <Label htmlFor="residenceYears">Years</Label>
                  <Input
                    id="residenceYears"
                    type="number"
                    min="0"
                    value={formData.residenceDurationYears}
                    onChange={(e) => updateFormData('residenceDurationYears', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="residenceMonths">Months</Label>
                  <Input
                    id="residenceMonths"
                    type="number"
                    min="0"
                    max="11"
                    value={formData.residenceDurationMonths}
                    onChange={(e) => updateFormData('residenceDurationMonths', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <DollarSign className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Financial Information</h2>
              <p className="text-gray-600 mt-2">Help us understand your financial situation</p>
            </div>

            <div className="bg-[#F9FAFB] p-6 rounded-xl border border-gray-100">
              <Label htmlFor="creditScore">Estimated Credit Score</Label>
              <div className="mt-4">
                <Slider
                  id="creditScore"
                  value={[formData.creditScore]}
                  onValueChange={(value) => updateFormData('creditScore', value[0])}
                  max={900}
                  min={300}
                  step={10}
                  className="w-full"
                  showTooltip
                  tooltipContent={(value) => `${value}`}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>300</span>
                  <span className="font-medium text-[#3BAA75]">{formData.creditScore}</span>
                  <span>900</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F9FAFB] p-6 rounded-xl border border-gray-100">
              <Label htmlFor="desiredLoanAmount">Desired Loan Amount</Label>
              <div className="mt-4">
                <Slider
                  id="desiredLoanAmount"
                  value={[formData.desiredLoanAmount]}
                  onValueChange={(value) => updateFormData('desiredLoanAmount', value[0])}
                  max={100000}
                  min={5000}
                  step={1000}
                  className="w-full"
                  showTooltip
                  tooltipContent={(value) => `$${value.toLocaleString()}`}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>$5,000</span>
                  <span className="font-medium text-[#3BAA75]">${formData.desiredLoanAmount.toLocaleString()}</span>
                  <span>$100,000</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="downPaymentAmount">Down Payment Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input
                  id="downPaymentAmount"
                  type="number"
                  min="0"
                  value={formData.downPaymentAmount}
                  onChange={(e) => updateFormData('downPaymentAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-[#F9FAFB] rounded-lg border border-gray-100">
              <Checkbox
                id="hasDriverLicense"
                checked={formData.hasDriverLicense}
                onCheckedChange={(checked) => updateFormData('hasDriverLicense', checked)}
              />
              <Label htmlFor="hasDriverLicense" className="text-sm font-medium cursor-pointer">
                I have a valid driver's license
              </Label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-[#F9FAFB] rounded-lg border border-gray-100">
                <Checkbox
                  id="collectsGovernmentBenefits"
                  checked={formData.collectsGovernmentBenefits}
                  onCheckedChange={(checked) => updateFormData('collectsGovernmentBenefits', checked)}
                />
                <Label htmlFor="collectsGovernmentBenefits" className="text-sm font-medium cursor-pointer">
                  I collect government benefits
                </Label>
              </div>

              {formData.collectsGovernmentBenefits && (
                <div className="ml-6 space-y-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <Label>Select all that apply:</Label>
                  {['cpp', 'ei', 'odsp', 'ontario_works', 'child_tax_benefit', 'other'].map((benefit) => (
                    <div key={benefit} className="flex items-center space-x-2">
                      <Checkbox
                        id={benefit}
                        checked={formData.governmentBenefitTypes.includes(benefit)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFormData('governmentBenefitTypes', [...formData.governmentBenefitTypes, benefit]);
                          } else {
                            updateFormData('governmentBenefitTypes', formData.governmentBenefitTypes.filter(b => b !== benefit));
                          }
                        }}
                      />
                      <Label htmlFor={benefit} className="capitalize text-sm cursor-pointer">
                        {benefit.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                  
                  {formData.governmentBenefitTypes.includes('other') && (
                    <div className="mt-3">
                      <Label htmlFor="governmentBenefitOther">Please specify:</Label>
                      <Input
                        id="governmentBenefitOther"
                        value={formData.governmentBenefitOther}
                        onChange={(e) => updateFormData('governmentBenefitOther', e.target.value)}
                        placeholder="Other benefit type"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <FileText className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Debt Discharge History</h2>
              <p className="text-gray-600 mt-2">Information about any previous debt discharge</p>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-[#F9FAFB] rounded-lg border border-gray-100">
              <Checkbox
                id="hasDebtDischargeHistory"
                checked={formData.hasDebtDischargeHistory}
                onCheckedChange={(checked) => updateFormData('hasDebtDischargeHistory', checked)}
              />
              <Label htmlFor="hasDebtDischargeHistory" className="text-sm font-medium cursor-pointer">
                I have a history of debt discharge
              </Label>
            </div>

            {formData.hasDebtDischargeHistory && (
              <div className="space-y-6 ml-6 p-6 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div>
                  <Label htmlFor="debtDischargeType" className={validationErrors.debtDischargeType ? "text-red-500" : ""}>
                    Type of Debt Discharge <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.debtDischargeType} 
                    onValueChange={(value) => updateFormData('debtDischargeType', value)}
                  >
                    <SelectTrigger 
                      id="debtDischargeType"
                      className={validationErrors.debtDischargeType ? "border-red-500 focus-visible:ring-red-500" : ""}
                    >
                      <SelectValue placeholder="Select discharge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bankruptcy">Bankruptcy</SelectItem>
                      <SelectItem value="consumer_proposal">Consumer Proposal</SelectItem>
                      <SelectItem value="informal_settlement">Informal Settlement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.debtDischargeType && (
                    <p className="mt-1 text-xs text-red-500">{validationErrors.debtDischargeType}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="debtDischargeYear" className={validationErrors.debtDischargeYear ? "text-red-500" : ""}>
                    Year of Discharge <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="debtDischargeYear"
                    type="number"
                    min="1980"
                    max={new Date().getFullYear()}
                    value={formData.debtDischargeYear}
                    onChange={(e) => updateFormData('debtDischargeYear', parseInt(e.target.value) || new Date().getFullYear())}
                    required
                    className={validationErrors.debtDischargeYear ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.debtDischargeYear && (
                    <p className="mt-1 text-xs text-red-500">{validationErrors.debtDischargeYear}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="debtDischargeStatus" className={validationErrors.debtDischargeStatus ? "text-red-500" : ""}>
                    Current Status <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.debtDischargeStatus} 
                    onValueChange={(value) => updateFormData('debtDischargeStatus', value)}
                  >
                    <SelectTrigger 
                      id="debtDischargeStatus"
                      className={validationErrors.debtDischargeStatus ? "border-red-500 focus-visible:ring-red-500" : ""}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discharged">Discharged</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="not_sure">Not Sure</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.debtDischargeStatus && (
                    <p className="mt-1 text-xs text-red-500">{validationErrors.debtDischargeStatus}</p>
                  )}
                </div>

                {formData.debtDischargeStatus === 'active' && (
                  <>
                    <div>
                      <Label htmlFor="amountOwed" className={validationErrors.amountOwed ? "text-red-500" : ""}>
                        Amount Still Owed <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                        <Input
                          id="amountOwed"
                          type="number"
                          min="0"
                          value={formData.amountOwed}
                          onChange={(e) => updateFormData('amountOwed', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className={`pl-10 ${validationErrors.amountOwed ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                      </div>
                      {validationErrors.amountOwed && (
                        <p className="mt-1 text-xs text-red-500">{validationErrors.amountOwed}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="trusteeName">
                        Trustee Name
                      </Label>
                      <Input
                        id="trusteeName"
                        value={formData.trusteeName}
                        onChange={(e) => updateFormData('trusteeName', e.target.value)}
                        placeholder="Trustee or administrator name"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="debtDischargeComments">
                    Additional Comments
                  </Label>
                  <Textarea
                    id="debtDischargeComments"
                    value={formData.debtDischargeComments}
                    onChange={(e) => updateFormData('debtDischargeComments', e.target.value)}
                    placeholder="Any additional information about your debt discharge history"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="step6"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <Phone className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Contact Preferences</h2>
              <p className="text-gray-600 mt-2">How would you like us to contact you?</p>
            </div>

            <div className="bg-[#F9FAFB] p-6 rounded-xl border border-gray-100">
              <Label className={validationErrors.preferredContactMethod ? "text-red-500" : ""}>
                Preferred Contact Method <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={formData.preferredContactMethod}
                onValueChange={(value) => updateFormData('preferredContactMethod', value)}
                className="mt-4 space-y-4"
              >
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition-all duration-200 hover:border-[#3BAA75]/50 hover:shadow-md">
                  <RadioGroupItem value="email" id="email-contact" />
                  <Label htmlFor="email-contact" className="flex items-center cursor-pointer">
                    <Mail className="w-5 h-5 mr-3 text-[#3BAA75]" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-xs text-gray-500">Receive updates via email</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition-all duration-200 hover:border-[#3BAA75]/50 hover:shadow-md">
                  <RadioGroupItem value="phone" id="phone-contact" />
                  <Label htmlFor="phone-contact" className="flex items-center cursor-pointer">
                    <Phone className="w-5 h-5 mr-3 text-[#3BAA75]" />
                    <div>
                      <div className="font-medium">Phone Call</div>
                      <div className="text-xs text-gray-500">Receive updates via phone call</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition-all duration-200 hover:border-[#3BAA75]/50 hover:shadow-md">
                  <RadioGroupItem value="sms" id="sms-contact" />
                  <Label htmlFor="sms-contact" className="flex items-center cursor-pointer">
                    <Phone className="w-5 h-5 mr-3 text-[#3BAA75]" />
                    <div>
                      <div className="font-medium">Text Message (SMS)</div>
                      <div className="text-xs text-gray-500">Receive updates via text message</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              {validationErrors.preferredContactMethod && (
                <p className="mt-3 text-xs text-red-500">{validationErrors.preferredContactMethod}</p>
              )}
            </div>
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            key="step7"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
                <Shield className="w-6 h-6 text-[#3BAA75]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
              <p className="text-gray-600 mt-2">Set up your account and review terms</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="password" className={validationErrors.password ? "text-red-500" : ""}>
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  className={validationErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword" className={validationErrors.confirmPassword ? "text-red-500" : ""}>
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  required
                  className={validationErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className={`flex items-start space-x-3 p-4 bg-[#F9FAFB] rounded-lg border ${validationErrors.consentSoftCheck ? "border-red-500" : "border-gray-100"}`}>
                <Checkbox
                  id="consentSoftCheck"
                  checked={formData.consentSoftCheck}
                  onCheckedChange={(checked) => updateFormData('consentSoftCheck', checked)}
                  className={validationErrors.consentSoftCheck ? "border-red-500" : ""}
                />
                <Label htmlFor="consentSoftCheck" className="text-sm leading-relaxed cursor-pointer">
                  I consent to a soft credit check being performed. This will not affect my credit score and helps us provide you with the best loan options.
                </Label>
              </div>
              {validationErrors.consentSoftCheck && (
                <p className="text-xs text-red-500">{validationErrors.consentSoftCheck}</p>
              )}

              <div className={`flex items-start space-x-3 p-4 bg-[#F9FAFB] rounded-lg border ${validationErrors.termsAccepted ? "border-red-500" : "border-gray-100"}`}>
                <Checkbox
                  id="termsAccepted"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => updateFormData('termsAccepted', checked)}
                  className={validationErrors.termsAccepted ? "border-red-500" : ""}
                />
                <Label htmlFor="termsAccepted" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the <a href="/terms" className="text-[#3BAA75] hover:underline">Terms of Service</a> and <a href="/privacy" className="text-[#3BAA75] hover:underline">Privacy Policy</a>. I understand that submitting this application does not guarantee loan approval.
                </Label>
              </div>
              {validationErrors.termsAccepted && (
                <p className="text-xs text-red-500">{validationErrors.termsAccepted}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mt-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-500" />
                What happens next?
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>We'll review your application within 24 hours</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You'll receive a pre-qualification decision via your preferred contact method</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>If pre-qualified, we'll help you find the perfect vehicle</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Our team will guide you through the final approval process</span>
                </li>
              </ul>
            </div>
            
            {validationErrors.submit && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{validationErrors.submit}</span>
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold text-gray-900">Vehicle Loan Pre-Qualification</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Get pre-qualified for your vehicle loan in just a few minutes
          </CardDescription>
          
          {/* Progress Bar */}
          <div className="mt-8">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} onStepClick={(step) => {
              if (step <= currentStep) {
                setCurrentStep(step);
              }
            }} />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="px-6 transition-all duration-200"
              >
                Previous
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="px-6"
                  disabled={isSubmitting}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="px-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreQualificationForm;