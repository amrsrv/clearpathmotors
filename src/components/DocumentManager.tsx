import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  CheckCircle,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Document } from '../types/database';

const documentTypes = [
  { value: 'drivers_license', label: 'Government-issued ID' },
  { value: 'pay_stubs', label: 'Proof of Income' },
  { value: 'bank_statements', label: 'Bank Statement' },
  { value: 'proof_of_residence', label: 'Proof of Address' }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];

export const UnifiedDocumentUploader = ({ applicationId, onUpload, isUploading = false, uploadError = null, isFromAdmin = false }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const [currentlyUploading, setCurrentlyUploading] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedFile, setExpandedFile] = useState(null);

  useEffect(() => {
    let progressInterval;
    if (isUploading && currentlyUploading) {
      setUploadProgress(0);
      progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev >= 90 ? 90 : prev + Math.random() * 10));
      }, 300);
    } else if (!isUploading && uploadProgress > 0) {
      setUploadProgress(100);
      const resetTimeout = setTimeout(() => {
        setUploadProgress(0);
        setCurrentlyUploading(null);
      }, 1000);
      return () => clearTimeout(resetTimeout);
    }
    return () => clearInterval(progressInterval);
  }, [isUploading, currentlyUploading, uploadProgress]);

  const validateFile = file => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Invalid file type.';
    if (file.size > MAX_FILE_SIZE) return 'File too large (max 10MB).';
    return null;
  };

  const onDrop = useCallback(acceptedFiles => {
    setValidationError(null);
    const newFiles = [];
    let hasError = false;
    acceptedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        hasError = true;
        return;
      }
      newFiles.push({ file, type: documentTypes[0].value, id: `${file.name}-${Date.now()}` });
    });
    if (!hasError) setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': [],
      'image/heic': []
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false
  });

  const handleRemoveFile = id => setSelectedFiles(prev => prev.filter(file => file.id !== id));
  const handleTypeChange = (id, newType) => setSelectedFiles(prev => prev.map(file => file.id === id ? { ...file, type: newType } : file));

  const handleSubmitAll = async () => {
    if (selectedFiles.length === 0) return toast.error('Select at least one file');
    for (const docFile of selectedFiles) {
      try {
        setCurrentlyUploading(docFile.id);
        await onUpload(docFile.file, docFile.type, isFromAdmin);
      } catch (e) {
        console.error(e);
        break;
      }
    }
    setSelectedFiles([]);
  };

  const getFileIcon = file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(ext)) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  };

  const toggleFileExpand = id => setExpandedFile(expandedFile === id ? null : id);

  return (
    <div className="w-full max-w-full overflow-hidden px-4">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 lg:p-6">
        <h2 className="text-2xl font-semibold mb-6">Upload Documents</h2>

        {(uploadError || validationError) && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{uploadError || validationError}</span>
          </div>
        )}

        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 cursor-pointer mb-6 ${isDragActive ? 'border-[#3BAA75] bg-[#3BAA75]/5' : 'border-gray-300 hover:border-[#3BAA75]'}`}>
          <input {...getInputProps()} />
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">{isDragActive ? 'Drop the file here...' : 'Tap to select a file or take a photo'}</p>
            <p className="text-xs text-gray-500">PDF, JPG, PNG or HEIC up to 10MB</p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Selected Documents</h3>
            <div className="space-y-3">
              {selectedFiles.map(docFile => (
                <div key={docFile.id} className={`border rounded-lg overflow-hidden ${currentlyUploading === docFile.id ? 'bg-[#3BAA75]/5 border-[#3BAA75]/20' : 'border-gray-200'}`}>
                  <div className="p-3 flex items-center justify-between overflow-hidden">
                    <div className="flex items-center space-x-3 overflow-hidden max-w-[80%]">
                      {getFileIcon(docFile.file)}
                      <div className="overflow-hidden max-w-full">
                        <p className="font-medium text-gray-900 truncate whitespace-nowrap max-w-[180px]">{docFile.file.name}</p>
                        <p className="text-xs text-gray-500">{(docFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    {expandedFile === docFile.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>

                  <AnimatePresence>
                    {expandedFile === docFile.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-200">
                        <div className="p-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                          <select
                            value={docFile.type}
                            onChange={e => handleTypeChange(docFile.id, e.target.value)}
                            className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            disabled={isUploading}
                          >
                            {documentTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={e => { e.stopPropagation(); handleRemoveFile(docFile.id); }}
                            className="mt-3 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            disabled={isUploading}
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" /> Remove
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {currentlyUploading === docFile.id && (
                    <div className="p-3 pt-0 space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-[#3BAA75]" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <button
            onClick={handleSubmitAll}
            disabled={isUploading}
            className="w-full bg-[#3BAA75] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2D8259] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Upload {selectedFiles.length > 1 ? `${selectedFiles.length} Documents` : 'Document'}</span>
              </>
            )}
          </button>
        )}

        <AnimatePresence>
          {uploadProgress === 100 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600">Document uploaded successfully!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface DocumentManagerProps {
  applicationId: string;
  documents: Document[];
  onUpload: (file: File, category: string, isFromAdmin?: boolean) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onUpdateStatus?: (documentId: string, newStatus: 'approved' | 'rejected', reviewNotes?: string) => Promise<boolean>;
  isUploading: boolean;
  uploadError: string | null;
  isAdmin?: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  applicationId,
  documents,
  onUpload,
  onDelete,
  onUpdateStatus,
  isUploading,
  uploadError,
  isAdmin = false
}) => {
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentToReview, setDocumentToReview] = useState<Document | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getDocumentIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(ext || '')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await onDelete(documentId);
        toast.success('Document deleted successfully');
      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
      }
    }
  };

  const handleViewDocument = async (filename: string) => {
    try {
      // Get signed URL for the document
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(filename, 3600); // 1 hour expiry

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Could not generate document URL');

      // Open the document in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDownloadDocument = async (filename: string) => {
    try {
      // Get signed URL for the document
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(filename, 3600); // 1 hour expiry

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Could not generate document URL');

      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = filename.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleSubmitReview = async () => {
    if (!documentToReview || !onUpdateStatus) return;
    
    try {
      setIsSubmittingReview(true);
      
      // If rejecting, require review notes
      if (reviewStatus === 'rejected' && !reviewNotes.trim()) {
        toast.error('Please provide a reason for rejection');
        return;
      }
      
      const success = await onUpdateStatus(
        documentToReview.id, 
        reviewStatus, 
        reviewStatus === 'rejected' ? reviewNotes : undefined
      );
      
      if (success) {
        setDocumentToReview(null);
        setReviewNotes('');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to update document status');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Document Manager</h2>
        <p className="text-gray-600 mb-6">
          View and manage your uploaded documents. You can delete documents that need to be replaced.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
          <p className="text-gray-500">Upload your first document using the upload tab.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <motion.div
              key={document.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {getDocumentIcon(document.filename)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {document.filename.split('/').pop()}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatCategory(document.category)}
                    </p>
                    {document.review_notes && (
                      <p className="text-sm text-red-600 mt-1">
                        Note: {document.review_notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleViewDocument(document.filename)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(document.filename)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {isAdmin && document.status === 'pending' && (
                    <button
                      onClick={() => setDocumentToReview(document)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Review document"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(document.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Document Review Modal */}
      <AnimatePresence>
        {documentToReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-4">Review Document</h3>
              <div className="mb-4">
                <p className="text-gray-700">
                  <span className="font-medium">Document:</span> {formatCategory(documentToReview.category)}
                </p>
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">Filename:</span> {documentToReview.filename.split('/').pop()}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="approved"
                      checked={reviewStatus === 'approved'}
                      onChange={() => setReviewStatus('approved')}
                      className="mr-2"
                    />
                    Approve
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="rejected"
                      checked={reviewStatus === 'rejected'}
                      onChange={() => setReviewStatus('rejected')}
                      className="mr-2"
                    />
                    Reject
                  </label>
                </div>
              </div>

              {reviewStatus === 'rejected' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    rows={3}
                    placeholder="Please provide a reason for rejection"
                    required={reviewStatus === 'rejected'}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setDocumentToReview(null);
                    setReviewNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || (reviewStatus === 'rejected' && !reviewNotes.trim())}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingReview ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>{reviewStatus === 'approved' ? 'Approve' : 'Reject'}</span>
                    </>
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