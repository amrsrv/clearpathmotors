import React, { useState, useEffect, useRef } from 'react';
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
  Users,
  FileText,
  Edit,
  Trash2,
  Upload,
  MessageSquare,
  User as UserIcon,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string | null;
  temp_user_id: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface ApplicationUpdate {
  id: string;
  application_id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  application?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface UserWithMessages {
  id: string;
  email: string;
  authUserId: string | null;
  tempUserId: string | null;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  ticketSubject?: string;
  name?: string;
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
  const [applicationUpdates, setApplicationUpdates] = useState<ApplicationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTempUserId, setSelectedTempUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithMessages[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'updates'>('notifications');

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
          if (showAllUsers && (selectedUserId || selectedTempUserId)) {
            loadNotifications(selectedUserId, selectedTempUserId);
          } else {
            loadNotifications(user?.id);
          }
        }
      )
      .subscribe();
      
    // Set up real-time subscription for activity log (application updates)
    const activityLogChannel = supabase
      .channel('activity-log-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log'
        },
        () => {
          loadApplicationUpdates();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(activityLogChannel);
    };
  }, [user?.id, showAllUsers, selectedUserId, selectedTempUserId]);

  useEffect(() => {
    if (showAllUsers) {
      loadApplicationUpdates();
    }
  }, [showAllUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get users from applications table
      const { data: applicationUsers, error: appError } = await supabase
        .from('applications')
        .select('user_id, temp_user_id, email, first_name, last_name')
        .order('created_at', { ascending: false });
        
      if (appError) throw appError;
      
      // Create a map to store unique users
      const userMap = new Map<string, UserWithMessages>();
      
      // Process application users
      applicationUsers?.forEach(app => {
        // Handle authenticated users
        if (app.user_id) {
          const userId = app.user_id;
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              id: userId,
              email: app.email || 'Unknown Email',
              authUserId: userId,
              tempUserId: null,
              name: `${app.first_name || ''} ${app.last_name || ''}`.trim() || app.email,
              unreadCount: 0,
              lastMessage: '',
              lastMessageTime: new Date().toISOString()
            });
          }
        }
        
        // Handle anonymous users
        if (app.temp_user_id) {
          const tempId = app.temp_user_id;
          if (!userMap.has(`temp_${tempId}`)) {
            userMap.set(`temp_${tempId}`, {
              id: `temp_${tempId}`,
              email: app.email || 'Anonymous User',
              authUserId: null,
              tempUserId: tempId,
              name: `${app.first_name || ''} ${app.last_name || ''}`.trim() || app.email || 'Anonymous User',
              unreadCount: 0,
              lastMessage: '',
              lastMessageTime: new Date().toISOString()
            });
          }
        }
      });
      
      // Get all notifications to count unread and get last message
      const { data: allNotifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (notifError) throw notifError;
      
      // Update user map with notification data
      allNotifications?.forEach(notification => {
        // Handle authenticated user notifications
        if (notification.user_id) {
          const userId = notification.user_id;
          if (userMap.has(userId)) {
            const user = userMap.get(userId)!;
            
            // Update unread count
            if (!notification.read) {
              user.unreadCount += 1;
            }
            
            // Update last message if this is the first one we're processing
            if (!user.lastMessage) {
              user.lastMessage = notification.message;
              user.lastMessageTime = notification.created_at;
            }
            
            userMap.set(userId, user);
          }
        }
        
        // Handle anonymous user notifications
        if (notification.temp_user_id) {
          const tempId = notification.temp_user_id;
          const mapKey = `temp_${tempId}`;
          
          if (userMap.has(mapKey)) {
            const user = userMap.get(mapKey)!;
            
            // Update unread count
            if (!notification.read) {
              user.unreadCount += 1;
            }
            
            // Update last message if this is the first one we're processing
            if (!user.lastMessage) {
              user.lastMessage = notification.message;
              user.lastMessageTime = notification.created_at;
            }
            
            userMap.set(mapKey, user);
          }
        }
      });
      
      // Get support tickets to add subject information
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('user_id, subject')
        .order('created_at', { ascending: false });
        
      if (ticketsError) {
        console.warn('Error fetching tickets (non-critical):', ticketsError);
      } else {
        // Add ticket subjects to user data
        tickets?.forEach(ticket => {
          if (ticket.user_id && userMap.has(ticket.user_id)) {
            const user = userMap.get(ticket.user_id)!;
            if (!user.ticketSubject) {
              user.ticketSubject = ticket.subject;
            }
            userMap.set(ticket.user_id, user);
          }
        });
      }
      
      // Convert map to array and sort by last message time
      const userArray = Array.from(userMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      
      setUsers(userArray);
      
      // If no user is selected and we have users, select the first one
      if (userArray.length > 0 && !selectedUserId && !selectedTempUserId) {
        const firstUser = userArray[0];
        setSelectedUserId(firstUser.authUserId);
        setSelectedTempUserId(firstUser.tempUserId);
        loadNotifications(firstUser.authUserId, firstUser.tempUserId);
      }
      
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (userId?: string | null, tempUserId?: string | null) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('notifications')
        .select('*');
        
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (tempUserId) {
        query = query.eq('temp_user_id', tempUserId);
      } else {
        // If neither ID is provided, use a fallback to prevent returning all notifications
        query = query.eq('user_id', 'no-user-found');
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setNotifications(data || []);
      
      if (showAllUsers) {
        setSelectedUserId(userId || null);
        setSelectedTempUserId(tempUserId || null);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationUpdates = async () => {
    try {
      setLoading(true);
      
      // Get application updates from activity_log
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          application:application_id(first_name, last_name, email)
        `)
        .not('is_admin_action', 'eq', true) // Only get user-initiated actions
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      setApplicationUpdates(data || []);
    } catch (error) {
      console.error('Error loading application updates:', error);
      toast.error('Failed to load application updates');
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
    if (!notificationTitle.trim() || !notificationMessage.trim() || (!selectedUserId && !selectedTempUserId)) {
      toast.error('Please fill in all fields and select a user');
      return;
    }
    
    try {
      setIsSending(true);
      
      // Prepare notification data based on whether we're sending to an authenticated or anonymous user
      const notificationData = selectedUserId 
        ? {
            user_id: selectedUserId,
            title: notificationTitle,
            message: notificationMessage,
            read: false
          }
        : {
            temp_user_id: selectedTempUserId,
            title: notificationTitle,
            message: notificationMessage,
            read: false
          };
      
      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);
        
      if (error) throw error;
      
      setNotificationTitle('');
      setNotificationMessage('');
      setShowComposer(false);
      toast.success('Notification sent successfully');
      
      // Refresh notifications
      loadNotifications(selectedUserId, selectedTempUserId);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleUserSelect = (user: UserWithMessages) => {
    setSelectedUserId(user.authUserId);
    setSelectedTempUserId(user.tempUserId);
    loadNotifications(user.authUserId, user.tempUserId);
    setShowUserSelector(false);
  };

  const formatUpdateAction = (action: string, details: any) => {
    switch (action) {
      case 'update_application':
        let changedFields = [];
        if (details.old && details.new) {
          for (const key in details.new) {
            if (details.old[key] !== details.new[key] && details.old[key] !== null && details.new[key] !== null) {
              changedFields.push(key.replace(/_/g, ' '));
            }
          }
        }
        return `updated their application${changedFields.length > 0 ? ` (changed: ${changedFields.join(', ')})` : ''}`;
      case 'upload_document':
        return `uploaded a document: ${details.category || 'file'}`;
      case 'delete_document':
        return `deleted a document: ${details.category || 'file'}`;
      case 'user_message_sent':
        return 'sent a new message';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
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

      {/* Tabs - Only show for admin view */}
      {showAllUsers && (
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </div>
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'updates'
                ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Application Updates
            </div>
          </button>
        </div>
      )}

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
                    onClick={() => handleUserSelect(u)}
                    className={`flex items-center w-full p-2 rounded-lg text-left mb-1 ${
                      (selectedUserId === u.authUserId && u.authUserId) || 
                      (selectedTempUserId === u.tempUserId && u.tempUserId)
                        ? 'bg-[#3BAA75]/10 text-[#3BAA75]'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    <span className="truncate">{u.name || u.email}</span>
                    {u.tempUserId && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                        Anonymous
                      </span>
                    )}
                    {u.unreadCount > 0 && (
                      <span className="ml-auto bg-[#3BAA75] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {u.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-2 text-gray-500">
                    <p>No users found</p>
                  </div>
                )}
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
              
              {showAllUsers && !selectedUserId && !selectedTempUserId && (
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
                    disabled={!selectedUserId && !selectedTempUserId}
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
                    disabled={!selectedUserId && !selectedTempUserId}
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
                    disabled={isSending || !notificationTitle.trim() || !notificationMessage.trim() || (!selectedUserId && !selectedTempUserId)}
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

      <AnimatePresence mode="wait">
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
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
                    p-4 rounded-lg transition-all duration-200 relative
                    ${notification.read 
                      ? 'bg-gray-50' 
                      : 'bg-gradient-to-br from-[#3BAA75]/5 to-[#3BAA75]/10 border border-[#3BAA75]/20 shadow-sm'}
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
          </motion.div>
        )}

        {activeTab === 'updates' && (
          <motion.div
            key="updates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
              </div>
            ) : applicationUpdates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No application updates yet</p>
              </div>
            ) : (
              applicationUpdates.map(update => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {update.action.includes('upload') ? (
                        <FileText className="w-5 h-5 text-blue-500" />
                      ) : update.action.includes('delete') ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : update.action.includes('message') ? (
                        <MessageSquare className="w-5 h-5 text-purple-500" />
                      ) : (
                        <Edit className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {update.application?.first_name} {update.application?.last_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {format(new Date(update.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatUpdateAction(update.action, update.details)}
                      </p>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => navigate(`/admin/applications/${update.application_id}`)}
                          className="text-xs text-[#3BAA75] hover:text-[#2D8259] font-medium flex items-center"
                        >
                          View Application
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// For TypeScript
const navigate = (path: string) => {
  window.location.href = path;
};

const ChevronRight = ({ className }: { className?: string }) => {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>;
};