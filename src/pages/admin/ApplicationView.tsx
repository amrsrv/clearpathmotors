import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  DollarSign,
  Car,
  CreditCard,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  ArrowLeft,
  Download,
  Upload,
  Trash2,
  MoreVertical,
  Calendar,
  Eye,
  RefreshCw,
  Image,
  File
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Application, Document, ApplicationStage } from '../../types/database';
import toast from 'react-hot-toast';

const ApplicationView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    applicant: true,
    loan: false,
    documents: false,
    timeline: false,
    notes: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplication, setEditedApplication] = useState<Partial<Application>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);
  const [documentUploadCategory, setDocumentUploadCategory] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) loadApplicationData(id);
  }, [id]);

  useEffect(() => {
    // Set up real-time subscription for documents
    if (!id) return;

    const documentsSubscription = supabase
      .channel('admin-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `application_id=eq.${id}`
        },
        (payload) => {
          console.log('Document change received:', payload);
          
          // Reload documents when changes occur
          loadDocuments(id);
          
          // Show toast notification
          if (payload.eventType === 'INSERT') {
            toast.success('New document uploaded');
          } else if (payload.eventType === 'UPDATE') {
            toast.success('Document updated');
          } else if (payload.eventType === 'DELETE') {
            toast.success('Document deleted');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(documentsSubscription);
    };
  }, [id]);

  const loadApplicationData = async (applicationId: string) => {
    try {
      // Load application details
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (applicationError) throw applicationError;
      setApplication(applicationData);
      setEditedApplication(applicationData);

      // Load documents
      await loadDocuments(applicationId);

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', applicationId)
        .order('stage_number', { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

    } catch (error) {
      console.error('Error loading application data:', error);
      toast.error('Failed to load application data');
    } finally {
      setLoading(false);
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

      // Load document URLs
      const urls: Record<string, string> = {};
      for (const doc of documentsData || []) {
        try {
          const { data } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(doc.filename, 3600); // 1 hour expiry

          if (data?.signedUrl) {
            urls[doc.id] = data.signedUrl;
          }
        } catch (error) {
          console.error(`Error getting URL for document ${doc.id}:`, error);
        }
      }
      setDocumentUrls(urls);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setApplication(prev => prev ? { ...prev, status: newStatus as any } : null);
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!note.trim() || !application) return;

    try {
      const { error } = await supabase
        .from('application_stages')
        .insert({
          application_id: application.id,
          stage_number: application.current_stage,
          status: 'note_added',
          notes: note
        });

      if (error) throw error;

      // Reload stages
      loadApplicationData(application.id);
      setNote('');
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Discard changes
      setEditedApplication(application || {});
    }
    setIsEditing(!isEditing);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedApplication(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!application || !editedApplication) return;
    
    setSaveLoading(true);
    setError(null);
    
    try {
      // Format postal code
      let formattedPostalCode = editedApplication.postal_code;
      if (formattedPostalCode) {
        const cleaned = formattedPostalCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (cleaned.length === 6) {
          formattedPostalCode = `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
        }
      }
      
      // Convert numeric fields
      const updatedApplication = {
        ...editedApplication,
        postal_code: formattedPostalCode,
        annual_income: typeof editedApplication.annual_income === 'string' 
          ? parseFloat(editedApplication.annual_income) 
          : editedApplication.annual_income,
        monthly_income: typeof editedApplication.annual_income === 'string'
          ? parseFloat(editedApplication.annual_income) / 12
          : (editedApplication.annual_income as number) / 12,
        credit_score: typeof editedApplication.credit_score === 'string'
          ? parseInt(editedApplication.credit_score)
          : editedApplication.credit_score,
        desired_monthly_payment: typeof editedApplication.desired_monthly_payment === 'string'
          ? parseFloat(editedApplication.desired_monthly_payment)
          : editedApplication.desired_monthly_payment,
      };
      
      const { error } = await supabase
        .from('applications')
        .update(updatedApplication)
        .eq('id', application.id);
      
      if (error) throw error;
      
      // Reload application data
      loadApplicationData(application.id);
      setIsEditing(false);
      toast.success('Application updated successfully');
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setError(error.message || 'An error occurred while saving changes');
      toast.error('Failed to update application');
    } finally {
      setSaveLoading(false);
    }
  };

  const scrollToNotes = () => {
    if (notesRef.current) {
      notesRef.current.scrollIntoView({ behavior: 'smooth' });
      setExpandedSections(prev => ({
        ...prev,
        notes: true
      }));
    }
  };

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document);
    setLoadingDocumentId(document.id);
    
    try {
      // Get or use cached URL
      let url = documentUrls[document.id];
      if (!url) {
        const { data } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(document.filename, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          url = data.signedUrl;
          setDocumentUrls(prev => ({ ...prev, [document.id]: url }));
        } else {
          throw new Error('Could not generate document URL');
        }
      }
      
      setShowDocumentPreview(true);
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document preview');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !documentUploadCategory) {
      return;
    }

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, PDF, or HEIC file.');
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        throw new Error('File is too large. Maximum size is 10MB.');
      }

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Get file extension
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const timestamp = Date.now();
      const filename = `${user.id}/${documentUploadCategory}_${timestamp}.${extension}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert({
          application_id: id,
          category: documentUploadCategory,
          filename: filename,
          status: 'pending'
        })
        .select()
        .single();

      if (documentError) throw documentError;

      // Reload documents
      await loadDocuments(id as string);
      setDocumentUploadCategory(null);
      toast.success('Document uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDocumentStatusChange = async (documentId: string, newStatus: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          status: newStatus,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      if (error) throw error;
      
      // Reload documents
      await loadDocuments(id as string);
      toast.success(`Document marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Get the document details first
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('filename')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the file from storage
      if (document) {
        const { error: storageError } = await supabase.storage
          .from('user-documents')
          .remove([document.filename]);

        if (storageError) throw storageError;
      }

      // Delete the document record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
      
      // Reload documents
      await loadDocuments(id as string);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(extension || '')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-2xl font-semibold text-gray-900">Application Not Found</h2>
          <p className="text-gray-600 mt-2">The application you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 inline-flex items-center px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'under_review': return 'bg-yellow-100 text-yellow-700';
      case 'pending_documents': return 'bg-orange-100 text-orange-700';
      case 'pre_approved': return 'bg-green-100 text-green-700';
      case 'vehicle_selection': return 'bg-purple-100 text-purple-700';
      case 'final_approval': return 'bg-indigo-100 text-indigo-700';
      case 'finalized': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="mr-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {application.first_name} {application.last_name}
                </h1>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(application.status)} mr-2`}>
                    {application.status.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  <span>ID: {application.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleEditToggle}
                    className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-70"
                  >
                    {saveLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    <span className="hidden md:inline">Save</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit2 className="h-5 w-5" />
                    <span className="hidden md:inline">Edit</span>
                  </button>
                  <button
                    onClick={scrollToNotes}
                    className="flex items-center gap-2 px-3 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="hidden md:inline">Add Note</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Status Selector */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Application Status
              </label>
              <select
                value={application.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="pending_documents">Pending Documents</option>
                <option value="pre_approved">Pre-Approved</option>
                <option value="vehicle_selection">Vehicle Selection</option>
                <option value="final_approval">Final Approval</option>
                <option value="finalized">Finalized</option>
              </select>
            </div>
          </div>

          {/* Applicant Information */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('applicant')}
            >
              <div className="flex items-center">
                <User className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Applicant Information</h2>
              </div>
              {expandedSections.applicant ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.applicant && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="first_name"
                            value={editedApplication.first_name || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.first_name}</div>
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
                            value={editedApplication.last_name || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.last_name}</div>
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
                            value={editedApplication.email || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-[#3BAA75]">{application.email}</div>
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
                            value={editedApplication.phone || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.phone}</div>
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
                            value={editedApplication.address || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.address}</div>
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
                            value={editedApplication.city || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.city}</div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Province
                        </label>
                        {isEditing ? (
                          <select
                            name="province"
                            value={editedApplication.province || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
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
                          <div className="text-gray-900">{application.province}</div>
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
                            value={editedApplication.postal_code || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.postal_code}</div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employment Status
                        </label>
                        {isEditing ? (
                          <select
                            name="employment_status"
                            value={editedApplication.employment_status || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          >
                            <option value="employed">Employed</option>
                            <option value="self_employed">Self Employed</option>
                            <option value="unemployed">Unemployed</option>
                          </select>
                        ) : (
                          <div className="text-gray-900 capitalize">
                            {application.employment_status?.replace('_', ' ')}
                          </div>
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
                            value={editedApplication.annual_income || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">
                            ${application.annual_income?.toLocaleString()}
                          </div>
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
                            min="300"
                            max="850"
                            value={editedApplication.credit_score || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">{application.credit_score}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Loan Details */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('loan')}
            >
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Loan Details</h2>
              </div>
              {expandedSections.loan ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.loan && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Type
                        </label>
                        {isEditing ? (
                          <select
                            name="vehicle_type"
                            value={editedApplication.vehicle_type || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          >
                            <option value="">Select Vehicle Type</option>
                            <option value="Car">Car</option>
                            <option value="SUV">SUV</option>
                            <option value="Truck">Truck</option>
                            <option value="Van">Van</option>
                          </select>
                        ) : (
                          <div className="text-gray-900">{application.vehicle_type}</div>
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
                            value={editedApplication.desired_monthly_payment || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">
                            ${application.desired_monthly_payment?.toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Loan Amount Range
                        </label>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              name="loan_amount_min"
                              value={editedApplication.loan_amount_min || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                              placeholder="Min"
                            />
                            <span>-</span>
                            <input
                              type="number"
                              name="loan_amount_max"
                              value={editedApplication.loan_amount_max || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                              placeholder="Max"
                            />
                          </div>
                        ) : (
                          <div className="text-gray-900">
                            ${application.loan_amount_min?.toLocaleString()} - ${application.loan_amount_max?.toLocaleString()}
                          </div>
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
                            value={editedApplication.interest_rate || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                            step="0.01"
                          />
                        ) : (
                          <div className="text-gray-900">{application.interest_rate}%</div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Loan Term
                        </label>
                        {isEditing ? (
                          <select
                            name="loan_term"
                            value={editedApplication.loan_term || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          >
                            <option value="36">36 months</option>
                            <option value="48">48 months</option>
                            <option value="60">60 months</option>
                            <option value="72">72 months</option>
                            <option value="84">84 months</option>
                          </select>
                        ) : (
                          <div className="text-gray-900">{application.loan_term} months</div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Down Payment
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            name="down_payment"
                            value={editedApplication.down_payment || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-10"
                          />
                        ) : (
                          <div className="text-gray-900">
                            ${application.down_payment?.toLocaleString() || '0'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('documents')}
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Documents</h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </span>
                {expandedSections.documents ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
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
                  <div className="px-4 pb-4">
                    {documents.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-start gap-3">
                              {getFileIcon(document.filename)}
                              <div>
                                <p className="font-medium text-sm truncate max-w-xs">{document.filename.split('/').pop()}</p>
                                <p className="text-xs text-gray-500">
                                  {document.category.replace(/_/g, ' ')} • {format(new Date(document.uploaded_at), 'MMM d, yyyy')}
                                </p>
                                {document.review_notes && (
                                  <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                    {document.review_notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 md:mt-0">
                              <span className={`
                                px-2 py-1 text-xs font-medium rounded-full
                                ${document.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                  document.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                  'bg-yellow-100 text-yellow-700'}
                              `}>
                                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleViewDocument(document)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  disabled={loadingDocumentId === document.id}
                                >
                                  {loadingDocumentId === document.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                                
                                <select
                                  value={document.status}
                                  onChange={(e) => handleDocumentStatusChange(document.id, e.target.value)}
                                  className="text-xs rounded-lg border border-gray-300 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                                
                                <button
                                  onClick={() => handleDeleteDocument(document.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleDocumentUpload}
                        accept=".jpg,.jpeg,.png,.pdf,.heic"
                      />
                      <div className="relative">
                        <button 
                          onClick={() => setDocumentUploadCategory('drivers_license')}
                          className="flex items-center gap-2 px-4 py-2 text-[#3BAA75] border border-[#3BAA75] rounded-lg hover:bg-[#3BAA75]/5 transition-colors"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload Document
                        </button>
                        
                        {documentUploadCategory && (
                          <div className="absolute mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                            {[
                              { id: 'drivers_license', label: 'Government ID' },
                              { id: 'pay_stubs', label: 'Proof of Income' },
                              { id: 'bank_statements', label: 'Bank Statements' },
                              { id: 'proof_of_residence', label: 'Proof of Address' },
                              { id: 'notice_of_assessment', label: 'Tax Documents' },
                              { id: 'insurance', label: 'Insurance' }
                            ].map(cat => (
                              <button
                                key={cat.id}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  setDocumentUploadCategory(cat.id);
                                  if (fileInputRef.current) fileInputRef.current.click();
                                }}
                              >
                                {cat.label}
                              </button>
                            ))}
                            <div className="border-t border-gray-100 my-1"></div>
                            <button
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setDocumentUploadCategory(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Application Timeline */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('timeline')}
            >
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Application Timeline</h2>
              </div>
              {expandedSections.timeline ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.timeline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4">
                    <div className="space-y-6">
                      {stages.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No timeline events yet</p>
                        </div>
                      ) : (
                        stages.map((stage, index) => (
                          <div key={stage.id} className="relative">
                            {index !== stages.length - 1 && (
                              <div className="absolute top-8 left-4 bottom-0 w-px bg-gray-200" />
                            )}
                            <div className="flex gap-4">
                              <div className="relative z-10">
                                {stage.status === 'completed' ? (
                                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  </div>
                                ) : stage.status === 'in_progress' ? (
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <AlertCircle className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">Stage {stage.stage_number}</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(stage.timestamp), 'MMM d, yyyy h:mm a')}
                                </p>
                                {stage.notes && (
                                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                    {stage.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add Note */}
          <div ref={notesRef} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('notes')}
            >
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Add Note</h2>
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
                  <div className="px-4 pb-4 space-y-4">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note about this application..."
                      className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-24"
                      rows={4}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!note.trim()}
                      className="w-full bg-[#3BAA75] text-white px-4 py-3 rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Note
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showDocumentPreview && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg truncate max-w-md">
                {selectedDocument.filename.split('/').pop()}
              </h3>
              <div className="flex items-center space-x-2">
                <a
                  href={documentUrls[selectedDocument.id]}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Download className="h-5 w-5" />
                </a>
                <button
                  onClick={() => setShowDocumentPreview(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {selectedDocument.filename.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${documentUrls[selectedDocument.id]}#toolbar=0`}
                  className="w-full h-full min-h-[60vh]"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={documentUrls[selectedDocument.id]}
                    alt="Document Preview"
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${selectedDocument.status === 'approved' ? 'bg-green-100 text-green-700' : 
                      selectedDocument.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'}
                  `}>
                    {selectedDocument.status.charAt(0).toUpperCase() + selectedDocument.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    Uploaded: {format(new Date(selectedDocument.uploaded_at), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDocument.status}
                    onChange={(e) => {
                      handleDocumentStatusChange(selectedDocument.id, e.target.value);
                      setSelectedDocument({
                        ...selectedDocument,
                        status: e.target.value as 'pending' | 'approved' | 'rejected'
                      });
                    }}
                    className="text-sm rounded-lg border border-gray-300"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <button
                    onClick={() => {
                      handleDeleteDocument(selectedDocument.id);
                      setShowDocumentPreview(false);
                    }}
                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {selectedDocument.status === 'rejected' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason
                  </label>
                  <textarea
                    value={selectedDocument.review_notes || ''}
                    onChange={(e) => {
                      const newNotes = e.target.value;
                      setSelectedDocument({
                        ...selectedDocument,
                        review_notes: newNotes
                      });
                    }}
                    onBlur={() => {
                      if (selectedDocument.review_notes !== null) {
                        handleDocumentStatusChange(
                          selectedDocument.id, 
                          selectedDocument.status,
                          selectedDocument.review_notes
                        );
                      }
                    }}
                    placeholder="Explain why this document was rejected..."
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationView;