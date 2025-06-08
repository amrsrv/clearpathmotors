import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when widget opens
  useEffect(() => {
    if (isOpen && user) {
      loadChatHistory();
    }
  }, [isOpen, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('messages')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading chat history:', error);
        return;
      }
      
      if (data?.messages && Array.isArray(data.messages)) {
        // Convert from OpenAI format to our format
        const formattedMessages: Message[] = data.messages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date()
          }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;
    
    const userMessage = message.trim();
    setMessage('');
    
    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the chatbot Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId: user.id,
          userMessage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      const { aiMessage } = await response.json();
      
      // Add AI response to chat
      const newAiMessage: Message = {
        role: 'assistant',
        content: aiMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-[#3BAA75] text-white p-4 rounded-full shadow-lg hover:bg-[#2D8259] transition-colors"
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
            className="fixed bottom-20 right-4 w-96 bg-white rounded-lg shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-[#3BAA75] text-white p-4 flex items-center justify-between">
              <h3 className="font-semibold">Chat with Support</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-96 p-4 overflow-y-auto bg-gray-50">
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm">
                    {user 
                      ? "Hi there! How can I help with your auto financing questions today?"
                      : "Please sign in to start a conversation."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`
                          flex items-start gap-2 max-w-[80%] 
                          ${msg.role === 'user' 
                            ? 'bg-[#3BAA75] text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                            : 'bg-white border border-gray-200 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                          }
                          p-3 shadow-sm
                        `}
                      >
                        {msg.role === 'assistant' && (
                          <Bot className="h-5 w-5 text-[#3BAA75] mt-1 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                            {msg.content}
                          </p>
                          <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <User className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center">
                        <Bot className="h-5 w-5 text-[#3BAA75] mr-2" />
                        <Loader2 className="h-4 w-4 text-[#3BAA75] animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Typing...</span>
                      </div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="flex justify-center">
                      <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
                        {error}
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={user ? "Type your message..." : "Please sign in to chat"}
                  disabled={!user || isLoading}
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!user || !message.trim() || isLoading}
                  className="bg-[#3BAA75] text-white p-2 rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              {!user && (
                <p className="text-xs text-center mt-2 text-gray-500">
                  Please <a href="/login" className="text-[#3BAA75] hover:underline">sign in</a> to chat with our support team
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};