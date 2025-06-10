import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const PreQualifiedBadge = () => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        duration: 0.6
      }}
      className="relative inline-flex"
    >
      {/* Main badge */}
      <div className="bg-gradient-to-r from-[#2A7A5B] to-[#3BAA75] px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full flex items-center gap-1.5 sm:gap-2.5 shadow-lg relative z-10">
        <div className="bg-white/20 rounded-full p-1">
          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </div>
        <span className="font-medium text-xs text-white tracking-wide uppercase">Pre-Qualified</span>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#2A7A5B]/20 to-[#3BAA75]/20 rounded-full blur-sm" />
      
      {/* Animated pulse */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 0 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-r from-[#2A7A5B]/20 to-[#3BAA75]/20 rounded-full"
      />
    </motion.div>
  );
};