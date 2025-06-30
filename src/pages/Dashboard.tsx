import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { DashboardNavBar } from '../components/DashboardNavBar';
import { NotificationCenter } from '../components/NotificationCenter';
import { DocumentManager, UnifiedDocumentUploader } from '../components/DocumentManager';
import { ApplicationTracker } from '../components/ApplicationTracker';
import { AppointmentScheduler } from '../components/AppointmentScheduler';
import { UserMessageCenter } from '../components/UserMessageCenter';
import { FileText, Bell, User, HelpCircle, CheckCircle, Clock, AlertCircle, Calendar, DollarSign, CreditCard, Car, Briefcase, MapPin, Phone, Mail, Home, RefreshCw, ChevronRight, Shield, BadgeCheck, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Application, ApplicationStage, Document, Notification } from '../types/database';
import HelpCenter from '../pages/HelpCenter';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ activeSection, setActiveSection }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load user profile
      await loadUserProfile();
      
      // Load application data
      const { data: applications, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (applicationError) {
        throw applicationError;
      }
      
      // Get the most recent application
      const latestApplication = applications && applications.length > 0 ? applications[0] : null;
      setApplication(latestApplication);
      
      if (latestApplication) {
        // Load documents
        const { data: documentData, error: documentError } = await supabase
          .from('documents')
          .select('*')
          .eq('application_id', latestApplication.id)
          .order('uploaded_at', { ascending: false });
        
        if (documentError) {
          throw documentError;
        }
        
        setDocuments(documentData || []);
        
        // Load application stages
        const { data: stageData, error: stageError } = await supabase
          .from('application_stages')
          .select('*')
          .eq('application_id', latestApplication.id)
          .order('stage_number', { ascending: true });
        
        if (stageError) {
          throw stageError;
        }
        
        setStages(stageData || []);
      }
      
      // Load notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (notificationError) {
        throw notificationError;
      }
      
      setNotifications(notificationData || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        // If the error is not that the profile doesn't exist, throw it
        if (profileError.code !== 'PGRST116') {
          console.error('Error loading user profile:', profileError);
          throw profileError;
        }
        
        // If the profile doesn't exist, we'll just return
        // The trigger on auth.users should have created it already
        // If not, it will be created on the next sign-in
        console.log('User profile not found');
        return;
      }
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      throw error;
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    if (!user || !application) return;
    
    try {
      setIsUploadingDocument(true);
      setUploadError(null);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${application.id}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (storageError) {
        throw storageError;
      }
      
      // Create document record in database
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert([
          {
            application_id: application.id,
            category,
            filename: fileName,
            status: 'pending'
          }
        ])
        .select()
        .single();
        
      if (documentError) {
        throw documentError;
      }
      
      // Update documents state
      setDocuments(prev => [document, ...prev]);
      
      toast.success('Document uploaded successfully');
      
      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError('Failed to upload document. Please try again.');
      toast.error('Failed to upload document');
      return null;
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    try {
      // Get the document to delete
      const documentToDelete = documents.find(doc => doc.id === documentId);
      if (!documentToDelete) {
        throw new Error('Document not found');
      }
      
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .remove([documentToDelete.filename]);
        
      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
        
      if (dbError) {
        throw dbError;
      }
      
      // Update documents state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      toast.success('Document deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      throw error;
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) {
        throw error;
      }
      
      // Update notifications state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
      return false;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleScheduleAppointment = async (date: Date, type: 'video' | 'phone') => {
    try {
      if (!application) {
        throw new Error('No application found');
      }
      
      // Update application with consultation time
      const { error } = await supabase
        .from('applications')
        .update({
          consultation_time: date.toISOString()
        })
        .eq('id', application.id);
        
      if (error) {
        throw error;
      }
      
      // Update application state
      setApplication(prev => prev ? { ...prev, consultation_time: date.toISOString() } : null);
      
      toast.success(`Consultation scheduled for ${date.toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast.error('Failed to schedule appointment');
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-[#3BAA75] mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Application Found</h2>
          <p className="text-gray-600 mb-6">You haven't submitted an application yet. Get started by applying for auto financing.</p>
          <Link 
            to="/get-prequalified"
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Apply Now
          </Link>
        </div>
      </div>
    );
  }

  const renderDashboardSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Application Status Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Application Status</h2>
                <div className="flex items-center">
                  <span className={`
                    px-3 py-1 text-sm font-medium rounded-full
                    ${application.status === 'pre_approved' ? 'bg-green-100 text-green-700' : 
                      application.status === 'pending_documents' ? 'bg-orange-100 text-orange-700' :
                      application.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                      application.status === 'finalized' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'}
                  `}>
                    {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
              
              <ApplicationTracker application={application} stages={stages} />
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 text-[#3BAA75] hover:text-[#2D8259] transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>
              </div>
            </div>
            
            {/* Application Details Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Application Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <User className="h-5 w-5 text-[#3BAA75]" />
                    Personal Information
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{application.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{application.phone}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{application.address}, {application.city}, {application.province} {application.postal_code}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">
                        Housing: {application.housing_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[#3BAA75]" />
                    Financial Information
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">
                        {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                      </span>
                    </div>
                    
                    {application.employer_name && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">Employer: {application.employer_name}</span>
                      </div>
                    )}
                    
                    {application.occupation && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">Occupation: {application.occupation}</span>
                      </div>
                    )}
                    
                    {(application.employment_duration_years !== null || application.employment_duration_months !== null) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          Employment Duration: {formatDuration(application.employment_duration_years, application.employment_duration_months)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">Annual Income: ${application.annual_income?.toLocaleString()}</span>
                    </div>
                    
                    {application.other_income !== null && application.other_income > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">Other Income: ${application.other_income?.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">Credit Score: {application.credit_score}</span>
                    </div>
                    
                    {application.collects_government_benefits && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          Collects Government Benefits: {application.government_benefit_types?.map(type => 
                            type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {application.has_debt_discharge_history && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          Debt Discharge: {application.debt_discharge_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                          ({application.debt_discharge_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})
                          {application.debt_discharge_year ? ` - ${application.debt_discharge_year}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Loan Details */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-[#3BAA75]" />
                  Loan Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Loan Range</div>
                    <div className="font-semibold">
                      ${application.loan_amount_min?.toLocaleString()} - ${application.loan_amount_max?.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Monthly Payment</div>
                    <div className="font-semibold">
                      ${application.desired_monthly_payment?.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Interest Rate</div>
                    <div className="font-semibold">
                      {application.interest_rate}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Loan Term</div>
                    <div className="font-semibold">
                      {application.loan_term} months
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Next Steps */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium mb-4">Next Steps</h3>
                
                <div className="space-y-4">
                  {application.status === 'pending_documents' && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-700 rounded-lg">
                      <div className="mt-0.5">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Documents Required</p>
                        <p className="text-sm mt-1">
                          Please upload the required documents to proceed with your application.
                        </p>
                        <button
                          onClick={() => setActiveSection('documents')}
                          className="mt-2 text-sm font-medium flex items-center gap-1 hover:underline"
                        >
                          Go to Documents
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {application.status === 'pre_approved' && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 text-green-700 rounded-lg">
                      <div className="mt-0.5">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Pre-Approved!</p>
                        <p className="text-sm mt-1">
                          Congratulations! Your application has been pre-approved. Schedule a consultation to discuss next steps.
                        </p>
                        <button
                          onClick={() => setActiveSection('appointment')}
                          className="mt-2 text-sm font-medium flex items-center gap-1 hover:underline"
                        >
                          Schedule Consultation
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {application.status === 'under_review' && (
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                      <div className="mt-0.5">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Application Under Review</p>
                        <p className="text-sm mt-1">
                          Our team is currently reviewing your application. We'll notify you once we have an update.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Benefits Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Your Benefits</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-[#3BAA75]/10 rounded-full p-4 mb-4">
                    <Shield className="h-6 w-6 text-[#3BAA75]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Secure Process</h3>
                  <p className="text-gray-600 text-sm">
                    Your information is protected with bank-level security and encryption.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-[#3BAA75]/10 rounded-full p-4 mb-4">
                    <BadgeCheck className="h-6 w-6 text-[#3BAA75]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Pre-Qualified</h3>
                  <p className="text-gray-600 text-sm">
                    Your pre-qualification gives you negotiating power at the dealership.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4">
                  <div className="bg-[#3BAA75]/10 rounded-full p-4 mb-4">
                    <Award className="h-6 w-6 text-[#3BAA75]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Credit Building</h3>
                  <p className="text-gray-600 text-sm">
                    On-time payments help build your credit score over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'documents':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Required Documents</h2>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 text-[#3BAA75] hover:text-[#2D8259] transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              
              <UnifiedDocumentUploader
                applicationId={application.id}
                onUpload={handleDocumentUpload}
                isUploading={isUploadingDocument}
                uploadError={uploadError}
              />
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <DocumentManager
                applicationId={application.id}
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                isUploading={isUploadingDocument}
                uploadError={uploadError}
              />
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onNavigate={setActiveSection}
              />
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Your Profile</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-[#3BAA75] rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold">
                    {application.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      {application.first_name} {application.last_name}
                    </h3>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user.email || ''}
                          disabled
                          className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={application.phone || ''}
                          disabled
                          className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={`${application.address || ''}, ${application.city || ''}, ${application.province || ''} ${application.postal_code || ''}`}
                          disabled
                          className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Account Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <div className="flex">
                          <input
                            type="password"
                            value="••••••••"
                            disabled
                            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-l-lg text-gray-700"
                          />
                          <Link
                            to="/reset-password"
                            className="px-4 py-2 bg-[#3BAA75] text-white rounded-r-lg hover:bg-[#2D8259] transition-colors"
                          >
                            Change
                          </Link>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notification Preferences
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="email-notifications"
                              checked={true}
                              disabled
                              className="rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                            />
                            <label htmlFor="email-notifications" className="ml-2 text-gray-700">
                              Email Notifications
                            </label>
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="sms-notifications"
                              checked={true}
                              disabled
                              className="rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                            />
                            <label htmlFor="sms-notifications" className="ml-2 text-gray-700">
                              SMS Notifications
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Account Actions</h4>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      to="/reset-password"
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Reset Password
                    </Link>
                    
                    <button
                      onClick={() => setActiveSection('help')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Get Help
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'help':
        return (
          <HelpCenter userId={user.id} applicationId={application.id} />
        );
        
      case 'messages':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <UserMessageCenter userId={user.id} applicationId={application.id} />
            </div>
          </div>
        );
        
      case 'appointment':
        return (
          <div className="space-y-6">
            <AppointmentScheduler onSchedule={handleScheduleAppointment} />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-0">
      <DashboardNavBar onNavigate={setActiveSection} activeSection={activeSection} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderDashboardSection()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper function to format duration
const formatDuration = (years: number | null, months: number | null): string => {
  if (years === null && months === null) return 'Not specified';
  
  const yearText = years ? `${years} year${years !== 1 ? 's' : ''}` : '';
  const monthText = months ? `${months} month${months !== 1 ? 's' : ''}` : '';
  
  if (yearText && monthText) {
    return `${yearText}, ${monthText}`;
  }
  
  return yearText || monthText;
};

export default Dashboard;