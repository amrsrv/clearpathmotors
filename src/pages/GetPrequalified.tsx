import React from 'react';
import { motion } from 'framer-motion';
import { PreQualificationForm } from '../components/PreQualificationForm';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const GetPrequalified = () => {
  const navigate = useNavigate();

  const handleFormComplete = (
    applicationId: string,
    tempUserId: string,
    formData: { email: string; [key: string]: any }
  ) => {
    navigate('/create-account', {
      state: {
        applicationId,
        tempUserId,
        formData,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Pre-Qualified Today
          </h1>
          <p className="text-xl text-gray-600">
            Complete this application to see your personalized financing options
          </p>
        </motion.div>

        <div className="w-full flex">
          <div className="w-full lg:w-3/4 mx-auto">
            <PreQualificationForm onComplete={handleFormComplete} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-16">
        <div className="bg-[#3BAA75]/5 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Why Get Pre-Qualified?
              </h2>
              <p className="text-gray-600 mb-6">
                Pre-qualification gives you a clear picture of what you can afford before you start shopping.
              </p>
              <ul className="space-y-4">
                {[
                  'Know your budget before shopping',
                  'No impact on your credit score',
                  'Stronger negotiating position',
                  'Faster purchase process',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="bg-[#3BAA75]/10 rounded-full p-2">
                      <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Our Commitment to You</h3>
                <p className="text-gray-600 mt-2">We prioritize your privacy and security</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: 'Bank-Level Security',
                    description: 'Your data is encrypted with 256-bit SSL technology',
                  },
                  {
                    title: 'Soft Credit Check',
                    description: "We only perform a soft inquiry that won't affect your score",
                  },
                  {
                    title: 'No Obligation',
                    description: 'Get pre-qualified with no commitment to proceed',
                  },
                ].map(({ title, description }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="bg-[#3BAA75]/10 rounded-full p-2 mt-1">
                      <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{title}</p>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetPrequalified;
