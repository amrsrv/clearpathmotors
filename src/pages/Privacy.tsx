import React from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../components/ScrollReveal';
import { Shield } from 'lucide-react';

const Privacy = () => {
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
            <Shield className="w-6 h-6 text-[#3BAA75]" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">Last Updated: {effectiveDate}</p>
        </motion.div>

        <div className="prose prose-lg max-w-none">
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Introduction</h2>
              <p className="text-gray-600">
                ClearPath Motors ("we," "our," or "us") is committed to protecting your privacy and ensuring that your personal information is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website, www.clearpathmotors.com, use our services, or interact with our business in any other way.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
              <p className="text-gray-600 mb-4">
                When you interact with ClearPath Motors, we collect both personal and non-personal information to provide services and improve your experience. Personal information may include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Mailing address</li>
                <li>Employment details</li>
                <li>Income information</li>
                <li>Vehicle preferences</li>
              </ul>
              <p className="text-gray-600">
                We may also collect information from third-party sources with your consent, such as credit bureaus, partner dealerships, or financial institutions.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>Facilitate pre-qualification assessments</li>
                <li>Connect you with lenders or dealerships</li>
                <li>Process financing applications</li>
                <li>Tailor offers to meet your needs</li>
                <li>Communicate regarding appointments and updates</li>
                <li>Improve our website and services</li>
                <li>Ensure legal compliance</li>
                <li>Detect and prevent fraudulent activity</li>
              </ul>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Data Security</h2>
              <p className="text-gray-600">
                At ClearPath Motors, data security is a top priority. We implement a range of physical, electronic, and administrative safeguards to protect your information from unauthorized access, disclosure, alteration, or destruction. These measures include encryption of sensitive data, secure socket layer (SSL) technology, firewall protection, secure data centers, and employee confidentiality agreements.
              </p>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Your Privacy Rights</h2>
              <p className="text-gray-600 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>Access your personal information</li>
                <li>Correct or update your data</li>
                <li>Request deletion of your information</li>
                <li>Object to specific types of processing</li>
                <li>Receive a copy of your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions or concerns about this Privacy Policy or the handling of your personal data, please contact us at:
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

export default Privacy;