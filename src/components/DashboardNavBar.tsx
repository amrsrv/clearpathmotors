import React from 'react';
import { Home, FileText, Bell, User, MessageSquare } from 'lucide-react';

interface DashboardNavBarProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export const DashboardNavBar: React.FC<DashboardNavBarProps> = ({ onNavigate, activeSection }) => {
  const navItems = [
    { name: 'Overview', icon: Home, section: 'overview' },
    { name: 'Documents', icon: FileText, section: 'documents' },
    { name: 'Messages', icon: MessageSquare, section: 'messages' },
    { name: 'Notifications', icon: Bell, section: 'notifications' },
    { name: 'Profile', icon: User, section: 'profile' },
  ];

  return (
    <div className="hidden sm:block bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => onNavigate(item.section)}
              className={`
                flex items-center px-4 py-3 text-sm font-medium transition-colors
                ${activeSection === item.section 
                  ? 'text-[#3BAA75] border-b-2 border-[#3BAA75]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              <item.icon className="h-5 w-5 mr-2" />
              {item.name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};