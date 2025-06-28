import React from 'react';
import { Home, FileText, Bell, User, LifeBuoy } from 'lucide-react';

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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden shadow-lg">
      <nav className="flex justify-around h-16 items-center">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onNavigate(item.section)}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-colors
              ${activeSection === item.section ? 'text-[#3BAA75]' : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span>{item.name}</span>
          </button>
        </Link>
      </nav>
    </div>
  );
};