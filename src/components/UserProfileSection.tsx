import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  DollarSign, 
  Briefcase, 
  CreditCard, 
  Calendar, 
  Car as CarIcon, 
  Save, 
  X, 
  Edit2, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  Shield, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  LogOut, 
  RefreshCw,
  ExternalLink,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import type { Application } from '../types/database';

interface UserProfileSectionProps {
  application: Application;
  onUpdate: () => void;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({ 
  application, 
  onUpdate 
}) => {
  const { user, signOut, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [activeSection, setActiveSection] = useState<string | null>('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localFormData, setLocalFormData] = useState<Partial<Application>>({});
  
  // Account settings states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<{provider: string, connected: boolean}[]>([
    { provider: 'Google', connected: false },
    { provider: 'Apple', connected: false },
    { provider: 'Facebook', connected: false }
  ]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize local form data from application
  useEffect(() => {
    if (application) {
      setLocalFormData({
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        phone: application.phone,
        address: application.address,
        city: application.city,
        province: application.province,
        postal_code: application.postal_code,
        employment_status: application.employment_status,
        employer_name: application.employer_name,
        occupation: application.occupation,
        annual_income: application.annual_income,
        credit_score: application.credit_score,
        vehicle_type: application.vehicle_type,
        desired_monthly_payment: application.desired_monthly_payment,
        down_payment: application.down_payment,
        date_of_birth: application.date_of_birth,
        marital_status: application.marital_status,
        housing_status: application.housing_status,
        housing_payment: application.housing_payment
      });
    }
  }, [application]);

  // Check for changes in form data
  useEffect(() => {
    if (!isEditing) return;
    
    const hasFormChanges = Object.keys(localFormData).some(key => {
      const appKey = key as keyof Application;
      return localFormData[appKey] !== application[appKey];
    });
    
    setHasChanges(hasFormChanges);
  }, [localFormData, application, isEditing]);

  // Check email verification status
  useEffect(() => {
    if (user) {
      setIsEmailVerified(!!user.email_confirmed_at);
      
      // Check if user has linked accounts
      const providers = user.app_metadata?.providers || [];
      setLinkedAccounts(prev => 
        prev.map(account => ({
          ...account,
          connected: providers.includes(account.provider.toLowerCase())
        }))
      );
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs
    if (type === 'number') {
      setLocalFormData({
        ...localFormData,
        [name]: value === '' ? null : Number(value)
      });
      return;
    }
    
    // Handle date inputs
    if (type === 'date') {
      setLocalFormData({
        ...localFormData,
        [name]: value
      });
      return;
    }
    
    // Handle all other inputs
    setLocalFormData({
      ...localFormData,
      [name]: value
    });
  };

  const handleSaveProfile = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update(localFormData)
        .eq('id', application.id);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
      onUpdate(); // Refresh application data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original values
    setLocalFormData({
      first_name: application.first_name,
      last_name: application.last_name,
      email: application.email,
      phone: application.phone,
      address: application.address,
      city: application.city,
      province: application.province,
      postal_code: application.postal_code,
      employment_status: application.employment_status,
      employer_name: application.employer_name,
      occupation: application.occupation,
      annual_income: application.annual_income,
      credit_score: application.credit_score,
      vehicle_type: application.vehicle_type,
      desired_monthly_payment: application.desired_monthly_payment,
      down_payment: application.down_payment,
      date_of_birth: application.date_of_birth,
      marital_status: application.marital_status,
      housing_status: application.housing_status,
      housing_payment: application.housing_payment
    });
    
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = () => {
    setIs2FAEnabled(!is2FAEnabled);
    toast.success(`Two-factor authentication ${!is2FAEnabled ? 'enabled' : 'disabled'}`);
  };

  const handleSendVerification = (type: 'email' | 'phone') => {
    toast.success(`Verification ${type === 'email' ? 'email' : 'SMS'} sent`);
    if (type === 'email') {
      setIsEmailVerified(true);
    } else {
      setIsPhoneVerified(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    setIsDeleting(true);
    try {
      // In a real implementation, this would call a secure backend endpoint
      // For demo purposes, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Account deletion request submitted');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      
      // Sign out the user
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not provided';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'Not provided';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatEmploymentStatus = (status: string | null) => {
    if (!status) return 'Not provided';
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const formatMaritalStatus = (status: string | null) => {
    if (!status) return 'Not provided';
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const formatHousingStatus = (status: string | null) => {
    if (!status) return 'Not provided';
    
    const statusMap: Record<string, string> = {
      'own': 'Own',
      'rent': 'Rent',
      'live_with_parents': 'Live with Parents',
      'other': 'Other'
    };
    
    return statusMap[status] || status;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 px-4 py-4 text-center font-medium text-sm sm:text-base transition-colors ${
            activeTab === 'profile'
              ? 'text-[#3BAA75] border-b-2 border-[#3BAA75]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 px-4 py-4 text-center font-medium text-sm sm:text-base transition-colors ${
            activeTab === 'account'
              ? 'text-[#3BAA75] border-b-2 border-[#3BAA75]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5" />
            <span>Account Settings</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Profile Information</h2>
                
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 sm:mt-0 flex items-center justify-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={!hasChanges || isSaving}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Sections */}
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'personal' ? null : 'personal')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Personal Info</h3>
                    </div>
                    {activeSection === 'personal' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'personal' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                              First Name
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="first_name"
                                name="first_name"
                                value={localFormData.first_name || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.first_name || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                              Last Name
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="last_name"
                                name="last_name"
                                value={localFormData.last_name || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.last_name || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            {isEditing ? (
                              <input
                                type="email"
                                id="email"
                                name="email"
                                value={localFormData.email || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.email || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            {isEditing ? (
                              <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={localFormData.phone || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.phone || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                              Date of Birth
                            </label>
                            {isEditing ? (
                              <input
                                type="date"
                                id="date_of_birth"
                                name="date_of_birth"
                                value={localFormData.date_of_birth?.toString().split('T')[0] || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.date_of_birth ? formatDate(application.date_of_birth) : 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="marital_status" className="block text-sm font-medium text-gray-700 mb-1">
                              Marital Status
                            </label>
                            {isEditing ? (
                              <select
                                id="marital_status"
                                name="marital_status"
                                value={localFormData.marital_status || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              >
                                <option value="">Select Status</option>
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                                <option value="divorced">Divorced</option>
                                <option value="widowed">Widowed</option>
                                <option value="separated">Separated</option>
                                <option value="other">Other</option>
                              </select>
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {formatMaritalStatus(application.marital_status)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Address Information */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'address' ? null : 'address')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Address Information</h3>
                    </div>
                    {activeSection === 'address' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'address' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                              Street Address
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="address"
                                name="address"
                                value={localFormData.address || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.address || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="city"
                                name="city"
                                value={localFormData.city || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.city || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                              Province
                            </label>
                            {isEditing ? (
                              <select
                                id="province"
                                name="province"
                                value={localFormData.province || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
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
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.province || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                              Postal Code
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="postal_code"
                                name="postal_code"
                                value={localFormData.postal_code || ''}
                                onChange={handleInputChange}
                                placeholder="A1A 1A1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.postal_code || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="housing_status" className="block text-sm font-medium text-gray-700 mb-1">
                              Housing Status
                            </label>
                            {isEditing ? (
                              <select
                                id="housing_status"
                                name="housing_status"
                                value={localFormData.housing_status || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              >
                                <option value="">Select Status</option>
                                <option value="own">Own</option>
                                <option value="rent">Rent</option>
                                <option value="live_with_parents">Live with Parents</option>
                                <option value="other">Other</option>
                              </select>
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {formatHousingStatus(application.housing_status)}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="housing_payment" className="block text-sm font-medium text-gray-700 mb-1">
                              Monthly Housing Payment
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                id="housing_payment"
                                name="housing_payment"
                                value={localFormData.housing_payment || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.housing_payment ? formatCurrency(application.housing_payment) : 'Not provided'}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Employment & Financial Information */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'financial' ? null : 'financial')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Employment & Financial Information</h3>
                    </div>
                    {activeSection === 'financial' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'financial' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700 mb-1">
                              Employment Status
                            </label>
                            {isEditing ? (
                              <select
                                id="employment_status"
                                name="employment_status"
                                value={localFormData.employment_status || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              >
                                <option value="">Select Status</option>
                                <option value="employed">Employed</option>
                                <option value="self_employed">Self-Employed</option>
                                <option value="unemployed">Unemployed</option>
                                <option value="student">Student</option>
                                <option value="retired">Retired</option>
                              </select>
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {formatEmploymentStatus(application.employment_status)}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="employer_name" className="block text-sm font-medium text-gray-700 mb-1">
                              Employer Name
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="employer_name"
                                name="employer_name"
                                value={localFormData.employer_name || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.employer_name || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                              Occupation
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                id="occupation"
                                name="occupation"
                                value={localFormData.occupation || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.occupation || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="annual_income" className="block text-sm font-medium text-gray-700 mb-1">
                              Annual Income
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                id="annual_income"
                                name="annual_income"
                                value={localFormData.annual_income || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.annual_income ? formatCurrency(application.annual_income) : 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="credit_score" className="block text-sm font-medium text-gray-700 mb-1">
                              Credit Score
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                id="credit_score"
                                name="credit_score"
                                min="300"
                                max="900"
                                value={localFormData.credit_score || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.credit_score || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          {/* Read-only fields */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monthly Income
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              {application.monthly_income ? formatCurrency(application.monthly_income) : 'Not provided'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Vehicle Information */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'vehicle' ? null : 'vehicle')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CarIcon className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Vehicle Information</h3>
                    </div>
                    {activeSection === 'vehicle' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'vehicle' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-700 mb-1">
                              Vehicle Type
                            </label>
                            {isEditing ? (
                              <select
                                id="vehicle_type"
                                name="vehicle_type"
                                value={localFormData.vehicle_type || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              >
                                <option value="">Select Type</option>
                                <option value="Car">Car</option>
                                <option value="SUV">SUV</option>
                                <option value="Truck">Truck</option>
                                <option value="Van">Van</option>
                              </select>
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.vehicle_type || 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="desired_monthly_payment" className="block text-sm font-medium text-gray-700 mb-1">
                              Desired Monthly Payment
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                id="desired_monthly_payment"
                                name="desired_monthly_payment"
                                value={localFormData.desired_monthly_payment || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.desired_monthly_payment ? formatCurrency(application.desired_monthly_payment) : 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="down_payment" className="block text-sm font-medium text-gray-700 mb-1">
                              Down Payment
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                id="down_payment"
                                name="down_payment"
                                value={localFormData.down_payment || ''}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                                {application.down_payment ? formatCurrency(application.down_payment) : 'Not provided'}
                              </div>
                            )}
                          </div>
                          
                          {/* Read-only fields */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Loan Amount Range
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              {application.loan_amount_min && application.loan_amount_max
                                ? `${formatCurrency(application.loan_amount_min)} - ${formatCurrency(application.loan_amount_max)}`
                                : 'Not provided'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Interest Rate
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              {application.interest_rate ? `${application.interest_rate}%` : 'Not provided'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Loan Term
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              {application.loan_term ? `${application.loan_term} months` : 'Not provided'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Application Status */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'status' ? null : 'status')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Application Status</h3>
                    </div>
                    {activeSection === 'status' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'status' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Status
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700 flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                                application.status === 'pre_approved' ? 'bg-green-100 text-green-800' :
                                application.status === 'pending_documents' ? 'bg-yellow-100 text-yellow-800' :
                                application.status === 'finalized' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {application.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Stage
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              Stage {application.current_stage} of 7
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Application Date
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              {formatDate(application.created_at)}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last Updated
                            </label>
                            <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                              {formatDate(application.updated_at)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Mobile Save Button (fixed at bottom) */}
              {isEditing && (
                <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={!hasChanges || isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">Account Settings</h2>
              
              <div className="space-y-6">
                {/* Password Change */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Change Password</h3>
                    </div>
                    {activeSection === 'password' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'password' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {passwordError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 flex-shrink-0" />
                              <span>{passwordError}</span>
                            </div>
                          )}
                          
                          <div>
                            <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                              Current Password
                            </label>
                            <input
                              type="password"
                              id="current_password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              id="new_password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              id="confirm_password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                            />
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              onClick={handleChangePassword}
                              disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                              className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isChangingPassword ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              <span>Update Password</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Two-Factor Authentication */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === '2fa' ? null : '2fa')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Two-Factor Authentication (2FA)</h3>
                    </div>
                    {activeSection === '2fa' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === '2fa' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <p className="text-sm text-gray-600">
                            Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-700">2FA Status</p>
                              <p className="text-sm text-gray-500">
                                {is2FAEnabled ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                            
                            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                              <input
                                type="checkbox"
                                id="toggle-2fa"
                                className="absolute w-6 h-6 opacity-0 z-10 cursor-pointer"
                                checked={is2FAEnabled}
                                onChange={handleToggle2FA}
                              />
                              <label
                                htmlFor="toggle-2fa"
                                className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                                  is2FAEnabled ? 'bg-[#3BAA75]' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                                    is2FAEnabled ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                ></span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-blue-50 text-blue-700 rounded-md flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Note:</p>
                              <p className="text-sm">
                                Full 2FA implementation requires additional backend configuration. This toggle is for demonstration purposes only.
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Email & Phone Verification */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'verification' ? null : 'verification')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Email & Phone Verification</h3>
                    </div>
                    {activeSection === 'verification' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'verification' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-700">Email Verification</p>
                              <p className="text-sm text-gray-500">
                                {application.email}
                              </p>
                            </div>
                            
                            <div>
                              {isEmailVerified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSendVerification('email')}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                                >
                                  Verify Now
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-700">Phone Verification</p>
                              <p className="text-sm text-gray-500">
                                {application.phone}
                              </p>
                            </div>
                            
                            <div>
                              {isPhoneVerified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSendVerification('phone')}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                                >
                                  Verify Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Linked Accounts */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'linked' ? null : 'linked')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-[#3BAA75]" />
                      <h3 className="font-medium text-gray-900">Linked Accounts</h3>
                    </div>
                    {activeSection === 'linked' ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'linked' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {linkedAccounts.map((account) => (
                            <div key={account.provider} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-700">{account.provider}</p>
                                <p className="text-sm text-gray-500">
                                  {account.connected ? 'Connected' : 'Not connected'}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setLinkedAccounts(prev => 
                                    prev.map(a => 
                                      a.provider === account.provider 
                                        ? { ...a, connected: !a.connected } 
                                        : a
                                    )
                                  );
                                  toast.success(`${account.connected ? 'Disconnected from' : 'Connected to'} ${account.provider}`);
                                }}
                                className={`px-3 py-1 rounded-md text-sm font-medium ${
                                  account.connected
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-[#3BAA75]/10 text-[#3BAA75] hover:bg-[#3BAA75]/20'
                                } transition-colors`}
                              >
                                {account.connected ? 'Disconnect' : 'Connect'}
                              </button>
                            </div>
                          ))}
                          
                          <div className="p-3 bg-blue-50 text-blue-700 rounded-md flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Note:</p>
                              <p className="text-sm">
                                Linking accounts requires additional configuration. This interface is for demonstration purposes only.
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Delete Account */}
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === 'delete' ? null : 'delete')}
                    className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5 text-red-600" />
                      <h3 className="font-medium text-red-700">Delete Account</h3>
                    </div>
                    {activeSection === 'delete' ? (
                      <ChevronUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-red-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {activeSection === 'delete' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-start gap-2 border border-red-200">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Warning:</p>
                              <p className="text-sm">
                                Deleting your account is permanent and cannot be undone. All your data, including applications and documents, will be permanently removed.
                              </p>
                            </div>
                          </div>
                          
                          {!showDeleteConfirm ? (
                            <div className="flex justify-end">
                              <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete Account</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-sm text-gray-700">
                                Please type <span className="font-bold">DELETE</span> to confirm:
                              </p>
                              
                              <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Type DELETE to confirm"
                              />
                              
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText('');
                                  }}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                                
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isDeleting ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  <span>Confirm Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Sign Out */}
                <div className="flex justify-center">
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-6 py-2 text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};