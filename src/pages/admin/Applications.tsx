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
  Edit2,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Application } from '../../types/database';
import toast from 'react-hot-toast';
import { BulkActions, BulkActionsProps } from '../../components/admin/BulkActions';
import { toStartCase } from '../../utils/formatters';

const ITEMS_PER_PAGE = 20;

const AdminApplications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [creditScoreRange, setCreditScoreRange] = useState({ min: '', max: '' });
  const [dealers, setDealers] = useState<any[]>([]);

  const fetchDealers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_profiles')
        .select('id, name, email');
      
      if (error) throw error;
      setDealers(data || []);
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('applications')
        .select(`
          *,
          documents (count),
          application_stages (count),
          dealer_profiles!dealer_id(name)
        `)
        .range((page * ITEMS_PER_PAGE), ((page + 1) * ITEMS_PER_PAGE) - 1)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        // Check if searchTerm is a valid UUID format for exact matching
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
        
        if (isUUID) {
          // If it's a UUID, search by exact match on id
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
        } else {
          // If it's not a UUID, search only text fields
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (employmentFilter !== 'all') {
        query = query.eq('employment_status', employmentFilter);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }

      if (creditScoreRange.min) {
        query = query.gte('credit_score', parseInt(creditScoreRange.min));
      }

      if (creditScoreRange.max) {
        query = query.lte('credit_score', parseInt(creditScoreRange.max));
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setApplications(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, sortBy, sortOrder, dateRange, employmentFilter, creditScoreRange]);

  useEffect(() => {
    fetchApplications();
    fetchDealers();
  }, [fetchApplications, fetchDealers]);

  const handleSelectApplication = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId) 
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(applications.map(app => app.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedApplications([]);
  };

  const handleActionComplete = () => {
    fetchApplications();
  };

  const handleBulkAction = async (action: string, data?: any) => {
    try {
      switch (action) {
        case 'delete':
          await supabase
            .from('applications')
            .delete()
            .in('id', selectedApplications);
          toast.success(`Deleted ${selectedApplications.length} applications`);
          break;
        case 'updateStatus':
          await supabase
            .from('applications')
            .update({ status: data.status })
            .in('id', selectedApplications);
          toast.success(`Updated status for ${selectedApplications.length} applications`);
          break;
        case 'assignDealer':
          await supabase
            .from('applications')
            .update({ dealer_id: data.dealerId })
            .in('id', selectedApplications);
          toast.success(`Assigned dealer to ${selectedApplications.length} applications`);
          break;
      }
      setSelectedApplications([]);
      fetchApplications();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pre_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending_documents':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">Manage and review loan applications</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={fetchApplications}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, email, or Application #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="pending_documents">Pending Documents</option>
            <option value="pre_approved">Pre-approved</option>
            <option value="vehicle_selection">Vehicle Selection</option>
            <option value="final_approval">Final Approval</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={employmentFilter}
                  onChange={(e) => setEmploymentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Employment</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                  <option value="student">Student</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Score Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={creditScoreRange.min}
                    onChange={(e) => setCreditScoreRange(prev => ({ ...prev, min: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={creditScoreRange.max}
                    onChange={(e) => setCreditScoreRange(prev => ({ ...prev, max: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <BulkActions
          selectedApplications={selectedApplications}
          onClearSelection={handleClearSelection}
          onActionComplete={handleActionComplete}
          dealers={dealers}
        />
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedApplications.length === applications.length && applications.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    No applications found
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(application.id)}
                        onChange={() => handleSelectApplication(application.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {application.email}
                          </div>
                          {application.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {application.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(application.status)}
                        <span className="text-sm font-medium">
                          {formatStatus(application.status)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Stage {application.current_stage}/7
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${application.loan_amount_min?.toLocaleString()} - ${application.loan_amount_max?.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Car className="h-3 w-3" />
                          {application.vehicle_type}
                        </div>
                        {application.credit_score && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <CreditCard className="h-3 w-3" />
                            Credit: {application.credit_score}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(application.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/applications/${application.id}`)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{page * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page === totalPages - 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApplications;