import React from 'react';
import { Home, FileText, Bell, User, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavBarProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ onNavigate, activeSection }) => {
  const navItems = [
    { name: 'Home', icon: Home, section: 'overview' },
    { name: 'Documents', icon: FileText, section: 'documents' },
    { name: 'Notifications', icon: Bell, section: 'notifications' },
    { name: 'Profile', icon: User, section: 'profile' },
    { name: 'Help', icon: LifeBuoy, section: 'help' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 sm:hidden shadow-lg">
      <nav className="flex justify-around h-16 items-center">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onNavigate(item.section)}
            className="flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-all duration-200"
          >
            <div className="relative">
              {activeSection === item.section && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full w-1 h-1 bg-[#3BAA75] rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`p-1.5 rounded-full transition-colors duration-200 ${
                activeSection === item.section 
                  ? 'text-[#3BAA75] bg-[#3BAA75]/10' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <span className={`mt-1 transition-colors duration-200 ${
              activeSection === item.section ? 'text-[#3BAA75]' : 'text-gray-500'
            }`}>
              {item.name}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};