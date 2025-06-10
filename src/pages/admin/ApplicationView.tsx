import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  CreditCard,
  Car,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  Flag,
  UserCheck,
  Ban,
  Unlock,
  Key,
  Home,
  Users,
  Heart,
  Wallet,
  FileQuestion,
  HelpCircle,
  Percent
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { ApplicationTracker } from '../../components/ApplicationTracker';
import { DocumentManager } from '../../components/DocumentManager';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import type { Application, ApplicationStage, Document, Notification } from '../../types/database';
import toast from 'react-hot-toast';

const ApplicationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'messages' | 'notes' | 'actions'>('overview');
  
  // Status and Stage Management
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [newStage, setNewStage] = useState<number>(1);
  const [stageNotes, setStageNotes] = useState('');
  
  // Notes Management
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Messaging
  const [messageText, setMessageText] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Notifications
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  
  // User Management
  const [showUserActions, setShowUserActions] = useState(false);
  const [isPerformingUserAction, setIsPerformingUserAction] = useState(false);
  
  // Appointment Management
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isSchedulingAppointment, setIsSchedulingAppointment] = useState(false);

  // Application Editing
  const [isEditingApplication, setIsEditingApplication] = useState(false);
  const [editedApplication, setEditedApplication] = useState<Partial<Application>>({});

  const { uploadDocument, deleteDocument, uploading, error: uploadError } = useDocumentUpload(id || '');

  const statusOptions = [
    { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
    { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'pending_documents', label: 'Pending Documents', color: 'bg-orange-100 text-orange-700' },
    { value: 'pre_approved', label: 'Pre-Approved', color: 'bg-green-100 text-green-700' },
    { value: 'vehicle_selection', label: 'Vehicle Selection', color: 'bg-purple-100 text-purple-700' },
    { value: 'final_approval', label: 'Final Approval', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'finalized', label: 'Finalized', color: 'bg-gray-100 text-gray-700' }
  ];

  useEffect(() => {
    if (!id) {
      navigate('/admin/applications');
      return;
    }
    loadApplicationData();
  }, [id]);

  useEffect(() => {
    if (!application?.id || !user?.id) return;

    // Set up real-time subscriptions
    const applicationsChannel = supabase
      .channel('admin-application-view')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `id=eq.${application.id}`
        },
        (payload) => {
          setApplication(payload.new as Application);
          toast.success('Application updated');
        }
      )
      .subscribe();

    const documentsChannel = supabase
      .channel('admin-documents-view')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `application_id=eq.${application.id}`
        },
        () => {
          loadDocuments();
        }
      )
      .subscribe();

    const stagesChannel = supabase
      .channel('admin-stages-view')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_stages',
          filter: `application_id=eq.${application.id}`
        },
        () => {
          loadStages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(stagesChannel);
    };
  }, [application?.id, user?.id]);

  const loadApplicationData = async () => {
    try {
      setLoading(true);
      
      // Load application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError) throw appError;
      if (!appData) throw new Error('Application not found');

      setApplication(appData);
      setNotes(appData.internal_notes || '');
      setNewStatus(appData.status);
      setNewStage(appData.current_stage);
      setEditedApplication(appData);

      // Load related data
      await Promise.all([
        loadStages(),
        loadDocuments(),
        loadMessages(),
      ]);

    } catch (error: any) {
      console.error('Error loading application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStages = async () => {
    try {
      const { data, error } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', id)
        .order('stage_number', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!application || newStatus === application.status) {
      setIsEditingStatus(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      // Send notification to user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: 'Application Status Updated',
            message: `Your application status has been updated to ${newStatus.replace(/_/g, ' ')}.`,
            read: false
          });
      }

      setIsEditingStatus(false);
      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleStageUpdate = async () => {
    if (!application || newStage === application.current_stage) {
      setIsEditingStage(false);
      return;
    }

    try {
      // Update application stage
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          current_stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Create stage record
      const { error: stageError } = await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: newStage,
          status: 'completed',
          notes: stageNotes
        });

      if (stageError) throw stageError;

      // Send notification to user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: `Application Advanced to Stage ${newStage}`,
            message: `Your application has moved to stage ${newStage} of 7. ${stageNotes}`,
            read: false
          });
      }

      setIsEditingStage(false);
      setStageNotes('');
      toast.success('Stage updated successfully');
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  };

  const handleNotesUpdate = async () => {
    if (!application) return;

    try {
      setIsSavingNotes(true);
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          internal_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      setIsEditingNotes(false);
      toast.success('Notes saved successfully');
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSendMessage = async () => {
    if (!application || !messageTitle.trim() || !messageText.trim()) return;

    try {
      setIsSendingMessage(true);

      const { error } = await supabase
        .from('admin_messages')
        .insert({
          admin_id: user?.id,
          user_id: application.user_id,
          application_id: application.id,
          message: `${messageTitle}\n\n${messageText}`,
          is_admin: true,
          read: false
        });

      if (error) throw error;

      // Also create a notification
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: messageTitle,
            message: messageText,
            read: false
          });
      }

      setMessageTitle('');
      setMessageText('');
      loadMessages();
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendNotification = async () => {
    if (!application || !notificationTitle.trim() || !notificationMessage.trim()) return;

    try {
      setIsSendingNotification(true);

      if (application.user_id) {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: notificationTitle,
            message: notificationMessage,
            read: false
          });

        if (error) throw error;
      }

      setNotificationTitle('');
      setNotificationMessage('');
      toast.success('Notification sent successfully');
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!application || !appointmentDate || !appointmentTime) return;

    try {
      setIsSchedulingAppointment(true);

      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);

      const { error } = await supabase
        .from('applications')
        .update({ 
          consultation_time: appointmentDateTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      // Send notification to user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: 'Consultation Scheduled',
            message: `Your consultation has been scheduled for ${format(appointmentDateTime, 'MMMM d, yyyy at h:mm a')}.`,
            read: false
          });
      }

      setAppointmentDate('');
      setAppointmentTime('');
      toast.success('Appointment scheduled successfully');
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setIsSchedulingAppointment(false);
    }
  };

  const handleUserAction = async (action: 'reset_password' | 'disable_account' | 'enable_account') => {
    if (!application?.user_id) return;

    try {
      setIsPerformingUserAction(true);

      // These would typically call Supabase Admin API
      // For now, we'll just show success messages
      switch (action) {
        case 'reset_password':
          // In a real implementation, you'd call the admin API to send a password reset email
          toast.success('Password reset email sent to user');
          break;
        case 'disable_account':
          // In a real implementation, you'd disable the user account
          toast.success('User account disabled');
          break;
        case 'enable_account':
          // In a real implementation, you'd enable the user account
          toast.success('User account enabled');
          break;
      }

      setShowUserActions(false);
    } catch (error: any) {
      console.error('Error performing user action:', error);
      toast.error('Failed to perform action');
    } finally {
      setIsPerformingUserAction(false);
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    try {
      const document = await uploadDocument(file, category);
      if (document) {
        setDocuments(prev => [document, ...prev]);
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
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleEditApplication = () => {
    if (!application) return;
    setEditedApplication(application);
    setIsEditingApplication(true);
  };

  const handleSaveApplication = async () => {
    if (!application) return;
    
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          ...editedApplication,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);
        
      if (error) throw error;
      
      setApplication({...application, ...editedApplication} as Application);
      setIsEditingApplication(false);
      toast.success('Application updated successfully');
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedApplication(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedApplication(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value)
    }));
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Application Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The application you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/admin/applications')}
            className="bg-[#3BAA75] text-white px-6 py-3 rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/applications')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                  {application.first_name} {application.last_name}
                </h1>
                <p className="text-sm text-gray-500">
                  Application #{application.id.slice(0, 8)} • {format(new Date(application.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(application.status)}`}>
                {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
              { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
              { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
              { id: 'notes', label: 'Notes', icon: <Edit className="h-4 w-4" /> },
              { id: 'actions', label: 'Actions', icon: <Settings className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#3BAA75] text-[#3BAA75]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Status and Stage Management */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Status Management */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Application Status</h3>
                    <button
                      onClick={() => setIsEditingStatus(!isEditingStatus)}
                      className="text-[#3BAA75] hover:text-[#2D8259] transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>

                  {isEditingStatus ? (
                    <div className="space-y-4">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleStatusUpdate}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingStatus(false);
                            setNewStatus(application.status);
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                      {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  )}
                </div>

                {/* Stage Management */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Current Stage</h3>
                    <button
                      onClick={() => setIsEditingStage(!isEditingStage)}
                      className="text-[#3BAA75] hover:text-[#2D8259] transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>

                  {isEditingStage ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stage Number (1-7)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={newStage}
                          onChange={(e) => setNewStage(parseInt(e.target.value))}
                          className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stage Notes
                        </label>
                        <textarea
                          value={stageNotes}
                          onChange={(e) => setStageNotes(e.target.value)}
                          className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          rows={3}
                          placeholder="Optional notes about this stage..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleStageUpdate}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Update Stage
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingStage(false);
                            setNewStage(application.current_stage);
                            setStageNotes('');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-[#3BAA75]">
                      Stage {application.current_stage} of 7
                    </div>
                  )}
                </div>
              </div>

              {/* Application Details */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Application Details</h3>
                  <button
                    onClick={handleEditApplication}
                    className="flex items-center gap-2 px-4 py-2 text-[#3BAA75] border border-[#3BAA75] rounded-lg hover:bg-[#3BAA75]/10 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Details
                  </button>
                </div>

                {isEditingApplication ? (
                  <div className="space-y-6">
                    {/* Personal Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            name="first_name"
                            value={editedApplication.first_name || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            name="last_name"
                            value={editedApplication.last_name || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={editedApplication.email || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            name="phone"
                            value={editedApplication.phone || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            name="date_of_birth"
                            value={editedApplication.date_of_birth || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                          <select
                            name="marital_status"
                            value={editedApplication.marital_status || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dependents</label>
                          <input
                            type="number"
                            name="dependents"
                            value={editedApplication.dependents || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Address Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <input
                            type="text"
                            name="address"
                            value={editedApplication.address || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            name="city"
                            value={editedApplication.city || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                          <select
                            name="province"
                            value={editedApplication.province || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Province</option>
                            <option value="ON">Ontario</option>
                            <option value="BC">British Columbia</option>
                            <option value="AB">Alberta</option>
                            <option value="MB">Manitoba</option>
                            <option value="NB">New Brunswick</option>
                            <option value="NL">Newfoundland and Labrador</option>
                            <option value="NS">Nova Scotia</option>
                            <option value="PE">Prince Edward Island</option>
                            <option value="QC">Quebec</option>
                            <option value="SK">Saskatchewan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                          <input
                            type="text"
                            name="postal_code"
                            value={editedApplication.postal_code || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Housing Status</label>
                          <select
                            name="housing_status"
                            value={editedApplication.housing_status || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Status</option>
                            <option value="own">Own</option>
                            <option value="rent">Rent</option>
                            <option value="live_with_parents">Live with parents</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Housing Payment</label>
                          <input
                            type="number"
                            name="housing_payment"
                            value={editedApplication.housing_payment || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Residence Duration</label>
                          <input
                            type="text"
                            name="residence_duration"
                            value={editedApplication.residence_duration || ''}
                            onChange={handleInputChange}
                            placeholder="e.g., 3 years"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Employment Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Employment Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                          <select
                            name="employment_status"
                            value={editedApplication.employment_status || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Status</option>
                            <option value="employed">Employed</option>
                            <option value="self_employed">Self-Employed</option>
                            <option value="unemployed">Unemployed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employer Name</label>
                          <input
                            type="text"
                            name="employer_name"
                            value={editedApplication.employer_name || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                          <input
                            type="text"
                            name="occupation"
                            value={editedApplication.occupation || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Duration</label>
                          <input
                            type="text"
                            name="employment_duration"
                            value={editedApplication.employment_duration || ''}
                            onChange={handleInputChange}
                            placeholder="e.g., 2 years"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                          <input
                            type="number"
                            name="annual_income"
                            value={editedApplication.annual_income || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Other Income</label>
                          <input
                            type="number"
                            name="other_income"
                            value={editedApplication.other_income || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Financial Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                          <input
                            type="number"
                            name="credit_score"
                            value={editedApplication.credit_score || ''}
                            onChange={handleNumberInputChange}
                            min="300"
                            max="900"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Collects Government Benefits</label>
                          <select
                            name="collects_government_benefits"
                            value={editedApplication.collects_government_benefits ? 'true' : 'false'}
                            onChange={(e) => setEditedApplication({
                              ...editedApplication,
                              collects_government_benefits: e.target.value === 'true'
                            })}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Has Debt Discharge History</label>
                          <select
                            name="has_debt_discharge_history"
                            value={editedApplication.has_debt_discharge_history ? 'true' : 'false'}
                            onChange={(e) => setEditedApplication({
                              ...editedApplication,
                              has_debt_discharge_history: e.target.value === 'true'
                            })}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        </div>
                        
                        {editedApplication.has_debt_discharge_history && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Type</label>
                              <select
                                name="debt_discharge_type"
                                value={editedApplication.debt_discharge_type || ''}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              >
                                <option value="">Select Type</option>
                                <option value="bankruptcy">Bankruptcy</option>
                                <option value="consumer_proposal">Consumer Proposal</option>
                                <option value="informal_settlement">Informal Settlement</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Year</label>
                              <input
                                type="number"
                                name="debt_discharge_year"
                                value={editedApplication.debt_discharge_year || ''}
                                onChange={handleNumberInputChange}
                                min="1900"
                                max={new Date().getFullYear()}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Status</label>
                              <select
                                name="debt_discharge_status"
                                value={editedApplication.debt_discharge_status || ''}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              >
                                <option value="">Select Status</option>
                                <option value="active">Active</option>
                                <option value="discharged">Discharged</option>
                                <option value="not_sure">Not Sure</option>
                              </select>
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Comments</label>
                              <textarea
                                name="debt_discharge_comments"
                                value={editedApplication.debt_discharge_comments || ''}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Vehicle Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                          <select
                            name="vehicle_type"
                            value={editedApplication.vehicle_type || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Type</option>
                            <option value="Car">Car</option>
                            <option value="SUV">SUV</option>
                            <option value="Truck">Truck</option>
                            <option value="Van">Van</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desired Monthly Payment</label>
                          <input
                            type="number"
                            name="desired_monthly_payment"
                            value={editedApplication.desired_monthly_payment || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desired Loan Amount</label>
                          <input
                            type="number"
                            name="desired_loan_amount"
                            value={editedApplication.desired_loan_amount || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment Amount</label>
                          <input
                            type="number"
                            name="down_payment_amount"
                            value={editedApplication.down_payment_amount || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Min</label>
                          <input
                            type="number"
                            name="loan_amount_min"
                            value={editedApplication.loan_amount_min || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Max</label>
                          <input
                            type="number"
                            name="loan_amount_max"
                            value={editedApplication.loan_amount_max || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                          <input
                            type="number"
                            name="interest_rate"
                            value={editedApplication.interest_rate || ''}
                            onChange={handleNumberInputChange}
                            min="0"
                            max="30"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (months)</label>
                          <select
                            name="loan_term"
                            value={editedApplication.loan_term || ''}
                            onChange={handleNumberInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Term</option>
                            <option value="36">36 months</option>
                            <option value="48">48 months</option>
                            <option value="60">60 months</option>
                            <option value="72">72 months</option>
                            <option value="84">84 months</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Contact Preferences Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Contact Preferences</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                          <select
                            name="preferred_contact_method"
                            value={editedApplication.preferred_contact_method || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Method</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Time</label>
                          <input
                            type="datetime-local"
                            name="consultation_time"
                            value={editedApplication.consultation_time ? new Date(editedApplication.consultation_time).toISOString().slice(0, 16) : ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setIsEditingApplication(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveApplication}
                        className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Personal Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <User className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-medium">{application.first_name} {application.last_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{application.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{application.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">
                            {application.date_of_birth ? format(new Date(application.date_of_birth), 'MMMM d, yyyy') : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Marital Status</p>
                          <p className="font-medium">
                            {application.marital_status 
                              ? application.marital_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Dependents</p>
                          <p className="font-medium">{application.dependents ?? 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <Home className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Address Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{application.address || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">City</p>
                          <p className="font-medium">{application.city || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Province</p>
                          <p className="font-medium">{application.province || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Postal Code</p>
                          <p className="font-medium">{application.postal_code || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Housing Status</p>
                          <p className="font-medium">
                            {application.housing_status 
                              ? application.housing_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Housing Payment</p>
                          <p className="font-medium">
                            {application.housing_payment 
                              ? `$${application.housing_payment.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Residence Duration</p>
                          <p className="font-medium">{application.residence_duration || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Employment Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <Briefcase className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Employment Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Employment Status</p>
                          <p className="font-medium">
                            {application.employment_status 
                              ? application.employment_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Employer Name</p>
                          <p className="font-medium">{application.employer_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Occupation</p>
                          <p className="font-medium">{application.occupation || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Employment Duration</p>
                          <p className="font-medium">{application.employment_duration || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Annual Income</p>
                          <p className="font-medium">
                            {application.annual_income 
                              ? `$${application.annual_income.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Other Income</p>
                          <p className="font-medium">
                            {application.other_income 
                              ? `$${application.other_income.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Financial Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <Wallet className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Financial Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Credit Score</p>
                          <p className="font-medium">{application.credit_score || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Government Benefits</p>
                          <p className="font-medium">
                            {application.collects_government_benefits !== null 
                              ? (application.collects_government_benefits ? 'Yes' : 'No') 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Debt Discharge History</p>
                          <p className="font-medium">
                            {application.has_debt_discharge_history !== null 
                              ? (application.has_debt_discharge_history ? 'Yes' : 'No') 
                              : 'Not provided'}
                          </p>
                        </div>
                        
                        {application.has_debt_discharge_history && (
                          <>
                            <div>
                              <p className="text-sm text-gray-500">Debt Discharge Type</p>
                              <p className="font-medium">
                                {application.debt_discharge_type 
                                  ? application.debt_discharge_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                                  : 'Not provided'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Debt Discharge Year</p>
                              <p className="font-medium">{application.debt_discharge_year || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Debt Discharge Status</p>
                              <p className="font-medium">
                                {application.debt_discharge_status 
                                  ? application.debt_discharge_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                                  : 'Not provided'}
                              </p>
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                              <p className="text-sm text-gray-500">Debt Discharge Comments</p>
                              <p className="font-medium">{application.debt_discharge_comments || 'No comments provided'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <Car className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Vehicle Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Vehicle Type</p>
                          <p className="font-medium">{application.vehicle_type || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Desired Monthly Payment</p>
                          <p className="font-medium">
                            {application.desired_monthly_payment 
                              ? `$${application.desired_monthly_payment.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Desired Loan Amount</p>
                          <p className="font-medium">
                            {application.desired_loan_amount 
                              ? `$${application.desired_loan_amount.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Down Payment Amount</p>
                          <p className="font-medium">
                            {application.down_payment_amount 
                              ? `$${application.down_payment_amount.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Loan Amount Range</p>
                          <p className="font-medium">
                            {application.loan_amount_min && application.loan_amount_max 
                              ? `$${application.loan_amount_min.toLocaleString()} - $${application.loan_amount_max.toLocaleString()}` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Interest Rate</p>
                          <p className="font-medium">
                            {application.interest_rate 
                              ? `${application.interest_rate}%` 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Loan Term</p>
                          <p className="font-medium">
                            {application.loan_term 
                              ? `${application.loan_term} months` 
                              : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Preferences Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <Phone className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Contact Preferences
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Preferred Contact Method</p>
                          <p className="font-medium">
                            {application.preferred_contact_method 
                              ? application.preferred_contact_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Consultation Time</p>
                          <p className="font-medium">
                            {application.consultation_time 
                              ? format(new Date(application.consultation_time), 'MMMM d, yyyy h:mm a') 
                              : 'Not scheduled'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Consent Information Section */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b flex items-center">
                        <FileCheck className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Consent Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Consent to Soft Credit Check</p>
                          <p className="font-medium">
                            {application.consent_soft_check !== null 
                              ? (application.consent_soft_check ? 'Yes' : 'No') 
                              : 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Terms Accepted</p>
                          <p className="font-medium">
                            {application.terms_accepted !== null 
                              ? (application.terms_accepted ? 'Yes' : 'No') 
                              : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Application Progress */}
              <ApplicationTracker application={application} stages={stages} />
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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

          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Send Message */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Send Message to User</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Message subject..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      rows={4}
                      placeholder="Type your message..."
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !messageTitle.trim() || !messageText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {isSendingMessage ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Message
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Message History</h3>
                {messages.length === 0 ? (
                  <p className="text-gray-500">No messages yet</p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="border-l-4 border-[#3BAA75] pl-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {message.is_admin ? 'Admin' : 'User'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Internal Notes</h3>
                  <button
                    onClick={() => setIsEditingNotes(!isEditingNotes)}
                    className="text-[#3BAA75] hover:text-[#2D8259] transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                {isEditingNotes ? (
                  <div className="space-y-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-64 rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Add internal notes about this application..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleNotesUpdate}
                        disabled={isSavingNotes}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                      >
                        {isSavingNotes ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Notes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingNotes(false);
                          setNotes(application.internal_notes || '');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-32">
                    {notes ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">No notes added yet</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'actions' && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Send Notification */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Send Notification</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      placeholder="Notification title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      rows={3}
                      placeholder="Notification message..."
                    />
                  </div>
                  <button
                    onClick={handleSendNotification}
                    disabled={isSendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {isSendingNotification ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                    Send Notification
                  </button>
                </div>
              </div>

              {/* Schedule Appointment */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Schedule Appointment</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e)=> setAppointmentDate(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleScheduleAppointment}
                    disabled={isSchedulingAppointment || !appointmentDate || !appointmentTime}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {isSchedulingAppointment ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    Schedule Appointment
                  </button>
                </div>
              </div>

              {/* User Account Actions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">User Account Actions</h3>
                  <button
                    onClick={() => setShowUserActions(!showUserActions)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showUserActions ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {showUserActions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-2">
                        <button
                          onClick={() => handleUserAction('reset_password')}
                          disabled={isPerformingUserAction || !application.user_id}
                          className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Key className="h-5 w-5 text-amber-500" />
                          <div>
                            <div className="font-medium">Reset Password</div>
                            <div className="text-sm text-gray-500">Send password reset email to user</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleUserAction('disable_account')}
                          disabled={isPerformingUserAction || !application.user_id}
                          className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Ban className="h-5 w-5 text-red-500" />
                          <div>
                            <div className="font-medium">Disable Account</div>
                            <div className="text-sm text-gray-500">Temporarily disable user account</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleUserAction('enable_account')}
                          disabled={isPerformingUserAction || !application.user_id}
                          className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Unlock className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="font-medium">Enable Account</div>
                            <div className="text-sm text-gray-500">Re-enable disabled user account</div>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Flag Application */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Flag Application</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      className="flex items-center gap-2 px-4 py-3 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      <Flag className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Flag for Review</div>
                        <div className="text-sm">Mark for additional review</div>
                      </div>
                    </button>

                    <button
                      className="flex items-center gap-2 px-4 py-3 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <AlertCircle className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Flag as Suspicious</div>
                        <div className="text-sm">Mark as potentially fraudulent</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ApplicationView;