import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Eye, ChevronRight } from 'lucide-react';
import { PreQualifiedBadge } from './PreQualifiedBadge';
import type { Application } from '../types/database';

interface ApplicationCardProps {
  application: Application;
  isSelected: boolean;
  onClick: () => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ 
  application, 
  isSelected,
  onClick 
}) => {
  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pre_approved':
        return 'bg-green-100 text-green-700';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending_documents':
        return 'bg-orange-100 text-orange-700';
      case 'finalized':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        border-2 rounded-lg p-4 cursor-pointer transition-colors
        ${isSelected 
          ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
          : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
        }
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {application.status === 'pre_approved' && <PreQualifiedBadge />}
          <div>
            <h3 className="font-medium text-lg">
              {application.vehicle_type || 'Vehicle'} Financing
            </h3>
            <p className="text-sm text-gray-500">
              Application #{application.id.slice(0, 8)} • Created {format(new Date(application.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${getStatusColor(application.status)}
          `}>
            {formatStatus(application.status)}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Stage {application.current_stage}/7
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Loan Amount</span>
          <span className="font-medium">
            ${application.loan_amount_min?.toLocaleString()} - ${application.loan_amount_max?.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Monthly Payment</span>
          <span className="font-medium">
            ${application.desired_monthly_payment?.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Interest Rate</span>
          <span className="font-medium">
            {application.interest_rate}%
          </span>
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button className="flex items-center text-[#3BAA75] hover:text-[#2D8259] text-sm font-medium">
          <Eye className="h-4 w-4 mr-1" />
          View Details
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </motion.div>
  );
};