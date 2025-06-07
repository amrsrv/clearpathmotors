import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Menu, MenuItem, ProductMenu, HoveredLink } from './Menu';
import { supabase } from '../lib/supabaseClient';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current page is home page
  const isHomePage = location.pathname === '/';

  // Track scroll position for header transparency and text color
  useEffect(() => {
    const handleScroll = () => {
      // For transparency effect - start showing background after scrolling a bit
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
      
      // For text color change - check if we've scrolled past hero section
      const isPastHero = window.scrollY > window.innerHeight - 100;
      if (isPastHero !== pastHero) {
        setPastHero(isPastHero);
      }
    };

    if (isHomePage) {
      window.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    } else {
      // If not home page, set scrolled to true to show solid background
      setScrolled(true);
      setPastHero(true);
    }
  }, [scrolled, pastHero, isHomePage]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAutoFinancingClick = async () => {
    if (!user) {
      navigate('/get-approved');
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
        navigate('/get-approved');
      }
    } catch (error) {
      console.error('Error checking application:', error);
      navigate('/get-approved');
    }
  };

  // Determine background style based on scroll position and page
  const navBackground = isHomePage
    ? scrolled 
      ? pastHero 
        ? 'bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-100' 
        : 'bg-black/30 backdrop-blur-sm'
      : 'bg-transparent'
    : 'bg-white shadow-sm border-b border-gray-100';

  // Determine text color based on scroll position and page
  const textColor = isHomePage
    ? pastHero ? 'text-gray-900' : 'text-white'
    : 'text-gray-900';
  
  const hoverTextColor = isHomePage
    ? pastHero ? 'hover:text-[#3BAA75]' : 'hover:text-white/80'
    : 'hover:text-[#3BAA75]';

  return (
    <motion.nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBackground}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-24">
          <div className="flex-shrink-0">
            <Link to="/" className="block">
              <motion.img 
                src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//clearpathlogo.png" 
                alt="Clearpath Motors Logo" 
                className="h-12 w-auto md:h-16"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
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

            <div className="flex items-center ml-6 space-x-4">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-300 text-base font-medium ${
                      isHomePage && !pastHero
                        ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>Account</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-50 border border-gray-100"
                      >
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-[#3BAA75] transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Dashboard
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-[#3BAA75] transition-colors"
                        >
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className={`px-5 py-2.5 rounded-lg transition-all duration-300 text-base font-medium ${
                    isHomePage && !pastHero
                      ? 'text-white hover:bg-white/20 border border-white/30 hover:border-white'
                      : 'text-gray-700 hover:text-[#3BAA75] border border-gray-200 hover:border-[#3BAA75] hover:shadow-sm'
                  }`}
                >
                  Login
                </Link>
              )}

              <Link
                to="/get-approved"
                className="bg-[#3BAA75] text-white px-6 py-2.5 rounded-lg hover:bg-[#2D8259] transition-all duration-300 text-base font-semibold shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`${textColor} ${hoverTextColor} transition-colors p-2 rounded-lg`}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg overflow-hidden"
            >
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
                      to="/get-approved"
                      className="block px-4 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors text-center mt-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;