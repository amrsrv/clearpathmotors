import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
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
  Home as HomeIcon,
  Menu,
  X
} from 'lucide-react';
import type { Application, ApplicationStage, Document, Notification } from '../types/database';
import { PreQualifiedBadge } from '../components/PreQualifiedBadge';
import { LoanRangeBar } from '../components/LoanRangeBar';
import { ApplicationTracker } from '../components/ApplicationTracker';
import { DocumentUpload } from '../components/DocumentUpload';
import { NotificationCenter } from '../components/NotificationCenter';
import { AppointmentScheduler } from '../components/AppointmentScheduler';
import toast from 'react-hot-toast';
import { DocumentManager } from '../components/DocumentManager';
import { UserMessageCenter } from '../components/UserMessageCenter';
import { ApplicationCard } from '../components/ApplicationCard';
import { UserProfileSection } from '../components/UserProfileSection';

interface DashboardProps {
  activeSection?: string;
  setActiveSection?: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  activeSection = 'overview',
  setActiveSection = () => {}
}) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prequalificationData, setPrequalificationData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [activeDocumentSection, setActiveDocumentSection] = useState<'documents' | 'messages' | 'activity'>('documents');
  const [showApplicationSelector, setShowApplicationSelector] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalApplications: 0,
    approvedApplications: 0,
    unreadMessages: 0
  });
  
  // Move the useDocumentUpload hook to the component level
  const { uploadDocument, deleteDocument, uploading, error: uploadError } = useDocumentUpload(selectedApplication?.id || '');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!selectedApplication?.id || !user?.id) return;

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
          console.log('Application update received:', payload);
          
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
          console.log('Document change received:', payload);
          
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
          console.log('Notification change received:', payload);
          
          // Reload notifications to get the latest state
          await loadNotifications(user.id);
          
          // Update summary stats
          await loadSummaryStats();
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
          console.log('Stage change received:', payload);
          
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
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          read: false
        });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      if (!user) return;

      // Load all applications for this user
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (applicationError) {
        throw applicationError;
      }

      if (!applicationData || applicationData.length === 0) {
        navigate('/get-approved');
        return;
      }

      setApplications(applicationData);
      
      // Select the most recent application by default
      const mostRecentApplication = applicationData[0];
      setSelectedApplication(mostRecentApplication);

      // Load stages for the selected application
      await loadStages(mostRecentApplication.id);

      // Load documents for the selected application
      await loadDocuments(mostRecentApplication.id);

      // Load notifications
      await loadNotifications(user.id);

      // Load summary stats
      await loadSummaryStats();

      // Set prequalification data
      updatePrequalificationData(mostRecentApplication);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaryStats = async () => {
    if (!user) return;

    try {
      // Count total applications for this user
      const { count: totalCount, error: totalError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count approved applications
      const { count: approvedCount, error: approvedError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pre_approved', 'finalized']);

      // Count unread messages
      const { count: unreadCount, error: unreadError } = await supabase
        .from('admin_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_admin', true)
        .eq('read', false);

      if (totalError || approvedError || unreadError) {
        console.error('Error loading summary stats:', { totalError, approvedError, unreadError });
        return;
      }

      setSummaryStats({
        totalApplications: totalCount || 0,
        approvedApplications: approvedCount || 0,
        unreadMessages: unreadCount || 0
      });
    } catch (error) {
      console.error('Error loading summary stats:', error);
    }
  };

  const updatePrequalificationData = (applicationData: Application) => {
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
    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', applicationId)
        .order('stage_number', { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const loadDocuments = async (applicationId: string) => {
    try {
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadNotifications = async (userId: string) => {
    try {
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    if (!selectedApplication) return;
    
    try {
      const document = await uploadDocument(file, category);
      if (document) {
        // Update the documents state immediately with the new document
        setDocuments(prevDocuments => [document, ...prevDocuments]);
        toast.success('Document uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      // Update the documents state immediately by removing the deleted document
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleApplicationSelect = async (application: Application) => {
    setSelectedApplication(application);
    await loadStages(application.id);
    await loadDocuments(application.id);
    updatePrequalificationData(application);
    setShowApplicationSelector(false);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-[#3BAA75] text-white px-6 py-3 rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!selectedApplication) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">No Application Found</h2>
          <p className="text-gray-600 mb-6">Start your application to view this dashboard</p>
          <button
            onClick={() => navigate('/get-approved')}
            className="bg-[#3BAA75] text-white px-6 py-3 rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Start Application
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Prequalification Results */}
            {prequalificationData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2A7A5B] rounded-xl p-8 text-white shadow-xl"
              >
                <h2 className="text-2xl font-semibold mb-6">Your Prequalification Results</h2>
                <LoanRangeBar
                  min={prequalificationData.loanRange.min}
                  max={prequalificationData.loanRange.max}
                  rate={prequalificationData.loanRange.rate}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                  <div className="text-center">
                    <div className="text-white/80 text-sm mb-1">Monthly Payment</div>
                    <div className="text-2xl font-bold">${prequalificationData.monthlyPayment}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/80 text-sm mb-1">Term Length</div>
                    <div className="text-2xl font-bold">{prequalificationData.term} months</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/80 text-sm mb-1">Interest Rate</div>
                    <div className="text-2xl font-bold">{prequalificationData.loanRange.rate}%</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Applications Hub */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Applications Hub</h2>
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
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Your Applications</h2>
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
          </div>
        );
      
      case 'applications':
        return (
          <div className="space-y-8">
            {/* Applications List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Your Applications</h2>
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
            
            {/* Application Progress */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Application Progress</h2>
              <ApplicationTracker
                application={selectedApplication}
                stages={stages}
              />
            </div>
          </div>
        );
      
      case 'documents':
        return (
          <div className="space-y-8">
            {/* Document Tabs */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 px-4 py-3 font-medium text-sm ${
                    activeTab === 'upload'
                      ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Documents
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`flex-1 px-4 py-3 font-medium text-sm ${
                    activeTab === 'manage'
                      ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5" />
                    Manage Documents
                  </div>
                </button>
              </div>

              {/* Document Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'upload' ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DocumentUpload
                        applicationId={selectedApplication.id}
                        documents={documents}
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
          </div>
        );
      
      case 'messages':
        return (
          <div className="space-y-8">
            <UserMessageCenter 
              userId={user?.id || ''} 
              applicationId={selectedApplication.id} 
            />
          </div>
        );
      
      case 'notifications':
        return (
          <div className="space-y-8">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
            />
          </div>
        );
      
      case 'profile':
        return (
          <div className="space-y-8">
            <UserProfileSection 
              application={selectedApplication}
              onUpdate={loadDashboardData}
            />
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Section Not Found</h2>
            <p className="text-gray-600">The requested section does not exist.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="mr-3 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden"
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Welcome Back, {selectedApplication.first_name || user?.email?.split('@')[0]}
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
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/contact')}
                className="flex items-center gap-2 text-gray-600 hover:text-[#3BAA75] transition-colors"
              >
                <Phone className="h-5 w-5" />
                <span className="hidden md:inline">Contact Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => {
                  handleSectionChange('overview');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeSection === 'overview' 
                    ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <HomeIcon className="h-5 w-5" />
                <span>Dashboard Overview</span>
              </button>
              
              <button
                onClick={() => {
                  handleSectionChange('applications');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeSection === 'applications' 
                    ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Applications</span>
              </button>
              
              <button
                onClick={() => {
                  handleSectionChange('documents');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeSection === 'documents' 
                    ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileCheck className="h-5 w-5" />
                <span>Documents</span>
              </button>
              
              <button
                onClick={() => {
                  handleSectionChange('messages');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeSection === 'messages' 
                    ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Messages</span>
                {summaryStats.unreadMessages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {summaryStats.unreadMessages}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  handleSectionChange('notifications');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeSection === 'notifications' 
                    ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  handleSectionChange('profile');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeSection === 'profile' 
                    ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application Selector Dropdown */}
      {showApplicationSelector && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Your Applications</h3>
              <button
                onClick={() => setShowApplicationSelector(false)}
                className="text-gray-400 hover:text-gray-500 p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-colors
                    ${selectedApplication.id === app.id 
                      ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
                      : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleApplicationSelect(app)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {app.vehicle_type || 'Vehicle'} Application
                    </h4>
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${app.status === 'pre_approved' 
                        ? 'bg-green-100 text-green-800' 
                        : app.status === 'pending_documents'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                      }
                    `}>
                      {formatStatus(app.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Created {format(new Date(app.created_at), 'MMM d, yyyy')}
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Loan:</span>{' '}
                      <span className="font-medium">${app.loan_amount_min?.toLocaleString()} - ${app.loan_amount_max?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment:</span>{' '}
                      <span className="font-medium">${app.desired_monthly_payment?.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <Link
                to="/get-prequalified"
                className="block w-full text-center bg-[#3BAA75] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#2D8259] transition-colors"
              >
                Start New Application
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Desktop Only */}
          <div className="hidden md:block md:col-span-1">
            <div className="space-y-4 sticky top-28">
              {/* Desktop Navigation */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => handleSectionChange('overview')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                      activeSection === 'overview' 
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <HomeIcon className="h-5 w-5" />
                    <span>Dashboard Overview</span>
                  </button>
                  
                  <button
                    onClick={() => handleSectionChange('applications')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                      activeSection === 'applications' 
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                    <span>Applications</span>
                  </button>
                  
                  <button
                    onClick={() => handleSectionChange('documents')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                      activeSection === 'documents' 
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FileCheck className="h-5 w-5" />
                    <span>Documents</span>
                  </button>
                  
                  <button
                    onClick={() => handleSectionChange('messages')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg ${
                      activeSection === 'messages' 
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" />
                      <span>Messages</span>
                    </div>
                    {summaryStats.unreadMessages > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {summaryStats.unreadMessages}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSectionChange('notifications')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg ${
                      activeSection === 'notifications' 
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5" />
                      <span>Notifications</span>
                    </div>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSectionChange('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                      activeSection === 'profile' 
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                  </button>
                </nav>
              </div>

              {/* Account Summary */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <h2 className="text-lg font-semibold mb-4">Account Summary</h2>
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

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
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
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="bg-[#3BAA75]/10 p-2 rounded-full mr-3">
                        <FileCheck className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <span className="font-medium">Upload Documents</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                  
                  <button 
                    onClick={() => handleSectionChange('messages')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="bg-[#3BAA75]/10 p-2 rounded-full mr-3">
                        <MessageSquare className="h-5 w-5 text-[#3BAA75]" />
                      </div>
                      <span className="font-medium">Message Support</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                  
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
          </div>

          {/* Main Content - Desktop */}
          <div className="md:col-span-2 lg:col-span-2 space-y-8">
            {renderContent()}
          </div>

          {/* Right Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="space-y-8 sticky top-28">
              {/* Notifications */}
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationAsRead}
              />

              {/* Appointment Scheduler */}
              <div id="appointment-section">
                <AppointmentScheduler
                  onSchedule={async (date, type) => {
                    try {
                      const { error } = await supabase
                        .from('applications')
                        .update({ consultation_time: date.toISOString() })
                        .eq('id', selectedApplication.id);

                      if (error) throw error;
                      
                      setSelectedApplication(prev => prev ? {
                        ...prev,
                        consultation_time: date.toISOString()
                      } : null);
                      
                      toast.success('Consultation scheduled successfully');
                    } catch (error) {
                      console.error('Error scheduling appointment:', error);
                      toast.error('Failed to schedule consultation');
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {renderContent()}
          
          {/* Mobile-only sections that are in the sidebar on desktop */}
          {activeSection === 'overview' && (
            <>
              {/* Appointment Scheduler for mobile */}
              <div id="appointment-section" className="mt-8">
                <AppointmentScheduler
                  onSchedule={async (date, type) => {
                    try {
                      const { error } = await supabase
                        .from('applications')
                        .update({ consultation_time: date.toISOString() })
                        .eq('id', selectedApplication.id);

                      if (error) throw error;
                      
                      setSelectedApplication(prev => prev ? {
                        ...prev,
                        consultation_time: date.toISOString()
                      } : null);
                      
                      toast.success('Consultation scheduled successfully');
                    } catch (error) {
                      console.error('Error scheduling appointment:', error);
                      toast.error('Failed to schedule consultation');
                    }
                  }}
                />
              </div>

              {/* Future Payments Block (Placeholder) */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-200 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#3BAA75]" />
                    Future Payments
                  </h2>
                  <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded">Coming Soon</span>
                </div>
                <p className="text-gray-600 mb-4">
                  Once your loan is finalized, you'll be able to view and manage your payments here.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Next Payment</span>
                    <span>--/--/----</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500 mt-2">
                    <span>Amount</span>
                    <span>$---</span>
                  </div>
                </div>
              </div>

              {/* Add-On Services Block (Placeholder) */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-200 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#3BAA75]" />
                    Add-On Services
                  </h2>
                  <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded">Coming Soon</span>
                </div>
                <p className="text-gray-600 mb-4">
                  Enhance your vehicle ownership experience with additional services and protection plans.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="font-medium text-gray-700">Extended Warranty</p>
                    <p className="text-sm text-gray-500">Protect your investment</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="font-medium text-gray-700">GAP Insurance</p>
                    <p className="text-sm text-gray-500">Coverage for the unexpected</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;