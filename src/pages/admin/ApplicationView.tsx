import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  CreditCard,
  Car,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit2,
  Save,
  X,
  MessageSquare,
  Bell,
  Flag,
  MoreVertical,
  Download,
  Upload,
  Trash2,
  Eye,
  RefreshCw,
  UserPlus,
  Settings,
  Shield,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { DocumentManager } from '../../components/DocumentManager';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import type { Application, Document, ApplicationStage, Notification } from '../../types/database';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  app_metadata?: {
    is_admin?: boolean;
  };
}

interface ActivityLogItem {
  id: string;
  action: string;
  details: any;
  created_at: string;
  is_admin_action: boolean;
  user_id: string;
}

const ApplicationView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplication, setEditedApplication] = useState<Partial<Application>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'activity' | 'notes'>('overview');
  const [internalNotes, setInternalNotes] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [assigningAdmin, setAssigningAdmin] = useState(false);

  const { uploadDocument, deleteDocument, uploading, error: uploadError } = useDocumentUpload(id || '');

  useEffect(() => {
    if (!id) {
      navigate('/admin/applications');
      return;
    }

    loadApplicationData();
    loadAdminUsers();
  }, [id]);

  useEffect(() => {
    if (!application?.id || !user?.id) return;

    // Set up real-time subscriptions
    const applicationsChannel = supabase
      .channel('admin-application-view')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `id=eq.${application.id}`
        },
        (payload) => {
          setApplication(payload.new as Application);
          toast.success('Application updated');
        }
      )
      .subscribe();

    const documentsChannel = supabase
      .channel('admin-documents-view')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `application_id=eq.${application.id}`
        },
        () => {
          loadDocuments();
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel('admin-activity-view')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `application_id=eq.${application.id}`
        },
        () => {
          loadActivityLog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [application?.id, user?.id]);

  const loadApplicationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError) throw appError;
      if (!appData) throw new Error('Application not found');

      setApplication(appData);
      setEditedApplication(appData);
      setInternalNotes(appData.internal_notes || '');

      // Load related data
      await Promise.all([
        loadDocuments(),
        loadStages(),
        loadActivityLog()
      ]);

    } catch (error: any) {
      console.error('Error loading application:', error);
      setError(error.message);
      if (error.message === 'Application not found') {
        navigate('/admin/applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      // Fallback to direct database query if edge function fails
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, created_at, raw_app_meta_data')
        .eq('raw_app_meta_data->>is_admin', 'true');

      if (error) {
        console.error('Error loading admin users from database:', error);
        // Set empty array as fallback
        setAdminUsers([]);
        return;
      }

      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        app_metadata: user.raw_app_meta_data
      }));

      setAdminUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error loading admin users:', error);
      setAdminUsers([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadStages = async () => {
    try {
      const { data, error } = await supabase
        .from('application_stages')
        .select('*')
        .eq('application_id', id)
        .order('stage_number', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const loadActivityLog = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLog(data || []);
    } catch (error) {
      console.error('Error loading activity log:', error);
    }
  };

  const handleSave = async () => {
    if (!application) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('applications')
        .update({
          ...editedApplication,
          internal_notes: internalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      setApplication({ ...application, ...editedApplication, internal_notes: internalNotes });
      setIsEditing(false);
      toast.success('Application updated successfully');
    } catch (error: any) {
      console.error('Error saving application:', error);
      toast.error('Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!application) return;

    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      setApplication({ ...application, status: newStatus as any });
      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAssignAdmin = async () => {
    if (!application || !selectedAdminId) return;

    try {
      setAssigningAdmin(true);

      const { error } = await supabase
        .from('applications')
        .update({ 
          assigned_to_admin_id: selectedAdminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      setApplication({ ...application, assigned_to_admin_id: selectedAdminId });
      setShowAssignModal(false);
      setSelectedAdminId('');
      toast.success('Admin assigned successfully');
    } catch (error: any) {
      console.error('Error assigning admin:', error);
      toast.error('Failed to assign admin');
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);

      const updatedNotes = internalNotes 
        ? `${internalNotes}\n\n[${format(new Date(), 'MMM d, yyyy h:mm a')}] ${newNote}`
        : `[${format(new Date(), 'MMM d, yyyy h:mm a')}] ${newNote}`;

      const { error } = await supabase
        .from('applications')
        .update({ 
          internal_notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', application?.id);

      if (error) throw error;

      setInternalNotes(updatedNotes);
      setNewNote('');
      toast.success('Note added successfully');
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    try {
      const document = await uploadDocument(file, category);
      if (document) {
        setDocuments(prev => [document, ...prev]);
        toast.success('Document uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending_documents':
        return 'bg-orange-100 text-orange-700';
      case 'pre_approved':
        return 'bg-green-100 text-green-700';
      case 'vehicle_selection':
        return 'bg-purple-100 text-purple-700';
      case 'final_approval':
        return 'bg-indigo-100 text-indigo-700';
      case 'finalized':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Application</h2>
          <p className="text-gray-600 mb-4">{error || 'Application not found'}</p>
          <Link
            to="/admin/applications"
            className="inline-flex items-center px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const assignedAdmin = adminUsers.find(admin => admin.id === application.assigned_to_admin_id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                to="/admin/applications"
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                  {application.first_name} {application.last_name}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                    {application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="text-sm text-gray-500">
                    ID: {application.id.slice(0, 8)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Stage {application.current_stage}/7
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden md:inline">
                  {assignedAdmin ? `Assigned to ${assignedAdmin.email}` : 'Assign Admin'}
                </span>
              </button>

              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedApplication(application);
                    }}
                    className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'activity', label: 'Activity', icon: Activity },
              { id: 'notes', label: 'Notes', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-[#3BAA75] text-[#3BAA75]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Status Management */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Status Management</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'submitted',
                    'under_review',
                    'pending_documents',
                    'pre_approved',
                    'vehicle_selection',
                    'final_approval',
                    'finalized'
                  ].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        application.status === status
                          ? 'border-[#3BAA75] bg-[#3BAA75]/10'
                          : 'border-gray-200 hover:border-[#3BAA75]/50'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedApplication.first_name || ''}
                          onChange={(e) => setEditedApplication({ ...editedApplication, first_name: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      ) : (
                        <p className="text-gray-900">{application.first_name || 'N/A'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedApplication.last_name || ''}
                          onChange={(e) => setEditedApplication({ ...editedApplication, last_name: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      ) : (
                        <p className="text-gray-900">{application.last_name || 'N/A'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editedApplication.email || ''}
                          onChange={(e) => setEditedApplication({ ...editedApplication, email: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      ) : (
                        <p className="text-gray-900">{application.email || 'N/A'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedApplication.phone || ''}
                          onChange={(e) => setEditedApplication({ ...editedApplication, phone: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      ) : (
                        <p className="text-gray-900">{application.phone || 'N/A'}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      {isEditing ? (
                        <textarea
                          value={`${editedApplication.address || ''}\n${editedApplication.city || ''}, ${editedApplication.province || ''} ${editedApplication.postal_code || ''}`}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            const addressLine = lines[0] || '';
                            const cityLine = lines[1] || '';
                            const [city, provincePostal] = cityLine.split(', ');
                            const [province, postal_code] = (provincePostal || '').split(' ');
                            
                            setEditedApplication({
                              ...editedApplication,
                              address: addressLine,
                              city: city || '',
                              province: province || '',
                              postal_code: postal_code || ''
                            });
                          }}
                          rows={3}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {application.address && (
                            <>
                              {application.address}<br />
                              {application.city}, {application.province} {application.postal_code}
                            </>
                          ) || 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedApplication.date_of_birth || ''}
                          onChange={(e) => setEditedApplication({ ...editedApplication, date_of_birth: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {application.date_of_birth ? format(new Date(application.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                    {isEditing ? (
                      <select
                        value={editedApplication.employment_status || ''}
                        onChange={(e) => setEditedApplication({ ...editedApplication, employment_status: e.target.value as any })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        <option value="">Select Status</option>
                        <option value="employed">Employed</option>
                        <option value="self_employed">Self Employed</option>
                        <option value="unemployed">Unemployed</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">
                        {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedApplication.annual_income || ''}
                        onChange={(e) => setEditedApplication({ ...editedApplication, annual_income: Number(e.target.value) })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      />
                    ) : (
                      <p className="text-gray-900">{formatCurrency(application.annual_income)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="300"
                        max="850"
                        value={editedApplication.credit_score || ''}
                        onChange={(e) => setEditedApplication({ ...editedApplication, credit_score: Number(e.target.value) })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      />
                    ) : (
                      <p className="text-gray-900">{application.credit_score || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle & Loan Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Vehicle & Loan Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                    {isEditing ? (
                      <select
                        value={editedApplication.vehicle_type || ''}
                        onChange={(e) => setEditedApplication({ ...editedApplication, vehicle_type: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        <option value="">Select Type</option>
                        <option value="Car">Car</option>
                        <option value="SUV">SUV</option>
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{application.vehicle_type || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desired Monthly Payment</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedApplication.desired_monthly_payment || ''}
                        onChange={(e) => setEditedApplication({ ...editedApplication, desired_monthly_payment: Number(e.target.value) })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      />
                    ) : (
                      <p className="text-gray-900">{formatCurrency(application.desired_monthly_payment)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Range</label>
                    <p className="text-gray-900">
                      {application.loan_amount_min && application.loan_amount_max
                        ? `${formatCurrency(application.loan_amount_min)} - ${formatCurrency(application.loan_amount_max)}`
                        : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
                    <p className="text-gray-900">
                      {application.interest_rate ? `${application.interest_rate}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DocumentManager
                applicationId={application.id}
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                isUploading={uploading}
                uploadError={uploadError}
              />
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-[#3BAA75]/10 rounded-full p-2">
                        <Activity className="h-4 w-4 text-[#3BAA75]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                          {activity.is_admin_action && ' • Admin Action'}
                        </p>
                        {activity.details && (
                          <pre className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Internal Notes</h3>
              
              {/* Add New Note */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new note..."
                    rows={3}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingNote ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Add Note'}
                  </button>
                </div>
              </div>

              {/* Existing Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes History</label>
                {internalNotes ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {internalNotes}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No notes added yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assign Admin Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Application to Admin
            </h3>
            
            {adminUsers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">No admin users found.</p>
                <button
                  onClick={() => loadAdminUsers()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Retry Loading Admins
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Admin
                  </label>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  >
                    <option value="">Select an admin</option>
                    {adminUsers.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignAdmin}
                    disabled={!selectedAdminId || assigningAdmin}
                    className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
                  >
                    {assigningAdmin ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Assign'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationView;