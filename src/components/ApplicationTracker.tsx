import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, FileText, Car, BadgeCheck, Award, PartyPopper } from 'lucide-react';
import type { Application, ApplicationStage } from '../types/database';

interface ApplicationTrackerProps {
  application: Application;
  stages: ApplicationStage[];
}

const stages = [
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

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ application, stages: applicationStages }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Application Progress</h2>
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[21px] top-0 h-full w-px bg-gray-200" />

        {stages.map((stage, index) => {
          const stageData = applicationStages.find(s => s.stage_number === index + 1);
          const isCompleted = application.current_stage > index + 1;
          const isCurrent = application.current_stage === index + 1;
          
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
    </div>
  );
};