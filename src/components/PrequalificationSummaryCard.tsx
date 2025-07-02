import React from 'react';
import { motion } from 'framer-motion';
import { PreQualifiedBadge } from './PreQualifiedBadge';
import { LoanRangeBar } from './LoanRangeBar';
import type { Application } from '../types/database';

interface PrequalificationSummaryCardProps {
  application: Application;
}

export const PrequalificationSummaryCard: React.FC<PrequalificationSummaryCardProps> = ({ application }) => {
  // Generate appropriate badge message based on application status
  const getBadgeMessage = (status: string | null) => {
    switch (status) {
      case 'submitted':
        return 'Application Submitted';
      case 'under_review':
        return 'Under Review';
      case 'pending_documents':
        return 'Documents Needed';
      case 'pre_approved':
        return 'Pre-Approved';
      case 'vehicle_selection':
        return 'Select Your Vehicle';
      case 'final_approval':
        return 'Final Approval';
      case 'finalized':
        return 'Financing Complete';
      default:
        return 'Pre-Qualified';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-[#3BAA75]/10 to-[#3BAA75]/5 rounded-xl shadow-lg p-6 border border-[#3BAA75]/20"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start">
          <div className="mb-2">
            <PreQualifiedBadge 
              message={getBadgeMessage(application.status)} 
              status={application.status || undefined}
            />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-2">
            {application.status === 'finalized' 
              ? 'Congratulations on Your Approval!' 
              : 'You\'re Pre-qualified for Financing'}
          </h2>
          <p className="text-gray-600 mt-1">
            {application.status === 'pending_documents' 
              ? 'Upload your documents to continue your application' 
              : application.status === 'vehicle_selection'
              ? 'Choose your vehicle to finalize your loan'
              : application.status === 'finalized'
              ? 'Your financing is complete and ready to go'
              : 'Based on your information, here\'s what you qualify for:'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#3BAA75]">
              ${application.loan_amount_min?.toLocaleString() || '15,000'} - ${application.loan_amount_max?.toLocaleString() || '50,000'}
            </div>
            <div className="text-sm text-gray-600">
              at {application.interest_rate || 5.99}% APR
            </div>
          </div>
        </div>
      </div>
      
      {/* Only show on larger screens */}
      <div className="hidden md:block mt-4">
        <LoanRangeBar
          min={application.loan_amount_min || 15000}
          max={application.loan_amount_max || 50000}
          rate={application.interest_rate || 5.99}
        />
      </div>
    </motion.div>
  );
};