import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { makeClient } from '../lib/makeClient';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
    preferredContact: 'email',
    bestTime: 'morning',
    formName: 'contact_form'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await makeClient.submitContactForm(formData);
      
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: '',
        preferredContact: 'email',
        bestTime: 'morning',
        formName: 'contact_form'
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('There was an error submitting your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#3BAA75]/5 to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions about auto financing? Our team is here to help you every step of the way.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <ScrollReveal delay={0.1}>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3BAA75]/10 rounded-full mb-4">
                <Phone className="h-6 w-6 text-[#3BAA75]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Call Us</h3>
              <p className="text-gray-600 mb-4">Our team is available Monday through Friday, 9am to 6pm EST.</p>
              <a href="tel:+16474513830" className="text-[#3BAA75] font-medium hover:text-[#2D8259] transition-colors">
                +1 (647) 451-3830
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3BAA75]/10 rounded-full mb-4">
                <Mail className="h-6 w-6 text-[#3BAA75]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email Us</h3>
              <p className="text-gray-600 mb-4">Send us an email and we'll get back to you within 24 hours.</p>
              <a href="mailto:info@clearpathmotors.com" className="text-[#3BAA75] font-medium hover:text-[#2D8259] transition-colors">
                info@clearpathmotors.com
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3BAA75]/10 rounded-full mb-4">
                <MapPin className="h-6 w-6 text-[#3BAA75]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
              <p className="text-gray-600 mb-4">Schedule an in-person consultation at our office.</p>
              <address className="not-italic text-[#3BAA75] font-medium">
                Toronto, Ontario
              </address>
            </div>
          </ScrollReveal>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="bg-[#3BAA75] p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
                <p className="mb-6">
                  Fill out the form and our team will get back to you as soon as possible. We're here to help with any questions about auto financing.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Phone className="h-5 w-5" />
                    </div>
                    <span>+1 (647) 451-3830</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Mail className="h-5 w-5" />
                    </div>
                    <span>info@clearpathmotors.com</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <span>Toronto, Ontario</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <div className="bg-green-100 rounded-full p-4 mb-4">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 mb-6">
                      Thank you for contacting us. We'll get back to you as soon as possible.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Send us a message</h3>
                    
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Application Status">Application Status</option>
                        <option value="Document Upload">Document Upload</option>
                        <option value="Payment Question">Payment Question</option>
                        <option value="Technical Support">Technical Support</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={4}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        required
                      ></textarea>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="preferredContact" className="block text-sm font-medium text-gray-700 mb-1">
                          Preferred Contact Method
                        </label>
                        <select
                          id="preferredContact"
                          name="preferredContact"
                          value={formData.preferredContact}
                          onChange={handleChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        >
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="bestTime" className="block text-sm font-medium text-gray-700 mb-1">
                          Best Time to Contact
                        </label>
                        <select
                          id="bestTime"
                          name="bestTime"
                          value={formData.bestTime}
                          onChange={handleChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                        >
                          <option value="morning">Morning (9am-12pm)</option>
                          <option value="afternoon">Afternoon (12pm-5pm)</option>
                          <option value="evening">Evening (5pm-8pm)</option>
                        </select>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-[#3BAA75] text-white px-6 py-3 rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <ScrollReveal>
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 mb-8">
              Can't find what you're looking for? Contact us using the form above.
            </p>
            <a
              href="/faq"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-[#3BAA75] text-[#3BAA75] rounded-lg font-semibold hover:bg-[#3BAA75] hover:text-white transition-colors"
            >
              View All FAQs
            </a>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Contact;