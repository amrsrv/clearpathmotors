import React, { useState, useEffect, useRef } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import CurrencyInputField from './CurrencyInputField';
import { vehicles } from '../pages/Vehicles';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import ExistingUserModal from './ExistingUserModal';
import type { CreditScoreBand } from '../types/database';

interface PreQualificationFormProps {
  onComplete: (applicationId: string, tempUserId: string, formData: any) => void;
}

// Define the form schema
const formSchema = z.object({
  // Step 1: Vehicle Type
  vehicle_type: z.string().min(1, 'Please select a vehicle type'),
  
  // Step 2: Monthly Budget
  desired_monthly_payment: z.number().min(100, 'Monthly payment must be at least $100'),
  
  // Step 3: Credit Score
  credit_score: z.number().int().min(300, 'Credit score must be at least 300').max(850, 'Credit score cannot exceed 850'),
  
  // Step 4: Home Address & Housing Info
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().min(1, 'Postal code is required')
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Please enter a valid postal code'),
  housing_status: z.string().min(1, 'Housing status is required'),
  housing_payment: z.number().min(0, 'Housing payment must be a positive number'),
  
  // Step 5: Employment & Income
  employment_status: z.string().min(1, 'Employment status is required'),
  employer_name: z.string().min(1, 'Employer name is required'),
  annual_income: z.number().min(1, 'Annual income is required'),
  
  // Step 6: Personal Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  
  // Terms and consent
  consent_soft_check: z.boolean().refine(val => val === true, {
    message: 'You must consent to a soft credit check',
  }),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  
  // Password fields for account creation (will be used in the final step)
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  confirmPassword: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const FORM_STORAGE_KEY = 'clearpath_prequalification_form_data';

const PreQualificationForm: React.FC<PreQualificationFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [showExistingUserModal, setShowExistingUserModal] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user } = useAuth();
  
  // Initialize form with default values
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_type: '',
      desired_monthly_payment: 500,
      credit_score: 650,
      address: '',
      city: '',
      province: '',
      postal_code: '',
      housing_status: '',
      housing_payment: 0,
      employment_status: '',
      employer_name: '',
      annual_income: 0,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      consent_soft_check: false,
      terms_accepted: false,
    },
    mode: 'onChange',
  });
  
  const { handleSubmit, trigger, watch, setValue, control, formState: { errors, isValid }, clearErrors } = methods;
  
  // Watch values for validation and UI updates
  const vehicleType = watch('vehicle_type');
  const creditScore = watch('credit_score');
  const currentStepFields = watch();

  // Generate a temporary user ID on component mount
  useEffect(() => {
    const initializeTempUserId = () => {
      // Check if we already have a temp user ID stored
      const storedTempUserId = localStorage.getItem('tempUserId');
      
      if (user) {
        // If user is authenticated, we don't need a temp user ID
        console.log('PreQualificationForm: User is authenticated, no need for temp user ID');
        return;
      }
      
      if (storedTempUserId) {
        console.log('PreQualificationForm: Using existing temp user ID:', storedTempUserId);
        setTempUserId(storedTempUserId);
        return;
      }
      
      try {
        // Generate a new UUID for the temp user ID
        const newTempUserId = crypto.randomUUID();
        localStorage.setItem('tempUserId', newTempUserId);
        setTempUserId(newTempUserId);
        console.log('PreQualificationForm: Generated new temp user ID:', newTempUserId);
      } catch (error) {
        console.error('PreQualificationForm: Error generating temp user ID:', error);
      }
    };

    initializeTempUserId();
    
    // Check for saved form data in sessionStorage
    const savedFormData = sessionStorage.getItem(FORM_STORAGE_KEY);
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        console.log('Restoring saved form data from session storage');
        
        // Update form with saved values
        Object.entries(parsedData).forEach(([key, value]) => {
          setValue(key as any, value);
        });
        
        // Clear the saved data
        sessionStorage.removeItem(FORM_STORAGE_KEY);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, [setValue, user]);

  // If user is logged in, set email field to user's email and make it read-only
  useEffect(() => {
    if (user?.email) {
      setValue('email' as any, user.email);
    }
  }, [user, setValue]);

  // Check if current step is valid
  const isStepValid = () => {
    const fieldsToValidate = {
      1: ['vehicle_type'],
      2: ['desired_monthly_payment'],
      3: ['credit_score'],
      4: ['address', 'city', 'province', 'postal_code', 'housing_status', 'housing_payment'],
      5: ['employment_status', 'employer_name', 'annual_income'],
      6: ['first_name', 'last_name', 'email', 'phone', 'consent_soft_check', 'terms_accepted'],
    };
    
    const currentStepFieldsArray = fieldsToValidate[currentStep as keyof typeof fieldsToValidate];
    
    // Check if any of the current step fields have errors
    return !currentStepFieldsArray.some(field => !!errors[field as keyof FormValues]);
  };
  
  // Function to handle next step
  const handleNextStep = async () => {
    // Define fields to validate for each step
    const fieldsToValidate = {
      1: ['vehicle_type'],
      2: ['desired_monthly_payment'],
      3: ['credit_score'],
      4: ['address', 'city', 'province', 'postal_code', 'housing_status', 'housing_payment'],
      5: ['employment_status', 'employer_name', 'annual_income'],
      6: ['first_name', 'last_name', 'email', 'phone', 'consent_soft_check', 'terms_accepted'],
    };
    
    // Validate current step fields
    const isStepValid = await trigger(fieldsToValidate[currentStep as keyof typeof fieldsToValidate]);
    
    if (isStepValid) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        // Scroll to top of form
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        // Final step submission
        handleSubmit(onSubmit)();
      }
    }
  };
  
  // Function to handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll to top of form
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Function to determine credit score band based on credit score
  const getCreditScoreBand = (score: number): CreditScoreBand => {
    if (score >= 750) return 'excellent';
    if (score >= 660) return 'good';
    if (score >= 560) return 'fair';
    return 'poor';
  };
  
  // Function to handle form submission
  const onSubmit = async (data: FormValues) => {
    console.log('FORM SUBMISSION STARTED - Setting isSubmitting to true');
    setIsSubmitting(true);
    console.log('Form data being submitted:', JSON.stringify(data, null, 2));
    
    try {
      console.log('PreQualificationForm: Submitting application with data:', {
        ...data, 
        password: data.password ? '********' : undefined,
        confirmPassword: data.confirmPassword ? '********' : undefined
      });
      
      // Use the temp user ID we generated
      let currentTempUserId = tempUserId;
      console.log('Current tempUserId:', currentTempUserId);
      
      // If we don't have a temp user ID, generate one now
      if (!currentTempUserId) {
        currentTempUserId = crypto.randomUUID();
        localStorage.setItem('tempUserId', currentTempUserId);
        console.log('Generated temp user ID on submit:', currentTempUserId);
      }
      
      // Calculate loan amount range based on monthly payment
      // This is a simplified calculation and should be replaced with your actual business logic
      const interestRate = 5.99;
      const interestRateMax = 7.99;
      const loanTerm = 60; // 5 years in months
      const monthlyRate = interestRate / 1200;
      const paymentFactor = (monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / (Math.pow(1 + monthlyRate, loanTerm) - 1);
      
      // Calculate loan amount based on desired monthly payment
      const loanAmount = data.desired_monthly_payment / paymentFactor;
      console.log('Calculated loan amount:', loanAmount);
      
      // Set loan range (min and max)
      const loanAmountMin = Math.round(loanAmount * 0.8);
      const loanAmountMax = Math.round(loanAmount * 1.2);

      // Determine credit score band
      const creditScoreBand = getCreditScoreBand(data.credit_score);
      console.log('PreQualificationForm: Credit score band:', creditScoreBand);
      
      // Prepare application data
      const applicationData = {
        temp_user_id: currentTempUserId,
        user_id: user?.id || null,
        vehicle_type: data.vehicle_type,
        desired_monthly_payment: data.desired_monthly_payment,
        credit_score: data.credit_score,
        address: data.address,
        city: data.city,
        province: data.province,
        postal_code: data.postal_code,
        housing_status: data.housing_status,
        housing_payment: data.housing_payment,
        employment_status: data.employment_status,
        employer_name: data.employer_name,
        annual_income: data.annual_income,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        loan_amount_min: loanAmountMin,
        loan_amount_max: loanAmountMax,
        interest_rate_min: interestRate,
        interest_rate_max: interestRateMax,
        interest_rate: interestRate,
        loan_term_min: loanTerm,
        loan_term_max: 84, // Maximum term length
        loan_term: loanTerm,
        has_driver_license: true,
        status: 'pending_documents',
        current_stage: 1,
        consent_soft_check: data.consent_soft_check,
        terms_accepted: data.terms_accepted,
      };
      console.log('Application data prepared:', JSON.stringify(applicationData, null, 2));
      
      console.log('PreQualificationForm: Prepared application data:', {
        ...applicationData,
        // Avoid logging personal data in production
        first_name: '***',
        last_name: '***',
        phone: '***********',
        address: '************'
      });
      
      console.log('PreQualificationForm: About to insert application into Supabase');
      try {
        // Insert application into Supabase
        const { data: application, error } = await supabase
        const { data: insertedApplication, error: supabaseError } = await supabase
          .insert(applicationData)
          .select()
          .single();
        
        application = insertedApplication; // Assign to outer scope variable for use outside try block

        if (supabaseError) {
          console.error('PreQualificationForm: Error submitting application:', supabaseError);
          console.log('PreQualificationForm: Error details:', JSON.stringify(supabaseError, null, 2));
          console.log('PreQualificationForm: Error code:', supabaseError.code);
          console.log('PreQualificationForm: Error message:', supabaseError.message);
          console.log('PreQualificationForm: Error details:', supabaseError.details);
          console.log('PreQualificationForm: Error hint:', supabaseError.hint);
          
          if (supabaseError.code === '23505') {
            toast.error('An application with this email already exists.');
          } else if (supabaseError.code === '42501') {
            toast.error('Permission denied. Please check your credentials.');
          } else if (supabaseError.code === '22P02') {
            toast.error('Invalid data format. Please check your inputs.');
          } else if (supabaseError.code === 'PGRST204') { // Example for a specific Supabase error code
            toast.error('Database schema error. Please contact support.');
          } else {
            toast.error('Failed to submit application. Please try again.');
          }
          
          setIsSubmitting(false);
          return;
        }
        
        console.log('PreQualificationForm: Application submitted successfully:', application.id);
        console.log('PreQualificationForm: Full application response:', JSON.stringify(application, null, 2));
        
        // Create initial application stage
        try {
          console.log('PreQualificationForm: Creating initial application stage');
          const { error: stageError } = await supabase
            .from('application_stages')
            .insert({
              application_id: application.id,
              stage_number: 1,
              status: 'completed',
              notes: 'Application submitted successfully'
            });
            
          if (stageError) {
            console.error('PreQualificationForm: Error creating application stage:', stageError);
            console.log('PreQualificationForm: Stage error details:', JSON.stringify(stageError, null, 2));
            console.log('PreQualificationForm: Stage error code:', stageError.code);
            console.log('PreQualificationForm: Stage error message:', stageError.message);
            // Continue despite stage error
          } else {
            console.log('PreQualificationForm: Application stage created successfully');
          }
        } catch (stageError) {
          console.error('PreQualificationForm: Exception creating application stage:', stageError);
          console.log('PreQualificationForm: Stage error details:', stageError instanceof Error ? stageError.message : JSON.stringify(stageError));
          // Continue despite stage error
        }
        
        // Create welcome notification
        try {
          console.log('PreQualificationForm: Creating welcome notification');
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: null,
              temp_user_id: currentTempUserId,
              title: 'Welcome to Clearpath Motors!',
              message: 'Thank you for starting your auto financing journey with us. Create an account to continue your application.',
              read: false
            });
            
          if (notificationError) {
            console.error('PreQualificationForm: Error creating welcome notification:', notificationError);
            console.log('PreQualificationForm: Notification error code:', notificationError.code);
            console.log('PreQualificationForm: Notification error message:', notificationError.message);
            // Continue despite notification error
          } else {
            console.log('PreQualificationForm: Welcome notification created successfully');
          }
        } catch (notificationError) {
          console.error('PreQualificationForm: Exception creating notification:', notificationError);
          console.log('PreQualificationForm: Notification error details:', notificationError instanceof Error ? notificationError.message : JSON.stringify(notificationError));
          // Continue despite notification error
        }
        
        // Call onComplete with the application ID, temp user ID, and form data
        console.log('PreQualificationForm: About to call onComplete with:', {
          applicationId: application.id,
          tempUserId: currentTempUserId
        });
        
        console.log('PreQualificationForm: Right before calling onComplete');
        
        toast.success('Application submitted successfully!');
        onComplete(application.id, currentTempUserId, {
          ...data,
          password: data.password || '', // Password will be set in the claim page
          loan_amount_min: loanAmountMin,
          loan_amount_max: loanAmountMax, 
          interest_rate_min: interestRate,
          interest_rate_max: interestRateMax,
          loan_term_min: loanTerm,
          loan_term_max: 84,
          monthly_rent_or_mortgage: data.housing_payment,
          interest_rate: interestRate
        });
        
        console.log('PreQualificationForm: After calling onComplete');
        
        console.log('PreQualificationForm: onComplete called successfully');
      } catch (insertError) {
        console.error('PreQualificationForm: Exception during Supabase insert:', insertError);
        console.log('PreQualificationForm: Insert error details:', insertError instanceof Error ? insertError.message : JSON.stringify(insertError));
        console.log('PreQualificationForm: Insert error stack:', insertError instanceof Error ? insertError.stack : 'No stack trace available');
        toast.error('Failed to submit application. Please try again.');
      }
      
    } catch (error) {
      console.error('PreQualificationForm: Error in form submission (caught in try-catch):', error);
      console.log('PreQualificationForm: Error details:', error instanceof Error ? error.message : JSON.stringify(error));
      console.log('PreQualificationForm: Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
      toast.error('An error occurred. Please try again.');
    } finally {
      console.log('PreQualificationForm: Finally block reached, setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };
  
  // Function to get credit score color class
  const getCreditScoreColorClass = (score: number) => {
    if (score < 580) return 'bg-red-500';
    if (score < 670) return 'bg-orange-500';
    if (score < 740) return 'bg-yellow-500';
    if (score < 800) return 'bg-green-500';
    return 'bg-emerald-500';
  };
  
  // Function to get credit score text
  const getCreditScoreText = (score: number) => {
    if (score < 580) return 'Poor';
    if (score < 670) return 'Fair';
    if (score < 740) return 'Good';
    if (score < 800) return 'Very Good';
    return 'Excellent';
  };
  
  // Animation variants for step transitions
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };
  
  return (
    <FormProvider {...methods}>
      <div className="w-full max-w-3xl mx-auto" ref={formRef}>
        <form className="bg-white rounded-xl shadow-lg p-8 md:p-10 mb-24">
          <AnimatePresence mode="wait">
            {/* Step 1: Vehicle Type */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-gray-900">Select Your Vehicle Type</h2>
                <p className="text-gray-600">Choose the type of vehicle you're interested in financing.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.type}
                      type="button"
                      onClick={() => {
                        setValue('vehicle_type', vehicle.type);
                        clearErrors('vehicle_type'); // Clear errors when a vehicle is selected
                      }}
                      className={`relative overflow-hidden rounded-lg transition-all duration-200 ${
                        vehicleType === vehicle.type
                          ? 'ring-4 ring-[#3BAA75] ring-opacity-50 transform scale-[1.02]'
                          : 'hover:shadow-md'
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <img
                          src={vehicle.image}
                          alt={vehicle.type}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <div className="p-4 text-center">
                        <h3 className="text-xl font-bold text-gray-900">{vehicle.type}</h3>
                        <p className="text-sm text-gray-600">{vehicle.description}</p>
                      </div>
                      {vehicleType === vehicle.type && (
                        <div className="absolute top-2 right-2 bg-[#3BAA75] text-white p-1 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                {errors.vehicle_type && (
                  <p className="text-red-500 text-sm">{errors.vehicle_type.message}</p>
                )}
              </motion.div>
            )}
            
            {/* Step 2: Monthly Budget */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-gray-900">Monthly Budget</h2>
                <p className="text-gray-600">What's your monthly budget for a vehicle?</p>
                
                <CurrencyInputField
                  control={control}
                  name="desired_monthly_payment"
                  label="Monthly Payment"
                  placeholder="Enter your desired monthly payment"
                  min={100}
                  max={2000}
                />
                
                <div className="mt-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjust your monthly payment
                  </label>
                  <Controller
                    control={control}
                    name="desired_monthly_payment"
                    render={({ field }) => (
                      <Slider
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        min={100}
                        max={2000}
                        step={50}
                        className="py-4"
                      />
                    )}
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>$100</span>
                    <span>$2,000+</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Step 3: Credit Score */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-gray-900">Credit Score</h2>
                <p className="text-gray-600">Estimate your current credit score.</p>
                
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Your estimated credit score
                    </label>
                    <div className="flex items-center">
                      <span className="text-lg font-semibold">{creditScore}</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full text-white ${getCreditScoreColorClass(creditScore)}`}>
                        {getCreditScoreText(creditScore)}
                      </span>
                    </div>
                  </div>
                  
                  <Controller
                    control={control}
                    name="credit_score"
                    render={({ field }) => (
                      <Slider
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        min={300}
                        max={850}
                        step={10}
                        className="py-4"
                      />
                    )}
                  />
                  
                  <div className="flex justify-between text-sm mt-2">
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-red-500 rounded-l-full"></div>
                      <span className="text-xs text-gray-500">Poor<br/>300-579</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-orange-500"></div>
                      <span className="text-xs text-gray-500">Fair<br/>580-669</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-yellow-500"></div>
                      <span className="text-xs text-gray-500">Good<br/>670-739</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-green-500"></div>
                      <span className="text-xs text-gray-500">Very Good<br/>740-799</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-emerald-500 rounded-r-full"></div>
                      <span className="text-xs text-gray-500">Excellent<br/>800-850</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Step 4: Home Address & Housing Info */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-gray-900">Home Address & Housing</h2>
                <p className="text-gray-600">Tell us about where you live.</p>
                
                <div className="space-y-4">
                  <Controller
                    control={control}
                    name="address"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street Address
                        </label>
                        <Input
                          {...field}
                          placeholder="123 Main St"
                          className={`${error ? 'border-red-500' : ''} text-base`}
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={control}
                    name="city"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <Input
                          {...field}
                          placeholder="Toronto"
                          className={`${error ? 'border-red-500' : ''} text-base`}
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={control}
                    name="province"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Province
                        </label>
                        <select
                          {...field}
                          className={`w-full h-11 rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent px-4 py-2 text-base`}
                        >
                          <option value="">Select Province</option>
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
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={control}
                    name="postal_code"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code
                        </label>
                        <Input
                          {...field}
                          placeholder="M5V 2H1"
                          className={`${error ? 'border-red-500' : ''} text-base`}
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={control}
                    name="housing_status"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Housing Status
                        </label>
                        <select
                          {...field}
                          className={`w-full h-11 rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent px-4 py-2 text-base`}
                          required
                        >
                          <option value="">Select Housing Status</option>
                          <option value="own">Own</option>
                          <option value="rent">Rent</option>
                          <option value="live_with_parents">Live with Parents</option>
                          <option value="other">Other</option>
                        </select>
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <CurrencyInputField
                    control={control}
                    name="housing_payment"
                    label="Monthly Rent or Mortgage Payment"
                    placeholder="Enter your monthly housing payment"
                  />
                </div>
              </motion.div>
            )}
            
            {/* Step 5: Employment & Income */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-gray-900">Employment & Income</h2>
                <p className="text-gray-600">Tell us about your employment and income.</p>
                
                <div className="space-y-4">
                  <Controller
                    control={control}
                    name="employment_status"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employment Status
                        </label>
                        <select
                          {...field}
                          className={`w-full h-11 rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent px-4 py-2 text-base`}
                          required
                        >
                          <option value="">Select Employment Status</option>
                          <option value="employed">Employed</option>
                          <option value="self_employed">Self-Employed</option>
                          <option value="unemployed">Unemployed</option>
                          <option value="student">Student</option>
                          <option value="retired">Retired</option>
                        </select>
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={control}
                    name="employer_name"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employer Name or Business Name
                        </label>
                        <Input
                          {...field}
                          placeholder="Where do you work?"
                          className={`${error ? 'border-red-500' : ''} text-base`}
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <CurrencyInputField
                    control={control}
                    name="annual_income"
                    label="Annual Income"
                    placeholder="Enter your annual income"
                  />
                </div>
              </motion.div>
            )}
            
            {/* Step 6: Personal Information */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
                <p className="text-gray-600">Tell us about yourself.</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={control}
                      name="first_name"
                      render={({ field, fieldState: { error } }) => (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          <Input
                            {...field}
                            placeholder="John"
                            className={`${error ? 'border-red-500' : ''} text-base`}
                          />
                          {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={control}
                      name="last_name"
                      render={({ field, fieldState: { error } }) => (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          <Input
                            {...field}
                            placeholder="Doe"
                            className={`${error ? 'border-red-500' : ''} text-base`}
                          />
                          {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                        </div>
                      )}
                    />
                  </div>
                  
                  <Controller
                    control={control}
                    name="email"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <Input
                          {...field}
                          placeholder="you@example.com"
                          className={`${error ? 'border-red-500' : ''} text-base`}
                          disabled={!!user?.email}
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field, fieldState: { error } }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <Input
                          {...field}
                          placeholder="(123) 456-7890"
                          className={`${error ? 'border-red-500' : ''} text-base`}
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                      </div>
                    )}
                  />
                  
                  <div className="space-y-2 pt-4">
                    <div className="flex items-start">
                      <Controller
                        control={control}
                        name="consent_soft_check"
                        render={({ field }) => (
                          <div className="flex items-start">
                            <Checkbox
                              id="consent_soft_check"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-1"
                            />
                            <label
                              htmlFor="consent_soft_check"
                              className="ml-2 text-sm text-gray-600"
                            >
                              I consent to a soft credit check that won't affect my credit score
                            </label>
                          </div>
                        )}
                      />
                    </div>
                    {errors.consent_soft_check && (
                      <p className="text-red-500 text-sm">{errors.consent_soft_check.message}</p>
                    )}
                    
                    <div className="flex items-start">
                      <Controller
                        control={control}
                        name="terms_accepted"
                        render={({ field }) => (
                          <div className="flex items-start">
                            <Checkbox
                              id="terms_accepted"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-1"
                            />
                            <label
                              htmlFor="terms_accepted"
                              className="ml-2 text-sm text-gray-600"
                            >
                              I accept the <a href="/terms" className="text-[#3BAA75] hover:underline">terms and conditions</a> and <a href="/privacy" className="text-[#3BAA75] hover:underline">privacy policy</a>
                            </label>
                          </div>
                        )}
                      />
                    </div>
                    {errors.terms_accepted && (
                      <p className="text-red-500 text-sm">{errors.terms_accepted.message}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg border-t border-gray-100 z-50">
        <div className="max-w-3xl mx-auto flex justify-between">
          {currentStep > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="w-24"
              >
                Back
              </Button>
              <div className="w-24">{/* Empty div to maintain flex spacing */}</div>
            </>
          )}
          
          <div className="flex items-center justify-center">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full mx-1 ${
                  index + 1 === currentStep 
                    ? 'bg-[#3BAA75]' 
                    : index + 1 < currentStep 
                      ? 'bg-[#3BAA75]/50' 
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <Button
            type="button"
            onClick={handleNextStep}
            disabled={isSubmitting || !isStepValid()}
            className="bg-[#3BAA75] hover:bg-[#2D8259] w-24"
          >
            {currentStep === totalSteps ? (
              isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Submit
                </div>
              ) : (
                'Submit'
              )
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>

      {/* Existing User Modal */}
      <AnimatePresence>
        {showExistingUserModal && (
          <ExistingUserModal
            email=""
            onClose={() => setShowExistingUserModal(false)}
            currentPath={location.pathname}
          />
        )}
      </AnimatePresence>
    </FormProvider>
  );
};

export default PreQualificationForm;