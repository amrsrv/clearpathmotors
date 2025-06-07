import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Notification } from '../types/database';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onMarkAsRead }) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        {unreadCount > 0 && (
          <span className="bg-[#3BAA75] text-white px-2 py-1 rounded-full text-sm">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  p-4 rounded-lg transition-colors
                  ${notification.read ? 'bg-gray-50' : 'bg-[#3BAA75]/5 border border-[#3BAA75]/10'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {notification.title.includes('Approved') ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : notification.title.includes('Rejected') ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Info className="w-5 h-5 text-[#3BAA75]" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="text-xs text-[#3BAA75] hover:text-[#2D8259] font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};