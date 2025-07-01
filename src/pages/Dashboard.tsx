import React, { useState, useEffect, useCallback } from 'react';
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
import { MobileNavBar } from '../components/MobileNavBar';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

// Utility function to validate UUID format
function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Fallback UUID to use when an invalid UUID is detected
const FALLBACK_UUID = '00000000-0000-0000-0000-000000000000';

const Dashboard: React.FC<DashboardProps> = ({ activeSection, setActiveSection }) => {
  const { user, initialized } = useAuth();
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
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [creatingApplication, setCreatingApplication] = useState(false);

  useEffect(() => {
    // Check for temporary user ID in localStorage
    const storedTempUserId = localStorage.getItem('tempUserId');
    if (storedTempUserId && isUuid(storedTempUserId)) {
      console.log('Dashboard: Using stored tempUserId:', storedTempUserId);
      setTempUserId(storedTempUserId);
    }
    
    // Wait for auth to be initialized before loading data
    if (initialized) {
      console.log('Dashboard: Auth initialized, loading dashboard data');
      loadDashboardData();
    } else {
      console.log('Dashboard: Auth not yet initialized, waiting...');
    }
  }, [initialized]);

  const loadDashboardData = async () => {
    if (!initialized) {
      console.log('Dashboard: Auth not initialized yet, skipping data load');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Dashboard: Loading dashboard data with user:', user ? {
        id: user.id,
        email: user.email,
        app_metadata: user.app_metadata
      } : 'null', 'and tempUserId:', tempUserId);
      
      // Load user profile if authenticated
      if (user) {
        await loadUserProfile();
      }
      
      // Load application data
      let applicationQuery = supabase
        .from('applications')
        .select('*');
        
      if (user && isUuid(user.id)) {
        applicationQuery = applicationQuery.eq('user_id', user.id);
      } else if (tempUserId && isUuid(tempUserId)) {
        applicationQuery = applicationQuery.eq('temp_user_id', tempUserId);
      } else {
        // If neither user.id nor tempUserId is a valid UUID, use a fallback
        // This prevents the database error but ensures no results are returned
        applicationQuery = applicationQuery.eq('user_id', FALLBACK_UUID);
      }
      
      const { data: applications, error: applicationError } = await applicationQuery
        .order('created_at', { ascending: false });
      
      if (applicationError) {
        console.error('Dashboard: Error loading applications:', applicationError);
        if (loadingAttempts < 3) {
          // Retry loading after a delay
          setLoadingAttempts(prev => prev + 1);
          setTimeout(loadDashboardData, 1000);
          return;
        }
        throw applicationError;
      }
      
      // Get the most recent application
      const latestApplication = applications && applications.length > 0 ? applications[0] : null;
      
      // If no application found and user is authenticated, create one
      if (!latestApplication && user && !creatingApplication) {
        console.log('Dashboard: No application found for authenticated user, creating one');
        await createDefaultApplication();
        return; // This will trigger a reload via the useEffect
      }
      
      setApplication(latestApplication);
      
      if (latestApplication) {
        console.log('Dashboard: Application found:', latestApplication.id);
        
        // Load documents
        const { data: documentData, error: documentError } = await supabase
          .from('documents')
          .select('*')
          .eq('application_id', latestApplication.id)
          .order('uploaded_at', { ascending: false });
        
        if (documentError) {
          console.error('Dashboard: Error loading documents:', documentError);
          // Continue despite document error
        } else {
          setDocuments(documentData || []);
        }
        
        // Load application stages
        const { data: stageData, error: stageError } = await supabase
          .from('application_stages')
          .select('*')
          .eq('application_id', latestApplication.id)
          .order('stage_number', { ascending: true });
        
        if (stageError) {
          console.error('Dashboard: Error loading application stages:', stageError);
          // Continue despite stage error
        } else {
          setStages(stageData || []);
        }
      } else {
        console.log('Dashboard: No application found');
      }
      
      // Load notifications
      let notificationQuery = supabase
        .from('notifications')
        .select('*');
        
      if (user && isUuid(user.id)) {
        notificationQuery = notificationQuery.eq('user_id', user.id);
      } else if (tempUserId && isUuid(tempUserId)) {
        notificationQuery = notificationQuery.eq('temp_user_id', tempUserId);
      } else {
        // If neither user.id nor tempUserId is a valid UUID, use a fallback
        notificationQuery = notificationQuery.eq('user_id', FALLBACK_UUID);
      }
      
      const { data: notificationData, error: notificationError } = await notificationQuery
        .order('created_at', { ascending: false });
      
      if (notificationError) {
        console.error('Dashboard: Error loading notifications:', notificationError);
        // Continue despite notification error
      } else {
        setNotifications(notificationData || []);
      }
      
      setLoadingAttempts(0); // Reset attempts counter on success
      
    } catch (error) {
      console.error('Dashboard: Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to create a default application for a new user
  const createDefaultApplication = async () => {
    if (!user || creatingApplication) return;
    
    try {
      setCreatingApplication(true);
      console.log('Dashboard: Creating default application for user:', user.id);
      
      // Extract name parts from email if available
      const emailName = user.email?.split('@')[0] || '';
      const nameParts = emailName.split(/[._-]/);
      const firstName = nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || '';
      const lastName = nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || '';
      
      // Create a new application
      const { data: newApp, error: createError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          status: 'pending_documents',
          current_stage: 1,
          email: user.email,
          first_name: firstName,
          last_name: lastName
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Dashboard: Error creating default application:', createError);
        throw createError;
      }
      
      console.log('Dashboard: Default application created:', newApp.id);
      
      // Create initial application stage
      const { error: stageError } = await supabase
        .from('application_stages')
        .insert({
          application_id: newApp.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });
      
      if (stageError) {
        console.error('Dashboard: Error creating initial stage:', stageError);
        // Continue despite error
      }
      
      // Create welcome notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Welcome to Clearpath!',
          message: 'Your account has been created successfully. Start your application process now.',
          read: false
        });
      
      if (notificationError) {
        console.error('Dashboard: Error creating welcome notification:', notificationError);
        // Continue despite error
      }
      
      // Reload dashboard data to show the new application
      await loadDashboardData();
      
    } catch (error) {
      console.error('Dashboard: Error in createDefaultApplication:', error);
      toast.error('Failed to create application. Please try again.');
    } finally {
      setCreatingApplication(false);
    }
  };

  // Function to load user profile with retry mechanism
  const loadUserProfile = async (maxRetries = 3, delay = 1000) => {
    if (!user || !isUuid(user.id)) return;
    
    let retries = 0;
    
    while (retries < maxRetries) {
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
            console.error('Dashboard: Error loading user profile:', profileError);
            throw profileError;
          }
          
          // If the profile doesn't exist, we'll try to create it
          console.log('Dashboard: User profile not found, creating one');
          
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([{ user_id: user.id }])
            .select()
            .single();
          
          if (createError) {
            console.error('Dashboard: Error creating user profile:', createError);
            throw createError;
          }
          
          setUserProfile(newProfile);
          return;
        }
        
        setUserProfile(profile);
        return;
      } catch (error) {
        console.warn(`Dashboard: Attempt ${retries + 1}/${maxRetries} to load user profile failed:`, error);
        
        // If we've reached max retries, throw the error
        if (retries === maxRetries - 1) {
          console.error('Dashboard: All attempts to load user profile failed');
          // Don't throw, just continue without the profile
          return;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next retry (exponential backoff)
        delay *= 1.5;
        retries++;
      }
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    if ((!user && !tempUserId) || !application) return;
    
    try {
      setIsUploadingDocument(true);
      setUploadError(null);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const userId = user?.id || tempUserId;
      const fileName = `${userId}/${application.id}/${Date.now()}.${fileExt}`;
      
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
      console.error('Dashboard: Error uploading document:', error);
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
        console.error('Dashboard: Error deleting from storage:', storageError);
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
      console.error('Dashboard: Error deleting document:', error);
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
      console.error('Dashboard: Error marking notification as read:', error);
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
      console.error('Dashboard: Error scheduling appointment:', error);
      toast.error('Failed to schedule appointment');
      return false;
    }
  };

  // Show loading state while auth is initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Initializing your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (loading && !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
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
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
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

  // Function to get the next step message based on application status
  const getNextStepMessage = (status: string) => {
    const nextStepMessage = {
      submitted: "Sit tight — our team is reviewing your application.",
      under_review: "We're assessing your details — no action needed for now.",
      pending_documents: "Upload the required documents to keep your application moving.",
      pre_approved: "You're pre-approved! Book a time to discuss vehicle options.",
      vehicle_selection: "Browse and select your vehicle to proceed.",
      final_approval: "You're almost done — confirm final details to wrap things up.",
      finalized: "Your financing is complete — we'll reach out with next steps!",
    }[status];
    
    return nextStepMessage || "Your application is being processed.";
  };

  const renderDashboardSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* New Top Section with Personalized Greeting and Loan Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
            >
              {/* Personalized Greeting */}
              <div className="p-6 bg-gradient-to-r from-[#3BAA75]/10 to-[#3BAA75]/5">
                <h2 className="text-xl font-semibold text-gray-900">
                  Hi {application.first_name || 'there'}!
                </h2>
                <p className="text-gray-600 mt-1">Here are your current loan results</p>
              </div>
              
              {/* Loan Snapshot Data */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <div className="font-semibold text-gray-900 flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      application.status === 'pre_approved' ? 'bg-green-500' :
                      application.status === 'under_review' ? 'bg-yellow-500' :
                      application.status === 'pending_documents' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}></span>
                    {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Rate</div>
                  <div className="font-semibold text-gray-900">
                    {application.interest_rate}%
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Loan Amount</div>
                  <div className="font-semibold text-gray-900">
                    ${application.loan_amount_min?.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Term</div>
                  <div className="font-semibold text-gray-900">
                    {application.loan_term} months
                  </div>
                </div>
              </div>
              
              {/* Next Step Box */}
              <div className="px-6 pb-6">
                <div className="bg-[#3BAA75]/10 rounded-xl p-4 border border-[#3BAA75]/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-[#3BAA75] rounded-full p-1.5">
                      {application.status === 'pre_approved' ? (
                        <CheckCircle className="h-4 w-4 text-white" />
                      ) : application.status === 'pending_documents' ? (
                        <FileText className="h-4 w-4 text-white" />
                      ) : (
                        <Clock className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Next Step</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {getNextStepMessage(application.status)}
                      </p>
                      
                      {/* Action buttons based on status */}
                      {application.status === 'pending_documents' && (
                        <button
                          onClick={() => setActiveSection('documents')}
                          className="mt-3 px-4 py-2 bg-[#3BAA75] text-white rounded-lg text-sm font-medium hover:bg-[#2D8259] transition-colors flex items-center gap-1 shadow-sm"
                        >
                          Upload Documents
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                      
                      {application.status === 'pre_approved' && (
                        <button
                          onClick={() => setActiveSection('appointment')}
                          className="mt-3 px-4 py-2 bg-[#3BAA75] text-white rounded-lg text-sm font-medium hover:bg-[#2D8259] transition-colors flex items-center gap-1 shadow-sm"
                        >
                          Schedule Consultation
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Application Progress Tracker */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">Application Progress</h2>
              <ApplicationTracker application={application} stages={stages} />
            </motion.div>
            
            {/* Application Details Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">Application Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <div className="p-2 bg-[#3BAA75]/10 rounded-lg">
                      <User className="h-5 w-5 text-[#3BAA75]" />
                    </div>
                    <span>Personal Information</span>
                  </h3>
                  
                  <div className="space-y-3 pl-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Mail className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700">{application.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Phone className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700">{application.phone}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <MapPin className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700 text-sm">{application.address}, {application.city}, {application.province} {application.postal_code}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Home className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700">
                        Housing: {application.housing_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <div className="p-2 bg-[#3BAA75]/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-[#3BAA75]" />
                    </div>
                    <span>Financial Information</span>
                  </h3>
                  
                  <div className="space-y-3 pl-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Briefcase className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700">
                        {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                      </span>
                    </div>
                    
                    {application.employer_name && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <Briefcase className="h-4 w-4 text-[#3BAA75]" />
                        <span className="text-gray-700">Employer: {application.employer_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <DollarSign className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700">Annual Income: ${application.annual_income?.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <CreditCard className="h-4 w-4 text-[#3BAA75]" />
                      <span className="text-gray-700">Credit Score: {application.credit_score}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Benefits Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">Your Benefits</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4 bg-gradient-to-br from-[#3BAA75]/5 to-[#3BAA75]/10 rounded-xl transition-transform hover:scale-105 duration-300">
                  <div className="bg-white rounded-full p-4 mb-4 shadow-md">
                    <Shield className="h-6 w-6 text-[#3BAA75]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Secure Process</h3>
                  <p className="text-gray-600 text-sm">
                    Your information is protected with bank-level security and encryption.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4 bg-gradient-to-br from-[#3BAA75]/5 to-[#3BAA75]/10 rounded-xl transition-transform hover:scale-105 duration-300">
                  <div className="bg-white rounded-full p-4 mb-4 shadow-md">
                    <BadgeCheck className="h-6 w-6 text-[#3BAA75]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Pre-Qualified</h3>
                  <p className="text-gray-600 text-sm">
                    Your pre-qualification gives you negotiating power at the dealership.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4 bg-gradient-to-br from-[#3BAA75]/5 to-[#3BAA75]/10 rounded-xl transition-transform hover:scale-105 duration-300">
                  <div className="bg-white rounded-full p-4 mb-4 shadow-md">
                    <Award className="h-6 w-6 text-[#3BAA75]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Credit Building</h3>
                  <p className="text-gray-600 text-sm">
                    On-time payments help build your credit score over time.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        );
        
      case 'documents':
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259]">Required Documents</h2>
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
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <DocumentManager
                applicationId={application.id}
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                isUploading={isUploadingDocument}
                uploadError={uploadError}
              />
            </motion.div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onNavigate={setActiveSection}
              />
            </motion.div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
            >
              <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">Your Profile</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-[#3BAA75] to-[#2D8259] rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {application.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      {application.first_name} {application.last_name}
                    </h3>
                    <p className="text-gray-600">{user?.email || application.email}</p>
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
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            value={user?.email || application.email || ''}
                            disabled
                            className="w-full pl-10 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={application.phone || ''}
                            disabled
                            className="w-full pl-10 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={`${application.address || ''}, ${application.city || ''}, ${application.province || ''} ${application.postal_code || ''}`}
                            disabled
                            className="w-full pl-10 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                          />
                        </div>
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
                          <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="password"
                              value="••••••••"
                              disabled
                              className="w-full pl-10 px-4 py-2 bg-gray-50 border border-gray-200 rounded-l-lg text-gray-700"
                            />
                          </div>
                          <Link
                            to="/reset-password"
                            className="px-4 py-2 bg-[#3BAA75] text-white rounded-r-lg hover:bg-[#2D8259] transition-colors flex items-center"
                          >
                            Change
                          </Link>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notification Preferences
                        </label>
                        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
            </motion.div>
          </div>
        );
        
      case 'help':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HelpCenter userId={user?.id || tempUserId || ''} applicationId={application.id} />
          </motion.div>
        );
        
      case 'messages':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <UserMessageCenter userId={user?.id || tempUserId || ''} applicationId={application.id} />
            </div>
          </motion.div>
        );
        
      case 'appointment':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AppointmentScheduler onSchedule={handleScheduleAppointment} />
          </motion.div>
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
      
      {/* Mobile Navigation Bar */}
      {user && (
        <MobileNavBar onNavigate={setActiveSection} activeSection={activeSection} />
      )}
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

// Mock Lock component for the profile section
const Lock = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
};

export default Dashboard;