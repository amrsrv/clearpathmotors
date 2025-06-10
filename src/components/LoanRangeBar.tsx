import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

interface LoanRangeBarProps {
  min: number;
  max: number;
  rate: number;
}

export const LoanRangeBar: React.FC<LoanRangeBarProps> = ({ min, max, rate }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="text-sm text-white/60 mb-2">Minimum</div>
          <div className="text-xl font-semibold">{formatCurrency(min)}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="text-sm text-white/60 mb-2">Recommended</div>
          <div className="text-xl font-semibold">{formatCurrency((min + max) / 2)}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <div className="text-sm text-white/60 mb-2">Maximum</div>
          <div className="text-xl font-semibold">{formatCurrency(max)}</div>
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
        className="flex items-center justify-center gap-2 mt-6"
      >
        <div className="text-sm text-white/60">Interest Rate</div>
        <div className="text-lg font-semibold">{rate}% APR</div>
      </motion.div>
    </div>
  );
};