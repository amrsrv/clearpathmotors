import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, FileText, Car, BadgeCheck, Award, PartyPopper } from 'lucide-react';
import type { Application, ApplicationStage } from '../types/database';

interface ApplicationTrackerProps {
  application: Application;
  stages: ApplicationStage[];
}

const stageDefinitions = [
  {
    title: 'Application Submitted',
    icon: <FileText className="w-5 h-5" />,
    description: 'Your application has been received and is being processed.'
  },
  {
    title: 'Under Review',
    icon: <Clock className="w-5 h-5" />,
    description: 'Our team is reviewing your application details.'
  },
  {
    title: 'Pending Documents',
    icon: <FileText className="w-5 h-5" />,
    description: 'Additional documents may be required to proceed.'
  },
  {
    title: 'Pre-Approved',
    icon: <BadgeCheck className="w-5 h-5" />,
    description: 'Your application has been pre-approved!'
  },
  {
    title: 'Vehicle Selection',
    icon: <Car className="w-5 h-5" />,
    description: 'Choose your perfect vehicle from our inventory.'
  },
  {
    title: 'Final Approval',
    icon: <Award className="w-5 h-5" />,
    description: 'Final review of your selected vehicle and terms.'
  },
  {
    title: 'Deal Finalized',
    icon: <PartyPopper className="w-5 h-5" />,
    description: 'Congratulations! Your deal is complete.'
  }
];

// Map application status to stage number
const statusToStageMap: Record<string, number> = {
  'submitted': 1,
  'under_review': 2,
  'pending_documents': 3,
  'pre_approved': 4,
  'vehicle_selection': 5,
  'final_approval': 6,
  'finalized': 7
};

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ application, stages }) => {
  // Derive current stage from application status
  const [currentStage, setCurrentStage] = useState<number>(application.current_stage);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  
  // Update current stage whenever application status changes
  useEffect(() => {
    // First check if the status maps directly to a stage
    if (application.status in statusToStageMap) {
      setCurrentStage(statusToStageMap[application.status]);
    } else {
      // Fallback to the current_stage field
      setCurrentStage(application.current_stage);
    }
  }, [application.status, application.current_stage]);

  // Check for mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Application Progress</h2>
      
      {isMobile ? (
        // Mobile view - horizontal progress bar with collapsible details
        <div className="space-y-6">
          {/* Horizontal progress bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-[#3BAA75] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStage / 7) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Start</span>
            <span>Stage {currentStage}/7</span>
            <span>Complete</span>
          </div>
          
          {/* Current stage details */}
          <div className="bg-[#3BAA75]/5 rounded-lg p-4 border border-[#3BAA75]/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#3BAA75] text-white rounded-full p-2">
                {stageDefinitions[currentStage - 1].icon}
              </div>
              <h3 className="font-semibold text-gray-900">
                {stageDefinitions[currentStage - 1].title}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {stageDefinitions[currentStage - 1].description}
            </p>
            
            {/* Show stage timestamp if available */}
            {stages.find(s => s.stage_number === currentStage) && (
              <div className="mt-3 text-xs text-gray-500">
                {format(new Date(stages.find(s => s.stage_number === currentStage)!.timestamp), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          
          {/* Completed stages */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Completed Stages</h4>
            {stageDefinitions.slice(0, currentStage - 1).map((stage, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="bg-green-100 text-green-700 rounded-full p-1.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{stage.title}</span>
              </div>
            ))}
          </div>
          
          {/* Upcoming stages */}
          {currentStage < 7 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Upcoming Stages</h4>
              {stageDefinitions.slice(currentStage).map((stage, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-60">
                  <div className="bg-gray-100 text-gray-400 rounded-full p-1.5">
                    {stage.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-500">{stage.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Desktop view - vertical timeline
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[21px] top-0 h-full w-px bg-gray-200" />

          {stageDefinitions.map((stage, index) => {
            const stageNumber = index + 1;
            const stageData = stages.find(s => s.stage_number === stageNumber);
            const isCompleted = currentStage > stageNumber;
            const isCurrent = currentStage === stageNumber;
            
            return (
              <div key={index} className="relative flex items-start mb-8 last:mb-0">
                {/* Stage indicator */}
                <div
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center z-10
                    ${isCompleted ? 'bg-[#3BAA75] text-white' : 
                      isCurrent ? 'bg-[#3BAA75]/20 text-[#3BAA75]' : 
                      'bg-gray-100 text-gray-400'}
                  `}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : stage.icon}
                </div>

                {/* Stage content */}
                <div className="ml-4 flex-1">
                  <h3 className={`font-semibold ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                    {stage.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                  
                  {stageData && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">
                        {new Date(stageData.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {stageData.notes && (
                        <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded">
                          {stageData.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper function to format dates
const format = (date: Date, formatString: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
};