import React from 'react';
import { Home, FileText, Bell, User, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardNavBarProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export const DashboardNavBar: React.FC<DashboardNavBarProps> = ({ onNavigate, activeSection }) => {
  const navItems = [
    { name: 'Overview', icon: Home, section: 'overview' },
    { name: 'Documents', icon: FileText, section: 'documents' },
    { name: 'Notifications', icon: Bell, section: 'notifications' },
    { name: 'Profile', icon: User, section: 'profile' },
    { name: 'Help', icon: LifeBuoy, section: 'help' },
  ];

  return (
    <div className="hidden sm:block bg-white border-b border-gray-100 mb-6 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => onNavigate(item.section)}
              className={`
                relative flex items-center px-4 py-3 text-sm font-medium transition-all duration-200
                ${activeSection === item.section 
                  ? 'text-[#3BAA75]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              <item.icon className="h-5 w-5 mr-2" />
              {item.name}
              
              {activeSection === item.section && (
                <motion.div 
                  layoutId="navIndicator-desktop"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3BAA75]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};