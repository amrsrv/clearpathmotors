import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { ProcessingAnimation } from './ProcessingAnimation';
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
  Building
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    dateOfBirth: '',
    employmentStatus: 'employed',
    employerName: '',
    occupation: '',
    annualIncome: '',
    creditScore: '',
    housingStatus: 'rent',
    housingPayment: '',
    vehicleType: '',
    desiredMonthlyPayment: '',
    downPayment: '0',
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
              address: data.address || '',
              city: data.city || '',
              province: data.province || '',
              postalCode: data.postal_code || '',
              dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '',
              employmentStatus: data.employment_status || 'employed',
              employerName: data.employer_name || '',
              occupation: data.occupation || '',
              annualIncome: data.annual_income?.toString() || '',
              creditScore: data.credit_score?.toString() || '',
              housingStatus: data.housing_status || 'rent',
              housingPayment: data.housing_payment?.toString() || '',
              vehicleType: data.vehicle_type || '',
              desiredMonthlyPayment: data.desired_monthly_payment?.toString() || '',
              downPayment: data.down_payment?.toString() || '0',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    setError(null);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!formData.firstName.trim()) {
          setError('First name is required');
          return false;
        }
        if (!formData.lastName.trim()) {
          setError('Last name is required');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email is required');
          return false;
        }
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
          setError('Invalid email address');
          return false;
        }
        if (!formData.phone.trim()) {
          setError('Phone number is required');
          return false;
        }
        if (!/^\+?1?\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
          setError('Invalid phone number');
          return false;
        }
        return true;

      case 2:
        if (!formData.address.trim()) {
          setError('Address is required');
          return false;
        }
        if (!formData.city.trim()) {
          setError('City is required');
          return false;
        }
        if (!formData.province.trim()) {
          setError('Province is required');
          return false;
        }
        if (!formData.postalCode.trim()) {
          setError('Postal code is required');
          return false;
        }
        if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(formData.postalCode)) {
          setError('Invalid postal code format (e.g. A1A 1A1)');
          return false;
        }
        return true;

      case 3:
        if (!formData.employmentStatus) {
          setError('Employment status is required');
          return false;
        }
        if (formData.employmentStatus !== 'unemployed') {
          if (!formData.employerName.trim()) {
            setError('Employer name is required');
            return false;
          }
          if (!formData.occupation.trim()) {
            setError('Occupation is required');
            return false;
          }
        }
        if (!formData.annualIncome.trim()) {
          setError('Annual income is required');
          return false;
        }
        if (isNaN(Number(formData.annualIncome)) || Number(formData.annualIncome) < 0) {
          setError('Annual income must be a valid number');
          return false;
        }
        return true;

      case 4:
        if (!formData.vehicleType.trim()) {
          setError('Vehicle type is required');
          return false;
        }
        if (!formData.desiredMonthlyPayment.trim()) {
          setError('Desired monthly payment is required');
          return false;
        }
        if (isNaN(Number(formData.desiredMonthlyPayment)) || Number(formData.desiredMonthlyPayment) <= 0) {
          setError('Monthly payment must be a valid number greater than 0');
          return false;
        }
        if (!formData.termsAccepted) {
          setError('You must accept the terms and conditions');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
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
      
      const applicationData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        date_of_birth: formData.dateOfBirth || null,
        employment_status: formData.employmentStatus,
        employer_name: formData.employerName,
        occupation: formData.occupation,
        annual_income: parseFloat(formData.annualIncome),
        monthly_income: parseFloat(formData.annualIncome) / 12,
        credit_score: formData.creditScore ? parseInt(formData.creditScore) : null,
        housing_status: formData.housingStatus,
        housing_payment: formData.housingPayment ? parseFloat(formData.housingPayment) : null,
        vehicle_type: formData.vehicleType,
        desired_monthly_payment: parseFloat(formData.desiredMonthlyPayment),
        down_payment: formData.downPayment ? parseFloat(formData.downPayment) : 0,
        status: 'pending_documents',
        current_stage: 1,
        // Calculate loan range based on monthly payment
        loan_amount_min: calculateLoanAmount(parseFloat(formData.desiredMonthlyPayment) * 0.8, 5.99, 60),
        loan_amount_max: calculateLoanAmount(parseFloat(formData.desiredMonthlyPayment) * 1.2, 5.99, 60),
        interest_rate: 5.99,
        loan_term: 60,
        // Set user_id for authenticated users, temp_user_id for anonymous users
        user_id: user?.id || null,
        temp_user_id: user?.id ? null : tempUserId,
        terms_accepted: formData.termsAccepted
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
        
        // Call onComplete with the application ID, temp user ID, and form data
        onComplete(data.id, tempUserId, formData);
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
          <div className="text-sm text-gray-500">Step {step} of 4</div>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-[#3BAA75] rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
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
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              
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
                  Date of Birth (Optional)
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
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-4">Address Information</h3>
              
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
                    Monthly Housing Payment
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="housingPayment"
                      name="housingPayment"
                      value={formData.housingPayment}
                      onChange={handleChange}
                      className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="1500"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-4">Financial Information</h3>
              
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
                  <input
                    type="text"
                    id="annualIncome"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="60000"
                  />
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
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-4">Vehicle Preferences</h3>
              
              <div className="mb-6">
                <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Car className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="Car">Car</option>
                    <option value="SUV">SUV</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="desiredMonthlyPayment" className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Monthly Payment
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="desiredMonthlyPayment"
                    name="desiredMonthlyPayment"
                    value={formData.desiredMonthlyPayment}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="500"
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
                  <input
                    type="text"
                    id="downPayment"
                    name="downPayment"
                    value={formData.downPayment}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="0"
                  />
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
                      . You also consent to a soft credit check which will not affect your credit score.
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

          {step < 4 ? (
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
    </div>
  );
};