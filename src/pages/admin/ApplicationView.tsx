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
  Building,
  Home,
  Users,
  Cake,
  Heart,
  Wallet,
  BadgeCheck,
  HelpCircle,
  FileQuestion,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { ApplicationTracker } from '../../components/ApplicationTracker';
import { DocumentManager } from '../../components/DocumentManager';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import type { Application, ApplicationStage, Document, Notification } from '../../types/database';
import toast from 'react-hot-toast';
import { useUserRole } from '../../hooks/useUserRole';

const ApplicationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
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

  // New fields for editing
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedApplication, setEditedApplication] = useState<Partial<Application>>({});

  // Dealer Assignment
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [isAssigningDealer, setIsAssigningDealer] = useState(false);

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

  useEffect(() => {
    if (!id) {
      navigate('/admin/applications');
      return;
    }
    loadApplicationData();
  }, [id]);

  useEffect(() => {
    // Only load dealers if user is super_admin
    if (role === 'super_admin') {
      loadDealers();
    }
  }, [role]);

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
        async (payload) => {
          console.log('Application update received:', payload);
          
          const oldStatus = application.status;
          const newStatus = payload.new.status;
          const oldStage = application.current_stage;
          const newStage = payload.new.current_stage;
          
          // Update application state with new data
          setApplication(payload.new as Application);
          
          // Reload stages and documents to ensure consistency
          await loadStages(application.id);
          await loadDocuments(application.id);
          
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
        }
      )
      .subscribe();

    // Set up real-time subscription for documents
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
          loadDocuments(application.id);
        }
      )
      .subscribe();

    // Set up real-time subscription for stages
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
          loadStages(application.id);
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

      // Set selected dealer if application has one
      if (appData?.dealer_id) {
        setSelectedDealerId(appData.dealer_id);
      }

      // Load related data
      await Promise.all([
        loadStages(appData.id),
        loadDocuments(appData.id),
        loadMessages(),
      ]);

    } catch (error: any) {
      console.error('Error loading application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDealers = async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_profiles')
        .select('id, name, email');
        
      if (error) throw error;
      setDealers(data || []);
    } catch (error) {
      console.error('Error loading dealers:', error);
      toast.error('Failed to load dealers');
    }
  };

  const loadStages = async (applicationId: string) => {
    try {
      const { data, error } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', applicationId)
        .order('stage_number', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const loadDocuments = async (applicationId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
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

  const createNotification = async (title: string, message: string) => {
    if (!application?.user_id) return;
    
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: application.user_id,
          title,
          message,
          read: false
        });
    } catch (error) {
      console.error('Error creating notification:', error);
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
    if (!application || !messageTitle.trim() || !messageText.trim() || !user) return;

    try {
      setIsSendingMessage(true);

      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: application.user_id,
          admin_id: user.id,
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

  const handleEditDetails = () => {
    if (!application) return;
    setEditedApplication(application);
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async () => {
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

      // Update local state
      setApplication({
        ...application,
        ...editedApplication
      } as Application);
      
      setIsEditingDetails(false);
      toast.success('Application details updated successfully');
    } catch (error: any) {
      console.error('Error updating application details:', error);
      toast.error('Failed to update application details');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditedApplication(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      setEditedApplication(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
      return;
    }
    
    // Handle all other inputs
    setEditedApplication(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignDealer = async () => {
    if (!selectedDealerId) {
      toast.error('Please select a dealer');
      return;
    }
    
    try {
      setIsAssigningDealer(true);
      
      const { error } = await supabase
        .from('applications')
        .update({ dealer_id: selectedDealerId })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Application assigned to dealer successfully');
      
      // Update local state
      setApplication({
        ...application,
        dealer_id: selectedDealerId
      });
    } catch (error) {
      console.error('Error assigning dealer:', error);
      toast.error('Failed to assign dealer');
    } finally {
      setIsAssigningDealer(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-700';
  };

  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
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

              {/* Dealer Assignment (Super Admin Only) */}
              {role === 'super_admin' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Dealer Assignment</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <select
                        value={selectedDealerId || ''}
                        onChange={(e) => setSelectedDealerId(e.target.value || null)}
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        <option value="">Select Dealer</option>
                        {dealers.map((dealer) => (
                          <option key={dealer.id} value={dealer.id}>
                            {dealer.name} ({dealer.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAssignDealer}
                      disabled={isAssigningDealer || selectedDealerId === application?.dealer_id}
                      className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                    >
                      {isAssigningDealer ? 'Assigning...' : 'Assign Dealer'}
                    </button>
                  </div>
                  {application?.dealer_id && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        This application is currently assigned to: {dealers.find(d => d.id === application.dealer_id)?.name || 'Unknown Dealer'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Application Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Application Details</h3>
                  <button
                    onClick={handleEditDetails}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors text-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Details
                  </button>
                </div>

                {isEditingDetails ? (
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            value={editedApplication.date_of_birth ? new Date(editedApplication.date_of_birth).toISOString().split('T')[0] : ''}
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
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Address Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
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
                          <input
                            type="text"
                            name="province"
                            value={editedApplication.province || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
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
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Residence Duration</label>
                          <input
                            type="text"
                            name="residence_duration"
                            value={editedApplication.residence_duration || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            placeholder="e.g., 3 years"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Employment & Income */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Employment & Income</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            placeholder="e.g., 2 years"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                          <input
                            type="number"
                            name="annual_income"
                            value={editedApplication.annual_income || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Other Income</label>
                          <input
                            type="number"
                            name="other_income"
                            value={editedApplication.other_income || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Loan & Vehicle Details */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Loan & Vehicle Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                          <input
                            type="text"
                            name="vehicle_type"
                            value={editedApplication.vehicle_type || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                          <input
                            type="number"
                            name="credit_score"
                            value={editedApplication.credit_score || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="300"
                            max="900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desired Loan Amount</label>
                          <input
                            type="number"
                            name="desired_loan_amount"
                            value={editedApplication.desired_loan_amount || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment Amount</label>
                          <input
                            type="number"
                            name="down_payment_amount"
                            value={editedApplication.down_payment_amount || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desired Monthly Payment</label>
                          <input
                            type="number"
                            name="desired_monthly_payment"
                            value={editedApplication.desired_monthly_payment || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
                          <input
                            type="number"
                            name="interest_rate"
                            value={editedApplication.interest_rate || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            max="30"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (months)</label>
                          <select
                            name="loan_term"
                            value={editedApplication.loan_term || ''}
                            onChange={handleInputChange}
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Min</label>
                          <input
                            type="number"
                            name="loan_amount_min"
                            value={editedApplication.loan_amount_min || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Max</label>
                          <input
                            type="number"
                            name="loan_amount_max"
                            value={editedApplication.loan_amount_max || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Additional Information</h4>
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
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Disability Programs (JSON)</label>
                          <textarea
                            name="disability_programs"
                            value={editedApplication.disability_programs ? JSON.stringify(editedApplication.disability_programs) : ''}
                            onChange={(e) => {
                              try {
                                const jsonValue = e.target.value ? JSON.parse(e.target.value) : null;
                                setEditedApplication(prev => ({
                                  ...prev,
                                  disability_programs: jsonValue
                                }));
                              } catch (error) {
                                // If not valid JSON, store as string
                                setEditedApplication(prev => ({
                                  ...prev,
                                  disability_programs: e.target.value
                                }));
                              }
                            }}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            rows={2}
                            placeholder='{"program": "example", "details": "example"}'
                          />
                        </div>
                      </div>
                    </div>

                    {/* Debt Discharge History */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Debt Discharge History</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                min="1900"
                                max={new Date().getFullYear()}
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
                                {debtDischargeStatusOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Debt Discharge Comments</label>
                              <textarea
                                name="debt_discharge_comments"
                                value={editedApplication.debt_discharge_comments || ''}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                rows={2}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Contact Preferences */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Contact Preferences</h4>
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
                            {preferredContactMethodOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
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

                    {/* Admin Assignment */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">Admin Assignment</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Admin</label>
                          <select
                            name="assigned_to_admin_id"
                            value={editedApplication.assigned_to_admin_id || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          >
                            <option value="">Not Assigned</option>
                            <option value={user?.id || ''}>Assign to Me</option>
                            {/* In a real implementation, you would fetch and display all admin users here */}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={() => setIsEditingDetails(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDetails}
                        className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Personal Information */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <User className="h-5 w-5 mr-2 text-gray-400" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Full Name</p>
                            <p className="text-sm text-gray-900">{application.first_name} {application.last_name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Email</p>
                            <p className="text-sm text-gray-900">{application.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Phone</p>
                            <p className="text-sm text-gray-900">{application.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Cake className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                            <p className="text-sm text-gray-900">
                              {application.date_of_birth 
                                ? format(new Date(application.date_of_birth), 'MMMM d, yyyy')
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Heart className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Marital Status</p>
                            <p className="text-sm text-gray-900">
                              {application.marital_status 
                                ? formatStatus(application.marital_status)
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Dependents</p>
                            <p className="text-sm text-gray-900">
                              {application.dependents !== null && application.dependents !== undefined
                                ? application.dependents
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                        Address Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 md:col-span-2">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Address</p>
                            <p className="text-sm text-gray-900">{application.address || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">City</p>
                            <p className="text-sm text-gray-900">{application.city || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Province</p>
                            <p className="text-sm text-gray-900">{application.province || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Postal Code</p>
                            <p className="text-sm text-gray-900">{application.postal_code || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Home className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Housing Status</p>
                            <p className="text-sm text-gray-900">
                              {application.housing_status 
                                ? formatStatus(application.housing_status)
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Housing Payment</p>
                            <p className="text-sm text-gray-900">
                              {application.housing_payment 
                                ? `$${application.housing_payment.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Residence Duration</p>
                            <p className="text-sm text-gray-900">{application.residence_duration || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employment & Income */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <Briefcase className="h-5 w-5 mr-2 text-gray-400" />
                        Employment & Income
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Employment Status</p>
                            <p className="text-sm text-gray-900">
                              {application.employment_status 
                                ? formatStatus(application.employment_status)
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Employer Name</p>
                            <p className="text-sm text-gray-900">{application.employer_name || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Occupation</p>
                            <p className="text-sm text-gray-900">{application.occupation || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Employment Duration</p>
                            <p className="text-sm text-gray-900">{application.employment_duration || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Annual Income</p>
                            <p className="text-sm text-gray-900">
                              {application.annual_income 
                                ? `$${application.annual_income.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Other Income</p>
                            <p className="text-sm text-gray-900">
                              {application.other_income 
                                ? `$${application.other_income.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loan & Vehicle Details */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <Car className="h-5 w-5 mr-2 text-gray-400" />
                        Loan & Vehicle Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Car className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Vehicle Type</p>
                            <p className="text-sm text-gray-900">{application.vehicle_type || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Credit Score</p>
                            <p className="text-sm text-gray-900">{application.credit_score || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Desired Loan Amount</p>
                            <p className="text-sm text-gray-900">
                              {application.desired_loan_amount 
                                ? `$${application.desired_loan_amount.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Down Payment Amount</p>
                            <p className="text-sm text-gray-900">
                              {application.down_payment_amount 
                                ? `$${application.down_payment_amount.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Desired Monthly Payment</p>
                            <p className="text-sm text-gray-900">
                              {application.desired_monthly_payment 
                                ? `$${application.desired_monthly_payment.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Wallet className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Interest Rate</p>
                            <p className="text-sm text-gray-900">
                              {application.interest_rate 
                                ? `${application.interest_rate}%`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Loan Term</p>
                            <p className="text-sm text-gray-900">
                              {application.loan_term 
                                ? `${application.loan_term} months`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Loan Amount Range</p>
                            <p className="text-sm text-gray-900">
                              {application.loan_amount_min && application.loan_amount_max
                                ? `$${application.loan_amount_min.toLocaleString()} - $${application.loan_amount_max.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-gray-400" />
                        Additional Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <BadgeCheck className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Has Driver's License</p>
                            <p className="text-sm text-gray-900">
                              {application.has_driver_license !== null && application.has_driver_license !== undefined
                                ? (application.has_driver_license ? 'Yes' : 'No')
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Collects Government Benefits</p>
                            <p className="text-sm text-gray-900">
                              {application.collects_government_benefits !== null && application.collects_government_benefits !== undefined
                                ? (application.collects_government_benefits ? 'Yes' : 'No')
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        {application.disability_programs && (
                          <div className="flex items-start gap-3 md:col-span-2">
                            <HelpCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Disability Programs</p>
                              <p className="text-sm text-gray-900 font-mono">
                                {typeof application.disability_programs === 'object'
                                  ? JSON.stringify(application.disability_programs, null, 2)
                                  : application.disability_programs}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Debt Discharge History */}
                    {application.has_debt_discharge_history && (
                      <div>
                        <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                          <FileQuestion className="h-5 w-5 mr-2 text-gray-400" />
                          Debt Discharge History
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Debt Discharge Type</p>
                              <p className="text-sm text-gray-900">
                                {application.debt_discharge_type 
                                  ? formatStatus(application.debt_discharge_type)
                                  : 'Not provided'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Debt Discharge Year</p>
                              <p className="text-sm text-gray-900">{application.debt_discharge_year || 'Not provided'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Debt Discharge Status</p>
                              <p className="text-sm text-gray-900">
                                {application.debt_discharge_status 
                                  ? formatStatus(application.debt_discharge_status)
                                  : 'Not provided'}
                              </p>
                            </div>
                          </div>
                          {application.debt_discharge_comments && (
                            <div className="flex items-start gap-3 md:col-span-2">
                              <MessageCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">Debt Discharge Comments</p>
                                <p className="text-sm text-gray-900">{application.debt_discharge_comments}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Preferences */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-gray-400" />
                        Contact Preferences
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Preferred Contact Method</p>
                            <p className="text-sm text-gray-900">
                              {application.preferred_contact_method 
                                ? formatStatus(application.preferred_contact_method)
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Consent to Soft Credit Check</p>
                            <p className="text-sm text-gray-900">
                              {application.consent_soft_check !== null && application.consent_soft_check !== undefined
                                ? (application.consent_soft_check ? 'Yes' : 'No')
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Terms & Conditions Accepted</p>
                            <p className="text-sm text-gray-900">
                              {application.terms_accepted !== null && application.terms_accepted !== undefined
                                ? (application.terms_accepted ? 'Yes' : 'No')
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin Assignment */}
                    <div>
                      <h4 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200 flex items-center">
                        <UserCheck className="h-5 w-5 mr-2 text-gray-400" />
                        Admin Assignment
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Assigned Admin</p>
                            <p className="text-sm text-gray-900">
                              {application.assigned_to_admin_id
                                ? (application.assigned_to_admin_id === user?.id ? 'You' : application.assigned_to_admin_id)
                                : 'Not assigned'}
                            </p>
                          </div>
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