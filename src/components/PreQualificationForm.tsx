import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { ProgressBar } from './ProgressBar';
import { ProcessingAnimation } from './ProcessingAnimation';
import { vehicles } from '../pages/Vehicles';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface PreQualificationFormProps {
  onComplete: (applicationId: string, tempUserId: string, formData: any) => void;
}

// Define the form schema with Zod
const formSchema = z.object({
  // Step 1: Vehicle Type
  vehicleType: z.string().min(1, 'Please select a vehicle type'),
  
  // Step 2: Financial Information
  desiredMonthlyPayment: z.number().min(100, 'Monthly payment must be at least $100').max(2000, 'Monthly payment cannot exceed $2000'),
  creditScore: z.string().refine(val => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 300 && num <= 900;
  }, 'Credit score must be between 300 and 900'),
  employmentStatus: z.string().min(1, 'Please select your employment status'),
  annualIncome: z.string().refine(val => {
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    return !isNaN(num) && num > 0;
  }, 'Please enter a valid annual income'),
  
  // Step 3: Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Please enter a valid postal code'),
  
  // Step 4: Additional Information
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  residenceYears: z.string().min(1, 'Please enter how long you have lived at your current address'),
  residenceMonths: z.string().min(1, 'Please enter how long you have lived at your current address'),
  housingStatus: z.string().min(1, 'Please select your housing status'),
  housingPayment: z.string().optional(),
  
  // Government Benefits
  collects_government_benefits: z.boolean().optional(),
  government_benefit_types: z.array(z.string()).optional(),
  government_benefit_other: z.string().optional(),
  government_benefit_amount: z.string().optional(),
  
  // Debt Discharge
  has_debt_discharge_history: z.boolean().optional(),
  debt_discharge_type: z.string().optional(),
  debt_discharge_status: z.string().optional(),
  debt_discharge_year: z.string().optional(),
  amount_owed: z.string().optional(),
  
  // Consent
  consentToSoftCheck: z.boolean().refine(val => val === true, 'You must consent to a soft credit check'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

type FormValues = z.infer<typeof formSchema>;

export const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempUserId] = useState(uuidv4());
  
  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // Step 1: Vehicle Type
      vehicleType: searchParams.get('vehicle') || '',
      
      // Step 2: Financial Information
      desiredMonthlyPayment: searchParams.get('budget') ? parseInt(searchParams.get('budget')!) : 500,
      creditScore: '',
      employmentStatus: 'employed',
      annualIncome: '',
      
      // Step 3: Personal Information
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      
      // Step 4: Additional Information
      dateOfBirth: '',
      residenceYears: '0',
      residenceMonths: '0',
      housingStatus: '',
      housingPayment: '',
      
      // Government Benefits
      collects_government_benefits: false,
      government_benefit_types: [],
      government_benefit_other: '',
      government_benefit_amount: '',
      
      // Debt Discharge
      has_debt_discharge_history: false,
      debt_discharge_type: '',
      debt_discharge_status: '',
      debt_discharge_year: '',
      amount_owed: '',
      
      // Consent
      consentToSoftCheck: false,
      termsAccepted: false
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setIsProcessing(true);
      
      // Calculate loan amount range based on monthly payment
      const monthlyPayment = data.desiredMonthlyPayment;
      const interestRate = 5.99; // Default interest rate
      const term = 60; // Default term in months
      
      // Calculate loan amount using the formula: PV = PMT * ((1 - (1 + r)^-n) / r)
      const monthlyRate = interestRate / 1200;
      const loanAmount = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -term)) / monthlyRate);
      
      // Set loan range with +/- 20%
      const loanMin = Math.round(loanAmount * 0.8);
      const loanMax = Math.round(loanAmount * 1.2);
      
      // Create application in Supabase
      const { data: application, error } = await supabase
        .from('applications')
        .insert({
          temp_user_id: tempUserId,
          status: 'pending_documents',
          current_stage: 1,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          province: data.province,
          postal_code: data.postalCode,
          employment_status: data.employmentStatus,
          annual_income: parseFloat(data.annualIncome.replace(/[^0-9.]/g, '')),
          monthly_income: parseFloat(data.annualIncome.replace(/[^0-9.]/g, '')) / 12,
          credit_score: parseInt(data.creditScore),
          vehicle_type: data.vehicleType,
          desired_monthly_payment: data.desiredMonthlyPayment,
          loan_amount_min: loanMin,
          loan_amount_max: loanMax,
          interest_rate: interestRate,
          loan_term: term,
          date_of_birth: data.dateOfBirth,
          residence_duration_years: parseInt(data.residenceYears),
          residence_duration_months: parseInt(data.residenceMonths),
          housing_status: data.housingStatus,
          housing_payment: data.housingPayment ? parseFloat(data.housingPayment.replace(/[^0-9.]/g, '')) : null,
          collects_government_benefits: data.collects_government_benefits,
          government_benefit_types: data.government_benefit_types?.length > 0 ? data.government_benefit_types : null,
          government_benefit_other: data.government_benefit_other || null,
          has_debt_discharge_history: data.has_debt_discharge_history,
          debt_discharge_type: data.debt_discharge_type || null,
          debt_discharge_status: data.debt_discharge_status || null,
          debt_discharge_year: data.debt_discharge_year ? parseInt(data.debt_discharge_year) : null,
          amount_owed: data.amount_owed ? parseFloat(data.amount_owed.replace(/[^0-9.]/g, '')) : null,
          consent_soft_check: data.consentToSoftCheck,
          terms_accepted: data.termsAccepted
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
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email
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
            vehicleType: data.vehicleType,
            monthlyBudget: data.desiredMonthlyPayment,
            originalFormData: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email
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

  // Handle next step
  const handleNext = async () => {
    // Validate current step fields
    let fieldsToValidate: string[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['vehicleType'];
        break;
      case 2:
        fieldsToValidate = ['desiredMonthlyPayment', 'creditScore', 'employmentStatus', 'annualIncome'];
        break;
      case 3:
        fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'province', 'postalCode'];
        break;
      case 4:
        fieldsToValidate = ['dateOfBirth', 'residenceYears', 'residenceMonths', 'housingStatus', 'consentToSoftCheck', 'termsAccepted'];
        
        // Validate government benefits fields if selected
        if (form.getValues('collects_government_benefits')) {
          fieldsToValidate.push('government_benefit_types', 'government_benefit_amount');
        }
        
        // Validate bankruptcy/consumer proposal fields if selected
        if (form.getValues('has_debt_discharge_history')) {
          fieldsToValidate.push('debt_discharge_type', 'debt_discharge_status', 'debt_discharge_year');
          if (form.getValues('debt_discharge_status') === 'active') {
            fieldsToValidate.push('amount_owed');
          }
        }
        break;
    }
    
    const result = await form.trigger(fieldsToValidate as any);
    
    if (result) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      } else {
        form.handleSubmit(onSubmit)();
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

  // Handle radio button changes
  const handleRadioChange = (name: string, value: boolean) => {
    form.setValue(name as any, value, { shouldValidate: true });
    
    // Reset related fields when changing radio buttons
    if (name === 'collects_government_benefits' && !value) {
      form.setValue('government_benefit_types', [], { shouldValidate: true });
      form.setValue('government_benefit_other', '', { shouldValidate: true });
      form.setValue('government_benefit_amount', '', { shouldValidate: true });
    }
    
    if (name === 'has_debt_discharge_history' && !value) {
      form.setValue('debt_discharge_type', '', { shouldValidate: true });
      form.setValue('debt_discharge_status', '', { shouldValidate: true });
      form.setValue('debt_discharge_year', '', { shouldValidate: true });
      form.setValue('amount_owed', '', { shouldValidate: true });
    }
  };

  // Handle multi-select changes for government benefits
  const handleBenefitTypeChange = (type: string) => {
    const currentTypes = form.getValues('government_benefit_types') || [];
    
    if (currentTypes.includes(type)) {
      // Remove the type if it's already selected
      form.setValue(
        'government_benefit_types', 
        currentTypes.filter(t => t !== type),
        { shouldValidate: true }
      );
    } else {
      // Add the type if it's not already selected
      form.setValue(
        'government_benefit_types',
        [...currentTypes, type],
        { shouldValidate: true }
      );
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
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">What type of vehicle are you looking for?</h2>
              <p className="text-lg text-gray-600 mb-8">Select the type of vehicle you're interested in financing.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {vehicles.map((vehicle) => (
                <motion.div
                  key={vehicle.type}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-[#3BAA75]",
                    "flex flex-col items-center text-center relative",
                    form.watch('vehicleType') === vehicle.type 
                      ? 'border-[#3BAA75] bg-[#3BAA75]/5 shadow-md' 
                      : 'border-gray-200'
                  )}
                  onClick={() => form.setValue('vehicleType', vehicle.type, { shouldValidate: true })}
                >
                  <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={vehicle.image} 
                      alt={vehicle.type} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="font-medium text-gray-800">{vehicle.type}</h3>
                  <p className="text-sm text-gray-600 mt-1">{vehicle.description}</p>
                  
                  {form.watch('vehicleType') === vehicle.type && (
                    <div className="absolute top-3 right-3 bg-[#3BAA75] text-white rounded-full p-1">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {form.formState.errors.vehicleType && (
              <p className="text-red-500 text-sm mt-2">{form.formState.errors.vehicleType.message}</p>
            )}
          </motion.div>
        );
      
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Financial Information</h2>
              <p className="text-lg text-gray-600 mb-8">Help us understand your financial situation to find the best options for you.</p>
            </div>
            
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="desiredMonthlyPayment"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-medium text-gray-700">
                      What's your ideal monthly car payment?
                    </FormLabel>
                    <div className="space-y-4">
                      <FormControl>
                        <Slider
                          min={100}
                          max={2000}
                          step={50}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          showTooltip
                          tooltipContent={(value) => `$${value}`}
                          className="py-4"
                        />
                      </FormControl>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>$100</span>
                        <span>$2000</span>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-[#3BAA75]">${field.value}</span>
                        <span className="text-gray-500 text-sm ml-1">per month</span>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="creditScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        What's your credit score?
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="number"
                            min="300"
                            max="900"
                            placeholder="Enter your credit score (300-900)"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Don't know your score? Enter your best estimate.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        What's your employment status?
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <select
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 appearance-none pr-10"
                            {...field}
                          >
                            <option value="employed">Employed</option>
                            <option value="self_employed">Self-Employed</option>
                            <option value="unemployed">Unemployed</option>
                            <option value="student">Student</option>
                            <option value="retired">Retired</option>
                          </select>
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Briefcase className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="annualIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      What's your annual income?
                    </FormLabel>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <FormControl>
                        <CurrencyInput
                          id="annualIncome"
                          placeholder="Enter your annual income"
                          prefix="$"
                          groupSeparator=","
                          decimalSeparator="."
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                          value={field.value}
                          onValueChange={(value) => field.onChange(value || '')}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Personal Information</h2>
              <p className="text-lg text-gray-600 mb-8">Tell us a bit about yourself so we can personalize your options.</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        First Name
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Last Name
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Email Address
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="email"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Phone Number
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="tel"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Street Address
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                          {...field}
                        />
                      </FormControl>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Home className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        City
                      </FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Province
                      </FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                          {...field}
                        >
                          <option value="">Select Province</option>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Postal Code
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="text"
                            placeholder="A1A 1A1"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Additional Information</h2>
              <p className="text-lg text-gray-600 mb-8">Just a few more details to help us find the best financing options for you.</p>
            </div>
            
            <div className="space-y-8">
              {/* Date of Birth and Residence Duration */}
              <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Date of Birth
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type="date"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="residenceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Years at Current Address
                      </FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                          {...field}
                        >
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10+">10+</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="residenceMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        Months at Current Address
                      </FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                          {...field}
                        >
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                          <option value="11">11</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Housing Status */}
              <FormField
                control={form.control}
                name="housingStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Housing Status
                    </FormLabel>
                    <FormControl>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                        {...field}
                      >
                        <option value="">Select Housing Status</option>
                        <option value="own">Own</option>
                        <option value="rent">Rent</option>
                        <option value="live_with_parents">Live with Parents</option>
                        <option value="other">Other</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Housing Payment - Only show if own or rent */}
              {(form.watch('housingStatus') === 'own' || form.watch('housingStatus') === 'rent') && (
                <FormField
                  control={form.control}
                  name="housingPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-gray-700">
                        {form.watch('housingStatus') === 'own' ? 'Monthly Mortgage Payment' : 'Monthly Rent Payment'}
                      </FormLabel>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <FormControl>
                          <CurrencyInput
                            placeholder="Enter monthly payment"
                            prefix="$"
                            groupSeparator=","
                            decimalSeparator="."
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                            value={field.value}
                            onValueChange={(value) => field.onChange(value || '')}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Please answer the following questions</h3>
                
                {/* Government Benefits Section */}
                <div className="mb-6">
                  <p className="font-medium text-gray-700 mb-3">1. Do you receive any government benefits? (CPP, EI, etc.)</p>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={form.watch('collects_government_benefits') === true}
                        onChange={() => handleRadioChange('collects_government_benefits', true)}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                      />
                      <span className="ml-2">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={form.watch('collects_government_benefits') === false}
                        onChange={() => handleRadioChange('collects_government_benefits', false)}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                      />
                      <span className="ml-2">No</span>
                    </label>
                  </div>
                  
                  <AnimatePresence>
                    {form.watch('collects_government_benefits') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 border-l-2 border-[#3BAA75]/30 space-y-4">
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                              Select all that apply:
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
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
                                    checked={(form.watch('government_benefit_types') || []).includes(benefit.id)}
                                    onChange={() => handleBenefitTypeChange(benefit.id)}
                                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm">{benefit.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          {(form.watch('government_benefit_types') || []).includes('other') && (
                            <FormField
                              control={form.control}
                              name="government_benefit_other"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium text-gray-700">
                                    Please specify:
                                  </FormLabel>
                                  <FormControl>
                                    <input
                                      type="text"
                                      className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          <FormField
                            control={form.control}
                            name="government_benefit_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  How much do you receive monthly?
                                </FormLabel>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <FormControl>
                                    <CurrencyInput
                                      placeholder="Enter monthly amount"
                                      prefix="$"
                                      groupSeparator=","
                                      decimalSeparator="."
                                      className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                                      value={field.value}
                                      onValueChange={(value) => field.onChange(value || '')}
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Bankruptcy/Consumer Proposal Section */}
                <div>
                  <p className="font-medium text-gray-700 mb-3">2. Have you ever filed for bankruptcy or a consumer proposal?</p>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={form.watch('has_debt_discharge_history') === true}
                        onChange={() => handleRadioChange('has_debt_discharge_history', true)}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                      />
                      <span className="ml-2">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={form.watch('has_debt_discharge_history') === false}
                        onChange={() => handleRadioChange('has_debt_discharge_history', false)}
                        className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                      />
                      <span className="ml-2">No</span>
                    </label>
                  </div>
                  
                  <AnimatePresence>
                    {form.watch('has_debt_discharge_history') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 border-l-2 border-[#3BAA75]/30 space-y-4">
                          <FormField
                            control={form.control}
                            name="debt_discharge_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Type:
                                </FormLabel>
                                <FormControl>
                                  <select
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                                    {...field}
                                  >
                                    <option value="">Select Type</option>
                                    <option value="bankruptcy">Bankruptcy</option>
                                    <option value="consumer_proposal">Consumer Proposal</option>
                                    <option value="division_1_proposal">Division 1 Proposal</option>
                                    <option value="other">Other</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="debt_discharge_status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Status:
                                </FormLabel>
                                <FormControl>
                                  <select
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                                    {...field}
                                  >
                                    <option value="">Select Status</option>
                                    <option value="active">Active</option>
                                    <option value="discharged">Discharged</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="debt_discharge_year"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Year Filed:
                                </FormLabel>
                                <FormControl>
                                  <input
                                    type="number"
                                    min="1980"
                                    max={new Date().getFullYear()}
                                    placeholder="YYYY"
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {form.watch('debt_discharge_status') === 'active' && (
                            <FormField
                              control={form.control}
                              name="amount_owed"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium text-gray-700">
                                    Amount Owed:
                                  </FormLabel>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <DollarSign className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <FormControl>
                                      <CurrencyInput
                                        placeholder="Enter amount owed"
                                        prefix="$"
                                        groupSeparator=","
                                        decimalSeparator="."
                                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent transition-all duration-200"
                                        value={field.value}
                                        onValueChange={(value) => field.onChange(value || '')}
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="consentToSoftCheck"
                      checked={form.watch('consentToSoftCheck')}
                      onChange={(e) => form.setValue('consentToSoftCheck', e.target.checked, { shouldValidate: true })}
                      type="checkbox"
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="consentToSoftCheck" className="font-medium text-gray-700">
                      I consent to a soft credit check
                    </label>
                    <p className="text-gray-500">
                      This won't affect your credit score and allows us to provide you with accurate pre-qualification options.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="termsAccepted"
                      checked={form.watch('termsAccepted')}
                      onChange={(e) => form.setValue('termsAccepted', e.target.checked, { shouldValidate: true })}
                      type="checkbox"
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="termsAccepted" className="font-medium text-gray-700">
                      I accept the terms and conditions
                    </label>
                    <p className="text-gray-500">
                      By checking this box, you agree to our <a href="/terms" className="text-[#3BAA75] hover:underline">Terms of Service</a> and <a href="/privacy" className="text-[#3BAA75] hover:underline">Privacy Policy</a>.
                    </p>
                  </div>
                </div>
                
                {(form.formState.errors.consentToSoftCheck || form.formState.errors.termsAccepted) && (
                  <p className="text-red-500 text-sm mt-2">
                    {form.formState.errors.consentToSoftCheck?.message || form.formState.errors.termsAccepted?.message}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-emerald-300/30 p-8 lg:p-12 border border-gray-100">
      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-8">
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={4} 
          onStepClick={(step) => {
            // Only allow going back to previous steps
            if (step < currentStep) {
              setCurrentStep(step);
            }
          }}
        />
      </div>
      
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center"
        >
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
      
      {/* Form Steps */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain layout
            )}
            
            <Button
              type="button"
              onClick={handleNext}
              className="w-full md:w-auto flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#3BAA75] to-[#2D8259] hover:from-[#2D8259] hover:to-[#1F5F3F] shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep < 4 ? (
                <>
                  Next
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              ) : (
                <>
                  Get Pre-Qualified
                  <CheckCircle className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Processing Animation */}
      {isProcessing && (
        <ProcessingAnimation 
          onComplete={() => setIsProcessing(false)}
        />
      )}
    </div>
  );
};