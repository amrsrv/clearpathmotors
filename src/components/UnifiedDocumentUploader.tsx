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
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentFile {
  file: File;
  type: string;
  id: string;
}

interface UnifiedDocumentUploaderProps {
  applicationId: string;
  onUpload: (file: File, category: string) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
}

const documentTypes = [
  { value: 'drivers_license', label: 'Government-issued ID' },
  { value: 'pay_stubs', label: 'Proof of Income' },
  { value: 'bank_statements', label: 'Bank Statement' },
  { value: 'proof_of_residence', label: 'Proof of Address' }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];

export const UnifiedDocumentUploader: React.FC<UnifiedDocumentUploaderProps> = ({
  applicationId,
  onUpload,
  isUploading = false,
  uploadError = null
}) => {
  const [selectedFiles, setSelectedFiles] = useState<DocumentFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentlyUploading, setCurrentlyUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  // Simulate upload progress when uploading
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (isUploading && currentlyUploading) {
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
        setCurrentlyUploading(null);
      }, 1000);
      
      return () => clearTimeout(resetTimeout);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isUploading, currentlyUploading, uploadProgress]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, PDF, or HEIC file.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    
    return null;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setValidationError(null);
    
    const newFiles: DocumentFile[] = [];
    let hasError = false;
    
    acceptedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        hasError = true;
        return;
      }
      
      // Add file with a default document type and unique ID
      newFiles.push({
        file,
        type: documentTypes[0].value, // Default to first type
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      });
    });
    
    if (!hasError) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
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

  const handleRemoveFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleTypeChange = (id: string, newType: string) => {
    setSelectedFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, type: newType } : file
      )
    );
  };

  const handleSubmitAll = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }
    
    // Check if all files have a type selected
    const missingType = selectedFiles.some(file => !file.type);
    if (missingType) {
      toast.error('Please select a document type for all files');
      return;
    }
    
    // Upload files one by one
    for (const docFile of selectedFiles) {
      try {
        setCurrentlyUploading(docFile.id);
        await onUpload(docFile.file, docFile.type);
      } catch (error) {
        console.error('Error uploading file:', error);
        break;
      }
    }
    
    // Clear selected files after successful upload
    setSelectedFiles([]);
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(extension || '')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const toggleFileExpand = (id: string) => {
    setExpandedFile(expandedFile === id ? null : id);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full">
      <h2 className="text-2xl font-semibold mb-6">Upload Documents</h2>
      
      {(uploadError || validationError) && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{uploadError || validationError}</span>
        </div>
      )}
      
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer mb-6
          ${isDragActive ? 'border-[#3BAA75] bg-[#3BAA75]/5' : 'border-gray-300 hover:border-[#3BAA75]'}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? "Drop the file here..."
              : "Tap here to select a file or take a photo"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, JPG, PNG or HEIC up to 10MB
          </p>
        </div>
      </div>
      
      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Selected Documents</h3>
          <div className="space-y-3">
            {selectedFiles.map((docFile) => (
              <div 
                key={docFile.id} 
                className={`
                  border rounded-lg overflow-hidden
                  ${currentlyUploading === docFile.id ? 'bg-[#3BAA75]/5 border-[#3BAA75]/20' : 'border-gray-200'}
                `}
              >
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleFileExpand(docFile.id)}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {getFileIcon(docFile.file)}
                    <div className="overflow-hidden">
                      <p className="font-medium text-gray-900 truncate">
                        {docFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(docFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {expandedFile === docFile.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedFile === docFile.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-gray-200"
                    >
                      <div className="p-3">
                        {/* Document Type Selector */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Document Type
                          </label>
                          <select
                            value={docFile.type}
                            onChange={(e) => handleTypeChange(docFile.id, e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                            disabled={isUploading}
                          >
                            {documentTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(docFile.id);
                            }}
                            className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            disabled={isUploading}
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Upload Progress */}
                {currentlyUploading === docFile.id && (
                  <div className="p-3 pt-0 space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#3BAA75]"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleSubmitAll}
          disabled={isUploading || selectedFiles.length === 0}
          className="w-full bg-[#3BAA75] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
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
      
      {/* Success Message */}
      <AnimatePresence>
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