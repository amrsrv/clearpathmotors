import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, AlertCircle, Info, Trash2, Check, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { Notification } from '../types/database';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

// Utility function to validate UUID format
function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Fallback UUID to use when an invalid UUID is detected
const FALLBACK_UUID = '00000000-0000-0000-0000-000000000000';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onNavigate?: (section: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onMarkAsRead,
  onNavigate
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setIsMarkingAllAsRead(true);
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      // Update all notifications in the array
      for (const id of unreadIds) {
        await onMarkAsRead(id);
      }
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    
    setIsClearingAll(true);
    try {
      const notificationIds = notifications.map(n => n.id);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
        
      if (error) throw error;
      
      toast.success('All notifications cleared');
      // This will trigger a reload of notifications in the parent component
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setIsClearingAll(false);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'unread') return !notification.read;
    if (filterType === 'read') return notification.read;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259]">Notifications</h2>
          {unreadCount > 0 && (
            <span className="ml-2 bg-[#3BAA75] text-white px-2 py-1 rounded-full text-sm">
              {unreadCount} new
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Filter notifications"
          >
            <Filter className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAllAsRead}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Mark all as read"
          >
            {isMarkingAllAsRead ? (
              <div className="h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </button>
          
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0 || isClearingAll}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear all notifications"
          >
            {isClearingAll ? (
              <div className="h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-gray-50 p-3 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Filter by:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      filterType === 'all' 
                        ? 'bg-[#3BAA75] text-white shadow-sm' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('unread')}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      filterType === 'unread' 
                        ? 'bg-[#3BAA75] text-white shadow-sm' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setFilterType('read')}
                    className={`px-3 py-1.5 text-xs rounded-full ${
                      filterType === 'read' 
                        ? 'bg-[#3BAA75] text-white shadow-sm' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Read
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  p-4 rounded-xl transition-all duration-200 relative
                  ${notification.read 
                    ? 'bg-gray-50 border border-gray-100' 
                    : 'bg-gradient-to-br from-[#3BAA75]/5 to-[#3BAA75]/10 border border-[#3BAA75]/20 shadow-sm'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {notification.title.includes('Approved') ? (
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    ) : notification.title.includes('Rejected') ? (
                      <div className="p-2 bg-red-100 rounded-full">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                    ) : (
                      <div className="p-2 bg-[#3BAA75]/10 rounded-full">
                        <Info className="w-5 h-5 text-[#3BAA75]" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="text-xs text-[#3BAA75] hover:text-[#2D8259] font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Quick action buttons */}
                {notification.title.includes('Document') && onNavigate && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => onNavigate('documents')}
                      className="text-xs bg-[#3BAA75]/10 text-[#3BAA75] px-3 py-1.5 rounded-lg hover:bg-[#3BAA75]/20 transition-colors"
                    >
                      View Documents
                    </button>
                  </div>
                )}
                
                {notification.title.includes('Message') && onNavigate && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => onNavigate('messages')}
                      className="text-xs bg-[#3BAA75]/10 text-[#3BAA75] px-3 py-1.5 rounded-lg hover:bg-[#3BAA75]/20 transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                )}
                
                {notification.title.includes('Application') && onNavigate && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => onNavigate('overview')}
                      className="text-xs bg-[#3BAA75]/10 text-[#3BAA75] px-3 py-1.5 rounded-lg hover:bg-[#3BAA75]/20 transition-colors"
                    >
                      View Application
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};