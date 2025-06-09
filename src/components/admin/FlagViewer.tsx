import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flag, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Filter,
  ArrowRight,
  X,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ApplicationFlag {
  id: string;
  application_id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  application?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const FlagViewer: React.FC = () => {
  const navigate = useNavigate();
  const [flags, setFlags] = useState<ApplicationFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<ApplicationFlag | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    loadFlags();
    
    // Set up real-time subscription for flags
    const flagsChannel = supabase
      .channel('admin-flags')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_flags'
        },
        () => {
          loadFlags();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(flagsChannel);
    };
  }, [severityFilter, statusFilter]);

  const loadFlags = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('application_flags')
        .select(`
          *,
          application:application_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });
        
      // Apply filters
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
    } catch (error) {
      console.error('Error loading flags:', error);
      toast.error('Failed to load flags');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFlags();
  };

  const handleResolveFlag = async () => {
    if (!selectedFlag) return;
    
    try {
      setIsResolving(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Update flag
      const { error } = await supabase
        .from('application_flags')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', selectedFlag.id);
        
      if (error) throw error;
      
      toast.success('Flag resolved successfully');
      setSelectedFlag(null);
      setResolutionNote('');
      loadFlags();
    } catch (error) {
      console.error('Error resolving flag:', error);
      toast.error('Failed to resolve flag');
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'critical':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredFlags = flags.filter(flag => {
    const searchLower = searchTerm.toLowerCase();
    return (
      flag.flag_type.toLowerCase().includes(searchLower) ||
      flag.description.toLowerCase().includes(searchLower) ||
      flag.application?.first_name?.toLowerCase().includes(searchLower) ||
      flag.application?.last_name?.toLowerCase().includes(searchLower) ||
      flag.application?.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Application Flags</h2>
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
              placeholder="Search flags..."
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
                    <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter || ''}
                      onChange={(e) => setStatusFilter(e.target.value as 'active' | 'resolved' | null || null)}
                      className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-[#3BAA75] animate-spin" />
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Flag className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No flags found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFlags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {flag.flag_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(flag.severity)}`}>
                        {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {flag.application?.first_name} {flag.application?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{flag.application?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(flag.created_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {flag.resolved_at ? (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-700">Resolved</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                          <span className="text-sm text-amber-700">Active</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/admin/applications/${flag.application_id}`)}
                          className="text-[#3BAA75] hover:text-[#2D8259] flex items-center"
                        >
                          View
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </button>
                        
                        {!flag.resolved_at && (
                          <button
                            onClick={() => setSelectedFlag(flag)}
                            className="text-green-600 hover:text-green-700 flex items-center"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Flag Modal */}
      <AnimatePresence>
        {selectedFlag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-[#3BAA75]">
                  <Flag className="h-6 w-6" />
                  <h3 className="text-lg font-semibold">Resolve Flag</h3>
                </div>
                <button
                  onClick={() => setSelectedFlag(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedFlag.severity)}`}>
                      {selectedFlag.severity.charAt(0).toUpperCase() + selectedFlag.severity.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(selectedFlag.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {selectedFlag.flag_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-700">{selectedFlag.description}</p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Note
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  rows={3}
                  placeholder="Add notes about how this flag was resolved..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedFlag(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleResolveFlag}
                  disabled={isResolving}
                  className="px-4 py-2 text-white bg-[#3BAA75] rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isResolving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Resolve Flag
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};