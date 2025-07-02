import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Calendar, DollarSign, CreditCard, Car, Briefcase, MapPin, Phone, Mail, Home } from 'lucide-react';
import type { Application, ApplicationStage } from '../types/database';

interface ApplicationDetailsViewProps {
  application: Application;
  stages: ApplicationStage[];
  onBackToList: () => void;
}

const ApplicationDetailsView: React.FC<ApplicationDetailsViewProps> = ({ 
  application, 
  stages, 
  onBackToList 
}) => {
  // Function to get the next step message based on application status
  const getNextStepMessage = (status: string) => {
    const nextStepMessage = {
      submitted: "Sit tight — our team is reviewing your application.",
      under_review: "We're assessing your details — no action needed for now.",
      pending_documents: "Upload the required documents to keep your application moving.",
      pre_approved: "You're pre-approved! Book a time to discuss vehicle options.",
      vehicle_selection: "Browse and select your vehicle to proceed.",
      final_approval: "You're almost done — confirm final details to wrap things up.",
      finalized: "Your financing is complete — we'll reach out with next steps!",
    }[status];
    
    return nextStepMessage || "Your application is being processed.";
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center text-gray-600 hover:text-[#3BAA75] transition-colors"
        onClick={onBackToList}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Applications
      </motion.button>

      {/* Application Details Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
      >
        <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#3BAA75] to-[#2D8259] mb-6">Application Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <div className="p-2 bg-[#3BAA75]/10 rounded-lg">
                <User className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <span>Personal Information</span>
            </h3>
            
            <div className="space-y-3 pl-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Mail className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700">{application.email}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Phone className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700">{application.phone}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <MapPin className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700 text-sm">{application.address}, {application.city}, {application.province} {application.postal_code}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Home className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700">
                  Housing: {application.housing_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <div className="p-2 bg-[#3BAA75]/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-[#3BAA75]" />
              </div>
              <span>Financial Information</span>
            </h3>
            
            <div className="space-y-3 pl-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Briefcase className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700">
                  {application.employment_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                </span>
              </div>
              
              {application.employer_name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Briefcase className="h-4 w-4 text-[#3BAA75]" />
                  <span className="text-gray-700">Employer: {application.employer_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <DollarSign className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700">Annual Income: ${application.annual_income?.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CreditCard className="h-4 w-4 text-[#3BAA75]" />
                <span className="text-gray-700">Credit Score: {application.credit_score}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Next Step Box */}
        <div className="mt-6">
          <div className="bg-[#3BAA75]/10 rounded-xl p-4 border border-[#3BAA75]/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-[#3BAA75] rounded-full p-1.5">
                {application.status === 'pre_approved' ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : application.status === 'pending_documents' ? (
                  <FileText className="h-4 w-4 text-white" />
                ) : (
                  <Clock className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Next Step</p>
                <p className="text-sm text-gray-700 mt-1">
                  {getNextStepMessage(application.status)}
                </p>
                
                {/* Action buttons based on status */}
                {application.status === 'pending_documents' && (
                  <button
                    onClick={() => {/* Handle document upload */}}
                    className="mt-3 px-4 py-2 bg-[#3BAA75] text-white rounded-lg text-sm font-medium hover:bg-[#2D8259] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    Upload Documents
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                
                {application.status === 'pre_approved' && (
                  <button
                    onClick={() => {/* Handle appointment scheduling */}}
                    className="mt-3 px-4 py-2 bg-[#3BAA75] text-white rounded-lg text-sm font-medium hover:bg-[#2D8259] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    Schedule Consultation
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper component for User icon
const User = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
};

// Helper component for FileText icon
const FileText = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
};

// Helper component for ChevronRight icon
const ChevronRight = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
};

export default ApplicationDetailsView;