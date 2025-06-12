import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Edit,
  Trash2,
  Upload,
  MessageSquare,
  User,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toStartCase } from '../../utils/formatters';

interface AuditLogEntry {
  id: string;
  application_id: string | null;
  user_id: string | null;
  action: string;
  details: any;
  is_admin_action: boolean;
  is_visible_to_user: boolean;
  created_at: string;
  application_first_name?: string;
  application_last_name?: string;
  application_email?: string;
  user_email?: string;
}

export const AuditLogViewer: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<'admin' | 'user' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadLogs();

    const auditLogChannel = supabase
      .channel('audit-log-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log'
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auditLogChannel);
    };
  }, [actionFilter, userTypeFilter]);

  const loadLogs = async (reset = true) => {
    try {
      if (reset) {
        setPage(0);
        setHasMore(true);
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      let query = supabase
        .from('activity_log_with_email')
        .select('*')
        .order('created_at', { ascending: false })
        .range(
          reset ? 0 : page * ITEMS_PER_PAGE,
          reset ? ITEMS_PER_PAGE - 1 : (page + 1) * ITEMS_PER_PAGE - 1
        );

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      if (userTypeFilter === 'admin') {
        query = query.eq('is_admin_action', true);
      } else if (userTypeFilter === 'user') {
        query = query.eq('is_admin_action', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (reset) {
        setLogs(data || []);
      } else {
        setLogs(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === ITEMS_PER_PAGE);

      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || loading || isRefreshing) return;
    loadLogs(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionIcon = (action: string) => {
    if (action.includes('document')) {
      if (action.includes('upload')) return <Upload className="h-5 w-5 text-blue-500" />;
      if (action.includes('delete')) return <Trash2 className="h-5 w-5 text-red-500" />;
      return <FileText className="h-5 w-5 text-amber-500" />;
    }

    if (action.includes('application')) {
      return <Edit className="h-5 w-5 text-green-500" />;
    }

    if (action.includes('message')) {
      return <MessageSquare className="h-5 w-5 text-purple-500" />;
    }

    if (action.includes('stage')) {
      return <Calendar className="h-5 w-5 text-indigo-500" />;
    }

    return <Clock className="h-5 w-5 text-gray-500" />;
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.application_first_name?.toLowerCase().includes(searchLower) ||
      log.application_last_name?.toLowerCase().includes(searchLower) ||
      log.application_email?.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower)
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
                      <option value="update_application">Application Update</option>
                      <option value="upload_document">Document Upload</option>
                      <option value="delete_document">Document Delete</option>
                      <option value="user_message_sent">User Message</option>
                      <option value="stage_update">Stage Update</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User Type
                    </label>
                    <select
                      value={userTypeFilter || ''}
                      onChange={(e) => setUserTypeFilter(e.target.value as 'admin' | 'user' | null || null)}
                      className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value="">All Users</option>
                      <option value="admin">Admin Actions</option>
                      <option value="user">User Actions</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getActionIcon(log.action)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {formatAction(log.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full ${log.is_admin_action ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          <User className={`h-4 w-4 ${log.is_admin_action ? 'text-purple-500' : 'text-blue-500'}`} />
                        </div>
                        <span className="ml-2 text-sm text-gray-900">
                          {log.user_email || 'Unknown User'}
                          {log.is_admin_action && <span className="ml-1 text-xs text-purple-600">(Admin)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.application_id ? (
                        <button
                          onClick={() => navigate(`/admin/applications/${log.application_id}`)}
                          className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium flex items-center"
                        >
                          {toStartCase(log.application_first_name)} {toStartCase(log.application_last_name)}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.action === 'update_application' && log.details?.old && log.details?.new && (
                        <div>
                          {Object.keys(log.details.new).filter(key =>
                            log.details.old[key] !== log.details.new[key] &&
                            log.details.old[key] !== null &&
                            log.details.new[key] !== null
                          ).map(key => (
                            <div key={key} className="text-xs">
                              <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                              <span className="text-red-500">{log.details.old[key]?.toString().substring(0, 20)}</span>{' '}
                              <span className="text-gray-500">→</span>{' '}
                              <span className="text-green-500">{log.details.new[key]?.toString().substring(0, 20)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {log.action === 'upload_document' && (
                        <span>{log.details?.category?.replace(/_/g, ' ')}</span>
                      )}

                      {log.action === 'delete_document' && (
                        <span>{log.details?.category?.replace(/_/g, ' ')}</span>
                      )}

                      {log.action === 'user_message_sent' && (
                        <span>New message</span>
                      )}

                      {log.action === 'stage_update' && (
                        <span>Stage {log.details?.stage_number} - {log.details?.status?.replace(/_/g, ' ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading || isRefreshing}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
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