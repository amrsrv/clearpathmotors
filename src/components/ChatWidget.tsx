import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Image, Smile, Paperclip, Loader2, Check, ChevronDown, ChevronUp, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

// Utility function to validate UUID format
function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Fallback UUID to use when an invalid UUID is detected
const FALLBACK_UUID = '00000000-0000-0000-0000-000000000000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  read: boolean;
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
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Generate or retrieve anonymousId for non-authenticated users
  useEffect(() => {
    if (!user) {
      // First check if we have a tempUserId from the standardized location
      const storedTempUserId = localStorage.getItem('tempUserId');
      if (storedTempUserId && isUuid(storedTempUserId)) {
        console.log('ChatWidget: Using stored tempUserId:', storedTempUserId);
        setAnonymousId(storedTempUserId);
        return;
      }
      
      // Fall back to the chat-specific anonymousId if needed
      const chatAnonymousId = localStorage.getItem('chatAnonymousId');
      if (chatAnonymousId && isUuid(chatAnonymousId)) {
        console.log('ChatWidget: Using stored chatAnonymousId:', chatAnonymousId);
        setAnonymousId(chatAnonymousId);
      } else {
        // Generate a new UUID and store it
        const newAnonymousId = uuidv4();
        console.log('ChatWidget: Generated new anonymousId:', newAnonymousId);
        localStorage.setItem('tempUserId', newAnonymousId);
        localStorage.setItem('chatAnonymousId', newAnonymousId); // For backward compatibility
        setAnonymousId(newAnonymousId);
      }
    }
  }, [user]);

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

  // Load chat history when widget opens or user/anonymousId changes
  useEffect(() => {
    if (isOpen && (user || anonymousId)) {
      loadChatHistory();
    }
  }, [isOpen, user, anonymousId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Update unread count
  useEffect(() => {
    if (!isOpen && (user || anonymousId)) {
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
  }, [isOpen, messages, user, anonymousId, chatId]);

  const loadChatHistory = async () => {
    if (!user && !anonymousId) return;
    
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('chat_messages')
        .select('*');
        
      if (user && isUuid(user.id)) {
        // For authenticated users
        query = query.eq('user_id', user.id);
      } else if (anonymousId && isUuid(anonymousId)) {
        // For anonymous users
        query = query.eq('anonymous_id', anonymousId);
      } else {
        // Use fallback to prevent database error
        query = query.eq('user_id', FALLBACK_UUID);
      }
      
      const { data: messagesData, error: messagesError } = await query
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        console.error('Error loading chat messages:', messagesError);
        return;
      }
      
      if (messagesData && messagesData.length > 0) {
        setMessages(messagesData);
        setChatId(messagesData[0].chat_id);
      } else {
        // Check if user has an existing chat
        let chatQuery = supabase.from('chats').select('id');
        
        if (user && isUuid(user.id)) {
          chatQuery = chatQuery.eq('user_id', user.id);
        } else if (anonymousId && isUuid(anonymousId)) {
          chatQuery = chatQuery.eq('anonymous_id', anonymousId);
        } else {
          // Use fallback to prevent database error
          chatQuery = chatQuery.eq('user_id', FALLBACK_UUID);
        }
        
        const { data: chatData, error: chatError } = await chatQuery.maybeSingle();
        
        if (chatError) {
          console.error('Error checking for existing chat:', chatError);
          return;
        }
        
        if (chatData) {
          setChatId(chatData.id);
        } else {
          // Create a new chat
          const { data: newChat, error: createError } = await supabase
            .from('chats')
            .insert({ 
              user_id: user?.id || null,
              anonymous_id: !user ? anonymousId : null
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating new chat:', createError);
            return;
          }
          
          setChatId(newChat.id);
          
          // Add welcome message
          const welcomeMessage = {
            id: uuidv4(),
            chat_id: newChat.id,
            user_id: user?.id || null,
            anonymous_id: !user ? anonymousId : null,
            role: 'assistant' as const,
            content: 'Hello! How can I help you with your auto financing needs today?',
            created_at: new Date().toISOString(),
            read: false
          };
          
          const { error: welcomeError } = await supabase
            .from('chat_messages')
            .insert(welcomeMessage);
            
          if (welcomeError) {
            console.error('Error adding welcome message:', welcomeError);
          } else {
            setMessages([welcomeMessage]);
          }
        }
      }
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
    if (!message.trim() || !chatId || (!user && !anonymousId)) return;

    // Generate a unique ID for this message
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create user message object
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content: message,
      created_at: timestamp,
      read: true
    };

    // Update UI immediately
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    try {
      // Save user message to database
      await supabase
        .from('chat_messages')
        .insert({
          id: messageId,
          chat_id: chatId,
          user_id: user?.id || null,
          anonymous_id: !user ? anonymousId : null,
          role: 'user',
          content: message,
          read: true
        });

      // Call the chatbot API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId: user?.id || null,
          anonymousId: !user ? anonymousId : null,
          userMessage: message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();
      
      // Simulate typing delay for a more natural feel
      setTimeout(() => {
        setIsTyping(false);
        
        // Fetch the latest messages to ensure we have the assistant's response
        loadChatHistory();
      }, 500 + Math.random() * 500); // Random delay between 500-1000ms
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);
      
      // Add error message
      const errorResponse: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process your message. Please try again later.",
        created_at: new Date().toISOString(),
        read: false
      };
      
      setMessages(prev => [...prev, errorResponse]);
      
      // Save error message to database
      await supabase
        .from('chat_messages')
        .insert({
          id: errorResponse.id,
          chat_id: chatId,
          user_id: user?.id || null,
          anonymous_id: !user ? anonymousId : null,
          role: 'assistant',
          content: errorResponse.content,
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
    if (e.target.files && e.target.files.length > 0) {
      // Handle file upload logic here
      // For now, just acknowledge the upload
      const fileName = e.target.files[0].name;
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Close attachment options
      setShowAttachmentOptions(false);
      
      // Send a message about the file
      setMessage(`I'd like to share a file: ${fileName}`);
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
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  <div className={`text-xs mt-1 flex items-center justify-end gap-1
                                    ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}
                                  `}>
                                    {formatTime(msg.created_at)}
                                    {msg.role === 'user' && (
                                      <Check className="h-3 w-3" />
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
                        disabled={isLoading}
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
                        disabled={isLoading || !message.trim()}
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