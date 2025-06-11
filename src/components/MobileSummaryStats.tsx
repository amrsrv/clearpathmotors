import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, MessageSquare } from 'lucide-react';

interface MobileSummaryStatsProps {
  totalApplications: number;
  approvedApplications: number;
  unreadMessages: number;
}

export const MobileSummaryStats: React.FC<MobileSummaryStatsProps> = ({
  totalApplications,
  approvedApplications,
  unreadMessages
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3 bg-white rounded-xl p-3 shadow-sm"
    >
      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50">
        <div className="flex justify-center mb-1">
          <FileText className="h-4 w-4 text-blue-500" />
        </div>
        <div className="text-xs text-gray-500 mb-0.5">Applications</div>
        <div className="text-lg font-semibold text-[#3BAA75]">{totalApplications}</div>
      </div>
      
      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50">
        <div className="flex justify-center mb-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-xs text-gray-500 mb-0.5">Approved</div>
        <div className="text-lg font-semibold text-[#3BAA75]">{approvedApplications}</div>
      </div>
      
      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50">
        <div className="flex justify-center mb-1">
          <MessageSquare className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-xs text-gray-500 mb-0.5">Messages</div>
        <div className="text-lg font-semibold text-[#3BAA75]">{unreadMessages}</div>
      </div>
    </motion.div>
  );
};