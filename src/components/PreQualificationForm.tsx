import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Calendar, CalendarDays, DollarSign, FileText, Home, User, Briefcase, CreditCard, Car, Phone, Mail, MapPin } from 'lucide-react';

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
}

const PreQualificationForm: React.FC = () => {
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
  });

  const totalSteps = 7;

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission logic here
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-gray-600">Let's start with your basic information</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="Toronto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="province">Province *</Label>
                <Select value={formData.province} onValueChange={(value) => updateFormData('province', value)}>
                  <SelectTrigger>
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
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => updateFormData('postalCode', e.target.value)}
                  placeholder="M5V 3A8"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maritalStatus">Marital Status *</Label>
                <Select value={formData.maritalStatus} onValueChange={(value) => updateFormData('maritalStatus', value)}>
                  <SelectTrigger>
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
              </div>
              <div>
                <Label htmlFor="dependents">Number of Dependents</Label>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Briefcase className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Employment Information</h2>
              <p className="text-gray-600">Tell us about your employment situation</p>
            </div>

            <div>
              <Label htmlFor="employmentStatus">Employment Status *</Label>
              <Select value={formData.employmentStatus} onValueChange={(value) => updateFormData('employmentStatus', value)}>
                <SelectTrigger>
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
            </div>

            {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed') && (
              <>
                <div>
                  <Label htmlFor="employerName">Employer Name *</Label>
                  <Input
                    id="employerName"
                    value={formData.employerName}
                    onChange={(e) => updateFormData('employerName', e.target.value)}
                    placeholder="Company name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => updateFormData('occupation', e.target.value)}
                    placeholder="Your job title"
                    required
                  />
                </div>

                <div>
                  <Label>Employment Duration *</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
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
              <Label htmlFor="monthlyIncome">Monthly Income *</Label>
              <Input
                id="monthlyIncome"
                type="number"
                min="0"
                value={formData.monthlyIncome}
                onChange={(e) => updateFormData('monthlyIncome', parseFloat(e.target.value) || 0)}
                placeholder="5000"
                required
              />
            </div>

            <div>
              <Label htmlFor="otherIncome">Other Monthly Income</Label>
              <Input
                id="otherIncome"
                type="number"
                min="0"
                value={formData.otherIncome}
                onChange={(e) => updateFormData('otherIncome', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Home className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Housing Information</h2>
              <p className="text-gray-600">Tell us about your living situation</p>
            </div>

            <div>
              <Label htmlFor="housingStatus">Housing Status *</Label>
              <Select value={formData.housingStatus} onValueChange={(value) => updateFormData('housingStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select housing status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="live_with_parents">Live with Parents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.housingStatus === 'own' || formData.housingStatus === 'rent') && (
              <div>
                <Label htmlFor="housingPayment">
                  Monthly {formData.housingStatus === 'own' ? 'Mortgage' : 'Rent'} Payment *
                </Label>
                <Input
                  id="housingPayment"
                  type="number"
                  min="0"
                  value={formData.housingPayment}
                  onChange={(e) => updateFormData('housingPayment', parseFloat(e.target.value) || 0)}
                  placeholder="1500"
                  required
                />
              </div>
            )}

            <div>
              <Label>How long have you lived at your current address? *</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Financial Information</h2>
              <p className="text-gray-600">Help us understand your financial situation</p>
            </div>

            <div>
              <Label htmlFor="creditScore">Estimated Credit Score</Label>
              <div className="mt-2">
                <Slider
                  value={[formData.creditScore]}
                  onValueChange={(value) => updateFormData('creditScore', value[0])}
                  max={900}
                  min={300}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>300</span>
                  <span className="font-medium">{formData.creditScore}</span>
                  <span>900</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="desiredLoanAmount">Desired Loan Amount</Label>
              <div className="mt-2">
                <Slider
                  value={[formData.desiredLoanAmount]}
                  onValueChange={(value) => updateFormData('desiredLoanAmount', value[0])}
                  max={100000}
                  min={5000}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>$5,000</span>
                  <span className="font-medium">${formData.desiredLoanAmount.toLocaleString()}</span>
                  <span>$100,000</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="downPaymentAmount">Down Payment Amount</Label>
              <Input
                id="downPaymentAmount"
                type="number"
                min="0"
                value={formData.downPaymentAmount}
                onChange={(e) => updateFormData('downPaymentAmount', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasDriverLicense"
                checked={formData.hasDriverLicense}
                onCheckedChange={(checked) => updateFormData('hasDriverLicense', checked)}
              />
              <Label htmlFor="hasDriverLicense">I have a valid driver's license</Label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="collectsGovernmentBenefits"
                  checked={formData.collectsGovernmentBenefits}
                  onCheckedChange={(checked) => updateFormData('collectsGovernmentBenefits', checked)}
                />
                <Label htmlFor="collectsGovernmentBenefits">I collect government benefits</Label>
              </div>

              {formData.collectsGovernmentBenefits && (
                <div className="ml-6 space-y-2">
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
                      <Label htmlFor={benefit} className="capitalize">
                        {benefit.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                  
                  {formData.governmentBenefitTypes.includes('other') && (
                    <div className="mt-2">
                      <Label htmlFor="governmentBenefitOther">Please specify:</Label>
                      <Input
                        id="governmentBenefitOther"
                        value={formData.governmentBenefitOther}
                        onChange={(e) => updateFormData('governmentBenefitOther', e.target.value)}
                        placeholder="Other benefit type"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Debt Discharge History</h2>
              <p className="text-gray-600">Information about any previous debt discharge</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasDebtDischargeHistory"
                checked={formData.hasDebtDischargeHistory}
                onCheckedChange={(checked) => updateFormData('hasDebtDischargeHistory', checked)}
              />
              <Label htmlFor="hasDebtDischargeHistory">I have a history of debt discharge</Label>
            </div>

            {formData.hasDebtDischargeHistory && (
              <div className="space-y-4 ml-6">
                <div>
                  <Label htmlFor="debtDischargeType">Type of Debt Discharge *</Label>
                  <Select value={formData.debtDischargeType} onValueChange={(value) => updateFormData('debtDischargeType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discharge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bankruptcy">Bankruptcy</SelectItem>
                      <SelectItem value="consumer_proposal">Consumer Proposal</SelectItem>
                      <SelectItem value="informal_settlement">Informal Settlement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="debtDischargeYear">Year of Discharge *</Label>
                  <Input
                    id="debtDischargeYear"
                    type="number"
                    min="1980"
                    max={new Date().getFullYear()}
                    value={formData.debtDischargeYear}
                    onChange={(e) => updateFormData('debtDischargeYear', parseInt(e.target.value) || new Date().getFullYear())}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="debtDischargeStatus">Current Status *</Label>
                  <Select value={formData.debtDischargeStatus} onValueChange={(value) => updateFormData('debtDischargeStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discharged">Discharged</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="not_sure">Not Sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.debtDischargeStatus === 'active' && (
                  <>
                    <div>
                      <Label htmlFor="amountOwed">Amount Still Owed</Label>
                      <Input
                        id="amountOwed"
                        type="number"
                        min="0"
                        value={formData.amountOwed}
                        onChange={(e) => updateFormData('amountOwed', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="trusteeName">Trustee Name</Label>
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
                  <Label htmlFor="debtDischargeComments">Additional Comments</Label>
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
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Phone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Preferences</h2>
              <p className="text-gray-600">How would you like us to contact you?</p>
            </div>

            <div>
              <Label>Preferred Contact Method *</Label>
              <RadioGroup
                value={formData.preferredContactMethod}
                onValueChange={(value) => updateFormData('preferredContactMethod', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email-contact" />
                  <Label htmlFor="email-contact" className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" id="phone-contact" />
                  <Label htmlFor="phone-contact" className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone Call
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="sms-contact" />
                  <Label htmlFor="sms-contact" className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Text Message (SMS)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Consent & Terms</h2>
              <p className="text-gray-600">Please review and accept our terms</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consentSoftCheck"
                  checked={formData.consentSoftCheck}
                  onCheckedChange={(checked) => updateFormData('consentSoftCheck', checked)}
                />
                <Label htmlFor="consentSoftCheck" className="text-sm leading-relaxed">
                  I consent to a soft credit check being performed. This will not affect my credit score and helps us provide you with the best loan options.
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="termsAccepted"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => updateFormData('termsAccepted', checked)}
                />
                <Label htmlFor="termsAccepted" className="text-sm leading-relaxed">
                  I have read and agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="/privacy" className=\"text-blue-600 hover:underline">Privacy Policy</a>. I understand that submitting this application does not guarantee loan approval.
                </Label>
              </div>
            </div>

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Vehicle Loan Pre-Qualification</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Get pre-qualified for your vehicle loan in just a few minutes
          </CardDescription>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm font-medium text-gray-700">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            {renderStep()}

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6"
              >
                Previous
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="px-6"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="px-6"
                  disabled={!formData.consentSoftCheck || !formData.termsAccepted}
                >
                  Submit Application
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