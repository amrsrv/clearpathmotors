import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';

interface ProcessingAnimationProps {
  onComplete?: () => void;
}

export const ProcessingAnimation: React.FC<ProcessingAnimationProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const duration = 3500; // 3.5 seconds total
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    const increment = 100 / steps;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          if (onComplete) {
            setTimeout(onComplete, 200);
          }
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#3BAA75] via-emerald-500 to-[#3BAA75] opacity-20 animate-pulse" />
          
          <div className="relative">
            {/* Processing icon */}
            <div className="flex justify-center mb-8">
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                }}
                className="bg-[#3BAA75]/10 rounded-full p-4"
              >
                <Cpu className="w-8 h-8 text-[#3BAA75]" />
              </motion.div>
            </div>

            {/* Processing message */}
            <div className="text-center mb-8">
              <motion.h3
                className="text-xl font-semibold text-gray-900 mb-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Calculating your personalized loan amount
              </motion.h3>
              <p className="text-gray-600">
                Please wait while we process your information
              </p>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-[#3BAA75] rounded-full"
                style={{ width: `${progress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Progress percentage */}
            <div className="mt-2 text-right text-sm text-gray-500">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};