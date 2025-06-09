import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  FileText,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface EmailComposerProps {
  recipientId: string;
  recipientEmail: string;
  applicationId?: string;
  onEmailSent?: () => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  recipientId,
  recipientEmail,
  applicationId,
  onEmailSent
}) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject);
      setBody(selectedTemplate.body);
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    // In a real implementation, this would load from the database
    // For now, we'll use mock data
    const mockTemplates: EmailTemplate[] = [
      {
        id: '1',
        name: 'Welcome Email',
        subject: 'Welcome to Clearpath Motors!',
        body: 'Dear Customer,\n\nThank you for choosing Clearpath Motors for your auto financing needs. We are excited to help you on your journey to vehicle ownership.\n\nYour application has been received and is currently being processed. Our team will be in touch shortly with next steps.\n\nBest regards,\nThe Clearpath Motors Team'
      },
      {
        id: '2',
        name: 'Document Request',
        subject: 'Action Required: Documents Needed for Your Application',
        body: 'Dear Customer,\n\nWe need a few additional documents to proceed with your auto financing application. Please log in to your dashboard and upload the following:\n\n1. Proof of income (recent pay stubs)\n2. Proof of residence (utility bill)\n3. Valid government ID\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\nThe Clearpath Motors Team'
      },
      {
        id: '3',
        name: 'Application Approved',
        subject: 'Congratulations! Your Application is Approved',
        body: 'Dear Customer,\n\nGreat news! Your auto financing application has been approved. You are now ready to select your vehicle.\n\nPlease log in to your dashboard to view your approved loan amount and next steps.\n\nBest regards,\nThe Clearpath Motors Team'
      }
    ];
    
    setTemplates(mockTemplates);
  };

  const handleSendEmail = async () => {
    if (!user || !subject || !body) return;
    
    try {
      setSending(true);
      setError(null);
      
      // In a real implementation, this would send an email through an API
      // For now, we'll simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a record of the email in the database
      if (applicationId) {
        const { error: logError } = await supabase
          .from('activity_log')
          .insert({
            application_id: applicationId,
            user_id: recipientId,
            admin_id: user.id,
            action: 'send_email',
            details: {
              subject,
              recipientEmail,
              timestamp: new Date().toISOString()
            },
            is_admin_action: true,
            is_visible_to_user: false
          });
          
        if (logError) throw logError;
      }
      
      // Create notification for recipient
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          title: 'New Email from Clearpath Motors',
          message: `You have received an email: ${subject}`,
          read: false
        });
        
      if (notificationError) throw notificationError;
      
      setSuccess(true);
      toast.success('Email sent successfully');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSubject('');
        setBody('');
        setSuccess(false);
        setSelectedTemplate(null);
        
        if (onEmailSent) {
          onEmailSent();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error sending email:', error);
      setError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Mail className="h-5 w-5 text-[#3BAA75] mr-2" />
          Send Email
        </h3>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-[#3BAA75] hover:text-[#2D8259] flex items-center gap-1"
        >
          <FileText className="h-4 w-4" />
          {showTemplates ? 'Hide Templates' : 'Show Templates'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>Email sent successfully</span>
        </div>
      )}

      <div className="space-y-4">
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Email Templates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-3 text-left rounded-lg border-2 transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-[#3BAA75] bg-[#3BAA75]/5'
                        : 'border-gray-200 hover:border-[#3BAA75]/50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-500 truncate">{template.subject}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="email"
            value={recipientEmail}
            readOnly
            className="w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSendEmail}
            disabled={!subject || !body || sending}
            className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
          >
            {sending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
};