import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flag, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  X, 
  ChevronDown, 
  ChevronUp,
  Filter,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

interface ApplicationFlag {
  id: string;
  application_id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface FlagViewerProps {
  applicationId?: string;
  onFlagResolved?: () => void;
}

export const FlagViewer: React.FC<FlagViewerProps> = ({ 
  applicationId,
  onFlagResolved
}) => {
  const { user } = useAuth();
  const [flags, setFlags] = useState<ApplicationFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFlag, setShowAddFlag] = useState(false);
  const [newFlag, setNewFlag] = useState({
    flag_type: '',
    severity: 'medium' as const,
    description: ''
  });
  const [addingFlag, setAddingFlag] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvingFlag, setResolvingFlag] = useState(false);

  useEffect(() => {
    loadFlags();
    
    // Set up real-time subscription
    const flagsChannel = supabase
      .channel('flags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_flags',
          filter: applicationId ? `application_id=eq.${applicationId}` : undefined
        },
        () => {
          loadFlags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flagsChannel);
    };
  }, [applicationId, severityFilter, statusFilter]);

  const loadFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('application_flags')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (applicationId) {
        query = query.eq('application_id', applicationId);
      }
      
      if (severityFilter) {
        query = query.eq('severity', severityFilter);
      }
      
      if (statusFilter === 'active') {
        query = query.is('resolved_at', null);
      } else if (statusFilter === 'resolved') {
        query = query.not('resolved_at', 'is', null);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      setFlags(data || []);
    } catch (error: any) {
      console.error('Error loading flags:', error);
      setError('Failed to load flags');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlag = async () => {
    if (!applicationId || !user) return;
    
    try {
      setAddingFlag(true);
      
      const { data, error } = await supabase
        .from('application_flags')
        .insert({
          application_id: applicationId,
          flag_type: newFlag.flag_type,
          severity: newFlag.severity,
          description: newFlag.description
        })
        .select()
        .single();

      if (error) throw error;
      
      setFlags(prev => [data, ...prev]);
      setShowAddFlag(false);
      setNewFlag({
        flag_type: '',
        severity: 'medium',
        description: ''
      });
      
      // Create notification for application owner
      const { data: application } = await supabase
        .from('applications')
        .select('user_id')
        .eq('id', applicationId)
        .single();
        
      if (application?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: `Application Flag: ${newFlag.severity.toUpperCase()}`,
            message: `Your application has been flagged: ${newFlag.description}`,
            read: false
          });
      }
    } catch (error: any) {
      console.error('Error adding flag:', error);
    } finally {
      setAddingFlag(false);
    }
  };

  const handleResolveFlag = async () => {
    if (!showResolveModal || !user) return;
    
    try {
      setResolvingFlag(true);
      
      const { error } = await supabase
        .from('application_flags')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', showResolveModal);

      if (error) throw error;
      
      // Update local state
      setFlags(prev => 
        prev.map(flag => 
          flag.id === showResolveModal
            ? { ...flag, resolved_at: new Date().toISOString(), resolved_by: user.id }
            : flag
        )
      );
      
      setShowResolveModal(null);
      setResolutionNote('');
      
      if (onFlagResolved) {
        onFlagResolved();
      }
    } catch (error: any) {
      console.error('Error resolving flag:', error);
    } finally {
      setResolvingFlag(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFlags = flags.filter(flag => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      flag.flag_type.toLowerCase().includes(searchLower) ||
      flag.description.toLowerCase().includes(searchLower) ||
      flag.severity.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Flag className="h-5 w-5 text-[#3BAA75] mr-2" />
            Application Flags
          </h2>
          <div className="flex items-center gap-2">
            {applicationId && (
              <button
                onClick={() => setShowAddFlag(true)}
                className="p-2 text-[#3BAA75] hover:bg-[#3BAA75]/10 rounded-full transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={loadFlags}
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
              placeholder="Search flags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
            />
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={severityFilter || ''}
                      onChange={(e) => setSeverityFilter(e.target.value || null)}
                      className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value="">All Severities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter || ''}
                      onChange={(e) => setStatusFilter(e.target.value as any || null)}
                      className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="overflow-x-auto">
        {error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={loadFlags}
              className="text-[#3BAA75] hover:text-[#2D8259]"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-gray-300 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading flags...</p>
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="p-8 text-center">
            <Flag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No flags found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFlags.map((flag) => (
              <div key={flag.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(flag.severity)}`}>
                        {flag.severity.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900">
                        {flag.flag_type}
                      </span>
                      {flag.resolved_at && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {flag.description}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Created: {format(new Date(flag.created_at), 'MMM d, yyyy h:mm a')}
                      {flag.resolved_at && (
                        <span className="ml-4">
                          Resolved: {format(new Date(flag.resolved_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!flag.resolved_at && (
                    <button
                      onClick={() => setShowResolveModal(flag.id)}
                      className="px-3 py-1 text-sm text-[#3BAA75] hover:bg-[#3BAA75]/10 rounded-lg transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Flag Modal */}
      {showAddFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Flag to Application
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flag Type
                </label>
                <input
                  type="text"
                  value={newFlag.flag_type}
                  onChange={(e) => setNewFlag({ ...newFlag, flag_type: e.target.value })}
                  placeholder="e.g., Credit Issue, Document Problem"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={newFlag.severity}
                  onChange={(e) => setNewFlag({ ...newFlag, severity: e.target.value as any })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowAddFlag(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFlag}
                disabled={!newFlag.flag_type || !newFlag.description || addingFlag}
                className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
              >
                {addingFlag ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Flag'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Flag Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resolve Flag
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Note (Optional)
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowResolveModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveFlag}
                disabled={resolvingFlag}
                className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50"
              >
                {resolvingFlag ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Resolve Flag'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};