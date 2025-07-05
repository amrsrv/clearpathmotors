import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

interface LoanRangeBarProps {
  min: number;
  max: number;
  rate_min: number;
  rate_max: number;
}

export const LoanRangeBar: React.FC<LoanRangeBarProps> = ({ min, max, rate_min, rate_max }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-xs sm:text-sm text-white/60 mb-1">Minimum</div>
          <div className="text-base sm:text-xl font-semibold">{formatCurrency(min)}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-xs sm:text-sm text-white/60 mb-1">Recommended</div>
          <div className="text-base sm:text-xl font-semibold">{formatCurrency((min + max) / 2)}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.5 }} 
          transition={{ delay: 0.4 }}
        >
          <div className="text-xs sm:text-sm text-white/60 mb-1">Maximum</div>
          <div className="text-base sm:text-lg font-semibold">{rate_min}% - {rate_max}% APR</div>
        </motion.div>
      </div>

      <div className="relative">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 mt-4"
      >
        <div className="text-xs sm:text-sm text-white/60">Interest Rate</div>
        <div className="text-base sm:text-lg font-semibold">{rate}% APR</div>
      </motion.div>
    </div>
  );
};