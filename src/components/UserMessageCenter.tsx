import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Check, 
  X, 
  User,
  ArrowLeft,
  Paperclip,
  Image
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
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

interface UserMessageCenterProps {
  userId: string;
  applicationId: string;
}

export const UserMessageCenter: React.FC<UserMessageCenterProps> = ({ userId, applicationId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Set up real-time subscription for messages
    const messagesChannel = supabase
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_messages',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add the new message to our state
            setMessages(prev => [...prev, payload.new as Message]);
            
            // If it's an admin message, mark it as read when we're viewing it
            if ((payload.new as Message).is_admin) {
              markMessageAsRead(payload.new.id);
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, applicationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark admin messages as read
      const unreadAdminMessages = data?.filter(m => m.is_admin && !m.read) || [];
      if (unreadAdminMessages.length > 0) {
        await markMessagesAsRead(unreadAdminMessages.map(m => m.id));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true })
        .eq('id', messageId);
        
      if (error) throw error;
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true })
        .in('id', messageIds);
        
      if (error) throw error;
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.id) ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;
    
    try {
      setSendingMessage(true);
      
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: userId,
          application_id: applicationId,
          message: messageText,
          is_admin: false,
          read: false
        });
        
      if (error) throw error;
      
      setMessageText('');
      toast.success('Message sent');
      
      // Refresh messages
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAttachmentClick = () => {
    setShowAttachmentOptions(!showAttachmentOptions);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // In a real implementation, you would upload the file to storage
      // For now, just acknowledge the upload with a message
      const fileName = e.target.files[0].name;
      
      toast.success(`File "${fileName}" selected. File upload feature coming soon.`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Close attachment options
      setShowAttachmentOptions(false);
    }
  };

  // Group messages by date
  const groupedMessages: Record<string, Message[]> = {};
  messages.forEach(message => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Message Center</h2>
        <p className="text-sm text-gray-600">
          Communicate with our support team about your application
        </p>
      </div>
      
      <div className="h-[400px] flex flex-col">
        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation with our team</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="space-y-4">
                  <div className="flex justify-center mb-2">
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {formatDate(date)}
                    </span>
                  </div>
                  
                  {dateMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`
                          rounded-lg p-3 max-w-[80%] shadow-sm
                          ${message.is_admin 
                            ? 'bg-white border border-gray-200 text-gray-700' 
                            : 'bg-[#3BAA75] text-white'
                          }
                        `}
                      >
                        {message.is_admin && (
                          <div className="flex items-center mb-1">
                            <div className="bg-[#3BAA75]/10 rounded-full p-1 mr-2">
                              <User className="h-3 w-3 text-[#3BAA75]" />
                            </div>
                            <span className="text-xs font-medium text-[#3BAA75]">Support Team</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                        <div className={`flex items-center justify-end mt-1 text-xs ${
                          message.is_admin ? 'text-gray-400' : 'text-white/70'
                        }`}>
                          <span>{format(new Date(message.created_at), 'h:mm a')}</span>
                          {!message.is_admin && (
                            <span className="ml-1">
                              {message.read ? (
                                <div className="relative">
                                  <Check className="h-3 w-3 absolute" />
                                  <Check className="h-3 w-3 ml-0.5" />
                                </div>
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <AnimatePresence>
            {showAttachmentOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100"
                  >
                    <Image className="h-6 w-6 text-[#3BAA75] mb-1" />
                    <span className="text-xs">Photo</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100"
                  >
                    <Paperclip className="h-6 w-6 text-[#3BAA75] mb-1" />
                    <span className="text-xs">Document</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAttachmentClick}
              className="p-2 text-gray-500 hover:text-[#3BAA75] hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sendingMessage || !messageText.trim()}
              className="p-2 bg-[#3BAA75] text-white rounded-full hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {sendingMessage ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
          </div>
        </div>
      </div>
    </div>
  );
};