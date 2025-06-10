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
  Filter,
  Settings,
  Flag,
  UserCheck,
  Ban,
  Unlock,
  Key,
  Home,
  Users,
  Heart,
  Landmark,
  FileQuestion,
  HelpCircle,
  ToggleLeft,
  ToggleRight
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

  // Application Details Editing
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedApplication, setEditedApplication] = useState<Partial<Application>>({});
  const [isSavingDetails, setIsSavingDetails] = useState(false);

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

  const maritalStatusOptions = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'separated', label: 'Separated' },
    { value: 'other', label: 'Other' }
  ];

  const housingStatusOptions = [
    { value: 'own', label: 'Own' },
    { value: 'rent', label: 'Rent' },
    { value: 'live_with_parents', label: 'Live with Parents' },
    { value: 'other', label: 'Other' }
  ];

  const debtDischargeTypeOptions = [
    { value: 'bankruptcy', label: 'Bankruptcy' },
    { value: 'consumer_proposal', label: 'Consumer Proposal' },
    { value: 'informal_settlement', label: 'Informal Settlement' },
    { value: 'other', label: 'Other' }
  ];

  const debtDischargeStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'discharged', label: 'Discharged' },
    { value: 'not_sure', label: 'Not Sure' }
  ];

  const preferredContactMethodOptions = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'sms', label: 'SMS' }
  ];

  const employmentStatusOptions = [
    { value: 'employed', label: 'Employed' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'unemployed', label: 'Unemployed' }
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

  const handleEditDetailsToggle = () => {
    if (isEditingDetails) {
      // Cancel editing
      setEditedApplication(application || {});
      setIsEditingDetails(false);
    } else {
      // Start editing
      setEditedApplication(application || {});
      setIsEditingDetails(true);
    }
  };

  const handleEditDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditedApplication(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setEditedApplication(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    } else {
      setEditedApplication(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveDetails = async () => {
    if (!application) return;

    try {
      setIsSavingDetails(true);
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          ...editedApplication,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      // Refresh application data
      loadApplicationData();
      setIsEditingDetails(false);
      toast.success('Application details updated successfully');
    } catch (error: any) {
      console.error('Error updating application details:', error);
      toast.error('Failed to update application details');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'Not specified';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Application Details</h3>
                  <button
                    onClick={handleEditDetailsToggle}
                    className="text-[#3BAA75] hover:text-[#2D8259] transition-colors flex items-center gap-1"
                  >
                    {isEditingDetails ? (
                      <>
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                </div>

                {isEditingDetails ? (
                  <div className="space-y-6">
                    {/* Personal Information Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            name="first_name"
                            value={editedApplication.first_name || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            name="last_name"
                            value={editedApplication.last_name || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={editedApplication.email || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            name="phone"
                            value={editedApplication.phone || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            name="date_of_birth"
                            value={editedApplication.date_of_birth || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                          <select
                            name="marital_status"
                            value={editedApplication.marital_status || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Status</option>
                            {maritalStatusOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dependents</label>
                          <input
                            type="number"
                            name="dependents"
                            value={editedApplication.dependents || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Address Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <input
                            type="text"
                            name="address"
                            value={editedApplication.address || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            name="city"
                            value={editedApplication.city || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                          <input
                            type="text"
                            name="province"
                            value={editedApplication.province || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                          <input
                            type="text"
                            name="postal_code"
                            value={editedApplication.postal_code || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Housing Status</label>
                          <select
                            name="housing_status"
                            value={editedApplication.housing_status || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Status</option>
                            {housingStatusOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Housing Payment</label>
                          <input
                            type="number"
                            name="housing_payment"
                            value={editedApplication.housing_payment || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Residence Duration</label>
                          <input
                            type="text"
                            name="residence_duration"
                            value={editedApplication.residence_duration || ''}
                            onChange={handleEditDetailsChange}
                            placeholder="e.g., 3 years"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Employment Information Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Employment Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                          <select
                            name="employment_status"
                            value={editedApplication.employment_status || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Status</option>
                            {employmentStatusOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employer Name</label>
                          <input
                            type="text"
                            name="employer_name"
                            value={editedApplication.employer_name || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                          <input
                            type="text"
                            name="occupation"
                            value={editedApplication.occupation || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Duration</label>
                          <input
                            type="text"
                            name="employment_duration"
                            value={editedApplication.employment_duration || ''}
                            onChange={handleEditDetailsChange}
                            placeholder="e.g., 2 years"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Information Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Financial Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                          <input
                            type="number"
                            name="annual_income"
                            value={editedApplication.annual_income || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
                          <input
                            type="number"
                            name="monthly_income"
                            value={editedApplication.monthly_income || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Other Income</label>
                          <input
                            type="number"
                            name="other_income"
                            value={editedApplication.other_income || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                          <input
                            type="number"
                            name="credit_score"
                            value={editedApplication.credit_score || ''}
                            onChange={handleEditDetailsChange}
                            min="300"
                            max="900"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Loan Information Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Loan Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                          <input
                            type="text"
                            name="vehicle_type"
                            value={editedApplication.vehicle_type || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desired Monthly Payment</label>
                          <input
                            type="number"
                            name="desired_monthly_payment"
                            value={editedApplication.desired_monthly_payment || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desired Loan Amount</label>
                          <input
                            type="number"
                            name="desired_loan_amount"
                            value={editedApplication.desired_loan_amount || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment Amount</label>
                          <input
                            type="number"
                            name="down_payment_amount"
                            value={editedApplication.down_payment_amount || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Min</label>
                          <input
                            type="number"
                            name="loan_amount_min"
                            value={editedApplication.loan_amount_min || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Max</label>
                          <input
                            type="number"
                            name="loan_amount_max"
                            value={editedApplication.loan_amount_max || ''}
                            onChange={handleEditDetailsChange}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                          <input
                            type="number"
                            name="interest_rate"
                            value={editedApplication.interest_rate || ''}
                            onChange={handleEditDetailsChange}
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
                            onChange={handleEditDetailsChange}
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

                    {/* Additional Information Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Additional Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="has_driver_license"
                            name="has_driver_license"
                            checked={editedApplication.has_driver_license || false}
                            onChange={(e) => setEditedApplication(prev => ({
                              ...prev,
                              has_driver_license: e.target.checked
                            }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor="has_driver_license" className="ml-2 block text-sm text-gray-700">
                            Has Driver's License
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="collects_government_benefits"
                            name="collects_government_benefits"
                            checked={editedApplication.collects_government_benefits || false}
                            onChange={(e) => setEditedApplication(prev => ({
                              ...prev,
                              collects_government_benefits: e.target.checked
                            }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor="collects_government_benefits" className="ml-2 block text-sm text-gray-700">
                            Collects Government Benefits
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="has_debt_discharge_history"
                            name="has_debt_discharge_history"
                            checked={editedApplication.has_debt_discharge_history || false}
                            onChange={(e) => setEditedApplication(prev => ({
                              ...prev,
                              has_debt_discharge_history: e.target.checked
                            }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor="has_debt_discharge_history" className="ml-2 block text-sm text-gray-700">
                            Has Debt Discharge History
                          </label>
                        </div>
                      </div>

                      {/* Conditional fields based on has_debt_discharge_history */}
                      {editedApplication.has_debt_discharge_history && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Type</label>
                            <select
                              name="debt_discharge_type"
                              value={editedApplication.debt_discharge_type || ''}
                              onChange={handleEditDetailsChange}
                              className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Type</option>
                              {debtDischargeTypeOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Year</label>
                            <input
                              type="number"
                              name="debt_discharge_year"
                              value={editedApplication.debt_discharge_year || ''}
                              onChange={handleEditDetailsChange}
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
                              onChange={handleEditDetailsChange}
                              className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Status</option>
                              {debtDischargeStatusOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Comments</label>
                            <textarea
                              name="debt_discharge_comments"
                              value={editedApplication.debt_discharge_comments || ''}
                              onChange={handleEditDetailsChange}
                              className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}

                      {/* Conditional fields based on collects_government_benefits */}
                      {editedApplication.collects_government_benefits && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Disability Programs</label>
                          <textarea
                            name="disability_programs"
                            value={typeof editedApplication.disability_programs === 'object' 
                              ? JSON.stringify(editedApplication.disability_programs) 
                              : editedApplication.disability_programs || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            rows={2}
                            placeholder="Enter details about disability programs"
                          />
                          <p className="text-xs text-gray-500 mt-1">Enter as JSON or plain text</p>
                        </div>
                      )}
                    </div>

                    {/* Contact Preferences Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Contact Preferences</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                          <select
                            name="preferred_contact_method"
                            value={editedApplication.preferred_contact_method || ''}
                            onChange={handleEditDetailsChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Select Method</option>
                            {preferredContactMethodOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Consent Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Consent Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="consent_soft_check"
                            name="consent_soft_check"
                            checked={editedApplication.consent_soft_check || false}
                            onChange={(e) => setEditedApplication(prev => ({
                              ...prev,
                              consent_soft_check: e.target.checked
                            }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor="consent_soft_check" className="ml-2 block text-sm text-gray-700">
                            Consent to Soft Credit Check
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="terms_accepted"
                            name="terms_accepted"
                            checked={editedApplication.terms_accepted || false}
                            onChange={(e) => setEditedApplication(prev => ({
                              ...prev,
                              terms_accepted: e.target.checked
                            }))}
                            className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300 rounded"
                          />
                          <label htmlFor="terms_accepted" className="ml-2 block text-sm text-gray-700">
                            Terms & Conditions Accepted
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleEditDetailsToggle}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDetails}
                        disabled={isSavingDetails}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                      >
                        {isSavingDetails ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Personal Information */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">{application.first_name} {application.last_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">{application.email}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">{application.phone}</span>
                          </div>
                          {application.date_of_birth && (
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Born {format(new Date(application.date_of_birth), 'MMMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">{application.address}, {application.city}, {application.province} {application.postal_code}</span>
                          </div>
                          {application.marital_status && (
                            <div className="flex items-center gap-3">
                              <Heart className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">
                                Marital Status: {application.marital_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          )}
                          {application.dependents !== null && application.dependents !== undefined && (
                            <div className="flex items-center gap-3">
                              <Users className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Dependents: {application.dependents}</span>
                            </div>
                          )}
                          {application.housing_status && (
                            <div className="flex items-center gap-3">
                              <Home className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">
                                Housing: {application.housing_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {application.residence_duration && ` (${application.residence_duration})`}
                                {application.housing_payment && ` - ${formatCurrency(application.housing_payment)}/month`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Information */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Financial Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">
                              {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {application.employer_name && ` at ${application.employer_name}`}
                              {application.employment_duration && ` (${application.employment_duration})`}
                            </span>
                          </div>
                          {application.occupation && (
                            <div className="flex items-center gap-3">
                              <Briefcase className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Occupation: {application.occupation}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">Annual Income: {formatCurrency(application.annual_income)}</span>
                          </div>
                          {application.monthly_income && (
                            <div className="flex items-center gap-3">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Monthly Income: {formatCurrency(application.monthly_income)}</span>
                            </div>
                          )}
                          {application.other_income !== null && application.other_income !== undefined && (
                            <div className="flex items-center gap-3">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Other Income: {formatCurrency(application.other_income)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">Credit Score: {application.credit_score}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">Vehicle Type: {application.vehicle_type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">Desired Payment: {formatCurrency(application.desired_monthly_payment)}/month</span>
                          </div>
                          {application.desired_loan_amount && (
                            <div className="flex items-center gap-3">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Desired Loan Amount: {formatCurrency(application.desired_loan_amount)}</span>
                            </div>
                          )}
                          {application.down_payment_amount !== null && application.down_payment_amount !== undefined && (
                            <div className="flex items-center gap-3">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Down Payment: {formatCurrency(application.down_payment_amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Loan Details */}
                    {(application.loan_amount_min || application.loan_amount_max || application.interest_rate || application.loan_term) && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Loan Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {application.loan_amount_min && application.loan_amount_max && (
                            <div className="flex items-center gap-3">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">
                                Loan Range: {formatCurrency(application.loan_amount_min)} - {formatCurrency(application.loan_amount_max)}
                              </span>
                            </div>
                          )}
                          {application.interest_rate && (
                            <div className="flex items-center gap-3">
                              <Landmark className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Interest Rate: {application.interest_rate}%</span>
                            </div>
                          )}
                          {application.loan_term && (
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-700">Loan Term: {application.loan_term} months</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Additional Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <FileQuestion className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-700">
                            Driver's License: {application.has_driver_license ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <HelpCircle className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-700">
                            Government Benefits: {application.collects_government_benefits ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-700">
                            Debt Discharge History: {application.has_debt_discharge_history ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {application.preferred_contact_method && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-700">
                              Preferred Contact: {application.preferred_contact_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Debt Discharge Details (if applicable) */}
                      {application.has_debt_discharge_history && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">Debt Discharge Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {application.debt_discharge_type && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Type:</span>
                                <span className="text-sm text-gray-600">
                                  {application.debt_discharge_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                            )}
                            {application.debt_discharge_year && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Year:</span>
                                <span className="text-sm text-gray-600">{application.debt_discharge_year}</span>
                              </div>
                            )}
                            {application.debt_discharge_status && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Status:</span>
                                <span className="text-sm text-gray-600">
                                  {application.debt_discharge_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                            )}
                          </div>
                          {application.debt_discharge_comments && (
                            <div className="mt-2">
                              <span className="text-sm font-medium text-gray-700">Comments:</span>
                              <p className="text-sm text-gray-600 mt-1">{application.debt_discharge_comments}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Government Benefits Details (if applicable) */}
                      {application.collects_government_benefits && application.disability_programs && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">Government Benefits Details</h5>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Programs:</span>
                            <p className="text-sm text-gray-600 mt-1">
                              {typeof application.disability_programs === 'object'
                                ? JSON.stringify(application.disability_programs, null, 2)
                                : application.disability_programs}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Consent Information */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Consent Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          {application.consent_soft_check ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="text-gray-700">
                            Consent to Soft Credit Check: {application.consent_soft_check ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {application.terms_accepted ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="text-gray-700">
                            Terms & Conditions Accepted: {application.terms_accepted ? 'Yes' : 'No'}
                          </span>
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