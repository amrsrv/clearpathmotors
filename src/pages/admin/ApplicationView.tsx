import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  DollarSign,
  Home,
  Car,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Upload,
  Trash2,
  Eye,
  Calendar,
  Flag,
  RefreshCw,
  UserCheck,
  Shield,
  HelpCircle,
  Info,
  PlusCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { DocumentUpload } from '../../components/DocumentUpload';
import { DocumentManager } from '../../components/DocumentManager';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import type { Application, Document, ApplicationStage } from '../../types/database';

interface AdminUser {
  id: string;
  email: string;
}

interface ApplicationFlag {
  id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface ActivityLogItem {
  id: string;
  action: string;
  details: any;
  created_at: string;
  is_admin_action: boolean;
  user_id: string | null;
}

interface AdminMessage {
  id: string;
  admin_id: string | null;
  user_id: string;
  application_id: string;
  message: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
}

const ApplicationView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [originalApplication, setOriginalApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplication, setEditedApplication] = useState<Partial<Application>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [flags, setFlags] = useState<ApplicationFlag[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    personal: true,
    employment: true,
    housing: true,
    financing: true,
    benefits: true,
    debt: true,
    documents: true,
    stages: true,
    flags: true,
    activity: false,
    messages: true,
    notes: true
  });
  const [activeDocumentTab, setActiveDocumentTab] = useState<'upload' | 'manage'>('manage');
  const [savingNotes, setSavingNotes] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [showDocumentReviewModal, setShowDocumentReviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentReviewStatus, setDocumentReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [documentReviewNotes, setDocumentReviewNotes] = useState('');
  const [submittingDocumentReview, setSubmittingDocumentReview] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [newFlag, setNewFlag] = useState({
    flag_type: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    description: ''
  });
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingApplication, setDeletingApplication] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [newStage, setNewStage] = useState<number>(1);
  const [stageNote, setStageNote] = useState('');
  const [submittingStage, setSubmittingStage] = useState(false);
  
  // Document upload hook
  const { uploadDocument, deleteDocument, uploading, error: uploadError } = useDocumentUpload(id || '');

  useEffect(() => {
    if (id) {
      loadApplication();
      loadDocuments();
      loadStages();
      loadFlags();
      loadActivityLog();
      loadAdminUsers();
      loadMessages();
    }
  }, [id]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Application not found');
      }
      
      setApplication(data);
      setOriginalApplication(data);
      setEditedApplication({});
    } catch (error: any) {
      console.error('Error loading application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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

  const loadFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('application_flags')
        .select(`
          *,
          resolved_by (
            id,
            email
          )
        `)
        .eq('application_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setFlags(data || []);
    } catch (error) {
      console.error('Error loading flags:', error);
    }
  };

  const loadActivityLog = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setActivityLog(data || []);
    } catch (error) {
      console.error('Error loading activity log:', error);
    }
  };

  const loadAdminUsers = async () => {
    try {
      // Get admin users from auth.users table
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('raw_app_meta_data->is_admin', true);
      
      if (error) throw error;
      
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select(`
          *,
          admin:admin_id (
            email
          )
        `)
        .eq('application_id', id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadApplication(),
      loadDocuments(),
      loadStages(),
      loadFlags(),
      loadActivityLog(),
      loadMessages()
    ]);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedApplication({});
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedApplication({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditedApplication(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle numeric inputs
    if (type === 'number' || name.includes('income') || name.includes('payment') || name.includes('amount')) {
      const numValue = value === '' ? null : Number(value);
      setEditedApplication(prev => ({
        ...prev,
        [name]: numValue
      }));
      return;
    }
    
    // Handle all other inputs
    setEditedApplication(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      if (!application) return;
      
      const { error } = await supabase
        .from('applications')
        .update(editedApplication)
        .eq('id', application.id);
      
      if (error) throw error;
      
      // Update local state
      setApplication({
        ...application,
        ...editedApplication
      });
      
      setIsEditing(false);
      setEditedApplication({});
      
      toast.success('Application updated successfully');
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const handleStatusChange = async () => {
    try {
      if (!application || !newStatus) return;
      
      // Determine the stage number based on the status
      let stageNumber = application.current_stage;
      switch (newStatus) {
        case 'submitted':
          stageNumber = 1;
          break;
        case 'under_review':
          stageNumber = 2;
          break;
        case 'pending_documents':
          stageNumber = 3;
          break;
        case 'pre_approved':
          stageNumber = 4;
          break;
        case 'vehicle_selection':
          stageNumber = 5;
          break;
        case 'final_approval':
          stageNumber = 6;
          break;
        case 'finalized':
          stageNumber = 7;
          break;
      }
      
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          current_stage: stageNumber
        })
        .eq('id', application.id);
      
      if (updateError) throw updateError;
      
      // Create a new stage record if moving to a new stage
      if (stageNumber !== application.current_stage) {
        const { error: stageError } = await supabase
          .from('application_stages')
          .insert({
            application_id: application.id,
            stage_number: stageNumber,
            status: 'completed',
            notes: statusNote || `Status updated to ${newStatus.replace(/_/g, ' ')}`
          });
        
        if (stageError) throw stageError;
      }
      
      // Update local state
      setApplication({
        ...application,
        status: newStatus,
        current_stage: stageNumber
      });
      
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNote('');
      
      toast.success('Status updated successfully');
      
      // Refresh data
      await Promise.all([
        loadStages(),
        loadActivityLog()
      ]);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAssignAdmin = async () => {
    try {
      if (!application || !selectedAdmin) return;
      
      const { error } = await supabase
        .from('applications')
        .update({
          assigned_to_admin_id: selectedAdmin
        })
        .eq('id', application.id);
      
      if (error) throw error;
      
      // Update local state
      setApplication({
        ...application,
        assigned_to_admin_id: selectedAdmin
      });
      
      setShowAssignModal(false);
      setSelectedAdmin('');
      
      toast.success('Application assigned successfully');
      
      // Refresh activity log
      await loadActivityLog();
    } catch (error: any) {
      console.error('Error assigning application:', error);
      toast.error('Failed to assign application');
    }
  };

  const handleSaveNotes = async () => {
    try {
      if (!application || !editedApplication.internal_notes) return;
      
      setSavingNotes(true);
      
      const { error } = await supabase
        .from('applications')
        .update({
          internal_notes: editedApplication.internal_notes
        })
        .eq('id', application.id);
      
      if (error) throw error;
      
      // Update local state
      setApplication({
        ...application,
        internal_notes: editedApplication.internal_notes
      });
      
      setEditedApplication(prev => ({
        ...prev,
        internal_notes: undefined
      }));
      
      toast.success('Notes saved successfully');
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSendMessage = async () => {
    try {
      if (!application || !newMessage.trim()) return;
      
      setSendingMessage(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Send message
      const { data, error } = await supabase
        .from('admin_messages')
        .insert({
          application_id: application.id,
          admin_id: user.id,
          user_id: application.user_id,
          message: newMessage.trim(),
          is_admin: true,
          read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setMessages([...messages, data]);
      setNewMessage('');
      
      // Create notification for user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: 'New message from Clearpath',
            message: 'You have received a new message regarding your application.',
            read: false
          });
      }
      
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    try {
      const document = await uploadDocument(file, category);
      if (document) {
        // Update documents list
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
      // Update documents list
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDocumentReview = async () => {
    try {
      if (!selectedDocument) return;
      
      setSubmittingDocumentReview(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Create document review
      const { error: reviewError } = await supabase
        .from('document_reviews')
        .insert({
          document_id: selectedDocument.id,
          reviewer_id: user.id,
          status: documentReviewStatus,
          notes: documentReviewNotes
        });
      
      if (reviewError) throw reviewError;
      
      // Update document status directly (the trigger will handle this server-side, but we update local state)
      const updatedDocuments = documents.map(doc => 
        doc.id === selectedDocument.id 
          ? { 
              ...doc, 
              status: documentReviewStatus, 
              review_notes: documentReviewNotes,
              reviewed_at: new Date().toISOString()
            } 
          : doc
      );
      
      setDocuments(updatedDocuments);
      
      // Create notification for user
      if (application?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: `Document ${documentReviewStatus === 'approved' ? 'Approved' : 'Needs Attention'}`,
            message: documentReviewStatus === 'approved' 
              ? `Your ${selectedDocument.category.replace(/_/g, ' ')} document has been approved.` 
              : `Your ${selectedDocument.category.replace(/_/g, ' ')} document needs attention. ${documentReviewNotes}`,
            read: false
          });
      }
      
      setShowDocumentReviewModal(false);
      setSelectedDocument(null);
      setDocumentReviewStatus('approved');
      setDocumentReviewNotes('');
      
      toast.success(`Document ${documentReviewStatus === 'approved' ? 'approved' : 'rejected'} successfully`);
      
      // Refresh activity log
      await loadActivityLog();
    } catch (error: any) {
      console.error('Error reviewing document:', error);
      toast.error('Failed to review document');
    } finally {
      setSubmittingDocumentReview(false);
    }
  };

  const handleAddFlag = async () => {
    try {
      if (!application) return;
      
      setSubmittingFlag(true);
      
      const { error } = await supabase
        .from('application_flags')
        .insert({
          application_id: application.id,
          flag_type: newFlag.flag_type,
          severity: newFlag.severity,
          description: newFlag.description
        });
      
      if (error) throw error;
      
      setShowFlagModal(false);
      setNewFlag({
        flag_type: '',
        severity: 'medium',
        description: ''
      });
      
      toast.success('Flag added successfully');
      
      // Refresh flags
      await loadFlags();
    } catch (error: any) {
      console.error('Error adding flag:', error);
      toast.error('Failed to add flag');
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('application_flags')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', flagId);
      
      if (error) throw error;
      
      // Update local state
      setFlags(prev => 
        prev.map(flag => 
          flag.id === flagId 
            ? { 
                ...flag, 
                resolved_at: new Date().toISOString(),
                resolved_by: user.id
              } 
            : flag
        )
      );
      
      toast.success('Flag resolved successfully');
    } catch (error: any) {
      console.error('Error resolving flag:', error);
      toast.error('Failed to resolve flag');
    }
  };

  const handleDeleteApplication = async () => {
    try {
      if (!application) return;
      
      setDeletingApplication(true);
      
      // Delete application (cascade will handle related records)
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', application.id);
      
      if (error) throw error;
      
      toast.success('Application deleted successfully');
      
      // Navigate back to applications list
      navigate('/admin/applications');
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete application');
    } finally {
      setDeletingApplication(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddStage = async () => {
    try {
      if (!application) return;
      
      setSubmittingStage(true);
      
      // Create new stage
      const { error } = await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: newStage,
          status: 'completed',
          notes: stageNote
        });
      
      if (error) throw error;
      
      // Update application current stage if new stage is higher
      if (newStage > (application.current_stage || 1)) {
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            current_stage: newStage
          })
          .eq('id', application.id);
        
        if (updateError) throw updateError;
        
        // Update local state
        setApplication({
          ...application,
          current_stage: newStage
        });
      }
      
      setShowStageModal(false);
      setNewStage(1);
      setStageNote('');
      
      toast.success('Stage added successfully');
      
      // Refresh stages and activity log
      await Promise.all([
        loadStages(),
        loadActivityLog()
      ]);
    } catch (error: any) {
      console.error('Error adding stage:', error);
      toast.error('Failed to add stage');
    } finally {
      setSubmittingStage(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_documents':
        return 'bg-orange-100 text-orange-800';
      case 'pre_approved':
        return 'bg-green-100 text-green-800';
      case 'vehicle_selection':
        return 'bg-purple-100 text-purple-800';
      case 'final_approval':
        return 'bg-indigo-100 text-indigo-800';
      case 'finalized':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Application</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/applications')}
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Not Found</h2>
          <p className="text-gray-600 mb-4">The application you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate('/admin/applications')}
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                  {application.first_name} {application.last_name}
                </h1>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                  {formatStatus(application.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Application ID: {application.id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center gap-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="h-5 w-5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Clock className="h-5 w-5" />
                    <span>Update Status</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Application Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('personal')}
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Personal Information</h2>
                </div>
                {expandedSections.personal ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.personal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="first_name"
                              value={editedApplication.first_name ?? application.first_name ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.first_name || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="last_name"
                              value={editedApplication.last_name ?? application.last_name ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.last_name || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          {isEditing ? (
                            <input
                              type="email"
                              name="email"
                              value={editedApplication.email ?? application.email ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 text-gray-400 mr-1" />
                              <p className="text-gray-900">{application.email || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          {isEditing ? (
                            <input
                              type="tel"
                              name="phone"
                              value={editedApplication.phone ?? application.phone ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-1" />
                              <p className="text-gray-900">{application.phone || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                          </label>
                          {isEditing ? (
                            <input
                              type="date"
                              name="date_of_birth"
                              value={editedApplication.date_of_birth ?? application.date_of_birth ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.date_of_birth ? formatDate(application.date_of_birth) : 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marital Status
                          </label>
                          {isEditing ? (
                            <select
                              name="marital_status"
                              value={editedApplication.marital_status ?? application.marital_status ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Status</option>
                              <option value="single">Single</option>
                              <option value="married">Married</option>
                              <option value="divorced">Divorced</option>
                              <option value="widowed">Widowed</option>
                              <option value="separated">Separated</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.marital_status 
                                ? application.marital_status.charAt(0).toUpperCase() + application.marital_status.slice(1) 
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dependents
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="dependents"
                              value={editedApplication.dependents ?? application.dependents ?? ''}
                              onChange={handleInputChange}
                              min="0"
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.dependents !== null && application.dependents !== undefined ? application.dependents : 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="address"
                              value={editedApplication.address ?? application.address ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              <p className="text-gray-900">{application.address || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="city"
                              value={editedApplication.city ?? application.city ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.city || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Province
                          </label>
                          {isEditing ? (
                            <select
                              name="province"
                              value={editedApplication.province ?? application.province ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
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
                          ) : (
                            <p className="text-gray-900">{application.province || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postal Code
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="postal_code"
                              value={editedApplication.postal_code ?? application.postal_code ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.postal_code || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Has Driver's License
                          </label>
                          {isEditing ? (
                            <select
                              name="has_driver_license"
                              value={editedApplication.has_driver_license !== undefined ? String(editedApplication.has_driver_license) : String(application.has_driver_license || false)}
                              onChange={(e) => setEditedApplication(prev => ({
                                ...prev,
                                has_driver_license: e.target.value === 'true'
                              }))}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.has_driver_license === true ? 'Yes' : 
                               application.has_driver_license === false ? 'No' : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Contact Method
                          </label>
                          {isEditing ? (
                            <select
                              name="preferred_contact_method"
                              value={editedApplication.preferred_contact_method ?? application.preferred_contact_method ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Method</option>
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                              <option value="sms">SMS</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.preferred_contact_method 
                                ? application.preferred_contact_method.charAt(0).toUpperCase() + application.preferred_contact_method.slice(1) 
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Employment & Income */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('employment')}
              >
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Employment & Income</h2>
                </div>
                {expandedSections.employment ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.employment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employment Status
                          </label>
                          {isEditing ? (
                            <select
                              name="employment_status"
                              value={editedApplication.employment_status ?? application.employment_status ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Status</option>
                              <option value="employed">Employed</option>
                              <option value="self_employed">Self Employed</option>
                              <option value="unemployed">Unemployed</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.employment_status 
                                ? application.employment_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employer Name
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="employer_name"
                              value={editedApplication.employer_name ?? application.employer_name ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.employer_name || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Occupation
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="occupation"
                              value={editedApplication.occupation ?? application.occupation ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.occupation || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employment Duration
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="employment_duration"
                              value={editedApplication.employment_duration ?? application.employment_duration ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              placeholder="e.g., 2 years"
                            />
                          ) : (
                            <p className="text-gray-900">{application.employment_duration || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Annual Income
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="annual_income"
                              value={editedApplication.annual_income ?? application.annual_income ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.annual_income)}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Income
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="monthly_income"
                              value={editedApplication.monthly_income ?? application.monthly_income ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.monthly_income)}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Other Income
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="other_income"
                              value={editedApplication.other_income ?? application.other_income ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.other_income)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Housing Information */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('housing')}
              >
                <div className="flex items-center">
                  <Home className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Housing Information</h2>
                </div>
                {expandedSections.housing ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.housing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Housing Status
                          </label>
                          {isEditing ? (
                            <select
                              name="housing_status"
                              value={editedApplication.housing_status ?? application.housing_status ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Status</option>
                              <option value="own">Own</option>
                              <option value="rent">Rent</option>
                              <option value="live_with_parents">Live with Parents</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.housing_status 
                                ? application.housing_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Housing Payment
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="housing_payment"
                              value={editedApplication.housing_payment ?? application.housing_payment ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.housing_payment)}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Residence Duration
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="residence_duration"
                              value={editedApplication.residence_duration ?? application.residence_duration ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                              placeholder="e.g., 3 years"
                            />
                          ) : (
                            <p className="text-gray-900">{application.residence_duration || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Financing Details */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('financing')}
              >
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Financing Details</h2>
                </div>
                {expandedSections.financing ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.financing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vehicle Type
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="vehicle_type"
                              value={editedApplication.vehicle_type ?? application.vehicle_type ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.vehicle_type || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Credit Score
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="credit_score"
                              value={editedApplication.credit_score ?? application.credit_score ?? ''}
                              onChange={handleInputChange}
                              min="300"
                              max="900"
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{application.credit_score || 'N/A'}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Desired Loan Amount
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="desired_loan_amount"
                              value={editedApplication.desired_loan_amount ?? application.desired_loan_amount ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.desired_loan_amount)}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Down Payment Amount
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="down_payment_amount"
                              value={editedApplication.down_payment_amount ?? application.down_payment_amount ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.down_payment_amount)}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Desired Monthly Payment
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="desired_monthly_payment"
                              value={editedApplication.desired_monthly_payment ?? application.desired_monthly_payment ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">{formatCurrency(application.desired_monthly_payment)}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Loan Amount Range
                          </label>
                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                name="loan_amount_min"
                                value={editedApplication.loan_amount_min ?? application.loan_amount_min ?? ''}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                placeholder="Min"
                              />
                              <input
                                type="number"
                                name="loan_amount_max"
                                value={editedApplication.loan_amount_max ?? application.loan_amount_max ?? ''}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                placeholder="Max"
                              />
                            </div>
                          ) : (
                            <p className="text-gray-900">
                              {application.loan_amount_min && application.loan_amount_max 
                                ? `${formatCurrency(application.loan_amount_min)} - ${formatCurrency(application.loan_amount_max)}`
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interest Rate
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="interest_rate"
                              value={editedApplication.interest_rate ?? application.interest_rate ?? ''}
                              onChange={handleInputChange}
                              step="0.01"
                              min="0"
                              max="30"
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            />
                          ) : (
                            <p className="text-gray-900">
                              {application.interest_rate !== null && application.interest_rate !== undefined 
                                ? `${application.interest_rate}%` 
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Loan Term
                          </label>
                          {isEditing ? (
                            <select
                              name="loan_term"
                              value={editedApplication.loan_term ?? application.loan_term ?? ''}
                              onChange={handleInputChange}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="">Select Term</option>
                              <option value="36">36 months</option>
                              <option value="48">48 months</option>
                              <option value="60">60 months</option>
                              <option value="72">72 months</option>
                              <option value="84">84 months</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.loan_term 
                                ? `${application.loan_term} months` 
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Government Benefits */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('benefits')}
              >
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Government Benefits</h2>
                  {application.collects_government_benefits && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Receives Benefits
                    </span>
                  )}
                </div>
                {expandedSections.benefits ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.benefits && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Collects Government Benefits
                          </label>
                          {isEditing ? (
                            <select
                              name="collects_government_benefits"
                              value={editedApplication.collects_government_benefits !== undefined ? String(editedApplication.collects_government_benefits) : String(application.collects_government_benefits || false)}
                              onChange={(e) => setEditedApplication(prev => ({
                                ...prev,
                                collects_government_benefits: e.target.value === 'true'
                              }))}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.collects_government_benefits === true ? 'Yes' : 
                               application.collects_government_benefits === false ? 'No' : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        {(isEditing ? (editedApplication.collects_government_benefits !== undefined ? editedApplication.collects_government_benefits : application.collects_government_benefits) : application.collects_government_benefits) && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Disability Programs
                              </label>
                              {isEditing ? (
                                <textarea
                                  name="disability_programs"
                                  value={
                                    editedApplication.disability_programs !== undefined
                                      ? typeof editedApplication.disability_programs === 'string'
                                        ? editedApplication.disability_programs
                                        : JSON.stringify(editedApplication.disability_programs, null, 2)
                                      : application.disability_programs
                                        ? typeof application.disability_programs === 'string'
                                          ? application.disability_programs
                                          : JSON.stringify(application.disability_programs, null, 2)
                                        : ''
                                  }
                                  onChange={handleInputChange}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                  rows={4}
                                  placeholder="Enter disability programs as JSON"
                                />
                              ) : (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  {application.disability_programs ? (
                                    <pre className="text-sm whitespace-pre-wrap">
                                      {typeof application.disability_programs === 'string'
                                        ? application.disability_programs
                                        : JSON.stringify(application.disability_programs, null, 2)}
                                    </pre>
                                  ) : (
                                    <p className="text-gray-500 italic">No disability programs specified</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Debt Discharge / Financial Challenges */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('debt')}
              >
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Debt Discharge / Financial Challenges</h2>
                  {application.has_debt_discharge_history && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Has Debt History
                    </span>
                  )}
                </div>
                {expandedSections.debt ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.debt && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Has Debt Discharge History
                          </label>
                          {isEditing ? (
                            <select
                              name="has_debt_discharge_history"
                              value={editedApplication.has_debt_discharge_history !== undefined ? String(editedApplication.has_debt_discharge_history) : String(application.has_debt_discharge_history || false)}
                              onChange={(e) => setEditedApplication(prev => ({
                                ...prev,
                                has_debt_discharge_history: e.target.value === 'true'
                              }))}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">
                              {application.has_debt_discharge_history === true ? 'Yes' : 
                               application.has_debt_discharge_history === false ? 'No' : 'N/A'}
                            </p>
                          )}
                        </div>
                        
                        {(isEditing ? (editedApplication.has_debt_discharge_history !== undefined ? editedApplication.has_debt_discharge_history : application.has_debt_discharge_history) : application.has_debt_discharge_history) && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Debt Discharge Type
                              </label>
                              {isEditing ? (
                                <select
                                  name="debt_discharge_type"
                                  value={editedApplication.debt_discharge_type ?? application.debt_discharge_type ?? ''}
                                  onChange={handleInputChange}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                >
                                  <option value="">Select Type</option>
                                  <option value="bankruptcy">Bankruptcy</option>
                                  <option value="consumer_proposal">Consumer Proposal</option>
                                  <option value="informal_settlement">Informal Settlement</option>
                                  <option value="other">Other</option>
                                </select>
                              ) : (
                                <p className="text-gray-900">
                                  {application.debt_discharge_type 
                                    ? application.debt_discharge_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                    : 'N/A'}
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Debt Discharge Year
                              </label>
                              {isEditing ? (
                                <input
                                  type="number"
                                  name="debt_discharge_year"
                                  value={editedApplication.debt_discharge_year ?? application.debt_discharge_year ?? ''}
                                  onChange={handleInputChange}
                                  min="1900"
                                  max={new Date().getFullYear()}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                />
                              ) : (
                                <p className="text-gray-900">{application.debt_discharge_year || 'N/A'}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Debt Discharge Status
                              </label>
                              {isEditing ? (
                                <select
                                  name="debt_discharge_status"
                                  value={editedApplication.debt_discharge_status ?? application.debt_discharge_status ?? ''}
                                  onChange={handleInputChange}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                >
                                  <option value="">Select Status</option>
                                  <option value="active">Active</option>
                                  <option value="discharged">Discharged</option>
                                  <option value="not_sure">Not Sure</option>
                                </select>
                              ) : (
                                <p className="text-gray-900">
                                  {application.debt_discharge_status 
                                    ? application.debt_discharge_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                    : 'N/A'}
                                </p>
                              )}
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Debt Discharge Comments
                              </label>
                              {isEditing ? (
                                <textarea
                                  name="debt_discharge_comments"
                                  value={editedApplication.debt_discharge_comments ?? application.debt_discharge_comments ?? ''}
                                  onChange={handleInputChange}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                                  rows={3}
                                />
                              ) : (
                                <p className="text-gray-900">{application.debt_discharge_comments || 'N/A'}</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden" id="documents-section">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('documents')}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Documents</h2>
                  <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {documents.length}
                  </span>
                </div>
                {expandedSections.documents ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.documents && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      {/* Document Tabs */}
                      <div className="flex border-b border-gray-200 mb-4">
                        <button
                          onClick={() => setActiveDocumentTab('manage')}
                          className={`px-4 py-2 font-medium text-sm ${
                            activeDocumentTab === 'manage'
                              ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Manage Documents
                        </button>
                        <button
                          onClick={() => setActiveDocumentTab('upload')}
                          className={`px-4 py-2 font-medium text-sm ${
                            activeDocumentTab === 'upload'
                              ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Upload New Document
                        </button>
                      </div>

                      {/* Document Content */}
                      <AnimatePresence mode="wait">
                        {activeDocumentTab === 'manage' ? (
                          <motion.div
                            key="manage"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            {documents.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No documents uploaded yet</p>
                                <button
                                  onClick={() => setActiveDocumentTab('upload')}
                                  className="mt-4 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                                >
                                  Upload Document
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {documents.map((document) => (
                                  <div 
                                    key={document.id} 
                                    className="border border-gray-200 rounded-lg p-4 hover:border-[#3BAA75]/50 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="flex items-center">
                                          <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                          <h3 className="font-medium text-gray-900">
                                            {document.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </h3>
                                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getDocumentStatusColor(document.status)}`}>
                                            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                          {document.filename.split('/').pop()}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Uploaded: {formatDateTime(document.uploaded_at)}
                                        </p>
                                        {document.reviewed_at && (
                                          <p className="text-xs text-gray-500">
                                            Reviewed: {formatDateTime(document.reviewed_at)}
                                          </p>
                                        )}
                                        {document.review_notes && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                                            <p className="font-medium text-xs text-gray-500 mb-1">Review Notes:</p>
                                            <p>{document.review_notes}</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => {
                                            setSelectedDocument(document);
                                            setShowDocumentReviewModal(true);
                                          }}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                          title="Review Document"
                                        >
                                          <Eye className="h-5 w-5" />
                                        </button>
                                        <button
                                          onClick={() => handleDocumentDelete(document.id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                          title="Delete Document"
                                        >
                                          <Trash2 className="h-5 w-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        ) : (
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
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Application Stages */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('stages')}
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Application Stages</h2>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStageModal(true);
                    }}
                    className="mr-2 px-3 py-1 bg-[#3BAA75] text-white text-sm rounded-lg hover:bg-[#2D8259] transition-colors"
                  >
                    Add Stage
                  </button>
                  {expandedSections.stages ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              <AnimatePresence>
                {expandedSections.stages && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      {stages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No stages recorded yet</p>
                          <button
                            onClick={() => setShowStageModal(true)}
                            className="mt-4 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                          >
                            Add Stage
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Vertical line */}
                          <div className="absolute left-[21px] top-0 h-full w-px bg-gray-200" />

                          <div className="space-y-6">
                            {stages.map((stage) => (
                              <div key={stage.id} className="relative flex items-start">
                                {/* Stage indicator */}
                                <div
                                  className={`
                                    w-11 h-11 rounded-full flex items-center justify-center z-10
                                    ${stage.status === 'completed' ? 'bg-[#3BAA75] text-white' : 'bg-gray-100 text-gray-400'}
                                  `}
                                >
                                  {stage.status === 'completed' ? (
                                    <CheckCircle className="h-5 w-5" />
                                  ) : (
                                    <span>{stage.stage_number}</span>
                                  )}
                                </div>

                                {/* Stage content */}
                                <div className="ml-4 flex-1">
                                  <h3 className="font-semibold text-gray-900">
                                    Stage {stage.stage_number}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Status: {stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {formatDateTime(stage.timestamp)}
                                  </p>
                                  {stage.notes && (
                                    <p className="mt-2 text-sm bg-gray-50 p-2 rounded text-gray-600">
                                      {stage.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Application Flags */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('flags')}
              >
                <div className="flex items-center">
                  <Flag className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Application Flags</h2>
                  {flags.filter(f => !f.resolved_at).length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      {flags.filter(f => !f.resolved_at).length} Active
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFlagModal(true);
                    }}
                    className="mr-2 px-3 py-1 bg-[#3BAA75] text-white text-sm rounded-lg hover:bg-[#2D8259] transition-colors"
                  >
                    Add Flag
                  </button>
                  {expandedSections.flags ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              <AnimatePresence>
                {expandedSections.flags && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      {flags.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Flag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No flags for this application</p>
                          <button
                            onClick={() => setShowFlagModal(true)}
                            className="mt-4 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                          >
                            Add Flag
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {flags.map((flag) => (
                            <div 
                              key={flag.id} 
                              className={`border rounded-lg p-4 ${flag.resolved_at ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center">
                                    <h3 className="font-medium text-gray-900">
                                      {flag.flag_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </h3>
                                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(flag.severity)}`}>
                                      {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {flag.description}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Created: {formatDateTime(flag.created_at)}
                                  </p>
                                  {flag.resolved_at && (
                                    <p className="text-xs text-gray-500">
                                      Resolved: {formatDateTime(flag.resolved_at)}
                                    </p>
                                  )}
                                </div>
                                {!flag.resolved_at && (
                                  <button
                                    onClick={() => handleResolveFlag(flag.id)}
                                    className="px-3 py-1 bg-[#3BAA75] text-white text-sm rounded-lg hover:bg-[#2D8259] transition-colors"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('activity')}
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Activity Log</h2>
                </div>
                {expandedSections.activity ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.activity && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      {activityLog.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No activity recorded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {activityLog.map((activity, index) => (
                            <div key={activity.id} className="relative">
                              {index !== activityLog.length - 1 && (
                                <div className="absolute top-8 left-4 bottom-0 w-px bg-gray-200" />
                              )}
                              <div className="flex gap-4">
                                <div className="relative z-10">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.is_admin_action ? 'bg-blue-500' : 'bg-[#3BAA75]'} text-white text-xs font-medium`}>
                                    {activity.is_admin_action ? 'A' : 'U'}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center">
                                    <p className="font-medium text-gray-900">
                                      {activity.is_admin_action ? 'Admin' : 'User'}
                                    </p>
                                    <span className="mx-1 text-gray-500">•</span>
                                    <p className="text-sm text-gray-500">
                                      {formatDateTime(activity.created_at)}
                                    </p>
                                  </div>
                                  <p className="text-gray-600 mt-1">
                                    {activity.action.replace(/_/g, ' ')}
                                  </p>
                                  {activity.details && Object.keys(activity.details).length > 0 && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                                      <pre className="whitespace-pre-wrap text-xs text-gray-600">
                                        {JSON.stringify(activity.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-6">
            {/* Application Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Application Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                    {formatStatus(application.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Stage</span>
                  <span className="font-medium">
                    {application.current_stage} of 7
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-900">{formatDate(application.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900">{formatDate(application.updated_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Consultation</span>
                  <span className="text-gray-900">
                    {application.consultation_time 
                      ? formatDateTime(application.consultation_time)
                      : 'Not Scheduled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Assigned To</span>
                  <div>
                    {application.assigned_to_admin_id ? (
                      <span className="text-gray-900">
                        {adminUsers.find(u => u.id === application.assigned_to_admin_id)?.email || 'Unknown Admin'}
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col gap-3">
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="w-full px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center justify-center gap-2"
                >
                  <Clock className="h-5 w-5" />
                  <span>Update Status</span>
                </button>
                
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="h-5 w-5" />
                  <span>Assign Application</span>
                </button>
                
                <button
                  onClick={() => setShowFlagModal(true)}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Flag className="h-5 w-5" />
                  <span>Add Flag</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('messages')}
              >
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Messages</h2>
                  {messages.filter(m => !m.read && !m.is_admin).length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      {messages.filter(m => !m.read && !m.is_admin).length} Unread
                    </span>
                  )}
                </div>
                {expandedSections.messages ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.messages && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="h-64 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-4">
                        {messages.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No messages yet</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message) => (
                              <div 
                                key={message.id} 
                                className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    message.is_admin 
                                      ? 'bg-[#3BAA75] text-white' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  <p className="text-sm">{message.message}</p>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs opacity-80">
                                      {formatDateTime(message.created_at)}
                                    </span>
                                    <span className="text-xs opacity-80">
                                      {message.is_admin ? 'Admin' : 'User'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingMessage ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('notes')}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-[#3BAA75] mr-2" />
                  <h2 className="text-lg font-semibold">Internal Notes</h2>
                </div>
                {expandedSections.notes ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <AnimatePresence>
                {expandedSections.notes && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <textarea
                        value={editedApplication.internal_notes !== undefined ? editedApplication.internal_notes : application.internal_notes || ''}
                        onChange={(e) => setEditedApplication(prev => ({
                          ...prev,
                          internal_notes: e.target.value
                        }))}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        rows={5}
                        placeholder="Add internal notes here (only visible to admins)"
                      />
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes || (editedApplication.internal_notes === application.internal_notes)}
                          className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {savingNotes ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Save className="h-5 w-5" />
                          )}
                          <span>Save Notes</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveDocumentTab('upload')}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <Upload className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <span>Upload Document</span>
                </button>
                
                <button
                  onClick={() => setShowStageModal(true)}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <Clock className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <span>Update Stage</span>
                </button>
                
                <button
                  onClick={() => {
                    const mailtoLink = `mailto:${application.email}?subject=Your Clearpath Application&body=Hello ${application.first_name},`;
                    window.open(mailtoLink);
                  }}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <Mail className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <span>Email Customer</span>
                </button>
                
                <button
                  onClick={() => {
                    const telLink = `tel:${application.phone}`;
                    window.open(telLink);
                  }}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                >
                  <Phone className="h-5 w-5 text-[#3BAA75] mr-3" />
                  <span>Call Customer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Update Application Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="">Select Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="pending_documents">Pending Documents</option>
                  <option value="pre_approved">Pre-Approved</option>
                  <option value="vehicle_selection">Vehicle Selection</option>
                  <option value="final_approval">Final Approval</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder="Add notes about this status change"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!newStatus}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Assign Application</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="">Select Admin</option>
                  {adminUsers.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignAdmin}
                  disabled={!selectedAdmin}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Review Modal */}
      {showDocumentReviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Review Document</h3>
              <button
                onClick={() => {
                  setShowDocumentReviewModal(false);
                  setSelectedDocument(null);
                  setDocumentReviewStatus('approved');
                  setDocumentReviewNotes('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-1">
                  {selectedDocument.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <p className="text-sm text-gray-500">
                  {selectedDocument.filename.split('/').pop()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Uploaded: {formatDateTime(selectedDocument.uploaded_at)}
                </p>
                <p className="text-xs text-gray-500">
                  Current Status: 
                  <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${getDocumentStatusColor(selectedDocument.status)}`}>
                    {selectedDocument.status.charAt(0).toUpperCase() + selectedDocument.status.slice(1)}
                  </span>
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="documentStatus"
                      value="approved"
                      checked={documentReviewStatus === 'approved'}
                      onChange={() => setDocumentReviewStatus('approved')}
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="documentStatus"
                      value="rejected"
                      checked={documentReviewStatus === 'rejected'}
                      onChange={() => setDocumentReviewStatus('rejected')}
                      className="h-4 w-4 text-red-600 focus:ring-red-600 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Reject</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes {documentReviewStatus === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={documentReviewNotes}
                  onChange={(e) => setDocumentReviewNotes(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder={documentReviewStatus === 'rejected' 
                    ? "Please explain why this document is being rejected" 
                    : "Optional notes for approved documents"}
                  required={documentReviewStatus === 'rejected'}
                />
                {documentReviewStatus === 'rejected' && (
                  <p className="text-xs text-gray-500 mt-1">
                    * Required for rejected documents. This will be visible to the customer.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDocumentReviewModal(false);
                    setSelectedDocument(null);
                    setDocumentReviewStatus('approved');
                    setDocumentReviewNotes('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentReview}
                  disabled={submittingDocumentReview || (documentReviewStatus === 'rejected' && !documentReviewNotes.trim())}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingDocumentReview ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Application Flag</h3>
              <button
                onClick={() => setShowFlagModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flag Type
                </label>
                <input
                  type="text"
                  value={newFlag.flag_type}
                  onChange={(e) => setNewFlag(prev => ({ ...prev, flag_type: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="e.g., income_verification, document_issue"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={newFlag.severity}
                  onChange={(e) => setNewFlag(prev => ({ ...prev, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newFlag.description}
                  onChange={(e) => setNewFlag(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder="Describe the issue or concern"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFlag}
                  disabled={submittingFlag || !newFlag.flag_type || !newFlag.description}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingFlag ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Add Flag'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Delete Application</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-6">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-700 text-center">
                  Are you sure you want to delete this application? This action cannot be undone.
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteApplication}
                  disabled={deletingApplication}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingApplication ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Delete Application'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Application Stage</h3>
              <button
                onClick={() => setShowStageModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage Number
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(Number(e.target.value))}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value={1}>Stage 1 - Application Submitted</option>
                  <option value={2}>Stage 2 - Under Review</option>
                  <option value={3}>Stage 3 - Pending Documents</option>
                  <option value={4}>Stage 4 - Pre-Approved</option>
                  <option value={5}>Stage 5 - Vehicle Selection</option>
                  <option value={6}>Stage 6 - Final Approval</option>
                  <option value={7}>Stage 7 - Deal Finalized</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder="Add notes about this stage"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStageModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStage}
                  disabled={submittingStage}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingStage ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Add Stage'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationView;