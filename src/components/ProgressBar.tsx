import React from 'react';
import { motion } from 'framer-motion';

export interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

export const ProgressBar = ({ currentStep, totalSteps, onStepClick }: ProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  // Determine if we're on mobile
  const isMobile = window.innerWidth < 640;

  return (
    <div className="w-full max-w-md mx-auto px-2 mb-6" role="region" aria-label="Application progress">
      <progress value={currentStep} max={totalSteps} className="sr-only" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center relative">
                <motion.button
                  onClick={() => onStepClick?.(index + 1)}
                  disabled={index + 1 >= currentStep}
                  initial={false}
                  animate={{
                    scale: currentStep >= index + 1 ? 1 : 0.8,
                    backgroundColor: currentStep >= index + 1 ? '#3BAA75' : '#E5E7EB'
                  }}
                  className={`
                    w-6 h-6 sm:w-8 sm:h-8 rounded-md flex items-center justify-center
                    transition-colors duration-300
                    ${currentStep >= index + 1 ? 'text-white' : 'text-gray-500'}
                    ${index + 1 < currentStep ? 'cursor-pointer hover:bg-[#2D8259]' : 'cursor-default'}
                  `}
                  aria-current={currentStep === index + 1 ? 'step' : undefined}
                  aria-label={`Step ${index + 1}`}
                 aria-current={currentStep === index + 1 ? 'step' : undefined}
                 aria-label={`Step ${index + 1}`}
                />
                <span className="text-xs text-gray-500 mt-1 hidden sm:block whitespace-nowrap">
                  {index === 0 && "Vehicle"}
                  {index === 1 && "Budget"}
                  {index === 2 && "Employment"}
                  {index === 3 && "Personal"}
                  {index === 4 && "Additional"}
                </span>
              </div>

              {index < totalSteps - 1 && (
                <div className="flex-1 mx-1">
                  <div className="h-[2px] bg-gray-200 relative">
                    <motion.div
                      className="absolute inset-0 bg-[#3BAA75] origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: currentStep > index + 1 ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};