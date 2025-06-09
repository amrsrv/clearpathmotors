import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isYesterday, subDays } from 'date-fns';
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  BarChart3,
  PlusCircle,
  ArrowRight,
  Bell,
  Mail,
  Phone,
  MessageSquare,
  FileCheck,
  UserCheck,
  RefreshCw,
  ChevronRight,
  Inbox,
  BarChart4,
  TrendingUp,
  TrendingDown,
  Zap,
  CheckSquare,
  XCircle,
  HelpCircle,
  FileWarning,
  UserPlus,
  Send,
  Flag
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Application, Document, ApplicationStage, Notification } from '../../types/database';
import { MessageCenter } from '../../components/admin/MessageCenter';
import { NotificationCenter } from '../../components/admin/NotificationCenter';
import { AuditLogViewer } from '../../components/admin/AuditLogViewer';
import { FlagViewer } from '../../components/admin/FlagViewer';

interface AdminDashboardProps {}

interface AdminUser {
  id: string;
  email: string;
  last_sign_in_at: string;
  app_metadata: {
    is_admin: boolean;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completed: boolean;
  applicationId?: string;
  userId?: string;
}

interface ActivityItem {
  id: string;
  action: string;
  details: any;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
  };
  applicationId?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    underReview: 0,
    approved: 0,
    pendingFollowup: 0,
    rejected: 0,
    newThisWeek: 0
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<{id: string, message: string, type: 'warning' | 'critical'}[]>([]);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [applicationTrend, setApplicationTrend] = useState<number[]>([]);
  const [approvalRate, setApprovalRate] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'notifications' | 'audit' | 'flags'>('overview');

  useEffect(() => {
    loadDashboardData();
    setupRealtimeSubscriptions();
  }, []);

  const setupRealtimeSubscriptions = () => {
    // Applications changes
    const applicationsChannel = supabase
      .channel('admin-dashboard-applications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        (payload) => {
          console.log('Application change received:', payload);
          
          // Reload applications to update document counts
          loadDashboardData();
          
          // Show toast notification
          if (payload.eventType === 'INSERT') {
            toast.success('New application submitted');
          } else if (payload.eventType === 'UPDATE') {
            toast.success('Application updated');
          }
        }
      )
      .subscribe();

    // Documents changes
    const documentsChannel = supabase
      .channel('admin-dashboard-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        (payload) => {
          console.log('Document change received:', payload);
          
          // Reload dashboard data
          loadDashboardData();
          
          // Show toast notification
          if (payload.eventType === 'INSERT') {
            toast.success('New document uploaded');
          }
        }
      )
      .subscribe();

    // Activity log changes
    const activityLogChannel = supabase
      .channel('admin-dashboard-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log'
        },
        (payload) => {
          console.log('Activity log change received:', payload);
          
          // Refresh activity log
          loadActivityLog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(activityLogChannel);
    };
  };

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminUser({
          id: user.id,
          email: user.email || '',
          last_sign_in_at: user.last_sign_in_at || '',
          app_metadata: {
            is_admin: user.app_metadata?.is_admin || false
          }
        });
      }

      // Load application stats
      await loadApplicationStats();
      
      // Load tasks
      await loadTasks();
      
      // Load activity log
      await loadActivityLog();
      
      // Load alerts
      await loadAlerts();
      
      // Load application trends
      await loadApplicationTrends();

      setError(null);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadApplicationStats = async () => {
    try {
      // Get total applications
      const { count: totalCount, error: totalError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      // Get under review applications
      const { count: underReviewCount, error: underReviewError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review');

      // Get approved applications
      const { count: approvedCount, error: approvedError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pre_approved');

      // Get pending documents applications
      const { count: pendingDocsCount, error: pendingDocsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_documents');

      // Get rejected applications (using final_approval as proxy since there's no rejected status)
      const { count: rejectedCount, error: rejectedError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'final_approval');

      // Get new applications this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: newThisWeekCount, error: newThisWeekError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      if (totalError || underReviewError || approvedError || pendingDocsError || rejectedError || newThisWeekError) {
        throw new Error('Error fetching application stats');
      }

      setStats({
        totalApplications: totalCount || 0,
        underReview: underReviewCount || 0,
        approved: approvedCount || 0,
        pendingFollowup: pendingDocsCount || 0,
        rejected: rejectedCount || 0,
        newThisWeek: newThisWeekCount || 0
      });

      // Calculate approval rate
      if (totalCount && totalCount > 0) {
        setApprovalRate(Math.round((approvedCount || 0) / totalCount * 100));
      }
    } catch (error) {
      console.error('Error loading application stats:', error);
      throw error;
    }
  };

  const loadTasks = async () => {
    try {
      // In a real app, you would fetch tasks from a database
      // For this demo, we'll generate tasks based on application data
      
      // Get applications that need attention
      const { data: pendingDocApps, error: pendingDocError } = await supabase
        .from('applications')
        .select('id, first_name, last_name, status, updated_at')
        .eq('status', 'pending_documents')
        .order('updated_at', { ascending: true })
        .limit(3);
        
      const { data: underReviewApps, error: underReviewError } = await supabase
        .from('applications')
        .select('id, first_name, last_name, status, updated_at')
        .eq('status', 'under_review')
        .order('updated_at', { ascending: true })
        .limit(3);
        
      if (pendingDocError || underReviewError) {
        throw new Error('Error fetching task data');
      }
      
      const generatedTasks: Task[] = [];
      
      // Add tasks for pending document applications
      pendingDocApps?.forEach((app, index) => {
        generatedTasks.push({
          id: `pending-doc-${app.id}`,
          title: `Review missing documents`,
          description: `${app.first_name} ${app.last_name}'s application is waiting for document review`,
          priority: 'high',
          dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
          completed: false,
          applicationId: app.id
        });
      });
      
      // Add tasks for under review applications
      underReviewApps?.forEach((app, index) => {
        const daysAgo = Math.floor((new Date().getTime() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysAgo >= 3) {
          generatedTasks.push({
            id: `review-${app.id}`,
            title: `Follow up on application`,
            description: `${app.first_name} ${app.last_name}'s application has been under review for ${daysAgo} days`,
            priority: daysAgo > 5 ? 'high' : 'medium',
            dueDate: new Date().toISOString(),
            completed: false,
            applicationId: app.id
          });
        }
      });
      
      // Add some generic tasks
      generatedTasks.push({
        id: 'weekly-report',
        title: 'Generate weekly report',
        description: 'Create and send the weekly application summary report',
        priority: 'medium',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
        completed: false
      });
      
      generatedTasks.push({
        id: 'team-meeting',
        title: 'Team status meeting',
        description: 'Weekly team status and application review meeting',
        priority: 'low',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
        completed: false
      });
      
      setTasks(generatedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      throw error;
    }
  };

  const loadActivityLog = async () => {
    try {
      // Get recent activity from activity_log table
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select(`
          id,
          action,
          details,
          created_at,
          application_id,
          user_id,
          is_admin_action
        `)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (activityError) {
        throw activityError;
      }

      // Format activity data without fetching user details from admin API
      const formattedActivity = (activityData || []).map(activity => {
        // Create a user object based on available data
        const isAdmin = activity.is_admin_action === true;
        const userId = activity.user_id || 'system';
        
        // Generate a display name and email based on user_id and admin status
        let displayName: string;
        let displayEmail: string;
        
        if (userId === 'system' || !activity.user_id) {
          displayName = 'System';
          displayEmail = 'system@clearpathmotors.com';
        } else {
          // Create a generic display name from user ID
          const shortId = userId.substring(0, 8);
          displayName = isAdmin ? `Admin ${shortId}` : `User ${shortId}`;
          displayEmail = isAdmin ? `admin-${shortId}@clearpathmotors.com` : `user-${shortId}@clearpathmotors.com`;
        }
        
        return {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          timestamp: activity.created_at,
          applicationId: activity.application_id,
          user: {
            id: userId,
            name: displayName,
            email: displayEmail,
            isAdmin: isAdmin
          }
        };
      });
      
      setActivityLog(formattedActivity);
    } catch (error) {
      console.error('Error loading activity log:', error);
      throw error;
    }
  };

  const loadAlerts = async () => {
    try {
      const alerts: {id: string, message: string, type: 'warning' | 'critical'}[] = [];
      
      // Check for applications with pending documents for more than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: oldPendingCount, error: pendingError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_documents')
        .lt('updated_at', sevenDaysAgo.toISOString());
        
      if (pendingError) {
        throw pendingError;
      }
      
      if (oldPendingCount && oldPendingCount > 0) {
        alerts.push({
          id: 'old-pending-docs',
          message: `${oldPendingCount} application${oldPendingCount > 1 ? 's' : ''} with pending documents for over 7 days`,
          type: 'warning'
        });
      }
      
      // Check for applications under review for more than 10 days
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const { count: oldReviewCount, error: reviewError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review')
        .lt('updated_at', tenDaysAgo.toISOString());
        
      if (reviewError) {
        throw reviewError;
      }
      
      if (oldReviewCount && oldReviewCount > 0) {
        alerts.push({
          id: 'old-under-review',
          message: `${oldReviewCount} application${oldReviewCount > 1 ? 's' : ''} in 'Under Review' for over 10 days`,
          type: 'critical'
        });
      }
      
      // Check for applications with rejected documents
      const { count: rejectedDocsCount, error: rejectedError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');
        
      if (rejectedError) {
        throw rejectedError;
      }
      
      if (rejectedDocsCount && rejectedDocsCount > 0) {
        alerts.push({
          id: 'rejected-docs',
          message: `${rejectedDocsCount} document${rejectedDocsCount > 1 ? 's have' : ' has'} been rejected`,
          type: 'warning'
        });
      }
      
      setAlerts(alerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      throw error;
    }
  };

  const loadApplicationTrends = async () => {
    try {
      // Get application counts for the last 7 days
      const trend: number[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const { count, error } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());
          
        if (error) {
          throw error;
        }
        
        trend.push(count || 0);
      }
      
      setApplicationTrend(trend);
    } catch (error) {
      console.error('Error loading application trends:', error);
      throw error;
    }
  };

  const handleTaskToggle = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const formatActivityAction = (action: string) => {
    switch (action) {
      case 'update_application':
        return 'updated an application';
      case 'insert_application':
        return 'created a new application';
      case 'upload_document':
        return 'uploaded a document';
      case 'update_document':
        return 'updated a document';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = parseISO(timestamp);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500'
    ];
    
    // Use the string's characters to deterministically select a color
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Overview and quick actions
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadDashboardData()}
                className="p-2 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
              { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
              { id: 'audit', label: 'Audit Log', icon: <FileCheck className="h-4 w-4" /> },
              { id: 'flags', label: 'Flags', icon: <Flag className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#3BAA75] text-[#3BAA75]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
            <button
              onClick={() => loadDashboardData()}
              className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Welcome Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm p-6 mb-6"
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getRandomColor(adminUser?.id || 'admin')}`}>
                    {adminUser?.email ? getInitials(adminUser.email.split('@')[0]) : 'A'}
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold">
                      {adminUser?.email ? (
                        <>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {adminUser.email.split('@')[0]}!</>
                      ) : (
                        <>Welcome to the ClearPath Admin Dashboard</>
                      )}
                    </h2>
                    <p className="text-gray-600">Here's what's happening today</p>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[
                  {
                    title: 'Total Applications',
                    value: stats.totalApplications,
                    icon: <FileText className="h-5 w-5 text-blue-500" />,
                    color: 'bg-blue-50'
                  },
                  {
                    title: 'Under Review',
                    value: stats.underReview,
                    icon: <Clock className="h-5 w-5 text-yellow-500" />,
                    color: 'bg-yellow-50'
                  },
                  {
                    title: 'Approved',
                    value: stats.approved,
                    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                    color: 'bg-green-50'
                  },
                  {
                    title: 'Pending Follow-up',
                    value: stats.pendingFollowup,
                    icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
                    color: 'bg-orange-50'
                  },
                  {
                    title: 'Rejected',
                    value: stats.rejected,
                    icon: <XCircle className="h-5 w-5 text-red-500" />,
                    color: 'bg-red-50'
                  },
                  {
                    title: 'New This Week',
                    value: stats.newThisWeek,
                    icon: <Calendar className="h-5 w-5 text-purple-500" />,
                    color: 'bg-purple-50',
                    trend: stats.newThisWeek > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${stat.color} rounded-lg p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{stat.title}</p>
                        <div className="flex items-center">
                          <p className="text-xl font-semibold mt-1">{stat.value}</p>
                          {stat.trend && <span className="ml-2">{stat.trend}</span>}
                        </div>
                      </div>
                      {stat.icon}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Alerts Section */}
                  {alerts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg shadow-sm p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center">
                          <Bell className="h-5 w-5 text-amber-500 mr-2" />
                          Alerts & Notifications
                        </h2>
                      </div>
                      
                      <div className="space-y-3">
                        {alerts.map((alert) => (
                          <div 
                            key={alert.id}
                            className={`p-3 rounded-lg flex items-start ${
                              alert.type === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                              <p>{alert.message}</p>
                              <div className="mt-2">
                                <button 
                                  onClick={() => navigate('/admin/applications')}
                                  className={`text-sm font-medium ${
                                    alert.type === 'critical' ? 'text-red-700 hover:text-red-800' : 'text-amber-700 hover:text-amber-800'
                                  } flex items-center`}
                                >
                                  View Applications
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Priority Tasks */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center">
                        <CheckSquare className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Priority Tasks
                      </h2>
                    </div>
                    
                    {tasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Inbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No pending tasks today! Enjoy your day.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map((task) => (
                          <div 
                            key={task.id}
                            className={`
                              relative overflow-hidden rounded-lg border-2 p-4 transition-all
                              ${task.completed 
                                ? 'border-gray-200 bg-gray-50' 
                                : task.priority === 'high' 
                                  ? 'border-red-200 bg-red-50' 
                                  : task.priority === 'medium'
                                    ? 'border-amber-200 bg-amber-50'
                                    : 'border-blue-200 bg-blue-50'
                              }
                            `}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleTaskToggle(task.id)}
                                  className="h-5 w-5 rounded border-gray-300 text-[#3BAA75] focus:ring-[#3BAA75]"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                    {task.title}
                                  </p>
                                  <div className={`text-xs px-2 py-1 rounded-full ${
                                    task.priority === 'high' 
                                      ? 'bg-red-100 text-red-800' 
                                      : task.priority === 'medium'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                  </div>
                                </div>
                                <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {task.description}
                                </p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </span>
                                  {task.applicationId && (
                                    <button
                                      onClick={() => navigate(`/admin/applications/${task.applicationId}`)}
                                      className="text-xs text-[#3BAA75] hover:text-[#2D8259] font-medium flex items-center"
                                    >
                                      View Application
                                      <ChevronRight className="h-3 w-3 ml-1" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* Activity Feed */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center">
                        <Clock className="h-5 w-5 text-[#3BAA75] mr-2" />
                        Recent Activity
                      </h2>
                    </div>
                    
                    {activityLog.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No recent activity to display</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {activityLog.map((activity, index) => (
                          <div key={activity.id} className="relative">
                            {index !== activityLog.length - 1 && (
                              <div className="absolute top-8 left-4 bottom-0 w-px bg-gray-200" />
                            )}
                            <div className="flex gap-4">
                              <div className="relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getRandomColor(activity.user.id)}`}>
                                  {getInitials(activity.user.name)}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <p className="font-medium text-gray-900">
                                    {activity.user.name}
                                  </p>
                                  <span className="mx-1 text-gray-500">•</span>
                                  <p className="text-sm text-gray-500">
                                    {formatTimeAgo(activity.timestamp)}
                                  </p>
                                </div>
                                <p className="text-gray-600 mt-1">
                                  {activity.user.name} {formatActivityAction(activity.action)}
                                  {activity.applicationId && (
                                    <button
                                      onClick={() => navigate(`/admin/applications/${activity.applicationId}`)}
                                      className="ml-1 text-[#3BAA75] hover:text-[#2D8259] font-medium"
                                    >
                                      View
                                    </button>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 text-center">
                      <button 
                        onClick={() => setActiveTab('audit')}
                        className="text-sm text-[#3BAA75] hover:text-[#2D8259] font-medium"
                      >
                        View All Activity
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Quick Links */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Zap className="h-5 w-5 text-[#3BAA75] mr-2" />
                      Quick Actions
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          title: 'New Application',
                          icon: <PlusCircle className="h-6 w-6 text-white" />,
                          color: 'bg-[#3BAA75]',
                          action: () => navigate('/admin/applications')
                        },
                        {
                          title: 'View Applications',
                          icon: <FileText className="h-6 w-6 text-white" />,
                          color: 'bg-blue-500',
                          action: () => navigate('/admin/applications')
                        },
                        {
                          title: 'Manage Users',
                          icon: <Users className="h-6 w-6 text-white" />,
                          color: 'bg-purple-500',
                          action: () => navigate('/admin/users')
                        },
                        {
                          title: 'Send Notifications',
                          icon: <Send className="h-6 w-6 text-white" />,
                          color: 'bg-amber-500',
                          action: () => setActiveTab('notifications')
                        }
                      ].map((action, index) => (
                        <motion.button
                          key={action.title}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={action.action}
                          className={`${action.color} text-white p-4 rounded-lg flex flex-col items-center justify-center text-center h-24 shadow-sm hover:shadow-md transition-all`}
                        >
                          <div className="bg-white/20 rounded-full p-2 mb-2">
                            {action.icon}
                          </div>
                          <span className="text-sm font-medium">{action.title}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Application Trends */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <BarChart3 className="h-5 w-5 text-[#3BAA75] mr-2" />
                      Application Trends
                    </h2>
                    
                    <div className="h-40 flex items-end justify-between">
                      {applicationTrend.map((count, index) => {
                        const day = new Date();
                        day.setDate(day.getDate() - (6 - index));
                        const dayName = format(day, 'EEE');
                        const height = count === 0 ? 5 : Math.max(20, Math.min(100, (count / Math.max(...applicationTrend)) * 100));
                        
                        return (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-8 bg-[#3BAA75]/80 rounded-t-sm hover:bg-[#3BAA75] transition-colors"
                              style={{ height: `${height}%` }}
                            />
                            <div className="text-xs text-gray-500 mt-2">{dayName}</div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Approval Rate</p>
                          <p className="text-xl font-semibold">{approvalRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Weekly Average</p>
                          <p className="text-xl font-semibold">
                            {applicationTrend.reduce((sum, count) => sum + count, 0) / 7 > 0 
                              ? (applicationTrend.reduce((sum, count) => sum + count, 0) / 7).toFixed(1) 
                              : '0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Help & Resources */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <HelpCircle className="h-5 w-5 text-[#3BAA75] mr-2" />
                      Help & Resources
                    </h2>
                    
                    <div className="space-y-3">
                      <a 
                        href="#" 
                        className="block p-3 border border-gray-200 rounded-lg hover:border-[#3BAA75]/50 hover:bg-[#3BAA75]/5 transition-colors"
                      >
                        <div className="font-medium">Admin Guide</div>
                        <div className="text-sm text-gray-500">Learn how to use the admin dashboard</div>
                      </a>
                      
                      <a 
                        href="#" 
                        className="block p-3 border border-gray-200 rounded-lg hover:border-[#3BAA75]/50 hover:bg-[#3BAA75]/5 transition-colors"
                      >
                        <div className="font-medium">Application Review Process</div>
                        <div className="text-sm text-gray-500">Step-by-step guide for reviewing applications</div>
                      </a>
                      
                      <a 
                        href="#" 
                        className="block p-3 border border-gray-200 rounded-lg hover:border-[#3BAA75]/50 hover:bg-[#3BAA75]/5 transition-colors"
                      >
                        <div className="font-medium">Contact Support</div>
                        <div className="text-sm text-gray-500">Get help with technical issues</div>
                      </a>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MessageCenter />
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <NotificationCenter showAllUsers={true} />
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AuditLogViewer />
            </motion.div>
          )}

          {activeTab === 'flags' && (
            <motion.div
              key="flags"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FlagViewer />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;