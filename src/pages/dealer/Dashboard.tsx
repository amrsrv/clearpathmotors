import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Users, 
  Car, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const DealerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDealer } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState([]);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingDocuments: 0,
    preApproved: 0,
    finalized: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user || !isDealer) {
      navigate('/login');
      return;
    }

    loadDashboardData();
  }, [user, isDealer]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Load dealer profile
      const { data: profileData, error: profileError } = await supabase
        .from('dealer_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        console.error('Error loading dealer profile:', profileError);
        throw new Error('Failed to load dealer profile. Please try again.');
      }
      
      setDealerProfile(profileData);
      
      // Load applications assigned to this dealer
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*')
        .eq('dealer_id', user.id)
        .order('created_at', { ascending: false });
        
      if (applicationsError) {
        console.error('Error loading applications:', applicationsError);
        throw new Error('Failed to load applications. Please try again.');
      }
      
      setApplications(applicationsData || []);
      
      // Calculate stats
      const totalCount = applicationsData?.length || 0;
      const pendingCount = applicationsData?.filter(app => app.status === 'pending_documents').length || 0;
      const approvedCount = applicationsData?.filter(app => app.status === 'pre_approved').length || 0;
      const finalizedCount = applicationsData?.filter(app => app.status === 'finalized').length || 0;
      
      setStats({
        totalApplications: totalCount,
        pendingDocuments: pendingCount,
        preApproved: approvedCount,
        finalized: finalizedCount
      });
      
    } catch (error) {
      console.error('Error in loadDashboardData:', error);
      setError(error.message || 'Failed to load dashboard data. Please try again.');
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status) => {
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

  const formatStatus = (status) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const filteredApplications = applications.filter(app => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      app.first_name?.toLowerCase().includes(searchLower) ||
      app.last_name?.toLowerCase().includes(searchLower) ||
      app.email?.toLowerCase().includes(searchLower) ||
      app.phone?.toLowerCase().includes(searchLower);
      
    const matchesStatus = !statusFilter || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => loadDashboardData()}
              className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to User Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Dealer Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome, {dealerProfile?.name || 'Dealer'}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Total Applications',
              value: stats.totalApplications,
              icon: <FileText className="h-6 w-6 text-blue-500" />,
              color: 'bg-blue-50'
            },
            {
              title: 'Pending Documents',
              value: stats.pendingDocuments,
              icon: <Clock className="h-6 w-6 text-orange-500" />,
              color: 'bg-orange-50'
            },
            {
              title: 'Pre-Approved',
              value: stats.preApproved,
              icon: <CheckCircle className="h-6 w-6 text-green-500" />,
              color: 'bg-green-50'
            },
            {
              title: 'Finalized',
              value: stats.finalized,
              icon: <Car className="h-6 w-6 text-gray-500" />,
              color: 'bg-gray-50'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.color} rounded-lg p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Public Application Link */}
        {dealerProfile?.public_slug && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Your Public Application Link</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`${window.location.origin}/apply/${dealerProfile.public_slug}`}
                readOnly
                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-700"
              />
              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(`${window.location.origin}/apply/${dealerProfile.public_slug}`);
                    toast.success('Link copied to clipboard');
                  } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    toast.error('Failed to copy to clipboard');
                  }
                }}
                className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Applications */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Applications</h2>
              <button
                onClick={() => navigate('/dealer/applications/new')}
                className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>New Application</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
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
              </div>

              {showFilters && (
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
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredApplications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter
                    ? "Try adjusting your search filters"
                    : "No applications have been assigned to you yet"}
                </p>
                <button
                  onClick={() => navigate('/dealer/applications/new')}
                  className="mt-4 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                >
                  Create Application
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((app) => (
                    <tr 
                      key={app.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/dealer/applications/${app.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.first_name} {app.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {app.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{app.email}</div>
                        <div className="text-sm text-gray-500">{app.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.vehicle_type || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${app.loan_amount_min?.toLocaleString()} - ${app.loan_amount_max?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerDashboard;