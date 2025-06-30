import React, { useLayoutEffect, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Calendar,
  Phone,
  Mail,
  User,
  Building,
  DollarSign,
  Car,
  CreditCard,
  Bell,
  ChevronRight,
  FileCheck,
  ArrowUpRight,
  Wallet,
  CalendarClock,
  MessageSquare,
  Plus,
  BarChart3,
  Shield,
  Inbox,
  ArrowRight,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import type { Application, ApplicationStage, Document, Notification, UserProfile } from '../types/database';
import { PreQualifiedBadge } from '../components/PreQualifiedBadge';
import { LoanRangeBar } from '../components/LoanRangeBar';
import { ApplicationTracker } from '../components/ApplicationTracker';
import { NotificationCenter } from '../components/NotificationCenter';
import { AppointmentScheduler } from '../components/AppointmentScheduler';
import toast from 'react-hot-toast';
import { DocumentManager } from '../components/DocumentManager';
import { ApplicationCard } from '../components/ApplicationCard';
import { DashboardNavBar } from '../components/DashboardNavBar';
import { UserProfileSection } from '../components/UserProfileSection';
import { toStartCase } from '../utils/formatters';
import { UnifiedDocumentUploader } from '../components/UnifiedDocumentUploader';
import HelpCenter from './HelpCenter';
import { runQuickDiagnostic } from '../utils/diagnostics';

interface DashboardProps {
  activeSection?: string;
  setActiveSection?: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  activeSection = 'overview', 
  setActiveSection = () => {} 
}) => {
  console.log('Dashboard: component initializing with activeSection:', activeSection);
  
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const location = useLocation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prequalificationData, setPrequalificationData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [showApplicationSelector, setShowApplicationSelector] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalApplications: 0,
    approvedApplications: 0,
    unreadMessages: 0
  });
  
  // Move the useDocumentUpload hook to the component level
  const { uploadDocument, deleteDocument, uploading, error: uploadError } = useDocumentUpload(selectedApplication?.id || '');

  // Add a function to handle forced refresh
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setLoadingError(null);
    
    try {
      // Check system status
      await runQuickDiagnostic();
      
      // Force refresh user data
      if (user) {
        const refreshedUser = await refreshUser();
        console.log('Dashboard: Force refreshed user data:', refreshedUser ? {
          id: refreshedUser.id,
          email: refreshedUser.email,
          app_metadata: refreshedUser.app_metadata
        } : 'Failed to refresh user');
      }
      
      // Reload dashboard data with increased retry count
      setRetryCount(prev => prev + 1);
      await loadDashboardData();
    } catch (error) {
      console.error('Dashboard: Error in force refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('Dashboard: Component mounted, authLoading =', authLoading, ', user =', user ? {
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata
    } : 'null');
    
    if (!authLoading && !user) {
      console.log('Dashboard: No authenticated user, redirecting to login');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (user) {
      console.log('Dashboard: User authenticated, loading dashboard data');
      loadDashboardData();
    }
  }, [user, authLoading]);

  // Check if we're being redirected with a specific section
  useEffect(() => {
    if (location.state?.section) {
      console.log('Dashboard: Redirected with specific section:', location.state.section);
      setActiveSection(location.state.section);
      // Clear the state to avoid persisting it
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedApplication?.id || !user?.id) {
      console.log('Dashboard: No selectedApplication or user, skipping real-time subscriptions');
      return;
    }

    console.log('Dashboard: Setting up real-time subscriptions for application:', selectedApplication.id);
    
    // Set up real-time subscription for application updates
    const applicationsChannel = supabase
      .channel('application-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `id=eq.${selectedApplication.id}`
        },
        async (payload) => {
          console.log('Dashboard: Application update received:', payload);
          
          const oldStatus = selectedApplication.status;
          const newStatus = payload.new.status;
          const oldStage = selectedApplication.current_stage;
          const newStage = payload.new.current_stage;
          
          // Update application state with new data
          setSelectedApplication(payload.new as Application);
          
          // Update applications list
          setApplications(prev => 
            prev.map(app => app.id === payload.new.id ? payload.new as Application : app)
          );
          
          // Reload stages and documents to ensure consistency
          await loadStages(selectedApplication.id);
          await loadDocuments(selectedApplication.id);
          
          // Create notification for status change
          if (oldStatus !== newStatus) {
            await createNotification(
              `Application Status Updated`,
              `Your application status has been updated from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}.`
            );
            
            toast.success(`Application status updated to ${formatStatus(newStatus)}`);
          }
          
          // Create notification for stage change
          if (oldStage !== newStage) {
            await createNotification(
              `Application Stage Advanced`,
              `Your application has moved to stage ${newStage} of 7.`
            );
            
            toast.success(`Application advanced to stage ${newStage}`);
          }
          
          // Update prequalification data if relevant fields changed
          if (
            payload.new.loan_amount_min !== selectedApplication.loan_amount_min ||
            payload.new.loan_amount_max !== selectedApplication.loan_amount_max ||
            payload.new.interest_rate !== selectedApplication.interest_rate ||
            payload.new.loan_term !== selectedApplication.loan_term ||
            payload.new.desired_monthly_payment !== selectedApplication.desired_monthly_payment
          ) {
            updatePrequalificationData(payload.new as Application);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for documents
    const documentsChannel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `application_id=eq.${selectedApplication.id}`
        },
        async (payload) => {
          console.log('Dashboard: Document change received:', payload);
          
          // Reload documents to get the latest state
          await loadDocuments(selectedApplication.id);
          
          // Handle document status changes
          if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            if (oldStatus !== newStatus) {
              const documentName = payload.new.filename.split('/').pop();
              const category = payload.new.category.replace(/_/g, ' ');
              
              // Create notification for document status change
              let notificationTitle = '';
              let notificationMessage = '';
              
              if (newStatus === 'approved') {
                notificationTitle = `Document Approved`;
                notificationMessage = `Your ${category} document "${documentName}" has been approved.`;
                toast.success(notificationMessage);
              } else if (newStatus === 'rejected') {
                notificationTitle = `Document Needs Attention`;
                notificationMessage = `Your ${category} document "${documentName}" was not approved. ${payload.new.review_notes ? `Reason: ${payload.new.review_notes}` : 'Please upload a new document.'}`;
                toast.error(notificationMessage);
              }
              
              if (notificationTitle) {
                await createNotification(notificationTitle, notificationMessage);
              }
            }
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for notifications
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Dashboard: Notification change received:', payload);
          
          // Reload notifications to get the latest state
          await loadNotifications(user.id);
          
          // Update summary stats
          await loadSummaryStats();
          
          // Show toast for new notifications
          if (payload.eventType === 'INSERT' && !payload.new.read) {
            toast.success(`New notification: ${payload.new.title}`);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for application stages
    const stagesChannel = supabase
      .channel('stages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_stages',
          filter: `application_id=eq.${selectedApplication.id}`
        },
        async (payload) => {
          console.log('Dashboard: Stage change received:', payload);
          
          // Reload stages to get the latest state
          await loadStages(selectedApplication.id);
          
          // Create notification for new stage
          if (payload.eventType === 'INSERT') {
            const stageNumber = payload.new.stage_number;
            const stageStatus = payload.new.status;
            
            await createNotification(
              `Application Stage ${stageNumber} ${formatStatus(stageStatus)}`,
              `Your application has ${stageStatus === 'completed' ? 'completed' : 'entered'} stage ${stageNumber}. ${payload.new.notes || ''}`
            );
            
            toast.success(`Stage ${stageNumber} ${formatStatus(stageStatus)}`);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for admin messages
    const messagesChannel = supabase
      .channel('admin-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          // Update unread messages count
          await loadSummaryStats();
          
          // Show toast notification for new message
          toast.success('You have a new message from support');
        }
      )
      .subscribe();

    return () => {
      console.log('Dashboard: Cleaning up real-time subscriptions');
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(stagesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedApplication?.id, user?.id]);

  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const createNotification = async (title: string, message: string) => {
    if (!user) {
      console.log('Dashboard: No user, skipping notification creation');
      return;
    }
    
    try {
      console.log('Dashboard: Creating notification', { title, message });
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          read: false
        });
    } catch (error) {
      console.error('Dashboard: Error creating notification:', error);
    }
  };

  const loadDashboardData = async () => {
    console.log('Dashboard: loadDashboardData started');
    
    try {
      if (!user) {
        console.log('Dashboard: No user in loadDashboardData, exiting early');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log('Dashboard: Loading applications for user:', user.id);

      // First verify the auth session is still valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Dashboard: No valid session found, redirecting to login');
        setLoadingError('Your session has expired. Please log in again.');
        navigate('/login');
        return;
      }

      // Load all applications for this user
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('*, dealer_profiles(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (applicationError) {
        console.error('Dashboard: Error loading applications:', applicationError);
        throw applicationError;
      }

      console.log('Dashboard: Applications data loaded:', applicationData?.length || 0, 'applications found');

      // If no applications, redirect to prequalification form
      if (!applicationData || applicationData.length === 0) {
        console.log('Dashboard: No applications found, redirecting to prequalification form');
        navigate('/get-prequalified');
        return;
      }

      setApplications(applicationData);
      
      // Select the most recent application by default
      const mostRecentApplication = applicationData[0];
      console.log('Dashboard: Selected most recent application:', mostRecentApplication.id);
      setSelectedApplication(mostRecentApplication);

      // Load stages for the selected application
      console.log('Dashboard: Loading stages for application:', mostRecentApplication.id);
      await loadStages(mostRecentApplication.id);

      // Load documents for the selected application
      console.log('Dashboard: Loading documents for application:', mostRecentApplication.id);
      await loadDocuments(mostRecentApplication.id);

      // Load notifications
      console.log('Dashboard: Loading notifications for user:', user.id);
      await loadNotifications(user.id);

      // Load user profile
      console.log('Dashboard: Loading user profile for user:', user.id);
      await loadUserProfile(user.id);

      // Load summary stats
      console.log('Dashboard: Loading summary stats');
      await loadSummaryStats();

      // Set prequalification data
      updatePrequalificationData(mostRecentApplication);

    } catch (error: any) {
      console.error('Dashboard: Error loading dashboard data:', error);
      setError(error.message);
      
      // Check for specific error patterns
      if (error.message?.includes('JWT')) {
        setLoadingError('Authentication error. Please try logging in again.');
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        setLoadingError('Network error. Please check your internet connection and try again.');
      } else if (error.code === '42501') {
        setLoadingError('Permission denied. You may not have access to this resource.');
      } else {
        setLoadingError('Error loading dashboard data. Please try refreshing the page.');
      }
    } finally {
      console.log('Dashboard: loadDashboardData completed, setting loading=false');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    console.log('Dashboard: loadUserProfile started for user:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Dashboard: Error loading user profile:', error);
        return;
      }

      console.log('Dashboard: User profile loaded:', data);
      
      // Set user profile data (will be null if no profile exists)
      setUserProfile(data);
      
      // If no profile exists, create a default one
      if (!data) {
        console.log('Dashboard: No user profile found for user:', userId);
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({ user_id: userId })
            .select()
            .single();
            
          if (createError) {
            console.error('Dashboard: Error creating user profile:', createError);
            return;
          }
          
          console.log('Dashboard: Created new user profile:', newProfile);
          setUserProfile(newProfile);
        } catch (createError) {
          console.error('Dashboard: Error creating user profile:', createError);
        }
      }
    } catch (error) {
      console.error('Dashboard: Error loading user profile:', error);
    }
  };

  const loadSummaryStats = async () => {
    console.log('Dashboard: loadSummaryStats started');
    if (!user) {
      console.log('Dashboard: No user in loadSummaryStats, exiting early');
      return;
    }

    try {
      // Get total applications for this user
      const { count: totalCount, error: totalError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get approved applications
      const { count: approvedCount, error: approvedError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pre_approved', 'finalized']);

      // Get unread messages
      const { count: unreadCount, error: unreadError } = await supabase
        .from('admin_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_admin', true)
        .eq('read', false);

      if (totalError || approvedError || unreadError) {
        console.error('Dashboard: Error loading summary stats:', { totalError, approvedError, unreadError });
        return;
      }

      console.log('Dashboard: Summary stats loaded', { 
        totalApplications: totalCount || 0,
        approvedApplications: approvedCount || 0,
        unreadMessages: unreadCount || 0
      });
      
      setSummaryStats({
        totalApplications: totalCount || 0,
        approvedApplications: approvedCount || 0,
        unreadMessages: unreadCount || 0
      });
    } catch (error) {
      console.error('Dashboard: Error loading summary stats:', error);
    }
  };

  const updatePrequalificationData = (applicationData: Application) => {
    console.log('Dashboard: Updating prequalification data with application:', applicationData.id);
    if (applicationData) {
      setPrequalificationData({
        loanRange: {
          min: applicationData.loan_amount_min || 15000,
          max: applicationData.loan_amount_max || 35000,
          rate: applicationData.interest_rate || 5.99
        },
        term: applicationData.loan_term || 60,
        monthlyPayment: applicationData.desired_monthly_payment || 450,
        status: applicationData.status
      });
    }
  };

  const loadStages = async (applicationId: string) => {
    console.log('Dashboard: loadStages started for application:', applicationId);
    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', applicationId)
        .order('stage_number', { ascending: true });

      if (stagesError) {
        console.error('Dashboard: Error loading stages:', stagesError);
        throw stagesError;
      }
      
      console.log('Dashboard: Stages loaded:', stagesData?.length || 0, 'stages found');
      setStages(stagesData || []);
    } catch (error) {
      console.error('Dashboard: Error loading stages:', error);
    }
  };

  const loadDocuments = async (applicationId: string) => {
    console.log('Dashboard: loadDocuments started for application:', applicationId);
    try {
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (documentsError) {
        console.error('Dashboard: Error loading documents:', documentsError);
        throw documentsError;
      }
      
      console.log('Dashboard: Documents loaded:', documentsData?.length || 0, 'documents found');
      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Dashboard: Error loading documents:', error);
    }
  };

  const loadNotifications = async (userId: string) => {
    console.log('Dashboard: loadNotifications started for user:', userId);
    try {
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Dashboard: Error loading notifications:', notificationsError);
        throw notificationsError;
      }
      
      console.log('Dashboard: Notifications loaded:', notificationsData?.length || 0, 'notifications found');
      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Dashboard: Error loading notifications:', error);
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    console.log('Dashboard: handleDocumentUpload started', { category });
    if (!selectedApplication) {
      console.log('Dashboard: No selectedApplication, aborting document upload');
      return;
    }
    
    try {
      console.log('Dashboard: Uploading document');
      const document = await uploadDocument(file, category);
      if (document) {
        // Update the documents state immediately with the new document
        console.log('Dashboard: Document uploaded successfully:', document.id);
        setDocuments(prevDocuments => [document, ...prevDocuments]);
        toast.success('Document uploaded successfully');
      }
    } catch (error) {
      console.error('Dashboard: Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    console.log('Dashboard: handleDocumentDelete started for document:', documentId);
    try {
      await deleteDocument(documentId);
      // Update the documents state immediately by removing the deleted document
      console.log('Dashboard: Document deleted successfully');
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Dashboard: Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    console.log('Dashboard: handleMarkNotificationAsRead started for notification:', id);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Dashboard: Error marking notification as read:', error);
        throw error;
      }

      console.log('Dashboard: Notification marked as read');
      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Dashboard: Error marking notification as read:', error);
    }
  };

  const handleApplicationSelect = async (application: Application) => {
    console.log('Dashboard: handleApplicationSelect started for application:', application.id);
    setSelectedApplication(application);
    await loadStages(application.id);
    await loadDocuments(application.id);
    updatePrequalificationData(application);
    setShowApplicationSelector(false);
  };

  const handleSectionChange = (section: string) => {
    console.log('Dashboard: handleSectionChange to section:', section);
    setActiveSection(section);
  };

  if (authLoading || loading) {
    console.log('Dashboard: Rendering loading state, authLoading =', authLoading, 'loading =', loading);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (loadingError) {
    console.log('Dashboard: Rendering error state with loading error:', loadingError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Error</h2>
            <p className="text-gray-600 mb-6">{loadingError}</p>
            <div className="space-y-4 w-full">
              <button 
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2 bg-[#3BAA75] text-white px-4 py-2 rounded-lg hover:bg-[#2D8259] transition-colors"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    <span>Refresh Dashboard</span>
                  </>
                )}
              </button>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/login');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign Out and Log In Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('Dashboard: Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-4">
            <button
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 bg-[#3BAA75] text-white px-4 py-2 rounded-lg hover:bg-[#2D8259] transition-colors"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  <span>Try Again</span>
                </>
              )}
            </button>
            <Link
              to="/get-prequalified"
              className="block w-full text-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Start New Application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedApplication) {
    console.log('Dashboard: No selectedApplication, rendering no application found state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">No Application Found</h2>
          <p className="text-gray-600 mb-6">Start your application to view this dashboard</p>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/get-prequalified')}
              className="w-full bg-[#3BAA75] text-white px-6 py-3 rounded-lg hover:bg-[#2D8259] transition-colors"
            >
              Start Application
            </button>
            <button 
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  <span>Refresh Dashboard</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render different content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <>
            {/* Prequalification Results */}
            {prequalificationData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2A7A5B] rounded-xl p-4 sm:p-8 text-white shadow-xl mb-6"
              >
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Your Prequalification Results</h2>
                <LoanRangeBar
                  min={prequalificationData.loanRange.min}
                  max={prequalificationData.loanRange.max}
                  rate={prequalificationData.loanRange.rate}
                />
                <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
                  <div className="text-center">
                    <div className="text-white/80 text-xs sm:text-sm mb-1">Monthly Payment</div>
                    <div className="text-lg sm:text-2xl font-bold">${prequalificationData.monthlyPayment}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/80 text-xs sm:text-sm mb-1">Term Length</div>
                    <div className="text-lg sm:text-2xl font-bold">{prequalificationData.term} months</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/80 text-xs sm:text-sm mb-1">Rate</div>
                    <div className="text-lg sm:text-2xl font-bold">{prequalificationData.loanRange.rate}%</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Applications Hub */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold">Applications Hub</h2>
                {applications.length > 1 && (
                  <button
                    onClick={() => setShowApplicationSelector(!showApplicationSelector)}
                    className="flex items-center gap-2 text-[#3BAA75] hover:text-[#2D8259] font-medium"
                  >
                    Switch Application
                    <ChevronRight className={`h-5 w-5 transition-transform ${showApplicationSelector ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>
              
              {/* Application Progress */}
              <ApplicationTracker
                application={selectedApplication}
                stages={stages}
              />
            </div>

            {/* All Applications Section */}
            {applications.length > 1 && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold">Your Applications</h2>
                  <Link
                    to="/get-prequalified"
                    className="flex items-center gap-2 text-[#3BAA75] hover:text-[#2D8259] font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Start New Application</span>
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      isSelected={selectedApplication.id === app.id}
                      onClick={() => handleApplicationSelect(app)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Appointment Scheduler */}
            <div id="appointment-section" className="mb-6">
              <AppointmentScheduler
                onSchedule={async (date, type) => {
                  try {
                    console.log('Dashboard: Scheduling appointment', { date, type });
                    const { error } = await supabase
                      .from('applications')
                      .update({ consultation_time: date.toISOString() })
                      .eq('id', selectedApplication.id);

                    if (error) {
                      console.error('Dashboard: Error scheduling appointment:', error);
                      throw error;
                    }
                    
                    console.log('Dashboard: Appointment scheduled successfully');
                    setSelectedApplication(prev => prev ? {
                      ...prev,
                      consultation_time: date.toISOString()
                    } : null);
                    
                    toast.success('Consultation scheduled successfully');
                  } catch (error) {
                    console.error('Dashboard: Error scheduling appointment:', error);
                    toast.error('Failed to schedule consultation');
                  }
                }}
              />
            </div>
          </>
        );
      case 'documents':
        return (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            {/* Document Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 px-4 py-3 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload Documents
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`flex-1 px-4 py-3 font-medium text-sm ${
                  activeTab === 'manage'
                    ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage Documents
              </button>
            </div>

            {/* Document Content */}
            <div className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'upload' ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <UnifiedDocumentUploader
                      applicationId={selectedApplication.id}
                      onUpload={handleDocumentUpload}
                      isUploading={uploading}
                      uploadError={uploadError}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="manage"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DocumentManager
                      applicationId={selectedApplication.id}
                      documents={documents}
                      onUpload={handleDocumentUpload}
                      onDelete={handleDocumentDelete}
                      isUploading={uploading}
                      uploadError={uploadError}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="mb-6">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              onNavigate={handleSectionChange}
            />
          </div>
        );
      case 'profile':
        return (
          <div className="mb-6">
            <UserProfileSection 
              application={selectedApplication}
              onUpdate={loadDashboardData}
            />
          </div>
        );
      case 'help':
        return (
          <div className="mb-6">
            <HelpCenter 
              userId={user?.id || ''}
              applicationId={selectedApplication?.id || ''}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 z-40 pt-2 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Welcome Back, {toStartCase(selectedApplication.first_name) || user?.email?.split('@')[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <PreQualifiedBadge />
                <button 
                  onClick={() => setShowApplicationSelector(!showApplicationSelector)}
                  className="text-sm text-gray-500 hover:text-[#3BAA75] transition-colors flex items-center"
                >
                  Application #{selectedApplication.id.slice(0, 8)}
                  <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showApplicationSelector ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Application Selector Dropdown */}
                {showApplicationSelector && (
                  <div className="absolute top-16 left-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-80">
                    <div className="text-sm font-medium text-gray-700 mb-2 px-2">
                      Your Applications ({applications.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {applications.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => handleApplicationSelect(app)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedApplication.id === app.id 
                              ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {app.vehicle_type || 'Vehicle'} Application
                              </div>
                              <div className="text-xs text-gray-500">
                                Created {format(new Date(app.created_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              app.status === 'pre_approved' 
                                ? 'bg-green-100 text-green-800' 
                                : app.status === 'pending_documents'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {formatStatus(app.status)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <Link
                        to="/get-prequalified"
                        className="flex items-center justify-center gap-1 w-full text-[#3BAA75] hover:bg-[#3BAA75]/5 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Start New Application
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh dashboard"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <Link
                to="/help"
                className="flex items-center gap-2 text-gray-600 hover:text-[#3BAA75] transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="hidden md:inline">Get Help</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Bar */}
      {!isMobile && (
        <DashboardNavBar 
          onNavigate={handleSectionChange} 
          activeSection={activeSection} 
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 overflow-hidden">
        {/* Desktop Summary Stats */}
        {!isMobile && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Applications</p>
                  <p className="text-2xl font-semibold mt-1">{summaryStats.totalApplications}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-semibold mt-1">{summaryStats.approvedApplications}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Support Tickets</p>
                  <Link to="/help" className="text-2xl font-semibold mt-1 flex items-center group">
                    <span>Create</span>
                    <ArrowRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
                <div className="bg-amber-50 p-3 rounded-full">
                  <HelpCircle className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 h-full">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 h-full">
            {renderContent()}
          </div>

          {/* Right Sidebar - Only visible on desktop */}
          {!isMobile && (
            <div className="space-y-6 sm:space-y-8">
              {/* Account Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <h2 className="text-xl font-semibold mb-6">Account Summary</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Application Status</span>
                    <span className="font-medium text-[#3BAA75]">
                      {selectedApplication.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Documents Pending</span>
                    <span className="font-medium">{documents.filter(d => d.status === 'pending').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Next Appointment</span>
                    <span className="font-medium">
                      {selectedApplication.consultation_time
                        ? format(new Date(selectedApplication.consultation_time), 'MMM d, h:mm a')
                        : 'Not Scheduled'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Notifications */}
              <NotificationCenter
                notifications={notifications.slice(0, 3)}
                onMarkAsRead={handleMarkNotificationAsRead}
                onNavigate={handleSectionChange}
              />

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
                <div className="space-y-3">
                  <a 
                    href="#appointment-section" 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="bg-[#3BAA75]/10 p-2 rounded-full mr-3">
                        <CalendarClock className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <span className="font-medium">Schedule Consultation</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </a>
                  
                  <button 
                    onClick={() => handleSectionChange('documents')}
                    className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <div className="bg-[#3BAA75]/10 p-2 rounded-full mr-3">
                        <FileCheck className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <span className="font-medium">Upload Documents</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                  
                  <Link
                    to="/help"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="bg-[#3BAA75]/10 p-2 rounded-full mr-3">
                        <HelpCircle className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <span className="font-medium">Contact Support</span>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-gray-400" />
                  </Link>
                  
                  <Link
                    to="/calculator"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="bg-[#3BAA75]/10 p-2 rounded-full mr-3">
                        <BarChart3 className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <span className="font-medium">Payment Calculator</span>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-gray-400" />
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;