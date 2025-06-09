import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File, 
  Download, 
  X, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import type { Document } from '../../types/database';

interface DocumentPreviewProps {
  document: Document;
  onClose: () => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  onClose,
  onApprove,
  onReject
}) => {
  const { getFileUrl } = useDocumentUpload(document.application_id);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDocumentUrl();
  }, [document]);

  const loadDocumentUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = await getFileUrl(document.filename);
      if (!url) {
        throw new Error('Failed to load document URL');
      }
      
      setUrl(url);
    } catch (error: any) {
      console.error('Error loading document URL:', error);
      setError(error.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    
    try {
      setProcessing(true);
      await onApprove(document.id);
    } catch (error) {
      console.error('Error approving document:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || !rejectReason.trim()) return;
    
    try {
      setProcessing(true);
      await onReject(document.id, rejectReason);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting document:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getFileIcon = () => {
    const extension = document.filename.split('.').pop()?.toLowerCase();
    
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

  const getStatusBadge = () => {
    switch (document.status) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            {getFileIcon()}
            <h3 className="font-semibold text-lg ml-2">
              {document.filename.split('/').pop()}
            </h3>
            <div className="ml-3">
              {getStatusBadge()}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {url && (
              <a
                href={url}
                download
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={loadDocumentUrl}
                className="text-[#3BAA75] hover:text-[#2D8259]"
              >
                Try Again
              </button>
            </div>
          ) : url ? (
            document.filename.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`${url}#toolbar=0`}
                className="w-full h-full min-h-[60vh]"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <img
                  src={url}
                  alt="Document Preview"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>
        
        {onApprove && onReject && document.status === 'pending' && (
          <div className="p-4 border-t border-gray-200">
            {showRejectForm ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || processing}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      'Reject Document'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Approve'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};