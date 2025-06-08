import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);

  // Load chat history when widget opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      loadChatHistory();
    }
  }, [isOpen, user]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      // Check if user has an existing chat
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      if (data) {
        setChatId(data.id);
        setMessages(data.messages || []);
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

        setChatId(newChat.id);
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! How can I help you today?',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveMessages = async (updatedMessages: Message[]) => {
    if (!user || !chatId) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ messages: updatedMessages })
        .eq('id', chatId);

      if (error) {
        console.error('Error saving messages:', error);
      }
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Update UI immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMessage('');
    setIsLoading(true);

    // Save to database
    await saveMessages(updatedMessages);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        role: 'assistant',
        content: getAIResponse(message),
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, aiResponse];
      setMessages(finalMessages);
      saveMessages(finalMessages);
      setIsLoading(false);
    }, 1000);
  };

  const getAIResponse = (userMessage: string): string => {
    const lowerCaseMessage = userMessage.toLowerCase();
    
    if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
      return "Hello! How can I help you with your auto financing needs today?";
    } else if (lowerCaseMessage.includes('rate') || lowerCaseMessage.includes('interest')) {
      return "Our interest rates start at 4.99% for qualified applicants. The exact rate depends on your credit score, income, and other factors. Would you like to get pre-qualified to see your personalized rate?";
    } else if (lowerCaseMessage.includes('document') || lowerCaseMessage.includes('upload')) {
      return "You can upload your documents through your dashboard after creating an account. We typically need proof of ID, income verification, and proof of residence. Is there a specific document you have questions about?";
    } else if (lowerCaseMessage.includes('credit') || lowerCaseMessage.includes('score')) {
      return "We work with all credit situations! Even if you have bad credit or no credit history, we have special programs designed to help you get approved. Would you like to learn more about our bad credit auto loans?";
    } else if (lowerCaseMessage.includes('approve') || lowerCaseMessage.includes('qualify')) {
      return "Our pre-qualification process takes just 30 seconds and has no impact on your credit score. Click the 'Get Started' button at the top of the page to begin your application.";
    } else if (lowerCaseMessage.includes('contact') || lowerCaseMessage.includes('speak') || lowerCaseMessage.includes('call')) {
      return "You can reach our customer support team at (647) 451-3830 or email us at info@clearpathmotors.com. Our office hours are Monday to Friday, 9AM to 6PM EST.";
    } else {
      return "Thank you for your message. To better assist you, would you like to speak with one of our financing specialists? You can schedule a consultation through your dashboard or call us directly at (647) 451-3830.";
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
            <div className="h-96 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`rounded-lg p-3 max-w-[80%] ${
                        msg.role === 'user' 
                          ? 'bg-[#3BAA75]/10 text-gray-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!user || isLoading}
                  className="bg-[#3BAA75] text-white p-2 rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              {!user && (
                <p className="text-xs text-gray-500 mt-2">
                  Please log in to use the chat feature
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};