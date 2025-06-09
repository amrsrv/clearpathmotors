import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Trash2, 
  Download, 
  RefreshCw, 
  X, 
  AlertTriangle,
  FileText,
  Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { CSVLink } from 'react-csv';
import toast from 'react-hot-toast';

interface BulkActionsProps {
  selectedItems: string[];
  itemType: 'applications' | 'users' | 'documents';
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedItems,
  itemType,
  onClearSelection,
  onActionComplete
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportHeaders, setExportHeaders] = useState<any[]>([]);
  const [exportReady, setExportReady] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from(itemType)
        .delete()
        .in('id', selectedItems);

      if (error) throw error;
      
      toast.success(`${selectedItems.length} ${itemType} deleted successfully`);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      console.error(`Error deleting ${itemType}:`, error);
      toast.error(`Failed to delete ${itemType}`);
    } finally {
      setProcessing(false);
      setShowConfirmDelete(false);
    }
  };

  const prepareExport = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      setProcessing(true);
      
      const { data, error } = await supabase
        .from(itemType)
        .select('*')
        .in('id', selectedItems);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Create headers from the first item
        const headers = Object.keys(data[0]).map(key => ({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          key
        }));
        
        setExportHeaders(headers);
        setExportData(data);
        setExportReady(true);
        
        // Trigger download
        document.getElementById('csv-download-link')?.click();
      }
    } catch (error: any) {
      console.error(`Error preparing export:`, error);
      toast.error(`Failed to prepare export`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSendEmail = async () => {
    if (selectedItems.length === 0 || !emailSubject || !emailBody) return;
    
    try {
      setProcessing(true);
      
      // In a real implementation, this would connect to an email service
      // For now, we'll just simulate success
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Email sent to ${selectedItems.length} recipients`);
      setShowConfirmEmail(false);
      setEmailSubject('');
      setEmailBody('');
      onClearSelection();
    } catch (error: any) {
      console.error(`Error sending emails:`, error);
      toast.error(`Failed to send emails`);
    } finally {
      setProcessing(false);
    }
  };

  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-4"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <CheckSquare className="h-5 w-5 text-[#3BAA75]" />
          <span>{selectedItems.length} selected</span>
        </div>
        
        <div className="h-6 border-l border-gray-200"></div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
          
          <button
            onClick={prepareExport}
            className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          
          {itemType === 'users' && (
            <button
              onClick={() => setShowConfirmEmail(true)}
              className="flex items-center gap-1 px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </button>
          )}
          
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>
        
        {/* Hidden CSV download link */}
        {exportReady && (
          <CSVLink
            id="csv-download-link"
            data={exportData}
            headers={exportHeaders}
            filename={`${itemType}_export_${new Date().toISOString().split('T')[0]}.csv`}
            className="hidden"
          />
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Deletion
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {selectedItems.length} {itemType}? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={processing}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      <AnimatePresence>
        {showConfirmEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Send Email to {selectedItems.length} Recipients
                </h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowConfirmEmail(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={processing || !emailSubject || !emailBody}
                  className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Send Email'
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