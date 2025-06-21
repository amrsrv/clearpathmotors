import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  RefreshCw, 
  Trash2, 
  FileText, 
  Send, 
  AlertCircle,
  X,
  Download,
  Mail,
  Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { CSVLink } from 'react-csv';
import toast from 'react-hot-toast';

interface BulkActionsProps {
  selectedApplications: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({ 
  selectedApplications, 
  onClearSelection,
  onActionComplete
}) => {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [exportData, setExportData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'pending_documents', label: 'Pending Documents' },
    { value: 'pre_approved', label: 'Pre-Approved' },
    { value: 'vehicle_selection', label: 'Vehicle Selection' },
    { value: 'final_approval', label: 'Final Approval' },
    { value: 'finalized', label: 'Finalized' }
  ];

  const handleDelete = async () => {
    if (selectedApplications.length === 0) return;
    
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('applications')
        .delete()
        .in('id', selectedApplications);
        
      if (error) throw error;
      
      toast.success(`${selectedApplications.length} application(s) deleted successfully`);
      onClearSelection();
      onActionComplete();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting applications:', error);
      toast.error('Failed to delete applications');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (selectedApplications.length === 0 || !newStatus) return;
    
    try {
      setIsProcessing(true);
      
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedApplications);
        
      if (updateError) throw updateError;
      
      // Get user IDs for these applications
      const { data: applications, error: fetchError } = await supabase
        .from('applications')
        .select('id, user_id')
        .in('id', selectedApplications);
        
      if (fetchError) throw fetchError;
      
      // Create notifications for users
      const notifications = applications
        .filter(app => app.user_id) // Only for applications with user_id
        .map(app => ({
          user_id: app.user_id,
          title: 'Application Status Updated',
          message: `Your application status has been updated to ${newStatus.replace(/_/g, ' ')}.`,
          read: false
        }));
        
      if (notifications.length > 0) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notifications);
          
        if (notifyError) throw notifyError;
      }
      
      // Create activity logs
      const activityLogs = selectedApplications.map(appId => ({
        application_id: appId,
        user_id: user?.id,
        action: 'bulk_status_update',
        details: {
          new_status: newStatus
        },
        is_admin_action: true
      }));
      
      await supabase
        .from('activity_log')
        .insert(activityLogs);
      
      toast.success(`${selectedApplications.length} application(s) updated successfully`);
      onClearSelection();
      onActionComplete();
      setShowStatusConfirm(false);
      setNewStatus('');
    } catch (error) {
      console.error('Error updating applications:', error);
      toast.error('Failed to update applications');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotify = async () => {
    if (selectedApplications.length === 0 || !notificationTitle.trim() || !notificationMessage.trim()) return;
    
    try {
      setIsProcessing(true);
      
      // Get user IDs for these applications
      const { data: applications, error: fetchError } = await supabase
        .from('applications')
        .select('id, user_id')
        .in('id', selectedApplications);
        
      if (fetchError) throw fetchError;
      
      // Create notifications for users
      const notifications = applications
        .filter(app => app.user_id) // Only for applications with user_id
        .map(app => ({
          user_id: app.user_id,
          title: notificationTitle,
          message: notificationMessage,
          read: false
        }));
        
      if (notifications.length > 0) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notifications);
          
        if (notifyError) throw notifyError;
      }
      
      toast.success(`Notification sent to ${notifications.length} user(s)`);
      onClearSelection();
      onActionComplete();
      setShowNotifyConfirm(false);
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (selectedApplications.length === 0) return;
    
    try {
      setIsExporting(true);
      
      // Get application data
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          province,
          postal_code,
          status,
          employment_status,
          annual_income,
          credit_score,
          vehicle_type,
          desired_monthly_payment,
          created_at
        `)
        .in('id', selectedApplications);
        
      if (error) throw error;
      
      // Format data for CSV
      const formattedData = data.map(app => ({
        ID: app.id,
        'First Name': app.first_name,
        'Last Name': app.last_name,
        Email: app.email,
        Phone: app.phone,
        Address: app.address,
        City: app.city,
        Province: app.province,
        'Postal Code': app.postal_code,
        Status: app.status.replace(/_/g, ' '),
        'Employment Status': app.employment_status?.replace(/_/g, ' '),
        'Annual Income': app.annual_income,
        'Credit Score': app.credit_score,
        'Vehicle Type': app.vehicle_type,
        'Monthly Payment': app.desired_monthly_payment,
        'Created At': new Date(app.created_at).toLocaleString()
      }));
      
      setExportData(formattedData);
      
      // Trigger download after a short delay
      setTimeout(() => {
        document.getElementById('csv-download-link')?.click();
        setIsExporting(false);
        toast.success(`${selectedApplications.length} application(s) exported successfully`);
      }, 500);
      
    } catch (error) {
      console.error('Error exporting applications:', error);
      toast.error('Failed to export applications');
      setIsExporting(false);
    }
  };

  if (selectedApplications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 flex items-center gap-4"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <CheckSquare className="h-5 w-5 text-[#3BAA75]" />
          <span className="font-medium">{selectedApplications.length} selected</span>
        </div>
        
        <div className="h-6 border-r border-gray-300"></div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatusConfirm(true)}
            className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Update Status</span>
          </button>
          
          <button
            onClick={() => setShowNotifyConfirm(true)}
            className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Notify</span>
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          
          <button
            onClick={onClearSelection}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Hidden CSV download link */}
        {exportData.length > 0 && (
          <CSVLink
            id="csv-download-link"
            data={exportData}
            filename={`applications-export-${new Date().toISOString().split('T')[0]}.csv`}
            className="hidden"
          >
            Download CSV
          </CSVLink>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Close modal when clicking outside
              if (e.target === e.currentTarget) {
                setShowDeleteConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 p-1"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Confirm Deletion</h3>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete {selectedApplications.length} application(s)? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Update Modal */}
      <AnimatePresence>
        {showStatusConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Close modal when clicking outside
              if (e.target === e.currentTarget) {
                setShowStatusConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowStatusConfirm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 p-1"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3 text-[#3BAA75] mb-4">
                <FileText className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Update Status</h3>
              </div>
              
              <p className="text-gray-700 mb-4">
                Update the status for {selectedApplications.length} selected application(s).
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                >
                  <option value="">Select Status</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStatusConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleStatusUpdate}
                  disabled={isProcessing || !newStatus}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotifyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Close modal when clicking outside
              if (e.target === e.currentTarget) {
                setShowNotifyConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowNotifyConfirm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 p-1"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3 text-[#3BAA75] mb-4">
                <Bell className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Send Notification</h3>
              </div>
              
              <p className="text-gray-700 mb-4">
                Send a notification to users of {selectedApplications.length} selected application(s).
              </p>
              
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    placeholder="Notification title..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    rows={3}
                    placeholder="Notification message..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNotifyConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleNotify}
                  disabled={isProcessing || !notificationTitle.trim() || !notificationMessage.trim()}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// For TypeScript
const Save = ({ className }: { className?: string }) => {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
};