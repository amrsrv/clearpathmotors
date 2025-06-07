import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, Phone } from 'lucide-react';

interface AppointmentSchedulerProps {
  onSchedule: (date: Date, type: 'video' | 'phone') => Promise<void>;
}

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({ onSchedule }) => {
  const [appointmentType, setAppointmentType] = useState<'video' | 'phone'>('video');

  const handleSchedule = () => {
    // Open Calendly in a new tab
    window.open('https://calendly.com/amirsaravi92/30min', '_blank');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Schedule a Consultation</h2>

      {/* Appointment Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Consultation Type
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setAppointmentType('video')}
            className={`
              flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors
              ${appointmentType === 'video'
                ? 'border-[#3BAA75] bg-[#3BAA75]/5'
                : 'border-gray-200 hover:border-[#3BAA75]'
              }
            `}
          >
            <Video className="h-5 w-5" />
            <span>Video Call</span>
          </button>
          <button
            onClick={() => setAppointmentType('phone')}
            className={`
              flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors
              ${appointmentType === 'phone'
                ? 'border-[#3BAA75] bg-[#3BAA75]/5'
                : 'border-gray-200 hover:border-[#3BAA75]'
              }
            `}
          >
            <Phone className="h-5 w-5" />
            <span>Phone Call</span>
          </button>
        </div>
      </div>

      {/* Schedule Button */}
      <button
        onClick={handleSchedule}
        className="w-full bg-[#3BAA75] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2D8259] transition-colors flex items-center justify-center gap-2"
      >
        <Calendar className="h-5 w-5" />
        Schedule Consultation
      </button>

      <p className="mt-4 text-sm text-gray-600 text-center">
        You'll be redirected to our scheduling page to pick a time that works for you
      </p>
    </div>
  );
};