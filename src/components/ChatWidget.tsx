import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize userId from localStorage or create a new one
  useEffect(() => {
    const storedUserId = localStorage.getItem('chatUserId');
    const { data: { user } } = supabase.auth.getUser();
    
    if (user) {
      // Use authenticated user ID
      setUserId(user.id);
      localStorage.setItem('chatUserId', user.id);
    } else if (storedUserId) {
      // Use stored anonymous ID
      setUserId(storedUserId);
    } else {
      // Create new anonymous ID
      const newUserId = uuidv4();
      setUserId(newUserId);
      localStorage.setItem('chatUserId', newUserId);
    }
  }, []);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('messages')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data && data.messages) {
          setMessages(data.messages);
        } else {
          // Create a welcome message if no chat history exists
          const welcomeMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: "Hello! I'm your Clearpath Motors assistant. How can I help you with your auto financing needs today?",
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
          
          // Save welcome message to database
          await supabase
            .from('chats')
            .insert({
              user_id: userId,
              messages: [welcomeMessage]
            });
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    
    if (userId) {
      loadChatHistory();
    }
  }, [userId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !userId) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Call the chatbot Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId,
          userMessage: message
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process your request at this time.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save updated messages to database
      const updatedMessages = [...messages, userMessage, assistantMessage];
      await supabase
        .from('chats')
        .upsert({
          user_id: userId,
          messages: updatedMessages
        });
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-[#3BAA75] text-white p-4 rounded-full shadow-lg hover:bg-[#2D8259] transition-colors z-50"
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 w-80 md:w-96 bg-white rounded-lg shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-[#3BAA75] text-white p-4 flex items-center justify-between">
              <h3 className="font-semibold">Chat with Clearpath</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-96 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-[#3BAA75] text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div
                        className={`text-xs mt-1 ${
                          msg.role === 'user' ? 'text-white/70' : 'text-gray-500'
                        } text-right`}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-[80%]">
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-[#3BAA75] mr-2" />
                        <p className="text-sm text-gray-500">Typing...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-[#3BAA75] text-white p-2 rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || !message.trim()}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};