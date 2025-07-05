import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    signOut();
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      current: location.pathname === '/admin'
    },
    {
      name: 'Applications',
      href: '/admin/applications',
      icon: FileText,
      current: location.pathname.startsWith('/admin/applications')
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: location.pathname.startsWith('/admin/users')
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      current: location.pathname.startsWith('/admin/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/admin" className="ml-3">
              <img
                src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//Clear%20Path%20(10%20x%203%20in).png"
                alt="Clearpath Motors Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        <div className="fixed inset-y-0 left-0 flex flex-col w-full max-w-xs bg-white shadow-xl">
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            <Link to="/admin" className="flex items-center">
              <img
                src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//Clear%20Path%20(10%20x%203%20in).png"
                alt="Clearpath Motors Logo"
                className="h-10 w-auto"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <nav className="px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center justify-between px-4 py-3 text-base font-medium rounded-lg
                    ${item.current
                      ? 'bg-[#3BAA75] text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-[#3BAA75]'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-6 w-6" />
                    {item.name}
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-70" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-base font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-[#3BAA75]"
            >
              <LogOut className="mr-3 h-6 w-6" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
            <Link to="/admin" className="flex items-center">
              <img
                src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//Clear%20Path%20(10%20x%203%20in).png"
                alt="Clearpath Motors Logo"
                className="h-16 w-auto"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-lg
                  ${item.current
                    ? 'bg-[#3BAA75] text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#3BAA75]'
                  }
                `}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-[#3BAA75]"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;