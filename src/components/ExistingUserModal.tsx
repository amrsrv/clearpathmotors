import React from 'react';
import { motion } from 'framer-motion';
import { X, LogIn, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExistingUserModalProps {
  email: string;
  onClose: () => void;
  currentPath: string;
}

const ExistingUserModal: React.FC<ExistingUserModalProps> = ({ email, onClose, currentPath }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-3 text-amber-600 mb-4">
          <div className="bg-amber-100 p-2 rounded-full">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">Account Already Exists</h3>
        </div>
        
        <p className="text-gray-700 mb-4">
          We found an existing account with the email <span className="font-medium">{email}</span>. Please sign in to continue with your application.
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          Your current form data will be saved and restored after you sign in.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <Link
            to={`/login?returnUrl=${encodeURIComponent(currentPath)}`}
            className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ExistingUserModal;