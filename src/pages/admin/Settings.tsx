import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Mail, Shield, Database, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react';

const AdminSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [autoApproval, setAutoApproval] = useState(false);
  const [documentRetention, setDocumentRetention] = useState('90');
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    notifications: true,
    security: false,
    email: false,
    system: false
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Settings saved:', {
      emailNotifications,
      smsNotifications,
      autoApproval,
      documentRetention
    });
    
    setSaveLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Settings
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage system settings and preferences
              </p>
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={saveLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-70"
            >
              {saveLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="hidden md:inline">Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('notifications')}
            >
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Notification Settings</h2>
              </div>
              {expandedSections.notifications ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.notifications && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium text-gray-700">Email Notifications</label>
                        <p className="text-sm text-gray-500">Receive application updates via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#3BAA75]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BAA75]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium text-gray-700">SMS Notifications</label>
                        <p className="text-sm text-gray-500">Receive application updates via SMS</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smsNotifications}
                          onChange={(e) => setSmsNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#3BAA75]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BAA75]"></div>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('security')}
            >
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Security Settings</h2>
              </div>
              {expandedSections.security ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.security && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium text-gray-700">Auto-Approval</label>
                        <p className="text-sm text-gray-500">Automatically approve low-risk applications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoApproval}
                          onChange={(e) => setAutoApproval(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#3BAA75]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BAA75]"></div>
                      </label>
                    </div>

                    <div>
                      <label className="font-medium text-gray-700">Document Retention (days)</label>
                      <p className="text-sm text-gray-500 mb-2">How long to keep uploaded documents</p>
                      <select
                        value={documentRetention}
                        onChange={(e) => setDocumentRetention(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent h-10"
                      >
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">1 year</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Email Templates */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('email')}
            >
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">Email Templates</h2>
              </div>
              {expandedSections.email ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.email && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5 transition-colors">
                      <div className="font-medium">Welcome Email</div>
                      <div className="text-sm text-gray-500">Sent when a new user signs up</div>
                    </button>

                    <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5 transition-colors">
                      <div className="font-medium">Application Status Update</div>
                      <div className="text-sm text-gray-500">Sent when application status changes</div>
                    </button>

                    <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5 transition-colors">
                      <div className="font-medium">Document Request</div>
                      <div className="text-sm text-gray-500">Sent when additional documents are needed</div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('system')}
            >
              <div className="flex items-center">
                <Database className="h-5 w-5 text-[#3BAA75] mr-2" />
                <h2 className="text-lg font-semibold">System Settings</h2>
              </div>
              {expandedSections.system ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <AnimatePresence>
              {expandedSections.system && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5 transition-colors">
                      <div className="font-medium">Backup Settings</div>
                      <div className="text-sm text-gray-500">Configure automatic backups</div>
                    </button>

                    <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5 transition-colors">
                      <div className="font-medium">API Configuration</div>
                      <div className="text-sm text-gray-500">Manage API keys and webhooks</div>
                    </button>

                    <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#3BAA75] hover:bg-[#3BAA75]/5 transition-colors">
                      <div className="font-medium">System Logs</div>
                      <div className="text-sm text-gray-500">View system activity and errors</div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-20 lg:hidden">
        <button
          onClick={handleSaveSettings}
          disabled={saveLoading}
          className="bg-[#3BAA75] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[#2D8259] transition-colors disabled:opacity-70"
        >
          {saveLoading ? (
            <RefreshCw className="h-7 w-7 animate-spin" />
          ) : (
            <Save className="h-7 w-7" />
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;