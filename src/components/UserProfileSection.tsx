import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Application } from '../types/database';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  User, 
  Calendar, 
  CreditCard, 
  Briefcase, 
  DollarSign, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Home, 
  Clock, 
  FileText, 
  Shield, 
  Key, 
  Bell, 
  Smartphone, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  LogOut, 
  UserCheck, 
  Wallet, 
  HelpCircle,
  Landmark,
  Banknote,
  Coins,
  BadgeCheck,
  BadgeX,
  MessageSquare,
  Car
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface UserProfileSectionProps {
  application: Application;
  onUpdate: () => void;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({ application, onUpdate }) => {
  const { user, signOut, updatePassword } = useAuth();
  const [formData, setFormData] = useState<Partial<Application>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: true,
    employment: true,
    financial: true,
    housing: false,
    government: false,
    debt: false,
    account: false
  });
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Only initialize formData when application ID changes or component mounts
  useEffect(() => {
    if (application && application.id !== applicationId) {
      setFormData({
        // Personal Information
        first_name: application.first_name || '',
        last_name: application.last_name || '',
        email: application.email || '',
        phone: application.phone || '',
        date_of_birth: application.date_of_birth || '',
        marital_status: application.marital_status || null,
        dependents: application.dependents || 0,
        
        // Address Information
        address: application.address || '',
        city: application.city || '',
        province: application.province || '',
        postal_code: application.postal_code || '',
        residence_duration_years: application.residence_duration_years || 0,
        residence_duration_months: application.residence_duration_months || 0,
        
        // Employment Information
        employment_status: application.employment_status || 'employed',
        employer_name: application.employer_name || '',
        occupation: application.occupation || '',
        employment_duration_years: application.employment_duration_years || 0,
        employment_duration_months: application.employment_duration_months || 0,
        
        // Financial Information
        annual_income: application.annual_income || 0,
        other_income: application.other_income || 0,
        credit_score: application.credit_score || 0,
        vehicle_type: application.vehicle_type || '',
        desired_monthly_payment: application.desired_monthly_payment || 0,
        down_payment: application.down_payment || 0,
        
        // Housing Information
        housing_status: application.housing_status || null,
        housing_payment: application.housing_payment || 0,
        
        // Government Benefits
        collects_government_benefits: application.collects_government_benefits || false,
        government_benefit_types: application.government_benefit_types || [],
        government_benefit_other: application.government_benefit_other || '',
        
        // Debt Discharge History
        has_debt_discharge_history: application.has_debt_discharge_history || false,
        debt_discharge_type: application.debt_discharge_type || null,
        debt_discharge_status: application.debt_discharge_status || null,
        debt_discharge_year: application.debt_discharge_year || null,
        amount_owed: application.amount_owed || 0,
        trustee_name: application.trustee_name || '',
        debt_discharge_comments: application.debt_discharge_comments || '',
        
        // Contact Preferences
        preferred_contact_method: application.preferred_contact_method || null,
        
        // Consent
        has_driver_license: application.has_driver_license || false
      });
      setApplicationId(application.id);
    }
  }, [application, applicationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError(null);
    setSuccess(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Validate form data
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone) {
        throw new Error('Please fill in all required fields');
      }
      
      // Update application in Supabase
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);
      
      if (updateError) throw updateError;
      
      setSuccess(true);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      
      // Call onUpdate to refresh data in parent component
      onUpdate();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'An error occurred while updating your profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError(null);
    
    try {
      // Validate password data
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error('Please fill in all password fields');
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      
      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      // Update password
      await updatePassword(passwordData.newPassword);
      
      toast.success('Password updated successfully');
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'An error occurred while updating your password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setPasswordError('Please type DELETE to confirm account deletion');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // In a real implementation, this would delete the user's account
      // For now, we'll just show a success message
      setTimeout(() => {
        toast.success('Account deletion request submitted');
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
      }, 1500);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setPasswordError(error.message || 'An error occurred while deleting your account');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format currency values
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
  };

  // Format date values
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not provided';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format employment status
  const formatEmploymentStatus = (status: string | null | undefined) => {
    if (!status) return 'Not specified';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format housing status
  const formatHousingStatus = (status: string | null | undefined) => {
    if (!status) return 'Not specified';
    
    const statusMap: Record<string, string> = {
      'own': 'Own',
      'rent': 'Rent',
      'live_with_parents': 'Live with Parents',
      'other': 'Other'
    };
    
    return statusMap[status] || status;
  };

  // Format marital status
  const formatMaritalStatus = (status: string | null | undefined) => {
    if (!status) return 'Not specified';
    
    const statusMap: Record<string, string> = {
      'single': 'Single',
      'married': 'Married',
      'divorced': 'Divorced',
      'widowed': 'Widowed',
      'separated': 'Separated',
      'other': 'Other'
    };
    
    return statusMap[status] || status;
  };

  // Format debt discharge type
  const formatDebtDischargeType = (type: string | null | undefined) => {
    if (!type) return 'Not specified';
    
    const typeMap: Record<string, string> = {
      'bankruptcy': 'Bankruptcy',
      'consumer_proposal': 'Consumer Proposal',
      'division_1_proposal': 'Division 1 Proposal',
      'other': 'Other'
    };
    
    return typeMap[type] || type;
  };

  // Format debt discharge status
  const formatDebtDischargeStatus = (status: string | null | undefined) => {
    if (!status) return 'Not specified';
    
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'discharged': 'Discharged'
    };
    
    return statusMap[status] || status;
  };

  // Format preferred contact method
  const formatContactMethod = (method: string | null | undefined) => {
    if (!method) return 'Not specified';
    
    const methodMap: Record<string, string> = {
      'email': 'Email',
      'phone': 'Phone',
      'sms': 'SMS'
    };
    
    return methodMap[method] || method;
  };

  // Format government benefit types
  const formatBenefitTypes = (types: string[] | null | undefined) => {
    if (!types || types.length === 0) return 'None';
    
    const typeMap: Record<string, string> = {
      'ontario_works': 'Ontario Works',
      'odsp': 'ODSP',
      'cpp': 'CPP',
      'ei': 'EI',
      'child_tax_benefit': 'Child Tax Benefit',
      'other': 'Other'
    };
    
    return types.map(type => typeMap[type] || type).join(', ');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3BAA75] to-[#2D8259] p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{application.first_name} {application.last_name}</h2>
              <p className="text-white/80">
                {application.email} • Member since {formatDate(application.created_at)}
              </p>
            </div>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-white text-[#3BAA75] rounded-lg hover:bg-white/90 transition-colors font-medium"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Application Status:</span>
              <span className="text-sm font-medium text-[#3BAA75]">
                {application.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Stage:</span>
              <span className="text-sm font-medium">{application.current_stage}/7</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            ID: {application.id.slice(0, 8)}
          </div>
        </div>
      </div>
      
      {/* Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center"
        >
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
      
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-6 p-4 bg-green-50 text-green-600 rounded-lg flex items-center"
        >
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Profile updated successfully!</span>
        </motion.div>
      )}
      
      {/* Main Content */}
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('personal')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                </div>
                {expandedSections.personal ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.personal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={formData.first_name || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={formData.last_name || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="date"
                              id="date_of_birth"
                              name="date_of_birth"
                              value={formData.date_of_birth || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="marital_status" className="block text-sm font-medium text-gray-700 mb-1">
                            Marital Status
                          </label>
                          <select
                            id="marital_status"
                            name="marital_status"
                            value={formData.marital_status || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
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
                        
                        <div>
                          <label htmlFor="dependents" className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Dependents
                          </label>
                          <input
                            type="number"
                            id="dependents"
                            name="dependents"
                            min="0"
                            value={formData.dependents || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="has_driver_license" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <input
                              type="checkbox"
                              id="has_driver_license"
                              name="has_driver_license"
                              checked={formData.has_driver_license || false}
                              onChange={(e) => setFormData(prev => ({ ...prev, has_driver_license: e.target.checked }))}
                              disabled={!isEditing}
                              className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded mr-2"
                            />
                            I have a valid driver's license
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Contact Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('contact')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                </div>
                {expandedSections.contact ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.contact && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
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
                              value={formData.email || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
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
                              value={formData.phone || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="preferred_contact_method" className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Contact Method
                          </label>
                          <select
                            id="preferred_contact_method"
                            name="preferred_contact_method"
                            value={formData.preferred_contact_method || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          >
                            <option value="">Select Preference</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                          Street Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                            Province
                          </label>
                          <select
                            id="province"
                            name="province"
                            value={formData.province || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
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
                        </div>
                        
                        <div>
                          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            id="postal_code"
                            name="postal_code"
                            value={formData.postal_code || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="residence_duration_years" className="block text-sm font-medium text-gray-700 mb-1">
                            Years at Current Address
                          </label>
                          <input
                            type="number"
                            id="residence_duration_years"
                            name="residence_duration_years"
                            min="0"
                            value={formData.residence_duration_years || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="residence_duration_months" className="block text-sm font-medium text-gray-700 mb-1">
                            Months at Current Address
                          </label>
                          <input
                            type="number"
                            id="residence_duration_months"
                            name="residence_duration_months"
                            min="0"
                            max="11"
                            value={formData.residence_duration_months || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Employment Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('employment')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Employment Information</h3>
                </div>
                {expandedSections.employment ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.employment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div>
                        <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700 mb-1">
                          Employment Status
                        </label>
                        <select
                          id="employment_status"
                          name="employment_status"
                          value={formData.employment_status || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                        >
                          <option value="employed">Employed</option>
                          <option value="self_employed">Self-Employed</option>
                          <option value="unemployed">Unemployed</option>
                          <option value="student">Student</option>
                          <option value="retired">Retired</option>
                        </select>
                      </div>
                      
                      {(formData.employment_status === 'employed' || formData.employment_status === 'self_employed') && (
                        <>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label htmlFor="employer_name" className="block text-sm font-medium text-gray-700 mb-1">
                                Employer Name
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Building className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  id="employer_name"
                                  name="employer_name"
                                  value={formData.employer_name || ''}
                                  onChange={handleChange}
                                  disabled={!isEditing}
                                  className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                                Occupation
                              </label>
                              <input
                                type="text"
                                id="occupation"
                                name="occupation"
                                value={formData.occupation || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              />
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label htmlFor="employment_duration_years" className="block text-sm font-medium text-gray-700 mb-1">
                                Years at Current Employer
                              </label>
                              <input
                                type="number"
                                id="employment_duration_years"
                                name="employment_duration_years"
                                min="0"
                                value={formData.employment_duration_years || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="employment_duration_months" className="block text-sm font-medium text-gray-700 mb-1">
                                Months at Current Employer
                              </label>
                              <input
                                type="number"
                                id="employment_duration_months"
                                name="employment_duration_months"
                                min="0"
                                max="11"
                                value={formData.employment_duration_months || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Financial Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('financial')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
                </div>
                {expandedSections.financial ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.financial && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="annual_income" className="block text-sm font-medium text-gray-700 mb-1">
                            Annual Income
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              id="annual_income"
                              name="annual_income"
                              min="0"
                              value={formData.annual_income || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="other_income" className="block text-sm font-medium text-gray-700 mb-1">
                            Other Income
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              id="other_income"
                              name="other_income"
                              min="0"
                              value={formData.other_income || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <label htmlFor="credit_score" className="block text-sm font-medium text-gray-700 mb-1">
                            Credit Score
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <CreditCard className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              id="credit_score"
                              name="credit_score"
                              min="300"
                              max="900"
                              value={formData.credit_score || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-700 mb-1">
                            Vehicle Type
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Car className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                              id="vehicle_type"
                              name="vehicle_type"
                              value={formData.vehicle_type || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            >
                              <option value="">Select Type</option>
                              <option value="Car">Car</option>
                              <option value="SUV">SUV</option>
                              <option value="Truck">Truck</option>
                              <option value="Van">Van</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="desired_monthly_payment" className="block text-sm font-medium text-gray-700 mb-1">
                            Desired Monthly Payment
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              id="desired_monthly_payment"
                              name="desired_monthly_payment"
                              min="0"
                              value={formData.desired_monthly_payment || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="down_payment" className="block text-sm font-medium text-gray-700 mb-1">
                          Down Payment
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            id="down_payment"
                            name="down_payment"
                            min="0"
                            value={formData.down_payment || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                          />
                        </div>
                      </div>
                      
                      {/* Read-only loan information */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-3">Loan Information</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Loan Range</p>
                            <p className="font-medium">
                              {formatCurrency(application.loan_amount_min)} - {formatCurrency(application.loan_amount_max)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Interest Rate</p>
                            <p className="font-medium">{application.interest_rate}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Loan Term</p>
                            <p className="font-medium">{application.loan_term} months</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Housing Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('housing')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <Home className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Housing Information</h3>
                </div>
                {expandedSections.housing ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.housing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div>
                        <label htmlFor="housing_status" className="block text-sm font-medium text-gray-700 mb-1">
                          Housing Status
                        </label>
                        <select
                          id="housing_status"
                          name="housing_status"
                          value={formData.housing_status || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                        >
                          <option value="">Select Status</option>
                          <option value="own">Own</option>
                          <option value="rent">Rent</option>
                          <option value="live_with_parents">Live with Parents</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      {(formData.housing_status === 'own' || formData.housing_status === 'rent') && (
                        <div>
                          <label htmlFor="housing_payment" className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Housing Payment
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              id="housing_payment"
                              name="housing_payment"
                              min="0"
                              value={formData.housing_payment || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Government Benefits */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('government')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <Landmark className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Government Benefits</h3>
                </div>
                {expandedSections.government ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.government && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                          <input
                            type="checkbox"
                            id="collects_government_benefits"
                            name="collects_government_benefits"
                            checked={formData.collects_government_benefits || false}
                            onChange={(e) => setFormData(prev => ({ ...prev, collects_government_benefits: e.target.checked }))}
                            disabled={!isEditing}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded mr-2"
                          />
                          I receive government benefits
                        </label>
                      </div>
                      
                      {formData.collects_government_benefits && (
                        <div className="pl-6 border-l-2 border-[#3BAA75]/20 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Benefit Types
                            </label>
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
                                    checked={formData.government_benefit_types?.includes(benefit.id)}
                                    onChange={() => {
                                      const currentTypes = [...(formData.government_benefit_types || [])];
                                      if (currentTypes.includes(benefit.id)) {
                                        setFormData(prev => ({
                                          ...prev,
                                          government_benefit_types: currentTypes.filter(t => t !== benefit.id)
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          government_benefit_types: [...currentTypes, benefit.id]
                                        }));
                                      }
                                    }}
                                    disabled={!isEditing}
                                    className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded mr-2"
                                  />
                                  <span className="text-sm">{benefit.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          {formData.government_benefit_types?.includes('other') && (
                            <div>
                              <label htmlFor="government_benefit_other" className="block text-sm font-medium text-gray-700 mb-1">
                                Other Benefit (Please Specify)
                              </label>
                              <input
                                type="text"
                                id="government_benefit_other"
                                name="government_benefit_other"
                                value={formData.government_benefit_other || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Debt Discharge History */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('debt')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <Wallet className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Debt Discharge History</h3>
                </div>
                {expandedSections.debt ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.debt && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                          <input
                            type="checkbox"
                            id="has_debt_discharge_history"
                            name="has_debt_discharge_history"
                            checked={formData.has_debt_discharge_history || false}
                            onChange={(e) => setFormData(prev => ({ ...prev, has_debt_discharge_history: e.target.checked }))}
                            disabled={!isEditing}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded mr-2"
                          />
                          I have filed for bankruptcy or consumer proposal
                        </label>
                      </div>
                      
                      {formData.has_debt_discharge_history && (
                        <div className="pl-6 border-l-2 border-[#3BAA75]/20 space-y-4">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label htmlFor="debt_discharge_type" className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                              </label>
                              <select
                                id="debt_discharge_type"
                                name="debt_discharge_type"
                                value={formData.debt_discharge_type || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              >
                                <option value="">Select Type</option>
                                <option value="bankruptcy">Bankruptcy</option>
                                <option value="consumer_proposal">Consumer Proposal</option>
                                <option value="division_1_proposal">Division 1 Proposal</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            
                            <div>
                              <label htmlFor="debt_discharge_status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                id="debt_discharge_status"
                                name="debt_discharge_status"
                                value={formData.debt_discharge_status || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              >
                                <option value="">Select Status</option>
                                <option value="active">Active</option>
                                <option value="discharged">Discharged</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label htmlFor="debt_discharge_year" className="block text-sm font-medium text-gray-700 mb-1">
                                Year Filed
                              </label>
                              <input
                                type="number"
                                id="debt_discharge_year"
                                name="debt_discharge_year"
                                min="1980"
                                max={new Date().getFullYear()}
                                value={formData.debt_discharge_year || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              />
                            </div>
                            
                            {formData.debt_discharge_status === 'active' && (
                              <div>
                                <label htmlFor="amount_owed" className="block text-sm font-medium text-gray-700 mb-1">
                                  Amount Owed
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <input
                                    type="number"
                                    id="amount_owed"
                                    name="amount_owed"
                                    min="0"
                                    value={formData.amount_owed || ''}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {formData.debt_discharge_status === 'active' && (
                            <div>
                              <label htmlFor="trustee_name" className="block text-sm font-medium text-gray-700 mb-1">
                                Trustee Name
                              </label>
                              <input
                                type="text"
                                id="trustee_name"
                                name="trustee_name"
                                value={formData.trustee_name || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                              />
                            </div>
                          )}
                          
                          <div>
                            <label htmlFor="debt_discharge_comments" className="block text-sm font-medium text-gray-700 mb-1">
                              Additional Comments
                            </label>
                            <textarea
                              id="debt_discharge_comments"
                              name="debt_discharge_comments"
                              rows={3}
                              value={formData.debt_discharge_comments || ''}
                              onChange={handleChange}
                              disabled={!isEditing}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:bg-gray-50 disabled:text-gray-700"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Account Settings */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('account')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
              >
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                </div>
                {expandedSections.account ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.account && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      {/* Password Change */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <Key className="h-5 w-5 text-[#3BAA75] mr-2" />
                            <h4 className="font-medium text-gray-900">Password</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPasswordChange(!showPasswordChange)}
                            className="text-[#3BAA75] hover:text-[#2D8259] text-sm font-medium"
                          >
                            {showPasswordChange ? 'Cancel' : 'Change Password'}
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {showPasswordChange && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                {passwordError && (
                                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span>{passwordError}</span>
                                  </div>
                                )}
                                
                                <div>
                                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Password
                                  </label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                      type="password"
                                      id="currentPassword"
                                      name="currentPassword"
                                      value={passwordData.currentPassword}
                                      onChange={handlePasswordChange}
                                      className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                  </label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                      type="password"
                                      id="newPassword"
                                      name="newPassword"
                                      value={passwordData.newPassword}
                                      onChange={handlePasswordChange}
                                      className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm New Password
                                  </label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                      type="password"
                                      id="confirmPassword"
                                      name="confirmPassword"
                                      value={passwordData.confirmPassword}
                                      onChange={handlePasswordChange}
                                      className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex justify-end">
                                  <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center gap-2 disabled:opacity-70"
                                  >
                                    {isChangingPassword ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      <>
                                        <Key className="h-4 w-4" />
                                        Update Password
                                      </>
                                    )}
                                  </button>
                                </div>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Two-Factor Authentication */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Shield className="h-5 w-5 text-[#3BAA75] mr-2" />
                            <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={twoFactorEnabled}
                              onChange={() => setTwoFactorEnabled(!twoFactorEnabled)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#3BAA75]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BAA75]"></div>
                          </label>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {twoFactorEnabled 
                            ? 'Two-factor authentication is enabled. This adds an extra layer of security to your account.'
                            : 'Enable two-factor authentication to add an extra layer of security to your account.'}
                        </p>
                      </div>
                      
                      {/* Email/Phone Verification */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Verification Status</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Mail className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-gray-700">Email</span>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center">
                              <BadgeCheck className="h-3 w-3 mr-1" />
                              Verified
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Phone className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-gray-700">Phone</span>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center">
                              <BadgeX className="h-3 w-3 mr-1" />
                              Unverified
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Linked Accounts */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Linked Accounts</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              <span className="text-gray-700">Google</span>
                            </div>
                            <button className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium">
                              Connect
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.489.5.09.682-.217.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.607 9.607 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48C19.137 20.16 22 16.42 22 12c0-5.523-4.477-10-10-10z" fill="#333"/>
                              </svg>
                              <span className="text-gray-700">GitHub</span>
                            </div>
                            <button className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium">
                              Connect
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                              </svg>
                              <span className="text-gray-700">Facebook</span>
                            </div>
                            <button className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium">
                              Connect
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete Account */}
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Trash2 className="h-5 w-5 text-red-500 mr-2" />
                            <h4 className="font-medium text-gray-900">Delete Account</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            {showDeleteConfirm ? 'Cancel' : 'Delete Account'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        
                        <AnimatePresence>
                          {showDeleteConfirm && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-4 overflow-hidden"
                            >
                              <div className="space-y-4">
                                {passwordError && (
                                  <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span>{passwordError}</span>
                                  </div>
                                )}
                                
                                <p className="text-sm text-red-600 font-medium">
                                  This action is permanent and cannot be undone. All your data will be permanently deleted.
                                </p>
                                
                                <div>
                                  <label htmlFor="deleteConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                                    Type "DELETE" to confirm
                                  </label>
                                  <input
                                    type="text"
                                    id="deleteConfirm"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="w-full rounded-lg border-red-300 shadow-sm focus:ring-red-500 focus:border-red-500"
                                  />
                                </div>
                                
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                                  >
                                    {isDeleting ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4" />
                                        Confirm Deletion
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Application Information (Read-only) */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 text-[#3BAA75] mr-2" />
                Application Information
              </h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Application ID</p>
                  <p className="font-medium">{application.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{formatDate(application.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">{formatDate(application.updated_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{application.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Stage</p>
                  <p className="font-medium">{application.current_stage}/7</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Consultation</p>
                  <p className="font-medium">{application.consultation_time ? formatDate(application.consultation_time) : 'Not scheduled'}</p>
                </div>
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
      
      {/* Support Section */}
      <div className="bg-gray-50 p-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HelpCircle className="h-5 w-5 text-[#3BAA75] mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
          </div>
          <button
            type="button"
            className="text-[#3BAA75] hover:text-[#2D8259] text-sm font-medium flex items-center"
            onClick={() => window.location.href = '/contact'}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Contact Support
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          If you need assistance with your application or have questions about your profile, our support team is here to help.
        </p>
      </div>
    </div>
  );
};