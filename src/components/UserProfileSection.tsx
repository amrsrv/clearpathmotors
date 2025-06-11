import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  CreditCard, 
  Car, 
  Calendar, 
  Home, 
  ChevronDown, 
  ChevronUp, 
  Edit,
  Save,
  X,
  Building,
  Clock,
  FileText,
  BadgeCheck,
  Check,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import type { Application } from '../types/database';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface UserProfileSectionProps {
  application: Application;
  onUpdate?: () => void;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({ 
  application,
  onUpdate 
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    personal: true,
    contact: true,
    employment: true,
    financial: true,
    vehicle: true,
    preferences: true
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Application>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check for mobile view
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
      setEditData({});
    } else {
      // Start editing
      setIsEditing(true);
      setEditData({
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        phone: application.phone,
        address: application.address,
        city: application.city,
        province: application.province,
        postal_code: application.postal_code,
        employer_name: application.employer_name,
        occupation: application.occupation,
        employment_duration: application.employment_duration
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!application.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update(editData)
        .eq('id', application.id);
        
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pre_approved':
        return 'bg-green-100 text-green-700';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending_documents':
        return 'bg-orange-100 text-orange-700';
      case 'finalized':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Mobile-specific section component
  const MobileProfileSection = ({ 
    title, 
    icon, 
    children, 
    isExpanded, 
    onToggle 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    isExpanded: boolean; 
    onToggle: () => void;
  }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#3BAA75]/10 rounded-full">
            {icon}
          </div>
          <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-black/5 text-sm">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Mobile-specific field display
  const MobileField = ({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-700/10">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-gray-500">{label}</span>
      </div>
      <span className="font-medium text-right">{value}</span>
    </div>
  );

  // Render mobile version
  if (isMobile) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">User Profile</h2>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
              {formatStatus(application.status)}
            </span>
            <button
              onClick={handleEditToggle}
              className={`p-1.5 rounded-full transition-colors ${
                isEditing ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}
              title={isEditing ? "Cancel editing" : "Edit profile"}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center justify-between">
            <p className="text-blue-700 text-xs">
              You are currently editing your profile.
            </p>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-3 py-1.5 bg-[#3BAA75] text-white rounded-lg text-xs font-medium hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  <span>Saving</span>
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="space-y-2">
          <MobileProfileSection
            title="Personal Information"
            icon={<User className="h-4 w-4 text-[#3BAA75]" />}
            isExpanded={expandedSections.personal}
            onToggle={() => toggleSection('personal')}
          >
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={editData.first_name || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={editData.last_name || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
              </div>
            ) : (
              <>
                <MobileField 
                  label="First Name" 
                  value={application.first_name || 'Not provided'} 
                />
                <MobileField 
                  label="Last Name" 
                  value={application.last_name || 'Not provided'} 
                />
                <MobileField 
                  label="Date of Birth" 
                  value={application.date_of_birth 
                    ? format(new Date(application.date_of_birth), 'MMM d, yyyy')
                    : 'Not provided'
                  } 
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
                <MobileField 
                  label="Marital Status" 
                  value={application.marital_status
                    ? application.marital_status.charAt(0).toUpperCase() + application.marital_status.slice(1)
                    : 'Not provided'
                  } 
                />
                <MobileField 
                  label="Dependents" 
                  value={application.dependents !== null && application.dependents !== undefined
                    ? application.dependents
                    : 'Not provided'
                  } 
                />
              </>
            )}
          </MobileProfileSection>

          <MobileProfileSection
            title="Contact Information"
            icon={<Phone className="h-4 w-4 text-[#3BAA75]" />}
            isExpanded={expandedSections.contact}
            onToggle={() => toggleSection('contact')}
          >
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editData.phone || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={editData.address || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={editData.city || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Province
                    </label>
                    <input
                      type="text"
                      name="province"
                      value={editData.province || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={editData.postal_code || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
              </div>
            ) : (
              <>
                <MobileField 
                  label="Email" 
                  value={application.email || 'Not provided'} 
                  icon={<Mail className="h-3.5 w-3.5" />}
                />
                <MobileField 
                  label="Phone" 
                  value={application.phone || 'Not provided'} 
                  icon={<Phone className="h-3.5 w-3.5" />}
                />
                <MobileField 
                  label="Address" 
                  value={application.address ? 
                    `${application.address}, ${application.city || ''}, ${application.province || ''} ${application.postal_code || ''}` : 
                    'Not provided'
                  } 
                  icon={<MapPin className="h-3.5 w-3.5" />}
                />
                <MobileField 
                  label="Preferred Contact" 
                  value={application.preferred_contact_method
                    ? application.preferred_contact_method.charAt(0).toUpperCase() + application.preferred_contact_method.slice(1)
                    : 'Email'
                  } 
                />
              </>
            )}
          </MobileProfileSection>

          <MobileProfileSection
            title="Employment Information"
            icon={<Briefcase className="h-4 w-4 text-[#3BAA75]" />}
            isExpanded={expandedSections.employment}
            onToggle={() => toggleSection('employment')}
          >
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Employer Name
                  </label>
                  <input
                    type="text"
                    name="employer_name"
                    value={editData.employer_name || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={editData.occupation || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Employment Duration
                  </label>
                  <input
                    type="text"
                    name="employment_duration"
                    value={editData.employment_duration || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] text-sm h-9"
                    placeholder="e.g., 2 years"
                  />
                </div>
              </div>
            ) : (
              <>
                <MobileField 
                  label="Employment Status" 
                  value={application.employment_status
                    ? application.employment_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    : 'Not provided'
                  } 
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                />
                <MobileField 
                  label="Employer" 
                  value={application.employer_name || 'Not provided'} 
                  icon={<Building className="h-3.5 w-3.5" />}
                />
                <MobileField 
                  label="Occupation" 
                  value={application.occupation || 'Not provided'} 
                />
                <MobileField 
                  label="Employment Duration" 
                  value={application.employment_duration || 'Not provided'} 
                  icon={<Clock className="h-3.5 w-3.5" />}
                />
              </>
            )}
          </MobileProfileSection>

          <MobileProfileSection
            title="Financial Information"
            icon={<DollarSign className="h-4 w-4 text-[#3BAA75]" />}
            isExpanded={expandedSections.financial}
            onToggle={() => toggleSection('financial')}
          >
            <MobileField 
              label="Annual Income" 
              value={application.annual_income ? 
                `$${application.annual_income.toLocaleString()}` : 
                'Not provided'
              } 
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Monthly Income" 
              value={application.monthly_income ? 
                `$${application.monthly_income.toLocaleString()}` : 
                'Not provided'
              } 
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Credit Score" 
              value={application.credit_score || 'Not provided'} 
              icon={<CreditCard className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Housing Status" 
              value={application.housing_status
                ? application.housing_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'Not provided'
              } 
              icon={<Home className="h-3.5 w-3.5" />}
            />
            {application.housing_payment && (
              <MobileField 
                label="Housing Payment" 
                value={`$${application.housing_payment.toLocaleString()}/month`} 
                icon={<DollarSign className="h-3.5 w-3.5" />}
              />
            )}
          </MobileProfileSection>

          <MobileProfileSection
            title="Vehicle Information"
            icon={<Car className="h-4 w-4 text-[#3BAA75]" />}
            isExpanded={expandedSections.vehicle}
            onToggle={() => toggleSection('vehicle')}
          >
            <MobileField 
              label="Vehicle Type" 
              value={application.vehicle_type || 'Not specified'} 
              icon={<Car className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Monthly Payment" 
              value={application.desired_monthly_payment ? 
                `$${application.desired_monthly_payment.toLocaleString()}` : 
                'Not specified'
              } 
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Loan Amount Range" 
              value={application.loan_amount_min && application.loan_amount_max ? 
                `$${application.loan_amount_min.toLocaleString()} - $${application.loan_amount_max.toLocaleString()}` : 
                'Not specified'
              } 
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Interest Rate" 
              value={application.interest_rate ? `${application.interest_rate}%` : 'Not specified'} 
              icon={<CreditCard className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Loan Term" 
              value={application.loan_term ? `${application.loan_term} months` : 'Not specified'} 
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <MobileField 
              label="Down Payment" 
              value={application.down_payment ? `$${application.down_payment.toLocaleString()}` : '$0'} 
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
          </MobileProfileSection>

          <MobileProfileSection
            title="Preferences & Consents"
            icon={<BadgeCheck className="h-4 w-4 text-[#3BAA75]" />}
            isExpanded={expandedSections.preferences}
            onToggle={() => toggleSection('preferences')}
          >
            <MobileField 
              label="Driver's License" 
              value={application.has_driver_license ? 
                <span className="text-green-600">Yes</span> : 
                <span className="text-red-600">No</span>
              } 
            />
            <MobileField 
              label="Government Benefits" 
              value={application.collects_government_benefits ? 
                <span className="text-blue-600">Yes</span> : 
                <span className="text-gray-600">No</span>
              } 
            />
            <MobileField 
              label="Soft Credit Check" 
              value={application.consent_soft_check ? 
                <span className="text-green-600">Provided</span> : 
                <span className="text-red-600">Not provided</span>
              } 
            />
            <MobileField 
              label="Terms & Conditions" 
              value={application.terms_accepted ? 
                <span className="text-green-600">Accepted</span> : 
                <span className="text-red-600">Not accepted</span>
              } 
            />
          </MobileProfileSection>
        </div>
      </div>
    );
  }

  // Desktop version (original)
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">User Profile</h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(application.status)}`}>
            {formatStatus(application.status)}
          </span>
          <button
            onClick={handleEditToggle}
            className={`p-2 rounded-full transition-colors ${
              isEditing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isEditing ? "Cancel editing" : "Edit profile"}
          >
            {isEditing ? <X className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 flex items-center justify-between">
          <p className="text-blue-700 text-sm">
            You are currently editing your profile information. Click Save when you're done.
          </p>
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('personal')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                <User className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <h3 className="font-medium text-gray-900">Personal Information</h3>
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
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          value={editData.first_name || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          value={editData.last_name || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">First Name</span>
                        <span className="font-medium">{application.first_name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Last Name</span>
                        <span className="font-medium">{application.last_name}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Date of Birth</span>
                    <span className="font-medium">
                      {application.date_of_birth 
                        ? format(new Date(application.date_of_birth), 'MMMM d, yyyy')
                        : 'Not provided'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Marital Status</span>
                    <span className="font-medium">
                      {application.marital_status
                        ? application.marital_status.charAt(0).toUpperCase() + application.marital_status.slice(1)
                        : 'Not provided'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Dependents</span>
                    <span className="font-medium">
                      {application.dependents !== null && application.dependents !== undefined
                        ? application.dependents
                        : 'Not provided'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Contact Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('contact')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                <Phone className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <h3 className="font-medium text-gray-900">Contact Information</h3>
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
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={editData.email || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={editData.phone || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={editData.address || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={editData.city || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Province
                          </label>
                          <input
                            type="text"
                            name="province"
                            value={editData.province || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            name="postal_code"
                            value={editData.postal_code || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Email</span>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{application.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Phone</span>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{application.phone}</span>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <span className="text-sm text-gray-500">Address</span>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {application.address}, {application.city}, {application.province} {application.postal_code}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Preferred Contact Method</span>
                        <span className="font-medium">
                          {application.preferred_contact_method
                            ? application.preferred_contact_method.charAt(0).toUpperCase() + application.preferred_contact_method.slice(1)
                            : 'Email'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Employment Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('employment')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                <Briefcase className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <h3 className="font-medium text-gray-900">Employment Information</h3>
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
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employer Name
                        </label>
                        <input
                          type="text"
                          name="employer_name"
                          value={editData.employer_name || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Occupation
                        </label>
                        <input
                          type="text"
                          name="occupation"
                          value={editData.occupation || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employment Duration
                        </label>
                        <input
                          type="text"
                          name="employment_duration"
                          value={editData.employment_duration || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          placeholder="e.g., 2 years"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Employment Status</span>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {application.employment_status
                              ? application.employment_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              : 'Not provided'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Employer</span>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {application.employer_name || 'Not provided'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Occupation</span>
                        <span className="font-medium">
                          {application.occupation || 'Not provided'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Employment Duration</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {application.employment_duration || 'Not provided'}
                          </span>
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
            onClick={() => toggleSection('financial')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                <DollarSign className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <h3 className="font-medium text-gray-900">Financial Information</h3>
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
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Annual Income</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        ${application.annual_income?.toLocaleString() || 'Not provided'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Monthly Income</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        ${application.monthly_income?.toLocaleString() || 'Not provided'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Credit Score</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {application.credit_score || 'Not provided'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Housing Status</span>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {application.housing_status
                          ? application.housing_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'Not provided'}
                      </span>
                    </div>
                  </div>
                  
                  {application.housing_payment && (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Housing Payment</span>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          ${application.housing_payment.toLocaleString()}/month
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {application.has_debt_discharge_history && (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Debt Discharge History</span>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {application.debt_discharge_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                          ({application.debt_discharge_year}) - 
                          {application.debt_discharge_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Vehicle Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('vehicle')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                <Car className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <h3 className="font-medium text-gray-900">Vehicle Information</h3>
            </div>
            {expandedSections.vehicle ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSections.vehicle && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Vehicle Type</span>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {application.vehicle_type || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Desired Monthly Payment</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        ${application.desired_monthly_payment?.toLocaleString() || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Loan Amount Range</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        ${application.loan_amount_min?.toLocaleString() || 'N/A'} - 
                        ${application.loan_amount_max?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Interest Rate</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {application.interest_rate}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Loan Term</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {application.loan_term} months
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Down Payment</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        ${application.down_payment?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preferences & Consents */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('preferences')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                <BadgeCheck className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <h3 className="font-medium text-gray-900">Preferences & Consents</h3>
            </div>
            {expandedSections.preferences ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSections.preferences && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Driver's License</span>
                    <span className={`text-sm ${application.has_driver_license ? 'text-green-600' : 'text-red-600'}`}>
                      {application.has_driver_license ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Government Benefits</span>
                    <span className={`text-sm ${application.collects_government_benefits ? 'text-blue-600' : 'text-gray-600'}`}>
                      {application.collects_government_benefits ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Soft Credit Check Consent</span>
                    <span className={`text-sm ${application.consent_soft_check ? 'text-green-600' : 'text-red-600'}`}>
                      {application.consent_soft_check ? 'Provided' : 'Not provided'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Terms & Conditions</span>
                    <span className={`text-sm ${application.terms_accepted ? 'text-green-600' : 'text-red-600'}`}>
                      {application.terms_accepted ? 'Accepted' : 'Not accepted'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};