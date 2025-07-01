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

const documentTypes = [
  { value: 'drivers_license', label: 'Government-issued ID' },
  { value: 'pay_stubs', label: 'Proof of Income' },
  { value: 'bank_statements', label: 'Bank Statement' },
  { value: 'proof_of_residence', label: 'Proof of Address' }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];

export const UnifiedDocumentUploader = ({ applicationId, onUpload, isUploading = false, uploadError = null }) => {
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
        await onUpload(docFile.file, docFile.type);
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

        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 cursor-pointer mb-6 transition-all duration-300 ${isDragActive ? 'border-[#3BAA75] bg-[#3BAA75]/5 scale-[1.02]' : 'border-gray-300 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5'}`}>
          <input {...getInputProps()} />
          <div className="text-center">
            <div className="bg-[#3BAA75]/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Upload className="h-8 w-8 text-[#3BAA75]" />
            </div>
            <p className="mt-2 text-sm text-gray-600 font-medium">{isDragActive ? 'Drop the file here...' : 'Tap to select a file or take a photo'}</p>
            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG or HEIC up to 10MB</p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Selected Documents</h3>
            <div className="space-y-3">
              {selectedFiles.map(docFile => (
                <div key={docFile.id} className={`border rounded-xl overflow-hidden transition-all duration-200 ${currentlyUploading === docFile.id ? 'bg-[#3BAA75]/5 border-[#3BAA75]/20 shadow-md' : 'border-gray-200 hover:border-[#3BAA75]/30 hover:shadow-sm'}`}>
                  <div className="p-3 flex items-center justify-between overflow-hidden" onClick={() => toggleFileExpand(docFile.id)}>
                    <div className="flex items-center space-x-3 overflow-hidden max-w-[80%]">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        {getFileIcon(docFile.file)}
                      </div>
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
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                            <select
                              value={docFile.type}
                              onChange={e => handleTypeChange(docFile.id, e.target.value)}
                              className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75] shadow-sm"
                              disabled={isUploading}
                            >
                              {documentTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleRemoveFile(docFile.id); }}
                            className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
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
                        <motion.div className="h-full bg-gradient-to-r from-[#3BAA75] to-[#2D8259]" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
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
            className="w-full bg-gradient-to-r from-[#3BAA75] to-[#2D8259] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#2D8259] hover:to-[#1F5F3F] disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all duration-300"
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 p-4 bg-green-50 rounded-xl shadow-sm">
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