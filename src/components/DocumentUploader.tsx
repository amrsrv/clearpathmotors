import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import type { Document } from '../types/database';

interface DocumentUploaderProps {
  applicationId: string;
  category: string;
  onUploadComplete: (document: Document) => void;
  maxSize?: number;
  acceptedTypes?: string[];
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  applicationId,
  category,
  onUploadComplete,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png']
}) => {
  const { uploadDocument, uploading, error } = useDocumentUpload(applicationId);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Simulate upload progress
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (uploading) {
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
    } else if (uploadProgress > 0) {
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
  }, [uploading, uploadProgress]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      const file = acceptedFiles[0];
      const document = await uploadDocument(file, category);
      if (document) {
        onUploadComplete(document);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [category, uploadDocument, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${isDragActive ? 'border-[#3BAA75] bg-[#3BAA75]/5' : 'border-gray-300 hover:border-[#3BAA75]'}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? "Drop the file here..."
              : "Drag and drop a file here, or click to select"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, JPG or PNG up to {maxSize / (1024 * 1024)}MB
          </p>
        </div>
      </div>

      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-[#3BAA75]/5 rounded-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Uploading document...</span>
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
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          </motion.div>
        )}

        {uploadProgress === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-green-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">Document uploaded successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};