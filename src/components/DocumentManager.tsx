import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File, 
  Download, 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Upload,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import type { Document } from '../types/database';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface DocumentManagerProps {
  applicationId: string;
  documents: Document[];
  onUpload: (file: File, category: string) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  applicationId,
  documents,
  onUpload,
  onDelete,
  isUploading = false,
  uploadError = null
}) => {
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { getFileUrl, deleteDocument } = useDocumentUpload(applicationId);

  // Simulate upload progress when replacing a document
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (isUploading && loadingDocumentId) {
      setUploadProgress(0);
      
      // Simulate progress up to 90% (the last 10% will be when the server confirms completion)
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 300);
    } else if (!isUploading && uploadProgress > 0) {
      // When upload completes, jump to 100%
      setUploadProgress(100);
      
      // Reset progress after showing 100% for a moment
      const resetTimeout = setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
      return () => clearTimeout(resetTimeout);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isUploading, loadingDocumentId, uploadProgress]);

  // Document categories for grouping
  const documentCategories = {
    'drivers_license': 'Government ID',
    'pay_stubs': 'Proof of Income',
    'notice_of_assessment': 'Tax Documents',
    'bank_statements': 'Bank Statements',
    'proof_of_residence': 'Proof of Address',
    'insurance': 'Insurance Documents'
  };

  // File type icons
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(extension || '')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    } else {
      return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  useEffect(() => {
    const loadDocumentUrls = async () => {
      const urls: Record<string, string> = {};
      for (const doc of documents) {
        const url = await getFileUrl(doc.filename);
        if (url) {
          urls[doc.id] = url;
        }
      }
      setDocumentUrls(urls);
    };

    if (documents.length > 0) {
      loadDocumentUrls();
    }
  }, [documents, getFileUrl]);

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document);
    setLoadingDocumentId(document.id);
    
    try {
      // Get or use cached URL
      let url = documentUrls[document.id];
      if (!url) {
        url = await getFileUrl(document.filename) || '';
        if (url) {
          setDocumentUrls(prev => ({ ...prev, [document.id]: url }));
        }
      }
      
      if (url) {
        setPreviewUrl(url);
        setShowPreview(true);
      } else {
        toast.error('Could not load document preview');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleReplaceDocument = async (document: Document, file: File) => {
    setValidationError(null);
    
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];
    
    if (!allowedTypes.includes(file.type)) {
      setValidationError('Invalid file type. Please upload a JPG, PNG, PDF, or HEIC file.');
      return;
    }
    
    if (file.size > maxSize) {
      setValidationError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    setLoadingDocumentId(document.id);
    try {
      // Delete the old document first
      if (onDelete) {
        await onDelete(document.id);
      } else {
        await deleteDocument(document.id);
      }
      
      // Upload the new document with the same category
      await onUpload(file, document.category);
      
      setShowReplaceConfirm(null);
      toast.success('Document replaced successfully');
    } catch (error) {
      console.error('Error replacing document:', error);
      toast.error('Failed to replace document');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setLoadingDocumentId(documentId);
    try {
      if (onDelete) {
        await onDelete(documentId);
      } else {
        await deleteDocument(documentId);
      }
      
      setShowDeleteConfirm(null);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleReviewDocument = async () => {
    if (!selectedDocument) return;
    
    setSubmittingReview(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Create document review - the database trigger will automatically update the document status
      const { error: reviewError } = await supabase
        .from('document_reviews')
        .insert({
          document_id: selectedDocument.id,
          reviewer_id: user.id,
          status: reviewStatus,
          notes: reviewNotes
        });
      
      if (reviewError) throw reviewError;
      
      // Create notification for user
      if (selectedDocument.application_id) {
        const { data: application } = await supabase
          .from('applications')
          .select('user_id')
          .eq('id', selectedDocument.application_id)
          .single();
          
        if (application?.user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: application.user_id,
              title: `Document ${reviewStatus === 'approved' ? 'Approved' : 'Needs Attention'}`,
              message: reviewStatus === 'approved' 
                ? `Your ${selectedDocument.category.replace(/_/g, ' ')} document has been approved.` 
                : `Your ${selectedDocument.category.replace(/_/g, ' ')} document needs attention. ${reviewNotes}`,
              read: false
            });
        }
      }
      
      setShowReviewModal(false);
      setReviewStatus('approved');
      setReviewNotes('');
      
      toast.success(`Document review submitted successfully. Status will be updated automatically.`);
      
    } catch (error: any) {
      console.error('Error reviewing document:', error);
      toast.error('Failed to review document');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Group documents by category
  const documentsByCategory = documents.reduce((acc, doc) => {
    const category = doc.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Document Management</h2>
      
      {(uploadError || validationError) && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{uploadError || validationError}</span>
        </div>
      )}
      
      {/* Document List */}
      <div className="space-y-6">
        {Object.entries(documentsByCategory).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No documents uploaded yet</p>
            <p className="text-sm mt-2">Upload documents to proceed with the application</p>
          </div>
        ) : (
          Object.entries(documentsByCategory).map(([category, docs]) => (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  {documentCategories[category as keyof typeof documentCategories] || category.replace(/_/g, ' ')}
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getFileIcon(doc.filename)}
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-xs">
                            {doc.filename.split('/').pop()}
                          </p>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="text-xs text-gray-500">
                              {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                            </span>
                            {getStatusBadge(doc.status)}
                          </div>
                          
                          {doc.review_notes && (
                            <p className="mt-2 text-sm bg-gray-50 p-2 rounded text-gray-600">
                              {doc.review_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {loadingDocumentId === doc.id ? (
                          <div className="p-2">
                            <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleViewDocument(doc)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title="View Document"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowReviewModal(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              title="Review Document"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            
                            <button
                              onClick={() => setShowReplaceConfirm(doc.id)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                              title="Replace Document"
                            >
                              <Upload className="h-5 w-5" />
                            </button>
                            
                            {onDelete && (
                              <button
                                onClick={() => setShowDeleteConfirm(doc.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Replace Document Confirmation */}
                    <AnimatePresence>
                      {showReplaceConfirm === doc.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm text-amber-800 mb-3">
                              Are you sure you want to replace this document? The current file will be permanently deleted.
                            </p>
                            
                            {uploadProgress > 0 && (
                              <div className="mb-3 space-y-2">
                                <div className="flex justify-between text-xs text-amber-800">
                                  <span>Uploading new document...</span>
                                  <span>{Math.round(uploadProgress)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-amber-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <input
                                type="file"
                                id={`replace-file-${doc.id}`}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleReplaceDocument(doc, e.target.files[0]);
                                  }
                                }}
                                accept=".jpg,.jpeg,.png,.pdf,.heic"
                              />
                              
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => setShowReplaceConfirm(null)}
                                  className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                
                                <label
                                  htmlFor={`replace-file-${doc.id}`}
                                  className="px-3 py-1 text-sm text-white bg-amber-600 rounded-md hover:bg-amber-700 cursor-pointer"
                                >
                                  Select New File
                                </label>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Delete Document Confirmation */}
                    <AnimatePresence>
                      {showDeleteConfirm === doc.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-red-800 mb-3">
                              Are you sure you want to delete this document? This action cannot be undone.
                            </p>
                            
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="px-3 py-1 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Document Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {selectedDocument?.filename.split('/').pop()}
              </h3>
              <div className="flex items-center space-x-2">
                <a
                  href={previewUrl}
                  download
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </a>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {selectedDocument?.filename.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  className="w-full h-full min-h-[60vh]"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Review Modal */}
      {showReviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Review Document</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewStatus('approved');
                  setReviewNotes('');
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
                  Current Status: 
                  <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedDocument.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedDocument.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
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
                      name="reviewStatus"
                      value="approved"
                      checked={reviewStatus === 'approved'}
                      onChange={() => setReviewStatus('approved')}
                      className="h-4 w-4 text-[#3BAA75] focus:ring-[#3BAA75] border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reviewStatus"
                      value="rejected"
                      checked={reviewStatus === 'rejected'}
                      onChange={() => setReviewStatus('rejected')}
                      className="h-4 w-4 text-red-600 focus:ring-red-600 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Reject</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes {reviewStatus === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder={reviewStatus === 'rejected' 
                    ? "Please explain why this document is being rejected" 
                    : "Optional notes for approved documents"}
                  required={reviewStatus === 'rejected'}
                />
                {reviewStatus === 'rejected' && (
                  <p className="text-xs text-gray-500 mt-1">
                    * Required for rejected documents. This will be visible to the customer.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewStatus('approved');
                    setReviewNotes('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewDocument}
                  disabled={submittingReview || (reviewStatus === 'rejected' && !reviewNotes.trim())}
                  className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? (
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
    </div>
  );
};