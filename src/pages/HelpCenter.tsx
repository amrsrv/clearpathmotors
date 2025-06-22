import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon,
  HelpCircle,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const HelpCenter = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical Issue');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Simulate upload progress
  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 300);
    return interval;
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, or PDF file.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    
    return null;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setValidationError(null);
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const error = validateFile(file);
      
      if (error) {
        setValidationError(error);
        return;
      }
      
      setFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': []
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false
  });

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <FileIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!subject.trim()) {
      setValidationError('Subject is required');
      return;
    }
    
    if (!message.trim()) {
      setValidationError('Message is required');
      return;
    }
    
    if (!user) {
      setValidationError('You must be logged in to submit a ticket');
      return;
    }
    
    setIsSubmitting(true);
    setValidationError(null);
    
    try {
      let fileUrl = null;
      
      // If a file was uploaded, store it in Supabase Storage
      if (file) {
        const progressInterval = simulateProgress();
        
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('support-tickets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (uploadError) {
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }
        
        // Get the public URL for the uploaded file
        const { data: urlData } = await supabase.storage
          .from('support-tickets')
          .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days expiry
        
        fileUrl = urlData?.signedUrl || null;
      }
      
      // Create a new support ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject,
          category,
          message,
          file_url: fileUrl,
          status: 'open'
        })
        .select()
        .single();
      
      if (ticketError) {
        throw new Error(`Error creating ticket: ${ticketError.message}`);
      }
      
      // Create a corresponding admin message
      const { error: messageError } = await supabase
        .from('admin_messages')
        .insert({
          user_id: user.id,
          admin_id: null,
          message: `[Support Ticket: ${subject}]\n\nCategory: ${category}\n\n${message}${fileUrl ? `\n\nAttachment: ${fileUrl}` : ''}`,
          is_admin: false,
          read: false
        });
      
      if (messageError) {
        console.error('Error creating admin message:', messageError);
        // Continue even if admin message creation fails
      }
      
      // Show success message
      setIsSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubject('');
        setCategory('Technical Issue');
        setMessage('');
        setFile(null);
        setIsSuccess(false);
        setUploadProgress(0);
      }, 3000);
      
      toast.success('Support ticket submitted successfully!');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      setValidationError(error instanceof Error ? error.message : 'An error occurred while submitting your ticket');
      toast.error('Failed to submit support ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 px-4 pb-20">
      <div className="text-center mb-8">
        <HelpCircle className="h-12 w-12 text-[#3BAA75] mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-gray-600">
          Have a question or ran into an issue? Submit a ticket and we'll get back to you.
        </p>
      </div>
      
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg p-8 text-center"
          >
            <div className="mb-6 flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4">Ticket Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for reaching out. Our support team has received your ticket and will respond as soon as possible.
            </p>
            <p className="text-sm text-gray-500">
              You'll receive a notification when we respond to your ticket.
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg p-6 md:p-8"
          >
            {validationError && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="Brief description of your issue"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                  disabled={isSubmitting}
                >
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Billing">Billing</option>
                  <option value="Document Upload">Document Upload</option>
                  <option value="Application Status">Application Status</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] min-h-[150px]"
                  placeholder="Please describe your issue in detail"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachment (optional)
                </label>
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
                    ${isDragActive ? 'border-[#3BAA75] bg-[#3BAA75]/5' : 'border-gray-300 hover:border-[#3BAA75]'}
                    ${file ? 'bg-gray-50' : ''}
                  `}
                >
                  <input {...getInputProps()} disabled={isSubmitting} />
                  
                  {file ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file)}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        disabled={isSubmitting}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {isDragActive
                          ? "Drop the file here..."
                          : "Drag and drop a file here, or click to select"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        JPG, PNG or PDF up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Uploading file...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#3BAA75]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#3BAA75] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Ticket</span>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">How long will it take to get a response?</h3>
            <p className="text-gray-600 text-sm">
              We typically respond to all support tickets within 24 hours during business days. For urgent matters, please call our support line at (647) 451-3830.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">What information should I include in my ticket?</h3>
            <p className="text-gray-600 text-sm">
              Please include as much detail as possible about your issue, including any error messages, steps to reproduce, and relevant screenshots or documents.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Can I update my ticket after submission?</h3>
            <p className="text-gray-600 text-sm">
              Yes, you can reply to your ticket with additional information at any time by checking your notifications or visiting the support section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;