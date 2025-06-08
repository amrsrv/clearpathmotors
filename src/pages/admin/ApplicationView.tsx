import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  User, Mail, Phone, Calendar, MapPin, Building, Briefcase, DollarSign,
  Home, Car, CreditCard, FileText, CheckCircle, AlertCircle, ChevronRight,
  ChevronLeft, Info, Heart, Shield, HelpCircle, ArrowRight, Clock, X,
  Check, RefreshCw, Edit2, Send, Download, Trash2, MessageSquare, Bell,
  FileCheck, ArrowUpRight, Wallet, CalendarClock, PieChart, BarChart
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { DocumentManager } from '../../components/DocumentManager';
import { DocumentUpload } from '../../components/DocumentUpload';
import { ApplicationTracker } from '../../components/ApplicationTracker';

// Define lender categories and options
const LENDERS = {
  aLenders: [
    { id: 'td', name: 'TD Auto Finance (TD Wheels)' },
    { id: 'rbc', name: 'RBC Royal Bank' },
    { id: 'scotiabank', name: 'Scotiabank' },
    { id: 'bmo', name: 'BMO Bank of Montreal' },
    { id: 'cibc', name: 'CIBC' },
    { id: 'national', name: 'National Bank of Canada' }
  ],
  creditUnions: [
    { id: 'alterna', name: 'Alterna Bank' },
    { id: 'meridian', name: 'Meridian Credit Union' },
    { id: 'versabank', name: 'VersaBank' },
    { id: 'manulife', name: 'Manulife Bank' },
    { id: 'canadiantire', name: 'Canadian Tire Bank' }
  ],
  bLenders: [
    { id: 'lendcare', name: 'LendCare (by goeasy)' },
    { id: 'ia', name: 'iA Auto Finance' },
    { id: 'edenpark', name: 'EdenPark' },
    { id: 'northlake', name: 'Northlake Financial' },
    { id: 'autocapital', name: 'AutoCapital Canada' },
    { id: 'rifco', name: 'Rifco National Auto Finance' },
    { id: 'axis', name: 'Axis Auto Finance' },
    { id: 'dealerhop', name: 'Dealerhop' }
  ]
};

// Define application status options
const APPLICATION_STATUSES = [
  { value: 'pending_documents', label: 'Pending Documents' },
  { value: 'pre_approved', label: 'Pre-Approved' },
  { value: 'vehicle_selection', label: 'Vehicle Selection' },
  { value: 'final_approval', label: 'Final Approval' },
  { value: 'finalized', label: 'Finalized' }
];

const ApplicationView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSendToLender, setShowSendToLender] = useState(false);
  const [selectedLender, setSelectedLender] = useState('');
  const [lenderNote, setLenderNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [assignedAdmin, setAssignedAdmin] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadApplicationData();
      loadAdminUsers();
    }
  }, [id]);
  
  const loadApplicationData = async () => {
    try {
      setLoading(true);
      
      // Fetch application data
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
        
      if (appError) throw appError;
      if (!appData) throw new Error('Application not found');
      
      setApplication(appData);
      setAssignedAdmin(appData.assigned_to_admin_id);
      
      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (docsError) throw docsError;
      setDocuments(docsData || []);
      
      // Fetch application stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', id)
        .order('stage_number', { ascending: true });
        
      if (stagesError) throw stagesError;
      setStages(stagesData || []);
      
      // Fetch activity log
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });
        
      if (activityError) throw activityError;
      setActivityLog(activityData || []);
      
      // Fetch flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('application_flags')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });
        
      if (flagsError) throw flagsError;
      setFlags(flagsData || []);
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
      
      // Calculate financial metrics
      calculateFinancialMetrics(appData);
      
      setError(null);
    } catch (error: any) {
      console.error('Error loading application data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadAdminUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Fetch admin users
      const { data, error } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('raw_app_meta_data->>is_admin', 'true');
        
      if (error) throw error;
      
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };
  
  const calculateFinancialMetrics = (appData: any) => {
    // Calculate total monthly income
    const monthlyIncome = parseFloat(appData.monthly_income) || 0;
    const otherIncome = parseFloat(appData.other_income) || 0;
    const totalIncome = monthlyIncome + otherIncome;
    
    // Calculate government benefits income if available
    let benefitsIncome = 0;
    if (appData.disability_programs && Array.isArray(appData.disability_programs)) {
      benefitsIncome = appData.disability_programs.reduce((sum: number, program: any) => {
        return sum + (parseFloat(program.amount) || 0);
      }, 0);
    }
    
    // Calculate total debt obligations (housing payment for now)
    const housingPayment = parseFloat(appData.housing_payment) || 0;
    
    // Estimate other debt payments (this would be more accurate with actual credit report data)
    const estimatedOtherDebt = totalIncome * 0.15; // Rough estimate of 15% of income going to other debts
    
    const totalDebt = housingPayment + estimatedOtherDebt;
    
    // Calculate net disposable income
    const netDisposable = totalIncome + benefitsIncome - totalDebt;
    
    // Calculate debt-to-income ratio
    const dti = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;
    
    // Calculate loan-to-income ratio
    const loanAmount = parseFloat(appData.desired_loan_amount) || 0;
    const lti = totalIncome > 0 ? (loanAmount / (totalIncome * 12)) * 100 : 0;
    
    // Set financial metrics
    setFinancialMetrics({
      totalMonthlyIncome: totalIncome,
      benefitsIncome: benefitsIncome,
      totalIncome: totalIncome + benefitsIncome,
      housingPayment: housingPayment,
      estimatedOtherDebt: estimatedOtherDebt,
      totalDebtObligations: totalDebt,
      netDisposableIncome: netDisposable,
      debtToIncomeRatio: dti,
      loanToIncomeRatio: lti,
      // Risk assessment
      incomeRisk: totalIncome < 3000 ? 'high' : totalIncome < 5000 ? 'medium' : 'low',
      dtiRisk: dti > 43 ? 'high' : dti > 36 ? 'medium' : 'low',
      ltiRisk: lti > 50 ? 'high' : lti > 30 ? 'medium' : 'low',
      overallRisk: calculateOverallRisk(dti, lti, appData)
    });
  };
  
  const calculateOverallRisk = (dti: number, lti: number, appData: any) => {
    let riskScore = 0;
    
    // DTI risk
    if (dti > 43) riskScore += 3;
    else if (dti > 36) riskScore += 2;
    else if (dti > 30) riskScore += 1;
    
    // LTI risk
    if (lti > 50) riskScore += 3;
    else if (lti > 30) riskScore += 2;
    else if (lti > 20) riskScore += 1;
    
    // Employment stability risk
    if (appData.employment_status === 'unemployed') riskScore += 3;
    else if (appData.employment_status === 'self_employed') riskScore += 1;
    
    if (appData.employment_duration === 'less_than_6_months') riskScore += 2;
    else if (appData.employment_duration === '6_months_to_1_year') riskScore += 1;
    
    // Housing stability risk
    if (appData.residence_duration === 'less_than_6_months') riskScore += 2;
    else if (appData.residence_duration === '6_months_to_1_year') riskScore += 1;
    
    // Debt discharge history risk
    if (appData.has_debt_discharge_history) {
      if (appData.debt_discharge_status === 'active') riskScore += 3;
      else if (appData.debt_discharge_status === 'discharged') {
        const dischargeYear = parseInt(appData.debt_discharge_year) || 0;
        const currentYear = new Date().getFullYear();
        if (currentYear - dischargeYear < 2) riskScore += 2;
        else if (currentYear - dischargeYear < 5) riskScore += 1;
      }
    }
    
    // Determine overall risk
    if (riskScore >= 7) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  };
  
  const handleStatusChange = async () => {
    if (!newStatus) {
      toast.error('Please select a new status');
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          current_stage: getStageNumberFromStatus(newStatus)
        })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      // Add application stage
      const { error: stageError } = await supabase
        .from('application_stages')
        .insert({
          application_id: id,
          stage_number: getStageNumberFromStatus(newStatus),
          status: 'active',
          notes: statusNote || `Application status updated to ${formatStatus(newStatus)}`
        });
        
      if (stageError) throw stageError;
      
      // Create notification for the user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: `Application Status Updated`,
            message: `Your application status has been updated to ${formatStatus(newStatus)}${statusNote ? `: ${statusNote}` : ''}.`,
            read: false
          });
      }
      
      // Reload application data
      await loadApplicationData();
      
      // Reset form
      setNewStatus('');
      setStatusNote('');
      setShowChangeStatus(false);
      
      toast.success('Application status updated successfully');
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSendToLender = async () => {
    if (!selectedLender) {
      toast.error('Please select a lender');
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Get lender name
      const lenderName = [...LENDERS.aLenders, ...LENDERS.creditUnions, ...LENDERS.bLenders]
        .find(lender => lender.id === selectedLender)?.name || selectedLender;
      
      // Add activity log entry
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          application_id: id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'send_to_lender',
          details: {
            lender_id: selectedLender,
            lender_name: lenderName,
            note: lenderNote
          },
          is_admin_action: true,
          is_visible_to_user: true
        });
        
      if (logError) throw logError;
      
      // Create notification for the user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: `Application Sent to Lender`,
            message: `Your application has been submitted to ${lenderName} for review.`,
            read: false
          });
      }
      
      // Reload activity log
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });
        
      if (activityError) throw activityError;
      setActivityLog(activityData || []);
      
      // Reset form
      setSelectedLender('');
      setLenderNote('');
      setShowSendToLender(false);
      
      toast.success(`Application sent to ${lenderName} successfully`);
    } catch (error: any) {
      console.error('Error sending application to lender:', error);
      toast.error('Failed to send application to lender');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAddNote = async () => {
    if (!internalNote) {
      toast.error('Please enter a note');
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Update application with new note
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          internal_notes: application.internal_notes 
            ? `${application.internal_notes}\n\n${new Date().toISOString()}: ${internalNote}`
            : `${new Date().toISOString()}: ${internalNote}`
        })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      // Add activity log entry
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          application_id: id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'add_note',
          details: {
            note: internalNote
          },
          is_admin_action: true,
          is_visible_to_user: false
        });
        
      if (logError) throw logError;
      
      // Reload application data
      await loadApplicationData();
      
      // Reset form
      setInternalNote('');
      setShowAddNote(false);
      
      toast.success('Note added successfully');
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      setIsSendingMessage(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      // Add message
      const { error: messageError } = await supabase
        .from('admin_messages')
        .insert({
          admin_id: user.id,
          user_id: application.user_id,
          application_id: id,
          message: newMessage,
          is_admin: true,
          read: false
        });
        
      if (messageError) throw messageError;
      
      // Create notification for the user
      if (application.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: 'New Message from Clearpath',
            message: 'You have received a new message regarding your application.',
            read: false
          });
      }
      
      // Reload messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
      
      // Reset form
      setNewMessage('');
      
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const handleAssignAdmin = async () => {
    if (!assignedAdmin) {
      toast.error('Please select an admin to assign');
      return;
    }
    
    try {
      setIsAssigning(true);
      
      // Update application with assigned admin
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          assigned_to_admin_id: assignedAdmin
        })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      // Add activity log entry
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          application_id: id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'assign_admin',
          details: {
            admin_id: assignedAdmin
          },
          is_admin_action: true,
          is_visible_to_user: false
        });
        
      if (logError) throw logError;
      
      // Reload application data
      await loadApplicationData();
      
      toast.success('Application assigned successfully');
    } catch (error: any) {
      console.error('Error assigning admin:', error);
      toast.error('Failed to assign admin');
    } finally {
      setIsAssigning(false);
    }
  };
  
  const handleDocumentUpload = async (file: File, category: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      // Generate unique filename
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const timestamp = Date.now();
      const filename = `${application.id}/${category}_${timestamp}.${extension}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;
      
      // Create document record
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert({
          application_id: id,
          category,
          filename,
          status: 'pending'
        })
        .select()
        .single();

      if (documentError) throw documentError;
      
      // Reload documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (docsError) throw docsError;
      setDocuments(docsData || []);
      
      toast.success('Document uploaded successfully');
      return document;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      return null;
    }
  };
  
  const handleDocumentDelete = async (documentId: string) => {
    try {
      // Get document details first
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('filename')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      if (!document) throw new Error('Document not found');
      
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .remove([document.filename]);

      if (storageError) throw storageError;
      
      // Delete document record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
      
      // Reload documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (docsError) throw docsError;
      setDocuments(docsData || []);
      
      toast.success('Document deleted successfully');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      throw error;
    }
  };
  
  const handleDocumentReview = async (documentId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      // Create document review
      const { error: reviewError } = await supabase
        .from('document_reviews')
        .insert({
          document_id: documentId,
          reviewer_id: user.id,
          status,
          notes
        });
        
      if (reviewError) throw reviewError;
      
      // Reload documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (docsError) throw docsError;
      setDocuments(docsData || []);
      
      toast.success(`Document ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      console.error('Error reviewing document:', error);
      toast.error('Failed to review document');
    }
  };
  
  const getStageNumberFromStatus = (status: string) => {
    switch (status) {
      case 'submitted': return 1;
      case 'pending_documents': return 3;
      case 'pre_approved': return 4;
      case 'vehicle_selection': return 5;
      case 'final_approval': return 6;
      case 'finalized': return 7;
      default: return 3; // Default to pending documents
    }
  };
  
  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };
  
  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '$0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-amber-600 bg-amber-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Application</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/admin/applications')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Applications
            </button>
            <button
              onClick={loadApplicationData}
              className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Not Found</h2>
          <p className="text-gray-600 mb-4">The application you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/admin/applications')}
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/applications')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Application #{application.id.slice(0, 8)}
                </h1>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  application.status === 'pending_documents' ? 'bg-amber-100 text-amber-700' :
                  application.status === 'pre_approved' ? 'bg-green-100 text-green-700' :
                  application.status === 'vehicle_selection' ? 'bg-purple-100 text-purple-700' :
                  application.status === 'final_approval' ? 'bg-blue-100 text-blue-700' :
                  application.status === 'finalized' ? 'bg-gray-100 text-gray-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {formatStatus(application.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Submitted on {formatDate(application.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowChangeStatus(true)}
                className="px-3 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors text-sm font-medium"
              >
                Update Status
              </button>
              <button
                onClick={() => setShowSendToLender(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Send to Lender
              </button>
              <button
                onClick={() => setShowAddNote(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Add Note
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'messages'
                  ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Messages ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity Log
            </button>
            <button
              onClick={() => setActiveTab('flags')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'flags'
                  ? 'border-b-2 border-[#3BAA75] text-[#3BAA75]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Flags ({flags.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left Column - Application Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Applicant Summary */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2 text-[#3BAA75]" />
                      Applicant Summary
                    </h2>
                    
                    <div className="flex items-center gap-2">
                      {application.has_debt_discharge_history && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Debt History
                        </span>
                      )}
                      
                      {application.collects_government_benefits && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Benefits
                        </span>
                      )}
                      
                      {financialMetrics && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                          getRiskColor(financialMetrics.overallRisk)
                        }`}>
                          {financialMetrics.overallRisk === 'low' && <CheckCircle className="h-3 w-3" />}
                          {financialMetrics.overallRisk === 'medium' && <AlertCircle className="h-3 w-3" />}
                          {financialMetrics.overallRisk === 'high' && <AlertCircle className="h-3 w-3" />}
                          {financialMetrics.overallRisk.charAt(0).toUpperCase() + financialMetrics.overallRisk.slice(1)} Risk
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{application.first_name} {application.last_name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-[#3BAA75] hover:underline">
                        <a href={`mailto:${application.email}`}>{application.email}</a>
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-[#3BAA75] hover:underline">
                        <a href={`tel:${application.phone}`}>{application.phone}</a>
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{formatDate(application.date_of_birth)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Marital Status</p>
                      <p className="font-medium">
                        {application.marital_status
                          ? application.marital_status.charAt(0).toUpperCase() + application.marital_status.slice(1)
                          : 'Not specified'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Dependents</p>
                      <p className="font-medium">{application.dependents || '0'}</p>
                    </div>
                    
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">
                        {application.address}, {application.city}, {application.province} {application.postal_code}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Employment & Income */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Employment & Income
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Employment Status</p>
                      <p className="font-medium">
                        {application.employment_status
                          ? application.employment_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'Not specified'}
                      </p>
                    </div>
                    
                    {application.employer_name && (
                      <div>
                        <p className="text-sm text-gray-500">Employer</p>
                        <p className="font-medium">{application.employer_name}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-500">Occupation</p>
                      <p className="font-medium">{application.occupation || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Employment Duration</p>
                      <p className="font-medium">
                        {application.employment_duration
                          ? application.employment_duration.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'Not specified'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Monthly Income</p>
                      <p className="font-medium">{formatCurrency(application.monthly_income)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Annual Income</p>
                      <p className="font-medium">{formatCurrency(application.annual_income)}</p>
                    </div>
                    
                    {application.other_income > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Other Income</p>
                        <p className="font-medium">{formatCurrency(application.other_income)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Government Benefits */}
                  {application.collects_government_benefits && application.disability_programs && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Government & Disability Benefits
                      </h3>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          {application.disability_programs.map((program: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-sm text-gray-700">
                                {program.name_other || program.name}:
                              </span>
                              <span className="text-sm font-medium">{formatCurrency(program.amount)}</span>
                            </div>
                          ))}
                          
                          <div className="col-span-2 mt-2 pt-2 border-t border-green-200">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-700">Total Monthly Benefits:</span>
                              <span className="text-sm font-medium">
                                {formatCurrency(application.disability_programs.reduce((sum: number, program: any) => sum + (parseFloat(program.amount) || 0), 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Housing Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Home className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Housing Information
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Housing Status</p>
                      <p className="font-medium">
                        {application.housing_status
                          ? application.housing_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'Not specified'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Monthly Payment</p>
                      <p className="font-medium">{formatCurrency(application.housing_payment)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Residence Duration</p>
                      <p className="font-medium">
                        {application.residence_duration
                          ? application.residence_duration.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Desired Financing */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Car className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Desired Financing
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Loan Amount</p>
                      <p className="font-medium">{formatCurrency(application.desired_loan_amount)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-medium">{application.vehicle_type || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Down Payment</p>
                      <p className="font-medium">{formatCurrency(application.down_payment_amount)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Has Driver's License</p>
                      <p className="font-medium">{application.has_driver_license ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Debt Discharge History */}
                {application.has_debt_discharge_history && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                      Financial Challenges
                    </h2>
                    
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-700">Type</p>
                          <p className="font-medium">
                            {application.debt_discharge_type
                              ? application.debt_discharge_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                              : 'Not specified'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-700">Year</p>
                          <p className="font-medium">{application.debt_discharge_year || 'Not specified'}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-700">Status</p>
                          <p className="font-medium">
                            {application.debt_discharge_status
                              ? application.debt_discharge_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                              : 'Not specified'}
                          </p>
                        </div>
                        
                        {application.debt_discharge_comments && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-sm text-gray-700">Comments</p>
                            <p className="text-sm">{application.debt_discharge_comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Contact Preferences */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Contact Preferences
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Preferred Method</p>
                      <p className="font-medium">
                        {application.preferred_contact_method === 'email' ? 'Email' : 
                         application.preferred_contact_method === 'phone' ? 'Phone Call' : 
                         application.preferred_contact_method === 'sms' ? 'Text Message (SMS)' : 
                         'Not specified'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Consent for Soft Check</p>
                      <p className="font-medium">{application.consent_soft_check ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Application Progress */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Application Progress
                  </h2>
                  
                  <ApplicationTracker
                    application={application}
                    stages={stages}
                  />
                </div>
                
                {/* Internal Notes */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-[#3BAA75]" />
                      Internal Notes
                    </h2>
                    
                    <button
                      onClick={() => setShowAddNote(true)}
                      className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium flex items-center"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Add Note
                    </button>
                  </div>
                  
                  {application.internal_notes ? (
                    <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line">
                      {application.internal_notes}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No internal notes yet</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Column - Financial Metrics & Actions */}
              <div className="space-y-6">
                {/* Admin Assignment */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Assigned Admin
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Currently Assigned To</p>
                        <p className="font-medium">
                          {application.assigned_to_admin_id ? (
                            adminUsers.find(admin => admin.id === application.assigned_to_admin_id)?.email || 'Unknown Admin'
                          ) : (
                            'Unassigned'
                          )}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setAssignedAdmin(application.assigned_to_admin_id)}
                        className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium"
                      >
                        Change
                      </button>
                    </div>
                    
                    <div className="relative">
                      <select
                        value={assignedAdmin || ''}
                        onChange={(e) => setAssignedAdmin(e.target.value || null)}
                        className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      >
                        <option value="">Unassigned</option>
                        {adminUsers.map(admin => (
                          <option key={admin.id} value={admin.id}>
                            {admin.email}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    </div>
                    
                    <button
                      onClick={handleAssignAdmin}
                      disabled={isAssigning}
                      className="w-full bg-[#3BAA75] text-white px-4 py-2 rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAssigning ? (
                        <span className="flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Assigning...
                        </span>
                      ) : (
                        'Save Assignment'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Financial Metrics */}
                {financialMetrics && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-[#3BAA75]" />
                      Financial Metrics
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-500">Total Monthly Income</p>
                          <p className="font-medium">{formatCurrency(financialMetrics.totalIncome)}</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-500">Total Debt Obligations</p>
                          <p className="font-medium">{formatCurrency(financialMetrics.totalDebtObligations)}</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (financialMetrics.totalDebtObligations / financialMetrics.totalIncome) * 100)}%` 
                            }} 
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-500">Net Disposable Income</p>
                          <p className="font-medium">{formatCurrency(financialMetrics.netDisposableIncome)}</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (financialMetrics.netDisposableIncome / financialMetrics.totalIncome) * 100)}%` 
                            }} 
                          />
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Debt-to-Income Ratio</p>
                            <p className={`font-medium ${
                              financialMetrics.dtiRisk === 'low' ? 'text-green-600' :
                              financialMetrics.dtiRisk === 'medium' ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {financialMetrics.debtToIncomeRatio.toFixed(1)}%
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500">Loan-to-Income Ratio</p>
                            <p className={`font-medium ${
                              financialMetrics.ltiRisk === 'low' ? 'text-green-600' :
                              financialMetrics.ltiRisk === 'medium' ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {financialMetrics.loanToIncomeRatio.toFixed(1)}%
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500">Income Risk</p>
                            <p className={`font-medium ${
                              financialMetrics.incomeRisk === 'low' ? 'text-green-600' :
                              financialMetrics.incomeRisk === 'medium' ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {financialMetrics.incomeRisk.charAt(0).toUpperCase() + financialMetrics.incomeRisk.slice(1)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500">Overall Risk</p>
                            <p className={`font-medium ${
                              financialMetrics.overallRisk === 'low' ? 'text-green-600' :
                              financialMetrics.overallRisk === 'medium' ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {financialMetrics.overallRisk.charAt(0).toUpperCase() + financialMetrics.overallRisk.slice(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ArrowRight className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Quick Actions
                  </h2>
                  
                  <div className="space-y-3">
                    <a
                      href={`mailto:${application.email}?subject=Your%20Clearpath%20Motors%20Application%20${application.id.slice(0, 8)}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="flex items-center text-gray-700">
                        <Mail className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Email Applicant
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-gray-400" />
                    </a>
                    
                    <a
                      href={`tel:${application.phone}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="flex items-center text-gray-700">
                        <Phone className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Call Applicant
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-gray-400" />
                    </a>
                    
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="flex items-center text-gray-700">
                        <FileCheck className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Review Documents
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('messages')}
                      className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="flex items-center text-gray-700">
                        <MessageSquare className="h-5 w-5 mr-2 text-[#3BAA75]" />
                        Send Message
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {/* Recommended Lenders */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Recommended Lenders
                  </h2>
                  
                  <div className="space-y-3">
                    {financialMetrics && (
                      <>
                        {financialMetrics.overallRisk === 'low' && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <h3 className="font-medium text-green-800 mb-2 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              A-Lenders (Prime)
                            </h3>
                            <p className="text-sm text-green-700 mb-2">
                              Strong application with low risk. Recommend prime lenders for best rates.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {LENDERS.aLenders.slice(0, 3).map(lender => (
                                <button
                                  key={lender.id}
                                  onClick={() => {
                                    setSelectedLender(lender.id);
                                    setShowSendToLender(true);
                                  }}
                                  className="px-2 py-1 bg-white text-green-700 text-xs rounded border border-green-200 hover:bg-green-100 transition-colors"
                                >
                                  {lender.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {financialMetrics.overallRisk === 'medium' && (
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Near-Prime Lenders
                            </h3>
                            <p className="text-sm text-amber-700 mb-2">
                              Moderate risk factors. Recommend near-prime lenders with competitive rates.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {[...LENDERS.creditUnions.slice(0, 2), ...LENDERS.bLenders.slice(0, 2)].map(lender => (
                                <button
                                  key={lender.id}
                                  onClick={() => {
                                    setSelectedLender(lender.id);
                                    setShowSendToLender(true);
                                  }}
                                  className="px-2 py-1 bg-white text-amber-700 text-xs rounded border border-amber-200 hover:bg-amber-100 transition-colors"
                                >
                                  {lender.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {financialMetrics.overallRisk === 'high' && (
                          <div className="p-3 bg-red-50 rounded-lg">
                            <h3 className="font-medium text-red-800 mb-2 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Subprime Lenders
                            </h3>
                            <p className="text-sm text-red-700 mb-2">
                              Higher risk profile. Recommend specialized subprime lenders.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {LENDERS.bLenders.slice(0, 4).map(lender => (
                                <button
                                  key={lender.id}
                                  onClick={() => {
                                    setSelectedLender(lender.id);
                                    setShowSendToLender(true);
                                  }}
                                  className="px-2 py-1 bg-white text-red-700 text-xs rounded border border-red-200 hover:bg-red-100 transition-colors"
                                >
                                  {lender.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <button
                      onClick={() => setShowSendToLender(true)}
                      className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Send to Lender
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileCheck className="h-5 w-5 mr-2 text-[#3BAA75]" />
                  Document Management
                </h2>
                
                <div className="space-y-6">
                  <DocumentManager
                    applicationId={id || ''}
                    documents={documents}
                    onUpload={handleDocumentUpload}
                    onDelete={handleDocumentDelete}
                  />
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-md font-medium text-gray-900 mb-4">Upload New Document</h3>
                    
                    <DocumentUpload
                      applicationId={id || ''}
                      documents={documents}
                      onUpload={handleDocumentUpload}
                    />
                  </div>
                </div>
              </div>
              
              {/* Document Review Section */}
              {documents.filter(doc => doc.status === 'pending').length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-[#3BAA75]" />
                    Pending Document Reviews
                  </h2>
                  
                  <div className="space-y-4">
                    {documents.filter(doc => doc.status === 'pending').map(doc => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{doc.filename.split('/').pop()}</p>
                            <p className="text-sm text-gray-500">
                              Category: {doc.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-sm text-gray-500">
                              Uploaded: {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                          
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                            Pending Review
                          </span>
                        </div>
                        
                        <div className="mt-4 space-y-3">
                          <textarea
                            placeholder="Add review notes here..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                            rows={2}
                            id={`notes-${doc.id}`}
                          />
                          
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                const notes = (document.getElementById(`notes-${doc.id}`) as HTMLTextAreaElement)?.value;
                                handleDocumentReview(doc.id, 'rejected', notes);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Reject
                            </button>
                            
                            <button
                              onClick={() => {
                                const notes = (document.getElementById(`notes-${doc.id}`) as HTMLTextAreaElement)?.value;
                                handleDocumentReview(doc.id, 'approved', notes);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Messages List */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-[#3BAA75]" />
                  Customer Messages
                </h2>
                
                <div className="space-y-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No messages yet</p>
                      <p className="text-sm mt-2">Start the conversation with the customer</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto p-2">
                      {messages.map(message => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.is_admin
                              ? 'bg-[#3BAA75]/10 ml-8'
                              : 'bg-gray-100 mr-8'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium">
                              {message.is_admin ? 'Admin' : application.first_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(message.created_at)}
                            </p>
                          </div>
                          <p className="text-sm">{message.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage || isSendingMessage}
                        className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {isSendingMessage ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message Templates */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#3BAA75]" />
                  Message Templates
                </h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setNewMessage("Hi there! I'm reviewing your application and wanted to check in. Is there anything specific you'd like to know about the process?")}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Initial Check-in</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Friendly first message to establish contact
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setNewMessage("I've reviewed your application and we need a few more documents to proceed. Could you please upload your proof of income and ID through the dashboard? Let me know if you need any help.")}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Request Documents</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ask for missing documentation
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setNewMessage("Great news! Your application has been pre-approved. I'll be sending more details shortly about next steps and available vehicles that match your criteria.")}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Pre-Approval Notice</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Inform about pre-approval status
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setNewMessage("I noticed you haven't uploaded all the required documents yet. Is there anything I can help clarify about what's needed? We can't proceed with your application until we have all the necessary documentation.")}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Document Follow-up</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Reminder about missing documents
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setNewMessage("Would you be available for a quick call to discuss your application? I have some options I'd like to go over with you. Please let me know what time works best for you.")}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Schedule Call</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Request a phone consultation
                    </p>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#3BAA75]" />
                Activity Log
              </h2>
              
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activityLog.map((activity, index) => (
                    <div key={activity.id} className="relative">
                      {index !== activityLog.length - 1 && (
                        <div className="absolute top-8 left-4 bottom-0 w-px bg-gray-200" />
                      )}
                      <div className="flex gap-4">
                        <div className="relative z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                            activity.is_admin_action ? 'bg-blue-500' : 'bg-[#3BAA75]'
                          }`}>
                            {activity.is_admin_action ? 'A' : 'U'}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900">
                              {activity.is_admin_action ? 'Admin' : application.first_name}
                            </p>
                            <span className="mx-1 text-gray-500">•</span>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(activity.created_at)}
                            </p>
                          </div>
                          <p className="text-gray-600 mt-1">
                            {formatActivityAction(activity.action)}
                            {activity.details && activity.action === 'send_to_lender' && (
                              <span> to <strong>{activity.details.lender_name}</strong></span>
                            )}
                            {activity.details && activity.action === 'update_document' && (
                              <span> to <strong>{activity.details.status}</strong></span>
                            )}
                          </p>
                          
                          {activity.details && activity.details.note && (
                            <p className="text-sm bg-gray-50 p-2 rounded mt-2 text-gray-600">
                              {activity.details.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {/* Flags Tab */}
          {activeTab === 'flags' && (
            <motion.div
              key="flags"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-[#3BAA75]" />
                Application Flags
              </h2>
              
              {flags.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No flags on this application</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flags.map(flag => (
                    <div
                      key={flag.id}
                      className={`border rounded-lg p-4 ${
                        flag.severity === 'critical' ? 'border-red-200 bg-red-50' :
                        flag.severity === 'high' ? 'border-amber-200 bg-amber-50' :
                        flag.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-medium ${
                            flag.severity === 'critical' ? 'text-red-700' :
                            flag.severity === 'high' ? 'text-amber-700' :
                            flag.severity === 'medium' ? 'text-yellow-700' :
                            'text-blue-700'
                          }`}>
                            {flag.flag_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <p className="text-sm mt-1">
                            {flag.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Flagged on {formatDate(flag.created_at)}
                          </p>
                        </div>
                        
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          flag.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          flag.severity === 'high' ? 'bg-amber-200 text-amber-800' :
                          flag.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)}
                        </span>
                      </div>
                      
                      {flag.resolved_at ? (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                          <div className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolved on {formatDate(flag.resolved_at)}
                          </div>
                          
                          <button className="text-xs text-gray-500 hover:text-gray-700">
                            View Details
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                          <button className="px-3 py-1 bg-white text-gray-700 rounded border border-gray-300 text-sm hover:bg-gray-50 transition-colors">
                            Mark as Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Modals */}
      {/* Change Status Modal */}
      {showChangeStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Application Status
              </h3>
              <button
                onClick={() => setShowChangeStatus(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Status
                </label>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-700">
                  {formatStatus(application.status)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                >
                  <option value="">Select Status</option>
                  {APPLICATION_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Note (Optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  rows={3}
                  placeholder="Add a note about this status change..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowChangeStatus(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || isUpdating}
                className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Send to Lender Modal */}
      {showSendToLender && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Application to Lender
              </h3>
              <button
                onClick={() => setShowSendToLender(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Lender
                </label>
                <select
                  value={selectedLender}
                  onChange={(e) => setSelectedLender(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                >
                  <option value="">Select Lender</option>
                  <optgroup label="A-Lenders (Prime)">
                    {LENDERS.aLenders.map(lender => (
                      <option key={lender.id} value={lender.id}>
                        {lender.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Credit Unions & Alt Banks">
                    {LENDERS.creditUnions.map(lender => (
                      <option key={lender.id} value={lender.id}>
                        {lender.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="B-Lenders (Subprime)">
                    {LENDERS.bLenders.map(lender => (
                      <option key={lender.id} value={lender.id}>
                        {lender.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note to Lender (Optional)
                </label>
                <textarea
                  value={lenderNote}
                  onChange={(e) => setLenderNote(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  rows={3}
                  placeholder="Add any specific details for the lender..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSendToLender(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToLender}
                disabled={!selectedLender || isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send to Lender'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Internal Note
              </h3>
              <button
                onClick={() => setShowAddNote(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                  rows={5}
                  placeholder="Add your internal note here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This note is only visible to admins and will not be shared with the applicant.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddNote(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!internalNote || isUpdating}
                className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Note'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format activity actions
const formatActivityAction = (action: string) => {
  switch (action) {
    case 'update_application':
      return 'updated the application';
    case 'upload_document':
      return 'uploaded a document';
    case 'update_document':
      return 'updated a document';
    case 'delete_document':
      return 'deleted a document';
    case 'send_to_lender':
      return 'sent the application';
    case 'add_note':
      return 'added a note';
    case 'assign_admin':
      return 'assigned the application';
    default:
      return action.replace(/_/g, ' ');
  }
};

export default ApplicationView;