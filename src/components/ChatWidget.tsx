import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Image, Smile, Paperclip, Loader2, Check, ChevronDown, ChevronUp, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  read: boolean;
  attachments?: string[];
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Check if mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Load chat history when widget opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      loadChatHistory();
    }
  }, [isOpen, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Update unread count
  useEffect(() => {
    if (!isOpen && user) {
      const unreadMessages = messages.filter(
        msg => msg.role === 'assistant' && !msg.read
      );
      setUnreadCount(unreadMessages.length);
    } else {
      setUnreadCount(0);
      
      // Mark messages as read when chat is opened
      if (isOpen && messages.length > 0 && chatId) {
        const unreadMessageIds = messages
          .filter(msg => msg.role === 'assistant' && !msg.read)
          .map(msg => msg.id);
          
        if (unreadMessageIds.length > 0) {
          markMessagesAsRead(unreadMessageIds);
        }
      }
    }
  }, [isOpen, messages, user, chatId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user || !chatId) return;
    
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // If the chat is open and the message is from the assistant, mark it as read
          if (isOpen && newMessage.role === 'assistant' && !newMessage.read) {
            markMessagesAsRead([newMessage.id]);
          }
          
          // Stop typing indicator if this is an assistant message
          if (newMessage.role === 'assistant') {
            setIsTyping(false);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [chatId, user, isOpen]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Check if user has an existing chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (chatError) {
        console.error('Error loading chat:', chatError);
        return;
      }

      let currentChatId: string;

      if (chatData) {
        currentChatId = chatData.id;
      } else {
        // Create a new chat for the user
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) {
          console.error('Error creating new chat:', createError);
          return;
        }

        currentChatId = newChat.id;
        
        // Add welcome message
        await supabase
          .from('chat_messages')
          .insert({
            chat_id: currentChatId,
            user_id: user.id,
            role: 'assistant',
            content: 'Hello! How can I help you with your auto financing needs today?',
            read: false
          });
      }

      setChatId(currentChatId);
      
      // Load messages for this chat
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        return;
      }
      
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!messageIds.length) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', messageIds);
        
      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !chatId) return;

    // Clear input and show typing indicator
    setMessage('');
    setIsTyping(true);

    try {
      // Call the chatbot API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId: user.id,
          userMessage: message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      // The messages will be added via the real-time subscription
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process your message. Please try again later.",
        created_at: new Date().toISOString(),
        read: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message to database
      await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: 'assistant',
          content: errorMessage.content,
          read: false
        });
    }
  };

  const handleAttachmentClick = () => {
    if (isMobileView) {
      setShowAttachmentOptions(!showAttachmentOptions);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && chatId) {
      // Handle file upload logic here
      // For now, just acknowledge the upload
      const fileName = e.target.files[0].name;
      
      // Insert a message about the file
      supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          user_id: user?.id,
          role: 'user',
          content: `Attached file: ${fileName}`,
          read: true
        });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Close attachment options
      setShowAttachmentOptions(false);
      
      // Simulate AI response
      setTimeout(() => {
        supabase
          .from('chat_messages')
          .insert({
            chat_id: chatId,
            user_id: user?.id,
            role: 'assistant',
            content: "I've received your file. Our team will review it shortly. Is there anything else you'd like to discuss about your auto financing?",
            read: false
          });
      }, 1500);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  // Determine chat widget size based on screen size
  const chatWidgetSize = isMobileView
    ? isOpen ? 'fixed inset-0 z-50' : 'fixed bottom-4 right-4 z-50'
    : 'fixed bottom-4 right-4 z-50';

  return (
    <>
      {/* Chat Button with Notification Badge */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-[#3BAA75] text-white p-4 rounded-full shadow-lg hover:bg-[#2D8259] transition-colors z-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={chatWidgetSize}
            initial={isMobileView ? { opacity: 0, y: 100 } : { opacity: 0, y: 20, scale: 0.95 }}
            animate={isMobileView ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobileView ? { opacity: 0, y: 100 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div 
              className={`
                bg-white rounded-lg shadow-xl overflow-hidden flex flex-col
                ${isMobileView ? 'h-full w-full' : 'w-96 h-[32rem] max-h-[calc(100vh-6rem)]'}
              `}
              ref={chatContainerRef}
            >
              {/* Header */}
              <div className="bg-[#3BAA75] text-white p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white/20 rounded-full p-1.5 mr-3">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Chat with Support</h3>
                    {isTyping && (
                      <p className="text-xs text-white/80">Typing...</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {!isMobileView && (
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-1.5 hover:bg-white/10 rounded-full mr-1 transition-colors"
                      aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                    >
                      {isMinimized ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="flex-1 overflow-y-auto p-4 bg-gray-50"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 text-[#3BAA75] animate-spin" />
                      </div>
                    ) : Object.keys(groupedMessages).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start a conversation with our team</p>
                      </div>
                    ) : (
                      Object.entries(groupedMessages).map(([date, dateMessages]) => (
                        <div key={date} className="mb-6">
                          <div className="flex justify-center mb-4">
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                              {date}
                            </span>
                          </div>
                          <div className="space-y-4">
                            {dateMessages.map((msg) => (
                              <motion.div 
                                key={msg.id} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div 
                                  className={`
                                    rounded-2xl p-3 max-w-[85%] shadow-sm
                                    ${msg.role === 'user' 
                                      ? 'bg-[#3BAA75] text-white' 
                                      : 'bg-white text-gray-800 border border-gray-100'
                                    }
                                  `}
                                >
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mb-2 p-2 bg-gray-100 rounded text-xs text-gray-700 flex items-center">
                                      <Paperclip className="h-3 w-3 mr-1" />
                                      {msg.attachments[0]}
                                    </div>
                                  )}
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  <div className={`text-xs mt-1 flex items-center justify-end gap-1
                                    ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}
                                  `}>
                                    {formatTime(msg.created_at)}
                                    {msg.role === 'user' && (
                                      <span className="ml-1">
                                        <Check className="h-3 w-3" />
                                      </span>
                                    )}
                                    {msg.role === 'assistant' && msg.read && (
                                      <span className="ml-1">
                                        <Check className="h-3 w-3" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                    {isTyping && (
                      <motion.div 
                        className="flex justify-start"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="bg-white rounded-2xl p-3 shadow-sm">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Input */}
              {!isMinimized && (
                <div className="border-t border-gray-100 bg-white">
                  <AnimatePresence>
                    {showAttachmentOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-2 border-b border-gray-100 overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-50"
                          >
                            <Image className="h-6 w-6 text-[#3BAA75] mb-1" />
                            <span className="text-xs">Photo</span>
                          </button>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-50"
                          >
                            <Paperclip className="h-6 w-6 text-[#3BAA75] mb-1" />
                            <span className="text-xs">Document</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <form onSubmit={handleSubmit} className="p-3">
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
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent text-sm"
                        disabled={!user || isLoading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-gray-500 hover:text-[#3BAA75] hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Add emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      
                      <button
                        type="submit"
                        disabled={!user || isLoading || !message.trim() || isTyping}
                        className="p-2 bg-[#3BAA75] text-white rounded-full hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send message"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </div>
                    
                    {!user && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Please log in to use the chat feature
                      </p>
                    )}
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};