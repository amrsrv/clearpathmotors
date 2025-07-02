import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  CreditCard, 
  Home, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  MessageSquare, 
  Flag, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Upload, 
  Download, 
  Eye, 
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ApplicationTracker } from '../../components/ApplicationTracker';
import { DocumentManager } from '../../components/DocumentManager';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import { UnifiedDocumentUploader } from '../../components/DocumentManager';
import type { Application, ApplicationStage, Document } from '../../types/database';

const ApplicationView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'messages' | 'flags'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  
  // Document upload state and hooks
  const { 
    uploadDocument, 
    deleteDocument, 
    updateDocumentStatus, 
    getFileUrl, 
    uploading, 
    error: uploadError 
  } = useDocumentUpload(id || '');

  useEffect(() => {
    if (id) {
      loadApplicationData();
    }
  }, [id]);

  const loadApplicationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load application data
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
        
      if (applicationError) throw applicationError;
      
      setApplication(applicationData);
      
      // Load application stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', id)
        .order('stage_number', { ascending: true });
        
      if (stagesError) throw stagesError;
      
      setStages(stagesData || []);
      
      // Load documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (documentsError) throw documentsError;
      
      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error loading application data:', error);
      setError('Failed to load application data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadApplicationData();
  };

  const handleEditField = (field: string, value: string | number | null) => {
    setEditField(field);
    setEditValue(value);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editField || !application) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('applications')
        .update({ [editField]: editValue })
        .eq('id', application.id);
        
      if (error) throw error;
      
      // Update local state
      setApplication(prev => prev ? { ...prev, [editField]: editValue } : null);
      
      // Create activity log
      await supabase
        .from('activity_log')
        .insert({
          application_id: application.id,
          user_id: user?.id,
          action: 'update_application',
          details: {
            field: editField,
            old: application[editField as keyof Application],
            new: editValue
          },
          is_admin_action: true,
          is_visible_to_user: true
        });
      
      toast.success('Field updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update field');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendAdminNote = async () => {
    if (!adminNote.trim() || !application) return;
    
    try {
      setIsSendingNote(true);
      
      // Create admin message
      const { error: messageError } = await supabase
        .from('admin_messages')
        .insert({
          user_id: application.user_id,
          admin_id: user?.id,
          application_id: application.id,
          message: adminNote,
          is_admin: true,
          read: false
        });
        
      if (messageError) throw messageError;
      
      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: application.user_id,
          title: 'New Message from Support',
          message: adminNote.length > 100 ? adminNote.substring(0, 100) + '...' : adminNote,
          read: false
        });
        
      if (notificationError) throw notificationError;
      
      toast.success('Message sent successfully');
      setAdminNote('');
    } catch (error) {
      console.error('Error sending admin note:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingNote(false);
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    try {
      const document = await uploadDocument(file, category, true);
      if (document) {
        // Update local state
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
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleUpdateDocumentStatus = async (documentId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await updateDocumentStatus(documentId, status, notes);
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              status, 
              review_notes: notes || null,
              reviewed_at: new Date().toISOString()
            } 
          : doc
      ));
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
      throw error;
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
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error || 'Application not found'}</span>
        </div>
        <button
          onClick={() => navigate('/admin/applications')}
          className="mt-4 flex items-center text-[#3BAA75] hover:text-[#2D8259]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/applications')}
            className="flex items-center text-gray-600 hover:text-[#3BAA75] mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Applications
          </button>
          <h1 className="text-2xl font-bold">
            {application.first_name} {application.last_name}
          </h1>
          <div className="flex items-center text-gray-500 text-sm">
            <span className="mr-3">Application ID: {application.id.substring(0, 8)}</span>
            <span>Created: {format(new Date(application.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <div className={`px-3 py-1.5 text-sm font-medium rounded-full ${
            application.status === 'pre_approved' ? 'bg-green-100 text-green-800' :
            application.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
            application.status === 'pending_documents' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-[#3BAA75] text-[#3BAA75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-[#3BAA75] text-[#3BAA75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'messages'
                ? 'border-[#3BAA75] text-[#3BAA75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'flags'
                ? 'border-[#3BAA75] text-[#3BAA75]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Flags
          </button>
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Application Progress */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Application Progress</h2>
              <ApplicationTracker application={application} stages={stages} />
            </div>
            
            {/* Application Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Application Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-md font-medium mb-4 flex items-center">
                    <User className="h-5 w-5 text-[#3BAA75] mr-2" />
                    Personal Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium">{application.first_name} {application.last_name}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('first_name', application.first_name)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{application.email}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('email', application.email)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{application.phone}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('phone', application.phone)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{application.address}</p>
                        <p className="text-sm">{application.city}, {application.province} {application.postal_code}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('address', application.address)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Housing Status</p>
                        <p className="font-medium">
                          {application.housing_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditField('housing_status', application.housing_status)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Financial Information */}
                <div>
                  <h3 className="text-md font-medium mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 text-[#3BAA75] mr-2" />
                    Financial Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Employment Status</p>
                        <p className="font-medium">
                          {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditField('employment_status', application.employment_status)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Employer</p>
                        <p className="font-medium">{application.employer_name || 'Not specified'}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('employer_name', application.employer_name)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Annual Income</p>
                        <p className="font-medium">${application.annual_income?.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('annual_income', application.annual_income)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Credit Score</p>
                        <p className="font-medium">{application.credit_score}</p>
                      </div>
                      <button
                        onClick={() => handleEditField('credit_score', application.credit_score)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Loan Details</p>
                        <p className="font-medium">
                          ${application.loan_amount_min?.toLocaleString()} - ${application.loan_amount_max?.toLocaleString()}
                        </p>
                        <p className="text-sm">{application.interest_rate}% / {application.loan_term} months</p>
                      </div>
                      <button
                        onClick={() => handleEditField('interest_rate', application.interest_rate)}
                        className="text-gray-400 hover:text-[#3BAA75]"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Admin Notes */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-md font-medium mb-4">Admin Notes</h3>
                
                <div className="mb-4">
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    rows={3}
                    placeholder="Add a note or message for the client..."
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSendAdminNote}
                    disabled={!adminNote.trim() || isSendingNote}
                    className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSendingNote ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Document Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Upload Documents</h2>
              <UnifiedDocumentUploader
                applicationId={application.id}
                onUpload={handleDocumentUpload}
                isUploading={uploading}
                uploadError={uploadError}
              />
            </div>
            
            {/* Document Manager */}
            <div className="bg-white rounded-lg shadow p-6">
              <DocumentManager
                applicationId={application.id}
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                isUploading={uploading}
                uploadError={uploadError}
                getFileUrl={getFileUrl}
                isAdmin={true}
                onUpdateStatus={handleUpdateDocumentStatus}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Messages</h2>
            {/* Message component would go here */}
            <p className="text-gray-500 text-center py-8">Message functionality is not implemented in this view.</p>
          </div>
        )}
        
        {activeTab === 'flags' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Application Flags</h2>
            {/* Flags component would go here */}
            <p className="text-gray-500 text-center py-8">Flag functionality is not implemented in this view.</p>
          </div>
        )}
      </div>

      {/* Edit Field Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-4">
                Edit {editField?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              
              <div className="mb-4">
                {typeof editValue === 'number' ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(parseFloat(e.target.value))}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                ) : editField === 'employment_status' ? (
                  <select
                    value={editValue as string}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="student">Student</option>
                    <option value="retired">Retired</option>
                  </select>
                ) : editField === 'housing_status' ? (
                  <select
                    value={editValue as string}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="own">Own</option>
                    <option value="rent">Rent</option>
                    <option value="live_with_parents">Live with Parents</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editValue as string}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
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