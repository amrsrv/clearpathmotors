import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  User, 
  Calendar, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';

interface AuditLogItem {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
}

interface AuditLogViewerProps {
  applicationId?: string;
  userId?: string;
  limit?: number;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ 
  applicationId, 
  userId,
  limit = 50
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [adminDetails, setAdminDetails] = useState<Record<string, { email: string; name: string }>>({});

  useEffect(() => {
    loadAuditLogs();
  }, [applicationId, userId, actionFilter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (applicationId) {
        query = query.eq('target_id', applicationId);
      }
      
      if (userId) {
        query = query.eq('admin_id', userId);
      }
      
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      setLogs(data || []);
      
      // Load admin details
      const adminIds = [...new Set(data?.map(log => log.admin_id).filter(Boolean) || [])];
      if (adminIds.length > 0) {
        loadAdminDetails(adminIds);
      }
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminDetails = async (adminIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .in('id', adminIds);

      if (error) throw error;
      
      const details: Record<string, { email: string; name: string }> = {};
      data?.forEach(admin => {
        details[admin.id] = {
          email: admin.email,
          name: admin.email.split('@')[0]
        };
      });
      
      setAdminDetails(details);
    } catch (error) {
      console.error('Error loading admin details:', error);
    }
  };

  const getActionLabel = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTargetTypeLabel = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAdminName = (adminId: string) => {
    if (!adminId) return 'System';
    return adminDetails[adminId]?.name || adminId.slice(0, 8);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.target_type.toLowerCase().includes(searchLower) ||
      log.target_id.toLowerCase().includes(searchLower) ||
      getAdminName(log.admin_id).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 text-[#3BAA75] mr-2" />
            Audit Log
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={loadAuditLogs}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
            />
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type
                </label>
                <select
                  value={actionFilter || ''}
                  onChange={(e) => setActionFilter(e.target.value || null)}
                  className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                >
                  <option value="">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={loadAuditLogs}
              className="text-[#3BAA75] hover:text-[#2D8259]"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-gray-300 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        {getAdminName(log.admin_id).charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {getAdminName(log.admin_id)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {adminDetails[log.admin_id]?.email || 'System'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {getTargetTypeLabel(log.target_type)}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {log.target_id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.details && (
                      <button
                        onClick={() => alert(JSON.stringify(log.details, null, 2))}
                        className="text-[#3BAA75] hover:text-[#2D8259]"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};