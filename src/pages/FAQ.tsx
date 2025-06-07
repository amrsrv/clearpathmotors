import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Can I apply with bad credit?",
      answer: "Yes! We believe everyone deserves a chance at auto financing. Our AI-powered system looks at multiple factors beyond just credit score, including income and employment history."
    },
    {
      question: "How fast is the approval process?",
      answer: "Most applicants receive a decision within minutes of completing their online application. Final approval and funding typically occur within 24-48 hours."
    },
    {
      question: "What documents do I need to apply?",
      answer: "You'll need a valid driver's license, proof of income (recent pay stubs), proof of residence, and basic contact information. No paper documents are required for initial approval."
    },
    {
      question: "Is there a minimum income requirement?",
      answer: "While we don't have a strict minimum, we typically look for monthly income of at least $1,500. However, each application is evaluated individually."
    },
    {
      question: "Will applying affect my credit score?",
      answer: "Initial pre-qualification uses a soft credit check, which doesn't impact your score. A hard inquiry is only performed when you decide to proceed with a specific loan offer."
    },
    {
      question: "Can I refinance my existing auto loan?",
      answer: "Yes, we offer refinancing options that could help lower your monthly payments or reduce your interest rate. Apply online to see your new rate."
    },
    {
      question: "What types of vehicles can I finance?",
      answer: "We finance new and used vehicles up to 10 years old. This includes cars, trucks, SUVs, and vans from reputable dealers in our network."
    },
    {
      question: "Is there a prepayment penalty?",
      answer: "No, we never charge prepayment penalties. You're free to pay off your loan early or make additional payments at any time."
    }
  ];

  return (
    <div className="bg-white min-h-screen pt-24 md:pt-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-600">Everything you need to know about auto financing with Clearpath</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-medium">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-[#3BAA75]" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              <motion.div
                initial={false}
                animate={{ height: openIndex === index ? 'auto' : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-50">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;