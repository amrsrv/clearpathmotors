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
    <div className="w-full max-w-md mx-auto px-2 mb-8" role="region" aria-label="Application progress">
      <progress value={currentStep} max={totalSteps} className="sr-only" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center relative">
                <motion.button
                  onClick={() => onStepClick?.(index + 1)}
                  disabled={index + 1 > currentStep}
                  initial={false}
                  animate={{
                    scale: currentStep >= index + 1 ? 1 : 0.85,
                    backgroundColor: currentStep >= index + 1 ? '#3BAA75' : '#E5E7EB',
                    boxShadow: currentStep >= index + 1 ? '0 2px 8px rgba(59, 170, 117, 0.2)' : 'none'
                  }}
                  whileHover={index + 1 <= currentStep ? { scale: 1.05 } : {}}
                  whileTap={index + 1 <= currentStep ? { scale: 0.95 } : {}}
                  transition={{ duration: 0.2 }}
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${currentStep >= index + 1 ? 'text-white' : 'text-gray-500'}
                    ${index + 1 < currentStep ? 'cursor-pointer hover:bg-[#2D8259]' : 'cursor-default'}
                  `}
                  aria-current={currentStep === index + 1 ? 'step' : undefined}
                  aria-label={`Step ${index + 1}`}
                >
                  {index + 1}
                </motion.button>
                <span className="text-xs text-gray-500 mt-2 hidden sm:block whitespace-nowrap">
                  {index === 0 && "Vehicle"}
                  {index === 1 && "Budget"}
                  {index === 2 && "Credit"}
                  {index === 3 && "Address"}
                  {index === 4 && "Employment"}
                  {index === 5 && "Personal"}
                </span>
              </div>

              {index < totalSteps - 1 && (
                <div className="flex-1 mx-1">
                  <div className="h-[2px] bg-gray-200 relative">
                    <motion.div
                      className="absolute inset-0 bg-[#3BAA75] origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: currentStep > index + 1 ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
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