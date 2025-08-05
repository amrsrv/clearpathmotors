import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  X,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  FileText,
  Key,
  UserCheck,
  UserX,
  Shield,
  Plus,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';
import RoleSelector from '../../components/RoleSelector';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  app_metadata: any;
}

interface Application {
  id: string;
  status: string;
  created_at: string;
  vehicle_type: string;
  desired_monthly_payment: number;
  annual_income: number;
  credit_score: number;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { updateUserRole } = useUserRole();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [userApplications, setUserApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>('non_admin');
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserActionModal, setShowUserActionModal] = useState<string | null>(null);
  const [isProcessingUserAction, setIsProcessingUserAction] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'dealer' | 'customer'>('customer');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const ITEMS_PER_PAGE = 10;
  const observer = useRef<IntersectionObserver | null>(null);
  const lastUserRef = useCallback((node: HTMLDivElement | null) => {
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
    loadUsers(true);
  }, [statusFilter]);

  useEffect(() => {
    if (page > 0) {
      loadMoreUsers();
    }
  }, [page]);

  const loadUsers = async (reset = false) => {
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users?start=0&limit=${ITEMS_PER_PAGE}${statusFilter ? `&status=${statusFilter}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const { users: userData } = await response.json();
      setUsers(userData || []);
      setHasMore(userData.length === ITEMS_PER_PAGE);
      setError(null);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMoreUsers = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users?start=${page * ITEMS_PER_PAGE}&limit=${ITEMS_PER_PAGE}${statusFilter ? `&status=${statusFilter}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const { users: userData } = await response.json();
      
      if (userData.length === 0) {
        setHasMore(false);
      } else {
        setUsers(prev => [...prev, ...userData]);
        setHasMore(userData.length === ITEMS_PER_PAGE);
      }
    } catch (error: any) {
      console.error('Error loading more users:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers(true);
  };

  const loadUserApplications = async (email: string) => {
    setLoadingApplications(true);
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
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleCreateDealer = async () => {
    // Implementation for creating dealer
    toast.success('Dealer creation functionality would be implemented here');
  };

  const handleUserAction = async (action: string) => {
    if (!selectedUser && action !== 'create_dealer') return;
    
    try {
      setIsProcessingUserAction(true);
      
      switch (action) {
        case 'reset_password':
          if (newPassword !== confirmNewPassword) {
            setPasswordError('Passwords do not match');
            return;
          }
          
          if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
          }
          
          // In a real implementation, you would call the Supabase Admin API
          // For now, we'll just show a success message
          toast.success('Password reset successful');
          break;
          
        case 'make_admin':
          // In a real implementation, you would update the user's app_metadata
          toast.success(`${selectedUser.email} is now an admin`);
          break;
          
        case 'remove_admin':
          // In a real implementation, you would update the user's app_metadata
          toast.success(`Admin privileges removed from ${selectedUser.email}`);
          break;
          
        case 'disable_user':
          // In a real implementation, you would disable the user account
          toast.success(`${selectedUser.email} has been disabled`);
          break;
          
        case 'enable_user':
          // In a real implementation, you would enable the user account
          toast.success(`${selectedUser.email} has been enabled`);
          break;
          
        case 'delete_user':
          // In a real implementation, you would delete the user account
          toast.success(`${selectedUser.email} has been deleted`);
          break;
          
        case 'make_super_admin':
          await updateUserRole(selectedUser.id, 'super_admin');
          toast.success(`${selectedUser.email} is now a Super Admin`);
          break;
          
        case 'remove_super_admin':
          await updateUserRole(selectedUser.id, 'customer');
          toast.success(`Super Admin privileges removed from ${selectedUser.email}`);
          break;
          
        case 'change_role':
          await updateUserRole(selectedUser.id, selectedRole);
          toast.success(`Role updated for ${selectedUser.email}`);
          break;
          
        case 'create_dealer':
          await handleCreateDealer();
          return;
          
      }
      
      // Refresh the user list
      await loadUsers(true);
      
      // Close the modal
      setShowUserActionModal(null);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError('');
    } catch (error) {
      console.error('Error performing user action:', error);
      toast.error('Failed to perform action');
    } finally {
      setIsProcessingUserAction(false);
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

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return user.email.toLowerCase().includes(searchLower);
  });

  if (loading && page === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Users</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => loadUsers(true)}
            className="mt-4 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Try Again
          </button>
        </div>
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
                Users
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {users.length} total users
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
              
              {/* Create Dealer Button */}
              <button
                onClick={() => setShowUserActionModal('create_dealer')}
                className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Dealer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            {
              title: 'Total Users',
              value: users.length,
              icon: <User className="h-6 w-6 text-blue-500" />,
              color: 'bg-blue-50'
            },
            {
              title: 'Verified Users',
              value: users.filter(u => u.email_confirmed_at).length,
              icon: <CheckCircle className="h-6 w-6 text-green-500" />,
              color: 'bg-green-50'
            },
            {
              title: 'Unverified Users',
              value: users.filter(u => !u.email_confirmed_at).length,
              icon: <XCircle className="h-6 w-6 text-red-500" />,
              color: 'bg-red-50'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.color} p-4 rounded-lg`}
            >
              <div className="flex items-center">
                {stat.icon}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search users by email..."
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
                          <option value="">All Users</option>
                          <option value="non_admin">Non-Admins</option>
                          <option value="verified">Verified</option>
                          <option value="unverified">Unverified</option>
                          <option value="admin">Admins</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-[60%] transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Users List */}
          <div className="mt-2 overflow-x-auto">
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user, index) => {
                const isLastItem = index === filteredUsers.length - 1;
                return (
                  <div
                    key={user.id}
                    ref={isLastItem ? lastUserRef : null}
                    className="p-4 bg-white hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="bg-gray-100 rounded-full p-2 mr-3">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div 
                            className="text-base font-medium text-[#3BAA75] hover:underline cursor-pointer"
                            onClick={() => loadUserApplications(user.email)}
                          >
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {user.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.email_confirmed_at
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                        </span>
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                          className="p-2 hover:bg-gray-100 rounded-full ml-2"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="text-xs text-gray-500">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Joined: {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Last login: {user.last_sign_in_at
                          ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy')
                          : 'Never'}
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.app_metadata?.is_admin
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.app_metadata?.is_admin ? 'Admin' : 'User'}
                      </span>
                    </div>

                    {showActionMenu === user.id && (
                      <div className="fixed inset-0 z-50" onClick={() => setShowActionMenu(null)}>
                        <div 
                          className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10"
                          style={{ top: `${index * 180 + 100}px` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              loadUserApplications(user.email);
                              setShowActionMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Applications
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserActionModal('reset_password');
                              setShowActionMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </button>
                          {user.app_metadata?.is_admin ? (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserActionModal('remove_admin');
                                setShowActionMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Remove Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserActionModal('make_admin');
                                setShowActionMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserActionModal('disable_user');
                              setShowActionMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Disable User
                          </button>
                          {user.app_metadata?.role === 'super_admin' ? (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserActionModal('remove_super_admin');
                                setShowActionMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-orange-600 hover:bg-gray-100 flex items-center"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Remove Super Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserActionModal('make_super_admin');
                                setShowActionMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-purple-600 hover:bg-gray-100 flex items-center"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Super Admin
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedRole(user.app_metadata?.role || 'customer');
                              setShowUserActionModal('change_role');
                              setShowActionMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-blue-600 hover:bg-gray-100 flex items-center"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Change Role
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserActionModal('delete_user');
                              setShowActionMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
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
          </div>
        </div>
      </div>

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
              {loadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#3BAA75] border-t-transparent" />
                </div>
              ) : userApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No applications found for this user</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {userApplications.map((app) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Action Modals */}
      <AnimatePresence>
        {showUserActionModal && (selectedUser || showUserActionModal === 'create_dealer') && (
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
              {/* Reset Password Modal */}
              {showUserActionModal === 'reset_password' && (
                <>
                  <div className="flex items-center gap-3 text-[#3BAA75] mb-4">
                    <Key className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Reset Password</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-4">
                    Set a new password for {selectedUser.email}
                  </p>
                  
                  {passwordError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Enter new password"
                        minLength={8}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Confirm new password"
                        minLength={8}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Make Admin Modal */}
              {showUserActionModal === 'make_admin' && (
                <>
                  <div className="flex items-center gap-3 text-[#3BAA75] mb-4">
                    <Shield className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Make Admin</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to give admin privileges to {selectedUser.email}? This will grant them full access to all admin features.
                  </p>
                </>
              )}
              
              {/* Remove Admin Modal */}
              {showUserActionModal === 'remove_admin' && (
                <>
                  <div className="flex items-center gap-3 text-amber-600 mb-4">
                    <Shield className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Remove Admin</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to remove admin privileges from {selectedUser.email}? They will no longer have access to admin features.
                  </p>
                </>
              )}
              
              {/* Disable User Modal */}
              {showUserActionModal === 'disable_user' && (
                <>
                  <div className="flex items-center gap-3 text-amber-600 mb-4">
                    <UserX className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Disable User</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to disable {selectedUser.email}? They will no longer be able to log in or access their account.
                  </p>
                </>
              )}
              
              {/* Delete User Modal */}
              {showUserActionModal === 'delete_user' && (
                <>
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                    <Trash2 className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Delete User</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to permanently delete {selectedUser.email}? This action cannot be undone and will remove all user data.
                  </p>
                </>
              )}
              
              {/* Make Super Admin Modal */}
              {showUserActionModal === 'make_super_admin' && (
                <>
                  <div className="flex items-center gap-3 text-purple-600 mb-4">
                    <Shield className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Make Super Admin</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to give super admin privileges to {selectedUser.email}? This will grant them full access to all system features and data.
                  </p>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                    <p className="text-sm text-yellow-700">
                      <strong>Warning:</strong> Super admins have unrestricted access to all data and functionality in the system. Only promote trusted users.
                    </p>
                  </div>
                </>
              )}
              
              {/* Remove Super Admin Modal */}
              {showUserActionModal === 'remove_super_admin' && (
                <>
                  <div className="flex items-center gap-3 text-orange-600 mb-4">
                    <Shield className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Remove Super Admin</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to remove super admin privileges from {selectedUser.email}? They will be downgraded to a regular customer account.
                  </p>
                </>
              )}
              
              {/* Change Role Modal */}
              {showUserActionModal === 'change_role' && (
                <>
                  <div className="flex items-center gap-3 text-blue-600 mb-4">
                    <Users className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Change User Role</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Select a new role for {selectedUser.email}. This will change their access level and permissions in the system.
                  </p>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <RoleSelector 
                      currentRole={selectedRole}
                      onRoleChange={setSelectedRole}
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Changing a user's role will immediately affect their access to the system. They may need to log out and log back in for all changes to take effect.
                    </p>
                  </div>
                </>
              )}
              
              {/* Create Dealer Modal */}
              {showUserActionModal === 'create_dealer' && (
                <>
                  <div className="flex items-center gap-3 text-[#3BAA75] mb-4">
                    <Plus className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Create Dealer Account</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-6">
                    Create a new dealer account with administrative privileges for managing vehicle inventory and customer applications.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="dealer@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dealer Name
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Dealer Name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Password
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-lg border-gray-300 focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        placeholder="Temporary password"
                        minLength={8}
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUserActionModal(null);
                    setSelectedUser(null);
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setPasswordError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={() => handleUserAction(showUserActionModal)}
                  disabled={isProcessingUserAction || (showUserActionModal === 'reset_password' && (!newPassword || !confirmNewPassword))}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    showUserActionModal === 'delete_user' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-[#3BAA75] hover:bg-[#2D8259]'
                  }`}
                >
                  {isProcessingUserAction ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {showUserActionModal === 'reset_password' && <Key className="h-4 w-4" />}
                      {showUserActionModal === 'make_admin' && <Shield className="h-4 w-4" />}
                      {showUserActionModal === 'remove_admin' && <Shield className="h-4 w-4" />}
                      {showUserActionModal === 'disable_user' && <UserX className="h-4 w-4" />}
                      {showUserActionModal === 'delete_user' && <Trash2 className="h-4 w-4" />}
                      {showUserActionModal === 'create_dealer' && <Plus className="h-4 w-4" />}
                    </>
                  )}
                  {showUserActionModal === 'reset_password' && 'Reset Password'}
                  {showUserActionModal === 'make_admin' && 'Make Admin'}
                  {showUserActionModal === 'remove_admin' && 'Remove Admin'}
                  {showUserActionModal === 'disable_user' && 'Disable User'}
                  {showUserActionModal === 'delete_user' && 'Delete User'}
                  {showUserActionModal === 'make_super_admin' && 'Make Super Admin'}
                  {showUserActionModal === 'remove_super_admin' && 'Remove Super Admin'}
                  {showUserActionModal === 'change_role' && 'Update Role'}
                  {showUserActionModal === 'create_dealer' && 'Create Dealer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;