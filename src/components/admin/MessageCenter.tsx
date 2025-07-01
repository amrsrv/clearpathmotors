import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Search, 
  User, 
  ChevronRight, 
  ArrowLeft,
  X,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  user_id: string;
  admin_id: string | null;
  application_id: string | null;
  message: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
}

interface UserWithMessages {
  id: string;
  email: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  ticketSubject?: string;
}

export const MessageCenter: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithMessages[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUsers();
    
    // Set up real-time subscription for messages
    const messagesChannel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_messages'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // If we're currently viewing this conversation, add the message
            if (selectedUserId === payload.new.user_id) {
              setMessages(prev => [...prev, payload.new as Message]);
            }
            
            // Refresh the user list to update unread counts
            loadUsers();
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all unique users who have messages
      const { data: messageUsers, error: messageError } = await supabase
        .from('admin_messages')
        .select('user_id, message, created_at, read, is_admin')
        .order('created_at', { ascending: false });
        
      if (messageError) throw messageError;
      
      // Get user details for these users
      if (messageUsers && messageUsers.length > 0) {
        const userIds = [...new Set(messageUsers.map(m => m.user_id))];
        
        // Get user details from applications table instead of auth API
        const { data: userDetails, error: userError } = await supabase
          .from('applications')
          .select('user_id, email, first_name, last_name')
          .in('user_id', userIds)
          .not('user_id', 'is', null);
          
        if (userError) throw userError;
        
        // Get the most recent support ticket for each user
        const { data: userTickets, error: ticketsError } = await supabase
          .from('support_tickets')
          .select('user_id, subject, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false });
          
        if (ticketsError) throw ticketsError;
        
        // Create a map of user IDs to their most recent ticket subject
        const ticketSubjectMap = new Map();
        userTickets?.forEach((ticket) => {
          if (!ticketSubjectMap.has(ticket.user_id)) {
            ticketSubjectMap.set(ticket.user_id, ticket.subject);
          }
        });
        
        // Create a map of user IDs to emails
        const userMap = new Map();
        userDetails?.forEach((u) => {
          if (u.user_id) {
            userMap.set(u.user_id, u.email);
          }
        });
        
        // Process users with messages
        const processedUsers: UserWithMessages[] = [];
        userIds.forEach(userId => {
          const userMessages = messageUsers.filter(m => m.user_id === userId);
          const lastMessage = userMessages[0]; // First message (most recent)
          const unreadCount = userMessages.filter(m => !m.read && !m.is_admin).length;
          
          if (userMap.has(userId)) {
            processedUsers.push({
              id: userId,
              email: userMap.get(userId) || 'Unknown User',
              unreadCount,
              lastMessage: lastMessage.message,
              lastMessageTime: lastMessage.created_at,
              ticketSubject: ticketSubjectMap.get(userId)
            });
          }
        });
        
        setUsers(processedUsers);
      }
    } catch (error) {
      console.error('Error loading users with messages:', error);
      toast.error('Failed to load message history');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string, userEmail: string) => {
    try {
      setLoading(true);
      setSelectedUserId(userId);
      setSelectedUserEmail(userEmail);
      
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark messages as read
      const unreadMessages = data?.filter(m => !m.read && !m.is_admin) || [];
      if (unreadMessages.length > 0) {
        await supabase
          .from('admin_messages')
          .update({ read: true })
          .in('id', unreadMessages.map(m => m.id));
          
        // Refresh user list to update unread counts
        loadUsers();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUserId || !messageText.trim() || !user) return;
    
    try {
      setSendingMessage(true);
      
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: selectedUserId,
          admin_id: user.id,
          message: messageText,
          is_admin: true,
          read: false
        });
        
      if (error) throw error;
      
      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedUserId,
          title: 'New Message from Support',
          message: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
          read: false
        });
      
      setMessageText('');
      toast.success('Message sent');
      
      // Refresh messages
      loadMessages(selectedUserId, selectedUserEmail);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex h-[600px]">
        {/* Users List */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 ${selectedUserId ? 'hidden md:block' : 'block'}`}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto h-[calc(600px-73px)]">
            {loading && !selectedUserId ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => loadMessages(user.id, user.email)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-[#3BAA75] text-white rounded-full w-10 h-10 flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                          <div className="font-medium">{user.ticketSubject || user.email}</div>
                          <div className="text-sm text-gray-500 truncate max-w-[180px]">
                            {user.lastMessage}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-500">
                          {format(new Date(user.lastMessageTime), 'MMM d')}
                        </div>
                        {user.unreadCount > 0 && (
                          <div className="bg-[#3BAA75] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mt-1">
                            {user.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Messages */}
        <div className={`w-full md:w-2/3 flex flex-col ${selectedUserId ? 'block' : 'hidden md:block'}`}>
          {selectedUserId ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden mr-2 text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">
                    {users.find(u => u.id === selectedUserId)?.ticketSubject || selectedUserEmail}
                  </h2>
                  <p className="text-xs text-gray-500">{selectedUserEmail}</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start a conversation</p>
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
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.message}</p>
                          <div className="flex items-center justify-end mt-1 text-xs opacity-80">
                            <span>{format(new Date(message.created_at), 'h:mm a')}</span>
                            {message.is_admin && (
                              <span className="ml-1">
                                {message.read ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3 opacity-50" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75] resize-none"
                    placeholder="Type your message..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !messageText.trim()}
                    className="ml-2 p-3 bg-[#3BAA75] text-white rounded-full hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {sendingMessage ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
              <p>Select a conversation</p>
              <p className="text-sm mt-1">Or search for a user to message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};