import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  X,
  ArrowRight,
  Car,
  DollarSign,
  CreditCard,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
  Edit2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Application } from '../../types/database';
import toast from 'react-hot-toast';

const AdminApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [employmentFilter, setEmploymentFilter] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [userApplications, setUserApplications] = useState<Application[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewApplicationModal, setShowNewApplicationModal] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const [newApplication, setNewApplication] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    employment_status: 'employed' as const,
    annual_income: '',
    credit_score: '',
    vehicle_type: '',
    desired_monthly_payment: '',
    status: 'submitted' as const,
    current_stage: 1
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;
  const observer = useRef<IntersectionObserver | null>(null);
  const lastApplicationRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    loadApplications(true);
  }, [statusFilter, employmentFilter]);

  useEffect(() => {
    if (page > 0) {
      loadMoreApplications();
    }
  }, [page]);

  useEffect(() => {
    // Set up real-time subscription for applications
    const applicationsSubscription = supabase
      .channel('admin-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        (payload) => {
          console.log('Application change received:', payload);
          
          // Reload applications when changes occur
          loadApplications(true);
          
          // Show toast notification
          if (payload.eventType === 'INSERT') {
            toast.success('New application submitted');
          } else if (payload.eventType === 'UPDATE') {
            toast.success('Application updated');
          } else if (payload.eventType === 'DELETE') {
            toast.success('Application deleted');
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for documents
    const documentsSubscription = supabase
      .channel('admin-documents-global-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        (payload) => {
          console.log('Document change received:', payload);
          
          // Reload applications to update document counts
          loadApplications(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsSubscription);
      supabase.removeChannel(documentsSubscription);
    };
  }, []);

  const loadApplications = async (reset = false) => {
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    
    try {
      setLoading(true);
      let query = supabase
        .from('applications')
        .select(`
          *,
          documents (count),
          application_stages (count)
        `)
        .range(0, ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (employmentFilter) {
        query = query.eq('employment_status', employmentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMoreApplications = async () => {
    try {
      let query = supabase
        .from('applications')
        .select(`
          *,
          documents (count),
          application_stages (count)
        `)
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (employmentFilter) {
        query = query.eq('employment_status', employmentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setApplications(prev => [...prev, ...data]);
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error loading more applications:', error);
      toast.error('Failed to load more applications');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadApplications(true);
  };

  const loadUserApplications = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserApplications(data || []);
      setSelectedEmail(email);
    } catch (error) {
      console.error('Error loading user applications:', error);
      toast.error('Failed to load user applications');
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      switch (action) {
        case 'delete':
          const { error: deleteError } = await supabase
            .from('applications')
            .delete()
            .in('id', selectedApplications);
          
          if (deleteError) throw deleteError;
          loadApplications(true);
          toast.success('Applications deleted successfully');
          break;

        case 'export':
          // Implement CSV export
          toast.success('Export feature coming soon');
          break;

        default:
          break;
      }

      setSelectedApplications([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const formatPostalCode = (postalCode: string): string => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = postalCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Insert space after the third character if length is 6
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    
    return cleaned;
  };

  const handleNewApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    try {
      // First check if an application with this email already exists
      const { data: existingApplications, error: searchError } = await supabase
        .from('applications')
        .select('id, email')
        .eq('email', newApplication.email)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingApplications) {
        setErrorMessage(`An application already exists for ${newApplication.email}`);
        return;
      }

      const formattedPostalCode = formatPostalCode(newApplication.postal_code);
      
      const { data, error } = await supabase
        .from('applications')
        .insert([{
          ...newApplication,
          postal_code: formattedPostalCode,
          annual_income: Number(newApplication.annual_income),
          credit_score: Number(newApplication.credit_score),
          desired_monthly_payment: Number(newApplication.desired_monthly_payment),
          monthly_income: Number(newApplication.annual_income) / 12,
          user_id: null // Explicitly set user_id to null for admin-created applications
        }])
        .select()
        .single();

      if (error) throw error;

      setApplications([data, ...applications]);
      setShowNewApplicationModal(false);
      setNewApplication({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        employment_status: 'employed',
        annual_income: '',
        credit_score: '',
        vehicle_type: '',
        desired_monthly_payment: '',
        status: 'submitted',
        current_stage: 1
      });

      navigate(`/admin/applications/${data.id}`);
    } catch (error) {
      console.error('Error creating application:', error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An error occurred while creating the application');
      }
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

  const filteredApplications = applications.filter(app => {
    const searchLower = searchTerm.toLowerCase();
    return (
      app.first_name?.toLowerCase().includes(searchLower) ||
      app.last_name?.toLowerCase().includes(searchLower) ||
      app.email?.toLowerCase().includes(searchLower) ||
      app.phone?.toLowerCase().includes(searchLower) ||
      app.status.toLowerCase().includes(searchLower)
    );
  });

  if (loading && page === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
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
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Applications
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {applications.length} total applications
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Total',
              value: applications.length,
              icon: <FileText className="h-5 w-5 text-blue-500" />,
              color: 'bg-blue-50'
            },
            {
              title: 'Pending',
              value: applications.filter(a => a.status === 'pending_documents').length,
              icon: <Clock className="h-5 w-5 text-yellow-500" />,
              color: 'bg-yellow-50'
            },
            {
              title: 'Approved',
              value: applications.filter(a => a.status === 'pre_approved').length,
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
              color: 'bg-green-50'
            },
            {
              title: 'Review',
              value: applications.filter(a => a.status === 'under_review').length,
              icon: <AlertCircle className="h-5 w-5 text-red-500" />,
              color: 'bg-red-50'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.color} rounded-lg p-4 md:p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-500">{stat.title}</p>
                  <p className="text-xl md:text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="mt-4 bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-12"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Bulk Actions
                </button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={statusFilter || ''}
                          onChange={(e) => setStatusFilter(e.target.value || null)}
                          className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        >
                          <option value="">All Statuses</option>
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="pending_documents">Pending Documents</option>
                          <option value="pre_approved">Pre-Approved</option>
                          <option value="vehicle_selection">Vehicle Selection</option>
                          <option value="final_approval">Final Approval</option>
                          <option value="finalized">Finalized</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employment
                        </label>
                        <select
                          value={employmentFilter || ''}
                          onChange={(e) => setEmploymentFilter(e.target.value || null)}
                          className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        >
                          <option value="">All Employment</option>
                          <option value="employed">Employed</option>
                          <option value="self_employed">Self Employed</option>
                          <option value="unemployed">Unemployed</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Applications List */}
          <div className="mt-2 overflow-x-auto">
            {filteredApplications.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter || employmentFilter
                    ? "Try adjusting your search filters"
                    : "No applications have been submitted yet"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredApplications.map((application, index) => {
                  const isLastItem = index === filteredApplications.length - 1;
                  return (
                    <div
                      key={application.id}
                      ref={isLastItem ? lastApplicationRef : null}
                      className="p-4 bg-white hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                      onClick={() => navigate(`/admin/applications/${application.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-base font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {application.id.slice(0, 8)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {showBulkActions && (
                            <input
                              type="checkbox"
                              checked={selectedApplications.includes(application.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedApplications([...selectedApplications, application.id]);
                                } else {
                                  setSelectedApplications(selectedApplications.filter(id => id !== application.id));
                                }
                              }}
                              className="rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75] h-5 w-5"
                            />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(showActionMenu === application.id ? null : application.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                          >
                            <MoreVertical className="h-5 w-5 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div 
                          className="text-sm text-[#3BAA75] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadUserApplications(application.email);
                          }}
                        >
                          <Mail className="h-4 w-4 inline mr-1" />
                          {application.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          <Phone className="h-4 w-4 inline mr-1" />
                          {application.phone}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                          {application.status.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          Stage {application.current_stage}/7
                        </span>
                      </div>

                      {showActionMenu === application.id && (
                        <div className="fixed inset-0 z-50" onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(null);
                        }}>
                          <div 
                            className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10"
                            style={{ top: `${index * 180 + 100}px` }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/applications/${application.id}`);
                                setShowActionMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Application
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApplications([application.id]);
                                setShowDeleteConfirm(true);
                                setShowActionMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Application
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {loading && page > 0 && (
                  <div className="p-4 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#3BAA75] border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={() => setShowNewApplicationModal(true)}
          className="bg-[#3BAA75] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[#2D8259] transition-colors"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete {selectedApplications.length > 1 ? 'Applications' : 'Application'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedApplications.length > 1 ? 'these applications' : 'this application'}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedApplications([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleBulkAction('delete');
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Applications Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Applications for {selectedEmail}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {userApplications.length} application(s) found
                </p>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-gray-400 hover:text-gray-500 transition-colors p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-4 space-y-4">
                {userApplications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No applications found for this user</p>
                  </div>
                ) : (
                  userApplications.map((app) => (
                    <div
                      key={app.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#3BAA75] transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEmail(null);
                        navigate(`/admin/applications/${app.id}`);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {app.status.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(app.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Vehicle Type</p>
                          <p className="text-sm font-medium">{app.vehicle_type || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Monthly Payment</p>
                          <p className="text-sm font-medium">
                            ${app.desired_monthly_payment?.toLocaleString() || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Annual Income</p>
                          <p className="text-sm font-medium">
                            ${app.annual_income?.toLocaleString() || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Credit Score</p>
                          <p className="text-sm font-medium">{app.credit_score || 'Not specified'}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button className="flex items-center text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium">
                          View Details
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Application Modal */}
      {showNewApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Application
              </h3>
              <button
                onClick={() => setShowNewApplicationModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleNewApplication} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newApplication.first_name}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      first_name: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newApplication.last_name}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      last_name: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newApplication.email}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      email: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newApplication.phone}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      phone: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newApplication.address}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      address: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    value={newApplication.city}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      city: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Province
                  </label>
                  <select
                    value={newApplication.province}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      province: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  >
                    <option value="">Select Province</option>
                    <option value="ON">Ontario</option>
                    <option value="BC">British Columbia</option>
                    <option value="AB">Alberta</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="QC">Quebec</option>
                    <option value="SK">Saskatchewan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={newApplication.postal_code}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      postal_code: e.target.value
                    })}
                    placeholder="A1A 1A1"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: A1A 1A1</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employment Status
                  </label>
                  <select
                    value={newApplication.employment_status}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      employment_status: e.target.value as 'employed' | 'self_employed' | 'unemployed'
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  >
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self Employed</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Annual Income
                  </label>
                  <input
                    type="number"
                    value={newApplication.annual_income}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      annual_income: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Credit Score
                  </label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={newApplication.credit_score}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      credit_score: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vehicle Type
                  </label>
                  <select
                    value={newApplication.vehicle_type}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      vehicle_type: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="Car">Car</option>
                    <option value="SUV">SUV</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Desired Monthly Payment
                  </label>
                  <input
                    type="number"
                    value={newApplication.desired_monthly_payment}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      desired_monthly_payment: e.target.value
                    })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] h-12"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewApplicationModal(false)}
                  className="px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors"
                >
                  Create Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;