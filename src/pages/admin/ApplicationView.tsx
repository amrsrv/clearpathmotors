import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Flag,
  Send,
  Plus,
  Eye,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { ApplicationTracker } from '../../components/ApplicationTracker';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import { UnifiedDocumentUploader, DocumentManager } from '../../components/DocumentManager';
import { toStartCase } from '../../utils/formatters';

const ApplicationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stages, setStages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagData, setFlagData] = useState({
    flag_type: 'missing_information',
    severity: 'medium',
    description: ''
  });
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const messagesEndRef = useRef(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Initialize document upload hook
  const { 
    uploadDocument, 
    deleteDocument, 
    updateDocumentStatus,
    getFileUrl 
  } = useDocumentUpload(id);

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'messages' && application) {
      loadMessages();
    }
  }, [activeTab, application]);

  useEffect(() => {
    // Scroll to bottom of messages when new messages are loaded
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch application details
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError) throw appError;
      setApplication(appData);

      // Fetch application stages
      const { data: stageData, error: stageError } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', id)
        .order('stage_number', { ascending: true });

      if (stageError) throw stageError;
      setStages(stageData || []);

      // Fetch documents
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });

      if (docError) throw docError;
      setDocuments(docData || []);

    } catch (error) {
      console.error('Error loading application:', error);
      setError('Failed to load application details. Please try again.');
      toast.error('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark unread admin messages as read
      const unreadMessages = data?.filter(m => !m.read && m.is_admin) || [];
      if (unreadMessages.length > 0) {
        await supabase
          .from('admin_messages')
          .update({ read: true })
          .in('id', unreadMessages.map(m => m.id));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !application) return;
    
    try {
      setSendingMessage(true);
      
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: application.user_id,
          admin_id: user.id,
          application_id: id,
          message: newMessage,
          is_admin: true,
          read: false
        });
        
      if (error) throw error;
      
      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: application.user_id,
          title: 'New Message from Support',
          message: newMessage.length > 100 ? newMessage.substring(0, 100) + '...' : newMessage,
          read: false
        });
      
      setNewMessage('');
      loadMessages();
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !application) return;
    
    try {
      setAddingNote(true);
      
      const { error } = await supabase
        .from('applications')
        .update({
          internal_notes: application.internal_notes 
            ? `${application.internal_notes}\n\n${format(new Date(), 'yyyy-MM-dd HH:mm')} - ${newNote}`
            : `${format(new Date(), 'yyyy-MM-dd HH:mm')} - ${newNote}`
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setApplication(prev => ({
        ...prev,
        internal_notes: prev.internal_notes 
          ? `${prev.internal_notes}\n\n${format(new Date(), 'yyyy-MM-dd HH:mm')} - ${newNote}`
          : `${format(new Date(), 'yyyy-MM-dd HH:mm')} - ${newNote}`
      }));
      
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleSubmitFlag = async () => {
    if (!flagData.description.trim() || !application) return;
    
    try {
      setSubmittingFlag(true);
      
      const { error } = await supabase
        .from('application_flags')
        .insert({
          application_id: id,
          flag_type: flagData.flag_type,
          severity: flagData.severity,
          description: flagData.description
        });
        
      if (error) throw error;
      
      setShowFlagForm(false);
      setFlagData({
        flag_type: 'missing_information',
        severity: 'medium',
        description: ''
      });
      
      toast.success('Flag added successfully');
    } catch (error) {
      console.error('Error adding flag:', error);
      toast.error('Failed to add flag');
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleDocumentUpload = async (file, category) => {
    try {
      setIsUploadingDocument(true);
      setUploadError(null);
      
      await uploadDocument(file, category, true); // true indicates it's from admin
      
      // Reload documents after upload
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (error) throw error;
      setDocuments(data || []);
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError(error.message || 'Failed to upload document');
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
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

  const handleUpdateDocumentStatus = async (documentId, newStatus, reviewNotes) => {
    try {
      const success = await updateDocumentStatus(documentId, newStatus, reviewNotes);
      
      if (success) {
        // Update document in the list
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { 
                ...doc, 
                status: newStatus, 
                review_notes: reviewNotes || null,
                reviewed_at: new Date().toISOString()
              } 
            : doc
        ));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Application</h2>
        <p className="text-gray-600 mb-6 text-center">{error || 'Application not found'}</p>
        <button
          onClick={() => navigate('/admin/applications')}
          className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/applications')}
        className="flex items-center text-gray-600 hover:text-[#3BAA75] mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Applications
      </button>

      {/* Application Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {application.first_name} {application.last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                application.status === 'pre_approved' ? 'bg-green-100 text-green-800' :
                application.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                application.status === 'pending_documents' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="text-sm text-gray-500">
                Application #{application.id.substring(0, 8)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFlagForm(true)}
              className="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <Flag className="h-4 w-4" />
              <span>Flag</span>
            </button>
            
            <button
              onClick={() => setActiveTab('messages')}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Message</span>
            </button>
            
            <button
              onClick={() => navigate(`/admin/applications/${id}/edit`)}
              className="px-3 py-1.5 text-sm bg-[#3BAA75]/10 text-[#3BAA75] rounded-lg hover:bg-[#3BAA75]/20 transition-colors flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
              { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
              { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
              { id: 'notes', label: 'Notes', icon: <Edit className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Application Progress */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Application Progress</h2>
                <ApplicationTracker application={application} stages={stages} />
              </div>
              
              {/* Application Details */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Application Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-700">Personal Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">{application.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">{application.phone}</span>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                        <span className="text-gray-700">
                          {application.address}, {application.city}, {application.province} {application.postal_code}
                        </span>
                      </div>
                      {application.date_of_birth && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            DOB: {new Date(application.date_of_birth).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Financial Information */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-700">Financial Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {application.employer_name && ` at ${application.employer_name}`}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Annual Income: ${application.annual_income?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Credit Score: {application.credit_score}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Car className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Vehicle Type: {application.vehicle_type || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Loan Details */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-700">Loan Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Loan Range: ${application.loan_amount_min?.toLocaleString()} - ${application.loan_amount_max?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Monthly Payment: ${application.desired_monthly_payment?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Loan Term: {application.loan_term || 60} months
                        </span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Interest Rate: {application.interest_rate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Application Status */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-700">Application Status</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Created: {format(new Date(application.created_at), 'PPP')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Updated: {format(new Date(application.updated_at), 'PPP')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {application.status === 'pre_approved' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : application.status === 'rejected' ? (
                          <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                        )}
                        <span className={`text-${
                          application.status === 'pre_approved' ? 'green' : 
                          application.status === 'rejected' ? 'red' : 
                          'yellow'
                        }-700`}>
                          Status: {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          Current Stage: {application.current_stage}/7
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-8">
              {/* Document Uploader */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
                <p className="text-gray-600 mb-4">
                  Upload documents for this application. The client will be notified when new documents are uploaded.
                </p>
                <UnifiedDocumentUploader
                  applicationId={id}
                  onUpload={handleDocumentUpload}
                  isUploading={isUploadingDocument}
                  uploadError={uploadError}
                  isFromAdmin={true}
                />
              </div>
              
              {/* Document Manager */}
              <div>
                <DocumentManager
                  applicationId={id}
                  documents={documents}
                  onUpload={handleDocumentUpload}
                  onDelete={handleDocumentDelete}
                  onUpdateStatus={handleUpdateDocumentStatus}
                  isUploading={isUploadingDocument}
                  uploadError={uploadError}
                  isAdmin={true}
                />
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Messages</h2>
              
              {/* Messages List */}
              <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start a conversation with the client</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`rounded-lg p-3 max-w-[80%] ${
                            message.is_admin
                              ? 'bg-[#3BAA75] text-white'
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.message}</p>
                          <div className="flex items-center justify-end mt-1 text-xs opacity-80">
                            <span>{format(new Date(message.created_at), 'h:mm a')}</span>
                            {message.is_admin && (
                              <span className="ml-1">
                                {message.read ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="flex items-center gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75] min-h-[80px]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 h-10 flex items-center"
                >
                  {sendingMessage ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Internal Notes</h2>
              
              {/* Notes Display */}
              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] mb-4">
                {application.internal_notes ? (
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">
                    {application.internal_notes}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <Edit className="h-12 w-12 mb-3 opacity-20" />
                    <p>No notes yet</p>
                    <p className="text-sm mt-1">Add your first note below</p>
                  </div>
                )}
              </div>
              
              {/* Add Note */}
              <div className="space-y-2">
                <h3 className="text-md font-medium">Add Note</h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75] min-h-[100px]"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {addingNote ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                  Add Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flag Form Modal */}
      <AnimatePresence>
        {showFlagForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-4">Flag Application</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flag Type
                  </label>
                  <select
                    value={flagData.flag_type}
                    onChange={(e) => setFlagData({...flagData, flag_type: e.target.value})}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="missing_information">Missing Information</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                    <option value="document_issue">Document Issue</option>
                    <option value="credit_concern">Credit Concern</option>
                    <option value="income_verification">Income Verification</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={flagData.severity}
                    onChange={(e) => setFlagData({...flagData, severity: e.target.value})}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={flagData.description}
                    onChange={(e) => setFlagData({...flagData, description: e.target.value})}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    rows={4}
                    placeholder="Describe the issue..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowFlagForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSubmitFlag}
                  disabled={!flagData.description.trim() || submittingFlag}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingFlag ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                  Submit Flag
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicationView;