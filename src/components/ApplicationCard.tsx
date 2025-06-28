import React, { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Eye, ChevronRight, ChevronDown, ChevronUp, DollarSign, CreditCard, Car, Briefcase, MapPin, Calendar, Phone, Mail, User } from 'lucide-react';
import { PreQualifiedBadge } from './PreQualifiedBadge';
import type { Application, UserProfile } from '../types/database';
import { toStartCase } from '../utils/formatters';

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
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const handleCardClick = () => {
    if (!isSelected) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        border-2 rounded-xl p-4 cursor-pointer transition-colors
        ${isSelected 
          ? 'border-[#3BAA75] bg-[#3BAA75]/5' 
          : 'border-gray-200 hover:border-[#3BAA75]/50 hover:bg-gray-50'
        }
      `}
      onClick={handleCardClick}
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
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
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
        <button 
          className="flex items-center text-[#3BAA75] hover:text-[#2D8259] text-sm font-medium"
          onClick={handleDetailsClick}
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="pt-4 mt-4 border-t border-gray-200 space-y-6"
        >
          {/* Personal Information */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <button 
              className="flex items-center justify-between w-full p-3 bg-gray-50 text-left font-medium"
              onClick={(e) => {
                e.stopPropagation();
                const details = e.currentTarget.nextElementSibling as HTMLElement;
                if (details) {
                  details.style.display = details.style.display === 'none' ? 'block' : 'none';
                }
              }}
            >
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <span>Personal Information</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{application.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{application.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{application.address}, {application.city}, {application.province} {application.postal_code}</span>
              </div>
              {application.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Born {format(new Date(application.date_of_birth), 'MMM d, yyyy')}</span>
                </div>
                {application.dealer_profiles && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Dealer: {application.dealer_profiles.name}</span>
                  </div>
                )}
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <button 
              className="flex items-center justify-between w-full p-3 bg-gray-50 text-left font-medium"
              onClick={(e) => {
                e.stopPropagation();
                const details = e.currentTarget.nextElementSibling as HTMLElement;
                if (details) {
                  details.style.display = details.style.display === 'none' ? 'block' : 'none';
                }
              }}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-500" />
                <span>Financial Information</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Annual Income: ${application.annual_income?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Credit Score: {application.credit_score}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <button 
              className="flex items-center justify-between w-full p-3 bg-gray-50 text-left font-medium"
              onClick={(e) => {
                e.stopPropagation();
                const details = e.currentTarget.nextElementSibling as HTMLElement;
                if (details) {
                  details.style.display = details.style.display === 'none' ? 'block' : 'none';
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-gray-500" />
                <span>Vehicle Information</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Vehicle Type: {application.vehicle_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Desired Payment: ${application.desired_monthly_payment?.toLocaleString()}/month</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Down Payment: ${application.down_payment?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action button to select this application */}
          {!isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="w-full bg-[#3BAA75] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#2D8259] transition-colors flex items-center justify-center gap-2 mt-4"
            >
              <Eye className="h-5 w-5" />
              View This Application
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};