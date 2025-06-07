import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  CalendarClock
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prequalificationData, setPrequalificationData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  
  // Move the useDocumentUpload hook to the component level
  const { uploadDocument, deleteDocument, uploading, error: uploadError } = useDocumentUpload(application?.id || '');

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
    if (!application?.id) return;

    // Set up real-time subscription for documents
    const documentsSubscription = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `application_id=eq.${application.id}`
        },
        (payload) => {
          console.log('Document change received:', payload);
          
          // Reload documents when changes occur
          loadDocuments(application.id);
          
          // Show toast notification
          if (payload.eventType === 'INSERT') {
            toast.success('Document uploaded successfully');
          } else if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new.status;
            if (newStatus === 'approved') {
              toast.success('Document approved');
            } else if (newStatus === 'rejected') {
              toast.error('Document rejected');
            } else {
              toast.success('Document updated');
            }
          } else if (payload.eventType === 'DELETE') {
            toast.success('Document removed');
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for notifications
    const notificationsSubscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Notification change received:', payload);
          
          // Reload notifications when changes occur
          loadNotifications(user?.id);
          
          // Show toast for new notifications
          if (payload.eventType === 'INSERT') {
            toast.success('New notification received');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(documentsSubscription);
      supabase.removeChannel(notificationsSubscription);
    };
  }, [application?.id, user?.id]);

  const loadDashboardData = async () => {
    try {
      if (!user) return;

      // Load application data
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (applicationError) {
        throw applicationError;
      }

      if (!applicationData) {
        navigate('/get-approved');
        return;
      }

      setApplication(applicationData);

      // Load stages
      await loadStages(applicationData.id);

      // Load documents
      await loadDocuments(applicationData.id);

      // Load notifications
      await loadNotifications(user.id);

      // Set mock prequalification data (replace with real data in production)
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

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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
    if (!application) return;
    
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

  if (!application) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome Back, {application.first_name || user?.email?.split('@')[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <PreQualifiedBadge />
                <span className="text-sm text-gray-500">
                  Application #{application.id.slice(0, 8)}
                </span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-8">
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
                <div className="grid grid-cols-3 gap-6 mt-8">
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

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  icon: <FileCheck className="h-6 w-6" />,
                  label: "Upload Documents",
                  action: () => {
                    setActiveTab('upload');
                    document.getElementById('document-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                },
                {
                  icon: <FileText className="h-6 w-6" />,
                  label: "Manage Documents",
                  action: () => {
                    setActiveTab('manage');
                    document.getElementById('document-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                },
                {
                  icon: <Calendar className="h-6 w-6" />,
                  label: "Schedule Consultation",
                  action: () => document.getElementById('appointment-section')?.scrollIntoView({ behavior: 'smooth' })
                },
                {
                  icon: <Car className="h-6 w-6" />,
                  label: "Browse Vehicles",
                  action: () => navigate('/vehicles')
                }
              ].map((action, index) => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-center"
                >
                  <div className="bg-[#3BAA75]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="text-[#3BAA75]">{action.icon}</div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Application Progress */}
            <ApplicationTracker
              application={application}
              stages={stages}
            />

            {/* Document Section */}
            <div id="document-section" className="space-y-4">
              {/* Document Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'upload'
                      ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload Documents
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'manage'
                      ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage Documents
                </button>
              </div>

              {/* Document Content */}
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
                      applicationId={application.id}
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
                      applicationId={application.id}
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

            {/* Appointment Scheduler */}
            <div id="appointment-section">
              <AppointmentScheduler
                onSchedule={async (date, type) => {
                  try {
                    const { error } = await supabase
                      .from('applications')
                      .update({ consultation_time: date.toISOString() })
                      .eq('id', application.id);

                    if (error) throw error;
                    
                    setApplication(prev => prev ? {
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

          {/* Right Sidebar */}
          <div className="space-y-8">
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
                    {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Documents Pending</span>
                  <span className="font-medium">{documents.filter(d => d.status === 'pending').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Next Appointment</span>
                  <span className="font-medium">
                    {application.consultation_time
                      ? format(new Date(application.consultation_time), 'MMM d, h:mm a')
                      : 'Not Scheduled'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Notifications */}
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
            />

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {stages.slice(-3).reverse().map((stage) => (
                  <div key={stage.id} className="flex items-start gap-3">
                    <div className="bg-[#3BAA75]/10 rounded-full p-2">
                      <Clock className="h-5 w-5 text-[#3BAA75]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Stage {stage.stage_number} - {stage.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(stage.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;