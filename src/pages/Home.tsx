import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, CheckCircle, Calendar, ChevronRight } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { TestimonialCarousel } from '../components/TestimonialCarousel';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { LogoScroll } from '../components/LogoScroll';
import Header from '../components/Header'; // If you have a separate header component

const Home = () => {
  const [rotatingWord, setRotatingWord] = useState('Financing');
  const words = ['Financing', 'Credit', 'Approval'];
  const [isMobile, setIsMobile] = useState(false);

  const avatars = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
  ];

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setRotatingWord(current => {
        const currentIndex = words.indexOf(current);
        return words[(currentIndex + 1) % words.length];
      });
    }, 3000);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      clearInterval(wordInterval);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <div className="relative">
      {/* Video Background - shared across header & hero */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
        {isMobile ? (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A7A5B] to-[#3BAA75]"></div>
        ) : (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
          >
            <source src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//0607.mp4" type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Page Content */}
      <div className="relative z-10">
        {/* Transparent Header */}
        <Header /> {/* Replace with your header component */}

        {/* Hero Section */}
        <div className="min-h-[72vh] md:min-h-[80vh] flex items-center px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl mx-auto">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                  <Clock3 className="w-4 h-4 mr-2" />
                  Quick Approval Process
                </span>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                  Easy{' '}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={rotatingWord}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-[#3BAA75] relative inline-block"
                    >
                      {rotatingWord}
                    </motion.span>
                  </AnimatePresence>
                </h1>
              </div>

              <div className="mt-6 space-y-4">
                <p className="text-lg md:text-xl text-white font-medium">
                  Pre-approval in under a minute.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-white bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75] mr-3 flex-shrink-0" />
                    <span className="text-base">95% approval rate for all credit situations</span>
                  </li>
                  <li className="flex items-center text-white bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <Clock3 className="h-5 w-5 text-[#3BAA75] mr-3 flex-shrink-0" />
                    <span className="text-base">Quick online application, instant decision</span>
                  </li>
                  <li className="flex items-center text-white bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <Calendar className="h-5 w-5 text-[#3BAA75] mr-3 flex-shrink-0" />
                    <span className="text-base">Flexible terms up to 84 months</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/get-approved"
                className="w-full sm:w-auto bg-[#3BAA75] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#A3D9B1] transition-colors group inline-flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                Get Started
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/calculator"
                className="w-full sm:w-auto bg-white text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center border-2 border-gray-200"
              >
                Calculate Payment
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="flex -space-x-3">
                {avatars.map((avatar, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-md"
                  >
                    <img
                      src={avatar}
                      alt={`Happy customer ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="font-semibold text-lg text-white">Trusted by 2,000+</div>
                <div className="text-white/80">Happy drivers</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ... The rest of your content like Stats, Testimonials, etc. */}
        <LogoScroll />
        <TestimonialCarousel />
      </div>
    </div>
  );
};

export default Home;