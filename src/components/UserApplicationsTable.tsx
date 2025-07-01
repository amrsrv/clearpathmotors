import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  ChevronRight, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  ArrowUpDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Car
} from 'lucide-react';
import { format } from 'date-fns';
import type { Application } from '../types/database';

interface UserApplicationsTableProps {
  applications: Application[];
  onSelectApplication: (application: Application) => void;
  isLoading?: boolean;
}

const UserApplicationsTable: React.FC<UserApplicationsTableProps> = ({ 
  applications, 
  onSelectApplication,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter and sort applications
  const filteredApplications = applications
    .filter(app => {
      // Apply search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (app.first_name?.toLowerCase().includes(searchLower) || false) ||
        (app.last_name?.toLowerCase().includes(searchLower) || false) ||
        (app.email?.toLowerCase().includes(searchLower) || false) ||
        (app.vehicle_type?.toLowerCase().includes(searchLower) || false);
      
      // Apply status filter
      const matchesStatus = statusFilter ? app.status === statusFilter : true;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'status') {
        const statusOrder = {
          'submitted': 1,
          'under_review': 2,
          'pending_documents': 3,
          'pre_approved': 4,
          'vehicle_selection': 5,
          'final_approval': 6,
          'finalized': 7
        };
        const statusA = statusOrder[a.status] || 0;
        const statusB = statusOrder[b.status] || 0;
        return sortDirection === 'asc' ? statusA - statusB : statusB - statusA;
      }
      return 0;
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortDirection]);

  const handleSort = (column: 'created_at' | 'status') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Submitted</span>;
      case 'under_review':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Under Review</span>;
      case 'pending_documents':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Pending Documents</span>;
      case 'pre_approved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Pre-Approved</span>;
      case 'vehicle_selection':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Vehicle Selection</span>;
      case 'final_approval':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">Final Approval</span>;
      case 'finalized':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Finalized</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending_documents':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'pre_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'vehicle_selection':
        return <Car className="h-4 w-4 text-purple-500" />;
      case 'final_approval':
        return <CheckCircle className="h-4 w-4 text-indigo-500" />;
      case 'finalized':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">My Applications</h2>
      
      {applications.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No applications found</h3>
          <p className="text-gray-500">You haven't submitted any applications yet.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={statusFilter || ''}
                        onChange={(e) => setStatusFilter(e.target.value || null)}
                        className="w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
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
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort By
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'created_at' | 'status')}
                          className="flex-1 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                        >
                          <option value="created_at">Date</option>
                          <option value="status">Status</option>
                        </select>
                        <button
                          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <ArrowUpDown className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      className="flex items-center gap-1"
                      onClick={() => handleSort('created_at')}
                    >
                      Date
                      {sortBy === 'created_at' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      className="flex items-center gap-1"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {sortBy === 'status' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {format(new Date(application.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {application.vehicle_type || 'Not specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(application.status)}
                        <span className="ml-2">
                          {getStatusBadge(application.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {application.loan_amount_min && application.loan_amount_max ? 
                          `$${application.loan_amount_min.toLocaleString()} - $${application.loan_amount_max.toLocaleString()}` : 
                          'Not specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => onSelectApplication(application)}
                        className="text-[#3BAA75] hover:text-[#2D8259] font-medium flex items-center"
                      >
                        View Details
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length} applications
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserApplicationsTable;