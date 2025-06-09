import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Search, 
  User, 
  FileText, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Filter,
  Calendar,
  ArrowRight,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ActivityLog {
  id: string;
  user_id: string | null;
  application_id: string | null;
  action: string;
  details: any;
  is_admin_action: boolean;
  is_visible_to_user: boolean;
  created_at: string;
  user?: {
    email: string;
  };
}

export const AuditLogViewer: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('7days');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadLogs(true);
  }, [actionFilter, dateFilter]);

  useEffect(() => {
    if (page > 0) {
      loadMoreLogs();
    }
  }, [page]);

  const loadLogs = async (reset = false) => {
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          user:user_id(email)
        `)
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);
        
      // Apply filters
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }
      
      if (dateFilter) {
        let startDate;
        switch (dateFilter) {
          case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            startDate = subDays(new Date(), 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case '7days':
            startDate = subDays(new Date(), 7);
            break;
          case '30days':
            startDate = subDays(new Date(), 30);
            break;
          default:
            startDate = null;
        }
        
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setLogs(data || []);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMoreLogs = async () => {
    try {
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          user:user_id(email)
        `)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
        
      // Apply filters
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }
      
      if (dateFilter) {
        let startDate;
        switch (dateFilter) {
          case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            startDate = subDays(new Date(), 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case '7days':
            startDate = subDays(new Date(), 7);
            break;
          case '30days':
            startDate = subDays(new Date(), 30);
            break;
          default:
            startDate = null;
        }
        
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setLogs(prev => [...prev, ...data]);
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error loading more activity logs:', error);
      toast.error('Failed to load more activity logs');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLogs(true);
  };

  const formatAction = (action: string): string => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('insert')) {
      return <Plus className="h-4 w-4 text-green-500" />;
    } else if (action.includes('update')) {
      return <Edit className="h-4 w-4 text-blue-500" />;
    } else if (action.includes('delete')) {
      return <Trash2 className="h-4 w-4 text-red-500" />;
    } else {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.user?.email?.toLowerCase().includes(searchLower) ||
      (log.application_id && log.application_id.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Activity Log</h2>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search activity logs..."
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
                      Action Type
                    </label>
                    <select
                      value={actionFilter || ''}
                      onChange={(e) => setActionFilter(e.target.value || null)}
                      className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value="">All Actions</option>
                      <option value="application_created">Application Created</option>
                      <option value="application_updated">Application Updated</option>
                      <option value="document_uploaded">Document Uploaded</option>
                      <option value="status_changed">Status Changed</option>
                      <option value="stage_changed">Stage Changed</option>
                      <option value="admin_message">Admin Message</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Period
                    </label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="">All Time</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {loading && page === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity logs found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-[#3BAA75] rounded-full flex items-center justify-center text-white">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.user?.email || 'System'}
                          </div>
                          {log.is_admin_action && (
                            <div className="text-xs text-purple-600">Admin Action</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getActionIcon(log.action)}
                        <span className="ml-2 text-sm text-gray-900">{formatAction(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.application_id ? (
                        <div className="text-sm text-gray-900">{log.application_id.slice(0, 8)}...</div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.application_id && (
                        <button
                          onClick={() => navigate(`/admin/applications/${log.application_id}`)}
                          className="text-[#3BAA75] hover:text-[#2D8259] flex items-center"
                        >
                          View Application
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {loading && page > 0 && (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-6 w-6 text-[#3BAA75] animate-spin" />
              </div>
            )}
            
            {hasMore && !loading && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-4 py-2 text-[#3BAA75] hover:bg-[#3BAA75]/10 rounded-lg transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};