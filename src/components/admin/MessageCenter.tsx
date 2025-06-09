import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  User, 
  X, 
  RefreshCw, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

interface Message {
  id: string;
  admin_id: string | null;
  user_id: string | null;
  application_id: string | null;
  message: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
}

interface MessageCenterProps {
  applicationId?: string;
  userId?: string;
}

export const MessageCenter: React.FC<MessageCenterProps> = ({ applicationId, userId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && (applicationId || userId)) {
      loadMessages();
    }
  }, [isOpen, applicationId, userId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !applicationId && !userId) {
      loadUsers();
    }
  }, [isOpen, applicationId, userId]);

  useEffect(() => {
    if (searchTerm && !applicationId && !userId) {
      searchUsers();
    }
  }, [searchTerm]);

  const loadMessages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (applicationId) {
        query = query.eq('application_id', applicationId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (selectedUser) {
        query = query.eq('user_id', selectedUser.id);
      } else {
        setLoading(false);
        return;
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark messages as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter(m => !m.read && !m.is_admin);
        if (unreadMessages.length > 0) {
          await supabase
            .from('admin_messages')
            .update({ read: true })
            .in('id', unreadMessages.map(m => m.id));
        }
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .limit(10);

      if (error) throw error;
      
      setFilteredUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!user || !searchTerm) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      
      setFilteredUsers(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    
    try {
      setSending(true);
      
      const messageData = {
        admin_id: user.id,
        user_id: userId || selectedUser?.id || null,
        application_id: applicationId || null,
        message: newMessage.trim(),
        is_admin: true,
        read: false
      };
      
      const { data, error } = await supabase
        .from('admin_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      
      // Create notification for user
      if (userId || selectedUser?.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId || selectedUser?.id,
            title: 'New Message from Admin',
            message: 'You have received a new message from the admin team.',
            read: false
          });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setSearchTerm('');
    loadMessages();
  };

  return (
    <div className="relative">
      {/* Message Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative"
        aria-label="Messages"
      >
        <MessageSquare className="h-6 w-6" />
        {messages.some(m => !m.read && !m.is_admin) && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {/* Message Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50"
              style={{ maxHeight: 'calc(100vh - 200px)', width: '350px' }}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {applicationId ? 'Application Messages' : 
                   userId ? 'User Messages' : 
                   selectedUser ? `Chat with ${selectedUser.email}` : 'Messages'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!applicationId && !userId && !selectedUser ? (
                <div className="p-4">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto max-h-[300px]">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p>No users found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => selectUser(user)}
                            className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center"
                          >
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-medium text-gray-900 truncate">{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                      </div>
                    ) : error ? (
                      <div className="p-4 text-center text-red-600">
                        <p>{error}</p>
                        <button
                          onClick={loadMessages}
                          className="mt-2 text-sm text-[#3BAA75] hover:text-[#2D8259]"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`rounded-lg p-3 max-w-[80%] ${
                                message.is_admin
                                  ? 'bg-[#3BAA75] text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              <div className="text-xs mt-1 flex justify-end opacity-80">
                                {format(new Date(message.created_at), 'h:mm a')}
                                {message.is_admin && message.read && (
                                  <Check className="ml-1 h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-200">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-l-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="bg-[#3BAA75] text-white p-2 rounded-r-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};