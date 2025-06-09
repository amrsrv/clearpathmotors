import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Search,
  Send,
  X,
  User,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  showAllUsers?: boolean;
  onMarkAsRead?: (id: string) => Promise<void>;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  showAllUsers = false,
  onMarkAsRead
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    if (showAllUsers) {
      loadUsers();
    } else {
      loadNotifications(user?.id);
    }
    
    // Set up real-time subscription for notifications
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: showAllUsers ? undefined : `user_id=eq.${user?.id}`
        },
        () => {
          if (showAllUsers && selectedUserId) {
            loadNotifications(selectedUserId);
          } else {
            loadNotifications(user?.id);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [user?.id, showAllUsers, selectedUserId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get users from applications table instead of auth API
      const { data, error } = await supabase
        .from('applications')
        .select('user_id, email, first_name, last_name')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Filter out duplicates and format user data
      const uniqueUsers = Array.from(
        new Map(data?.map(item => [item.user_id, item]).filter(item => item[0] !== null))
        .values()
      );
      
      setUsers(uniqueUsers.map(u => ({
        id: u.user_id,
        email: u.email,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      })));
      
      // If no user is selected, select the first one
      if (uniqueUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(uniqueUsers[0].user_id);
        loadNotifications(uniqueUsers[0].user_id);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (userId: string | undefined) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      // If parent component provided a handler, use it
      if (onMarkAsRead) {
        await onMarkAsRead(id);
        return;
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim() || !selectedUserId) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      setIsSending(true);
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedUserId,
          title: notificationTitle,
          message: notificationMessage,
          read: false
        });
        
      if (error) throw error;
      
      setNotificationTitle('');
      setNotificationMessage('');
      setShowComposer(false);
      toast.success('Notification sent successfully');
      
      // Refresh notifications
      loadNotifications(selectedUserId);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    loadNotifications(userId);
    setShowUserSelector(false);
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="ml-2 bg-[#3BAA75] text-white px-2 py-1 rounded-full text-sm">
              {unreadCount} new
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showAllUsers && (
            <button
              onClick={() => setShowUserSelector(!showUserSelector)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Users className="h-5 w-5" />
            </button>
          )}
          
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            {showComposer ? <X className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* User Selector Dropdown */}
      <AnimatePresence>
        {showUserSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
                />
              </div>
              
              <div className="max-h-40 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u.id)}
                    className={`flex items-center w-full p-2 rounded-lg text-left mb-1 ${
                      selectedUserId === u.id
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span className="truncate">{u.name || u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-3">Send New Notification</h3>
              
              {showAllUsers && !selectedUserId && (
                <div className="mb-3 p-3 bg-amber-50 text-amber-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Please select a user first</span>
                </div>
              )}
              
              <div className="space-y-3">
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
                    disabled={!selectedUserId}
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
                    disabled={!selectedUserId}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowComposer(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleSendNotification}
                    disabled={isSending || !notificationTitle.trim() || !notificationMessage.trim() || !selectedUserId}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {isSending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  p-4 rounded-lg transition-colors
                  ${notification.read ? 'bg-gray-50' : 'bg-[#3BAA75]/5 border border-[#3BAA75]/10'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {notification.title.includes('Approved') ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : notification.title.includes('Rejected') ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Info className="w-5 h-5 text-[#3BAA75]" />
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
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-[#3BAA75] hover:text-[#2D8259] font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};