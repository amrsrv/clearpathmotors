import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { Document } from '../types/database';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

interface DocumentUploadProps {
  applicationId: string;
  documents: Document[];
  onUpload: (file: File, category: string) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
}

const documentCategories = [
  {
    id: 'drivers_license',
    label: 'Government-issued ID',
    description: 'Driver\'s license, passport, or other valid ID'
  },
  {
    id: 'pay_stubs',
    label: 'Proof of Income',
    description: 'Recent pay stubs, T4, or Notice of Assessment'
  },
  {
    id: 'bank_statements',
    label: 'Bank Statements',
    description: 'Last 3 months of bank statements'
  },
  {
    id: 'proof_of_residence',
    label: 'Proof of Address',
    description: 'Utility bill or bank statement from last 90 days'
  }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'image/heic'
];

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  applicationId, 
  documents, 
  onUpload,
  isUploading = false,
  uploadError = null
}) => {
  const [dragActiveCategory, setDragActiveCategory] = useState<string | null>(null);
  const { getFileUrl } = useDocumentUpload(applicationId);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Simulate upload progress when uploading
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (isUploading && uploadingCategory) {
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
  }, [isUploading, uploadingCategory, uploadProgress]);

  useEffect(() => {
    const loadDocumentUrls = async () => {
      const urls: Record<string, string> = {};
      for (const doc of documents) {
        try {
          const url = await getFileUrl(doc.filename);
          if (url) {
            urls[doc.id] = url;
          }
        } catch (error) {
          console.error(`Error getting URL for document ${doc.id}:`, error);
        }
      }
      setDocumentUrls(urls);
    };

    if (documents.length > 0) {
      loadDocumentUrls();
    }
  }, [documents, getFileUrl]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, PDF, or HEIC file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveCategory(category);
    } else if (e.type === "dragleave") {
      setDragActiveCategory(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveCategory(null);
    setValidationError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      
      if (error) {
        setValidationError(error);
        return;
      }

      setUploadingCategory(category);
      try {
        await onUpload(file, category);
      } finally {
        setUploadingCategory(null);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    setValidationError(null);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);
      
      if (error) {
        setValidationError(error);
        e.target.value = '';
        return;
      }

      setUploadingCategory(category);
      try {
        await onUpload(file, category);
      } finally {
        setUploadingCategory(null);
        e.target.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Required Documents</h2>
      
      {(uploadError || validationError) && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{uploadError || validationError}</span>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        {documentCategories.map(category => {
          const categoryDocs = documents.filter(doc => doc.category === category.id);
          const latestDoc = categoryDocs[0]; // Documents are already sorted by uploaded_at desc
          const isCurrentlyUploading = uploadingCategory === category.id;
          
          return (
            <div
              key={category.id}
              className={`
                border-2 rounded-lg p-4 transition-colors
                ${dragActiveCategory === category.id ? 'border-[#3BAA75] bg-[#3BAA75]/5' : 'border-gray-200'}
                ${latestDoc?.status === 'approved' ? 'bg-green-50' : 
                  latestDoc?.status === 'rejected' ? 'bg-red-50' : ''}
                ${isCurrentlyUploading ? 'bg-[#3BAA75]/5' : ''}
              `}
              onDragEnter={e => handleDrag(e, category.id)}
              onDragLeave={e => handleDrag(e, category.id)}
              onDragOver={e => handleDrag(e, category.id)}
              onDrop={e => handleDrop(e, category.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{category.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>
                {latestDoc?.status === 'approved' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {latestDoc?.status === 'rejected' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {isCurrentlyUploading && (
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Uploading...</span>
                    <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#3BAA75]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {!isCurrentlyUploading && latestDoc ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[70%]">
                      {latestDoc.filename.split('/').pop()}
                    </span>
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${latestDoc.status === 'approved' ? 'bg-green-100 text-green-700' :
                        latestDoc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}
                    `}>
                      {latestDoc.status.charAt(0).toUpperCase() + latestDoc.status.slice(1)}
                    </span>
                  </div>
                  
                  {documentUrls[latestDoc.id] && (
                    <a
                      href={documentUrls[latestDoc.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium block mt-2"
                    >
                      View Document
                    </a>
                  )}
                  
                  {latestDoc.review_notes && (
                    <p className="text-sm bg-white/50 p-2 rounded text-gray-600">
                      {latestDoc.review_notes}
                    </p>
                  )}

                  <label className="block">
                    <span className="sr-only">Upload new file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => handleFileInput(e, category.id)}
                      accept=".jpg,.jpeg,.png,.pdf,.heic"
                      disabled={isUploading}
                    />
                    <button
                      onClick={() => document.querySelector<HTMLInputElement>(`input[type="file"]`)?.click()}
                      className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isUploading}
                    >
                      Upload new file
                    </button>
                  </label>
                </div>
              ) : (
                <label className="block">
                  <span className="sr-only">Choose file</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => handleFileInput(e, category.id)}
                    accept=".jpg,.jpeg,.png,.pdf,.heic"
                    disabled={isUploading}
                  />
                  <div
                    className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-[#3BAA75] transition-colors"
                    onClick={() => document.querySelector<HTMLInputElement>(`input[type="file"]`)?.click()}
                  >
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <span className="relative cursor-pointer text-[#3BAA75] font-medium hover:text-[#2D8259]">
                          Upload a file
                        </span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, JPG, PNG, or HEIC up to 10MB</p>
                    </div>
                  </div>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};