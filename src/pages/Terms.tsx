import React from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../components/ScrollReveal';
import { Scale } from 'lucide-react';

const Terms = () => {
  const effectiveDate = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-2 bg-[#3BAA75]/10 rounded-full mb-4">
            <Scale className="w-6 h-6 text-[#3BAA75]" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">Last Updated: {effectiveDate}</p>
        </motion.div>

        <div className="prose prose-lg max-w-none">
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-gray-600">
                Welcome to ClearPath Motors. These Terms of Service ("Terms") govern your use of our website, services, tools, and any interactions with our team. By accessing or using www.clearpathmotors.com or engaging with our services, you agree to comply with and be bound by these Terms. If you do not agree with any part of these Terms, you should refrain from using our services.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
              <p className="text-gray-600">
                To use our services, you must be at least 18 years of age or the legal age of majority in your jurisdiction. By using our website or submitting a pre-qualification application, you confirm that you meet this age requirement and have the legal authority to enter into a binding agreement.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">3. Services Provided</h2>
              <p className="text-gray-600 mb-4">
                ClearPath Motors offers vehicle financing pre-qualification services, dealership referrals, and auto-related consulting services. We are not a lender or financial institution. Rather, we act as an intermediary, helping users understand their potential financing options by connecting them with third-party lenders, financial providers, or dealerships.
              </p>
              <p className="text-gray-600">
                The loan ranges and approval odds we present are estimates based on the information you provide and do not constitute a guaranteed offer of credit. Final decisions, interest rates, and loan amounts are determined by the financial institution with whom you complete your application.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">4. Account and Information Accuracy</h2>
              <p className="text-gray-600">
                When submitting any information through our forms or consultation tools, you agree to provide accurate, current, and complete information. You are solely responsible for the accuracy of the information you submit, including financial, employment, and identification details. If we believe that any information you've provided is false, misleading, or incomplete, we reserve the right to deny or terminate services at our sole discretion without prior notice.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">5. Communications and Consent</h2>
              <p className="text-gray-600">
                By submitting your contact information, you agree to receive communications from ClearPath Motors via email, SMS, phone, or other methods. These communications may include service updates, appointment confirmations, promotional offers, or requests for additional documentation. You may opt out of marketing communications at any time by following the unsubscribe instructions provided.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">6. Disclaimer of Warranties</h2>
              <p className="text-gray-600">
                To the fullest extent permitted by law, ClearPath Motors makes no representations or warranties about the accuracy, reliability, or completeness of any content, results, or estimates provided on our website. All services are provided "as is" and "as available" without warranty of any kind, express or implied. We do not guarantee the performance, availability, or security of our website, nor do we guarantee any financial outcome, approval, or vehicle availability.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-600">
                Under no circumstances shall ClearPath Motors, its directors, employees, partners, agents, or affiliates be liable for any indirect, incidental, consequential, or special damages arising out of or in connection with your use of our website or services. This includes, but is not limited to, loss of profits, loss of data, or failure to obtain financing.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">8. Governing Law</h2>
              <p className="text-gray-600">
                These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein. Any disputes or claims arising from these Terms or the use of our services will be resolved exclusively in the courts of Ontario, unless otherwise agreed by both parties in writing.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions or concerns about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="font-semibold text-gray-900 mb-2">ClearPath Motors</p>
                <p className="text-gray-600">Email: info@clearpathmotors.com</p>
                <p className="text-gray-600">Website: www.clearpathmotors.com</p>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Terms;