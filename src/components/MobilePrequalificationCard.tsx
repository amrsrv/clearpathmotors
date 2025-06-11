import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, CreditCard } from 'lucide-react';

interface MobilePrequalificationCardProps {
  loanRange: {
    min: number;
    max: number;
    rate: number;
  };
  term: number;
  monthlyPayment: number;
}

export const MobilePrequalificationCard: React.FC<MobilePrequalificationCardProps> = ({
  loanRange,
  term,
  monthlyPayment
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-[#2A7A5B] rounded-xl p-4 text-white shadow-xl">
      <h2 className="text-lg font-semibold mb-3">Your Prequalification Results</h2>
      
      {/* Loan Range */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-white/80 text-xs">Minimum</span>
          <span className="font-semibold">{formatCurrency(loanRange.min)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80 text-xs">Recommended</span>
          <span className="font-bold text-lg">{formatCurrency((loanRange.min + loanRange.max) / 2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80 text-xs">Maximum</span>
          <span className="font-semibold">{formatCurrency(loanRange.max)}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-emerald-500 rounded-full"
        />
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/10 rounded-lg p-2">
          <div className="flex justify-center mb-1">
            <DollarSign className="h-4 w-4 text-white/80" />
          </div>
          <div className="text-xs text-white/80">Monthly</div>
          <div className="font-semibold">${monthlyPayment}</div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-2">
          <div className="flex justify-center mb-1">
            <Calendar className="h-4 w-4 text-white/80" />
          </div>
          <div className="text-xs text-white/80">Term</div>
          <div className="font-semibold">{term} mo</div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-2">
          <div className="flex justify-center mb-1">
            <CreditCard className="h-4 w-4 text-white/80" />
          </div>
          <div className="text-xs text-white/80">Rate</div>
          <div className="font-semibold">{loanRange.rate}%</div>
        </div>
      </div>
    </div>
  );
};