import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, X, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Menu, MenuItem, ProductMenu, HoveredLink } from './Menu';
import { supabase } from '../lib/supabaseClient';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAutoFinancingClick = async () => {
    if (!user) {
      navigate('/get-prequalified');
      return;
    }

    try {
      const { data: application } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (application) {
        navigate('/dashboard');
      } else {
        navigate('/get-prequalified');
      }
    } catch (error) {
      console.error('Error checking application:', error);
      navigate('/get-prequalified');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-24">
          <div className="flex-shrink-0">
            <Link to="/" className="block">
              <img 
                src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//clearpathlogo.png" 
                alt="Clearpath Motors Logo" 
                className="h-12 w-auto md:h-20"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Menu setActive={setActiveItem}>
              <MenuItem setActive={setActiveItem} active={activeItem} item="Products">
                <ProductMenu />
              </MenuItem>
              
              <MenuItem setActive={setActiveItem} active={activeItem} item="Resources">
                <div className="flex flex-col">
                  <HoveredLink to="/how-it-works">How It Works</HoveredLink>
                  <HoveredLink to="/faq">FAQ</HoveredLink>
                  <HoveredLink to="/blog/car-loan-bad-credit-canada">Blog</HoveredLink>
                </div>
              </MenuItem>
              
              <MenuItem setActive={setActiveItem} active={activeItem} item="Support">
                <div className="flex flex-col">
                  <HoveredLink to="/contact">Contact Us</HoveredLink>
                  <HoveredLink to="/faq">Help Center</HoveredLink>
                </div>
              </MenuItem>
            </Menu>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="ml-2 flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-base font-medium"
                >
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors text-base font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors text-base font-medium"
                >
                  Sign Up
                </Link>
                <Link
                  to="/get-prequalified"
                  className="ml-2 bg-[#3BAA75] text-white px-6 py-3 rounded-lg hover:bg-[#2D8259] transition-colors text-base font-semibold shadow-sm hover:shadow-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-[#3BAA75] transition-colors p-2 rounded-lg hover:bg-gray-50"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              <button
                onClick={handleAutoFinancingClick}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
              >
                Auto Financing
              </button>
              <Link
                to="/calculator"
                className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Payment Calculator
              </Link>
              <Link
                to="/how-it-works"
                className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </Link>
              <Link
                to="/faq"
                className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-4 py-3 text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/get-prequalified"
                    className="block px-4 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors text-center mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;