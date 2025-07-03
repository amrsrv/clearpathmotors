import React, { useLayoutEffect, useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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
import UserApplicationsTable from '../components/UserApplicationsTable';
import ApplicationDetailsView from '../components/ApplicationDetailsView';
import { PrequalificationSummaryCard } from '../components/PrequalificationSummaryCard';

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

// Timeout for data loading operations (in milliseconds)
const LOADING_TIMEOUT_MS = 15000; // 15 seconds

// Helper function to create a timeout promise
const createTimeoutPromise = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
};

const Dashboard: React.FC<DashboardProps> = ({ activeSection, setActiveSection }) => {
  const { user, initialized } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const [userApplications, setUserApplications] = useState<Application[]>([]);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [creatingApplication, setCreatingApplication] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    // Wait for auth to be initialized before loading data
    if (initialized) {
      console.log('Dashboard: Auth initialized, loading dashboard data');
      loadDashboardData();
    } else {
      console.log('Dashboard: Auth not yet initialized, waiting...');
    }
  }, [initialized]);

  // Add user to the dependency array to ensure data is reloaded when user changes
  useEffect(() => {
    if (initialized && user) {
      console.log('Dashboard: User changed, reloading data');
      loadDashboardData();
    }
  }, [user, initialized]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialized && !user) {
      console.log('Dashboard: No authenticated user, redirecting to login');
      navigate('/login');
    }
  }, [user, initialized, navigate]);

  const loadDashboardData = async () => {
    // Early exit if no authenticated user is available
    if (!initialized || !user) {
      console.log('Dashboard: No authenticated user available, skipping data load');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setLoadingTimedOut(false);
      
      console.log('Dashboard: Loading dashboard data with user:', user ? {
        id: user.id,
        email: user.email,
        app_metadata: user.app_metadata
      } : 'null');
      
      // Load user profile if authenticated
      await loadUserProfile();
      
      // Load application data with timeout
      let applicationQuery = supabase
        .from('applications')
        .select('*');
        
      if (user && isUuid(user.id)) {
        applicationQuery = applicationQuery.eq('user_id', user.id);
      } else {
        // If user.id is not a valid UUID, use a fallback
        // This prevents the database error but ensures no results are returned
        applicationQuery = applicationQuery.eq('user_id', FALLBACK_UUID);
      }
      
      const applicationsPromise = applicationQuery
        .order('created_at', { ascending: false });
      
      const applicationsResult = await Promise.race([
        applicationsPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Applications query timed out:', error);
        setLoadingTimedOut(true);
        return { data: [], error: new Error('Applications query timed out') };
      });
      
      const { data: applications, error: applicationError } = applicationsResult;
      
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
      
      // Set all user applications
      setUserApplications(applications || []);
      
      // Get the most recent application
      const latestApplication = applications && applications.length > 0 ? applications[0] : null;
      
      // If no application found and user is authenticated, create one
      if (!latestApplication && user && !creatingApplication) {
        console.log('Dashboard: No application found for authenticated user, creating one');
        setCreatingApplication(true);
        await createDefaultApplication();
        setCreatingApplication(false);
        return; // Exit and let the useEffect trigger a reload
      }
      
      setCurrentApplication(latestApplication);
      setShowApplicationDetails(!!latestApplication);
      
      if (latestApplication) {
        console.log('Dashboard: Application found:', latestApplication.id);
        
        // Load documents with timeout
        const documentsPromise = supabase
          .from('documents')
          .select('*')
          .eq('application_id', latestApplication.id)
          .order('uploaded_at', { ascending: false });
        
        const documentsResult = await Promise.race([
          documentsPromise,
          createTimeoutPromise(LOADING_TIMEOUT_MS)
        ]).catch(error => {
          console.error('Dashboard: Documents query timed out:', error);
          return { data: [], error: new Error('Documents query timed out') };
        });
        
        const { data: documentData, error: documentError } = documentsResult;
        
        if (documentError) {
          console.error('Dashboard: Error loading documents:', documentError);
          // Continue despite document error
        } else {
          setDocuments(documentData || []);
        }
        
        // Load application stages with timeout
        const stagesPromise = supabase
          .from('application_stages')
          .select('*')
          .eq('application_id', latestApplication.id)
          .order('stage_number', { ascending: true });
        
        const stagesResult = await Promise.race([
          stagesPromise,
          createTimeoutPromise(LOADING_TIMEOUT_MS)
        ]).catch(error => {
          console.error('Dashboard: Stages query timed out:', error);
          return { data: [], error: new Error('Stages query timed out') };
        });
        
        const { data: stageData, error: stageError } = stagesResult;
        
        if (stageError) {
          console.error('Dashboard: Error loading application stages:', stageError);
          // Continue despite stage error
        } else {
          setStages(stageData || []);
        }
      } else {
        console.log('Dashboard: No application found');
      }
      
      // Load notifications with timeout
      let notificationQuery = supabase
        .from('notifications')
        .select('*');
        
      if (user && isUuid(user.id)) {
        notificationQuery = notificationQuery.eq('user_id', user.id);
      } else {
        // If user.id is not a valid UUID, use a fallback
        notificationQuery = notificationQuery.eq('user_id', FALLBACK_UUID);
      }
      
      const notificationsPromise = notificationQuery
        .order('created_at', { ascending: false });
      
      const notificationsResult = await Promise.race([
        notificationsPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Notifications query timed out:', error);
        return { data: [], error: new Error('Notifications query timed out') };
      });
      
      const { data: notificationData, error: notificationError } = notificationsResult;
      
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
      console.log('Dashboard: Creating default application for user:', user.id);
      
      // Extract name parts from email if available
      const emailName = user.email?.split('@')[0] || '';
      const nameParts = emailName.split(/[._-]/);
      const firstName = nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || '';
      const lastName = nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || '';
      
      // Ensure email is either a valid email string or null (not empty string)
      const userEmail = user.email && user.email.trim() !== '' ? user.email : null;
      
      // Create a new application
      const createPromise = supabase
        .from('applications')
        .insert({
          user_id: user.id,
          status: 'pending_documents',
          current_stage: 1,
          email: userEmail,
          first_name: firstName,
          last_name: lastName
        })
        .select()
        .single();
      
      const result = await Promise.race([
        createPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Application creation timed out:', error);
        return { data: null, error: new Error('Application creation timed out') };
      });
      
      const { data: newApp, error: createError } = result;
      
      if (createError) {
        console.error('Dashboard: Error creating default application:', createError);
        throw createError;
      }
      
      console.log('Dashboard: Default application created:', newApp.id);
      
      // Create initial application stage
      const stagePromise = supabase
        .from('application_stages')
        .insert({
          application_id: newApp.id,
          stage_number: 1,
          status: 'completed',
          notes: 'Application submitted successfully'
        });
      
      await Promise.race([
        stagePromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Stage creation timed out:', error);
        // Continue despite timeout
      });
      
      // Create welcome notification
      const notificationPromise = supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Welcome to Clearpath Motors!',
          message: 'Thank you for starting your auto financing journey with us. Create an account to continue your application.',
          read: false
        });
      
      await Promise.race([
        notificationPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Notification creation timed out:', error);
        // Continue despite timeout
      });
      
      // Don't call loadDashboardData here - let the useEffect handle it
      
    } catch (error) {
      console.error('Dashboard: Error in createDefaultApplication:', error);
      toast.error('Failed to create application. Please try again.');
    }
  };

  // Function to load user profile with retry mechanism
  const loadUserProfile = async (maxRetries = 3, delay = 1000) => {
    if (!user || !isUuid(user.id)) return;
    
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // Check if user profile exists
        const profilePromise = supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        const result = await Promise.race([
          profilePromise,
          createTimeoutPromise(LOADING_TIMEOUT_MS)
        ]).catch(error => {
          console.error('Dashboard: User profile query timed out:', error);
          return { data: null, error: new Error('User profile query timed out') };
        });
        
        const { data: profile, error: profileError } = result;
        
        if (profileError) {
          // If the error is not that the profile doesn't exist, throw it
          if (profileError.code !== 'PGRST116') {
            console.error('Dashboard: Error loading user profile:', profileError);
            throw profileError;
          }
          
          // If the profile doesn't exist, we'll try to create it
          console.log('Dashboard: User profile not found, creating one');
          
          const createProfilePromise = supabase
            .from('user_profiles')
            .insert([{ user_id: user.id }])
            .select()
            .single();
          
          const createResult = await Promise.race([
            createProfilePromise,
            createTimeoutPromise(LOADING_TIMEOUT_MS)
          ]).catch(error => {
            console.error('Dashboard: Profile creation timed out:', error);
            return { data: null, error: new Error('Profile creation timed out') };
          });
          
          const { data: newProfile, error: createError } = createResult;
          
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
    if (!user || !currentApplication) return;
    
    try {
      setIsUploadingDocument(true);
      setUploadError(null);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const userId = user.id;
      const fileName = `${userId}/${currentApplication.id}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const uploadPromise = supabase.storage
        .from('user-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      const uploadResult = await Promise.race([
        uploadPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Document upload timed out:', error);
        return { data: null, error: new Error('Document upload timed out') };
      });
      
      const { error: storageError } = uploadResult;
        
      if (storageError) {
        throw storageError;
      }
      
      // Create document record in database
      const documentPromise = supabase
        .from('documents')
        .insert([
          {
            application_id: currentApplication.id,
            category,
            filename: fileName,
            status: 'pending'
          }
        ])
        .select()
        .single();
      
      const documentResult = await Promise.race([
        documentPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Document record creation timed out:', error);
        return { data: null, error: new Error('Document record creation timed out') };
      });
      
      const { data: document, error: documentError } = documentResult;
        
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
      const storagePromise = supabase.storage
        .from('user-documents')
        .remove([documentToDelete.filename]);
      
      const storageResult = await Promise.race([
        storagePromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Storage deletion timed out:', error);
        // Continue with database deletion even if storage deletion times out
        return { error: new Error('Storage deletion timed out') };
      });
      
      const { error: storageError } = storageResult;
        
      if (storageError) {
        console.error('Dashboard: Error deleting from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
      
      // Delete from database
      const dbPromise = supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      const dbResult = await Promise.race([
        dbPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Database deletion timed out:', error);
        return { error: new Error('Database deletion timed out') };
      });
      
      const { error: dbError } = dbResult;
        
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
      const updatePromise = supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      const result = await Promise.race([
        updatePromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Notification update timed out:', error);
        return { error: new Error('Notification update timed out') };
      });
      
      const { error } = result;
        
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

  const handleRefreshProfile = () => {
    setRefreshing(true);
    loadDashboardData();
    toast.success('Profile refreshed successfully');
  };

  const handleScheduleAppointment = async (date: Date, type: 'video' | 'phone') => {
    try {
      if (!currentApplication) {
        throw new Error('No application found');
      }
      
      // Update application with consultation time
      const updatePromise = supabase
        .from('applications')
        .update({
          consultation_time: date.toISOString()
        })
        .eq('id', currentApplication.id);
      
      const result = await Promise.race([
        updatePromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Appointment scheduling timed out:', error);
        return { error: new Error('Appointment scheduling timed out') };
      });
      
      const { error } = result;
        
      if (error) {
        throw error;
      }
      
      // Update application state
      setCurrentApplication(prev => prev ? { ...prev, consultation_time: date.toISOString() } : null);
      
      toast.success(`Consultation scheduled for ${date.toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Dashboard: Error scheduling appointment:', error);
      toast.error('Failed to schedule appointment');
      return false;
    }
  };

  const handleSelectApplication = (application: Application) => {
    setCurrentApplication(application);
    setShowApplicationDetails(true);
    
    // Load documents and stages for the selected application
    loadApplicationDetails(application.id);
  };

  const handleBackToList = () => {
    setShowApplicationDetails(false);
  };

  const loadApplicationDetails = async (applicationId: string) => {
    try {
      // Load documents with timeout
      const documentsPromise = supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });
      
      const documentsResult = await Promise.race([
        documentsPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Documents query timed out:', error);
        return { data: [], error: new Error('Documents query timed out') };
      });
      
      const { data: documentData, error: documentError } = documentsResult;
      
      if (documentError) {
        console.error('Dashboard: Error loading documents:', documentError);
        // Continue despite document error
      } else {
        setDocuments(documentData || []);
      }
      
      // Load application stages with timeout
      const stagesPromise = supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', applicationId)
        .order('stage_number', { ascending: true });
      
      const stagesResult = await Promise.race([
        stagesPromise,
        createTimeoutPromise(LOADING_TIMEOUT_MS)
      ]).catch(error => {
        console.error('Dashboard: Stages query timed out:', error);
        return { data: [], error: new Error('Stages query timed out') };
      });
      
      const { data: stageData, error: stageError } = stagesResult;
      
      if (stageError) {
        console.error('Dashboard: Error loading application stages:', stageError);
        // Continue despite stage error
      } else {
        setStages(stageData || []);
      }
    } catch (error) {
      console.error('Dashboard: Error loading application details:', error);
      toast.error('Failed to load application details');
    }
  };

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (loading && !currentApplication) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
          {loadingTimedOut && (
            <p className="text-red-500 mt-2">Loading is taking longer than expected. Please be patient.</p>
          )}
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

  if (userApplications.length === 0) {
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

  const renderDashboardSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Prequalification Summary Card */}
            {currentApplication && (
              <PrequalificationSummaryCard application={currentApplication} />
            )}
            
            {/* Application Progress Tracker */}
            {currentApplication && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
              >
                <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">Application Progress</h2>
                <ApplicationTracker application={currentApplication} stages={stages} />
              </motion.div>
            )}
            
            {showApplicationDetails && currentApplication ? (
              <ApplicationDetailsView 
                application={currentApplication}
                stages={stages}
                onBackToList={handleBackToList}
              />
            ) : (
              <UserApplicationsTable 
                applications={userApplications}
                onSelectApplication={handleSelectApplication}
                isLoading={loading}
              />
            )}
            
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
                applicationId={currentApplication?.id || ''}
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
                applicationId={currentApplication?.id || ''}
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
                    {currentApplication?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      {currentApplication?.first_name} {currentApplication?.last_name}
                    </h3>
                    <p className="text-gray-600">{user?.email || currentApplication?.email}</p>
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
                            value={user?.email || currentApplication?.email || ''}
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
                            value={currentApplication?.phone || ''}
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
                            value={`${currentApplication?.address || ''}, ${currentApplication?.city || ''}, ${currentApplication?.province || ''} ${currentApplication?.postal_code || ''}`}
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
                    <button
                      onClick={handleRefreshProfile}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Refresh Profile
                    </button>
                    
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
            <HelpCenter userId={user?.id || ''} applicationId={currentApplication?.id || ''} />
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
              <UserMessageCenter userId={user?.id || ''} applicationId={currentApplication?.id || ''} />
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