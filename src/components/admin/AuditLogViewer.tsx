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
  ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
  admin?: {
    email: string;
  };
}

export const AuditLogViewer: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
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
        .from('audit_logs')
        .select(`
          *,
          admin:admin_id(email)
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
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMoreLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          admin:admin_id(email)
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
      console.error('Error loading more audit logs:', error);
      toast.error('Failed to load more audit logs');
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
      log.target_type.toLowerCase().includes(searchLower) ||
      log.admin?.email?.toLowerCase().includes(searchLower) ||
      log.target_id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Audit Log</h2>
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
              placeholder="Search audit logs..."
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
                      <option value="insert_application">Create Application</option>
                      <option value="update_application">Update Application</option>
                      <option value="delete_application">Delete Application</option>
                      <option value="upload_document">Upload Document</option>
                      <option value="status_update">Status Update</option>
                      <option value="bulk_status_update">Bulk Status Update</option>
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
            <p>No audit logs found</p>
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
                    Admin
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
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
                            {log.admin?.email || 'System'}
                          </div>
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
                      <div className="text-sm text-gray-900">{log.target_type}</div>
                      <div className="text-xs text-gray-500">{log.target_id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.target_type === 'application' && (
                        <button
                          onClick={() => navigate(`/admin/applications/${log.target_id}`)}
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

// For TypeScript
const Plus = ({ className }: { className?: string }) => {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
};

const Edit = ({ className }: { className?: string }) => {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
};