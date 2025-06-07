import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../../components/ScrollReveal';
import { MapPin, ChevronRight, Car, CheckCircle, Clock, Shield, BadgeCheck } from 'lucide-react';

const TorontoServiceArea = () => {
  useEffect(() => {
    // Update meta tags for SEO
    document.title = "Auto Financing in Toronto | ClearPath Motors";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Looking for car loans in Toronto? Get approved in minutes with ClearPath Motors. 95% approval rate, competitive rates from 4.99%, and flexible terms for all credit situations.'
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#3BAA75]/5 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ScrollReveal>
          <div className="flex items-center gap-2 text-[#3BAA75] mb-8">
            <MapPin className="h-5 w-5" />
            <Link to="/" className="hover:underline">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-600">Toronto</span>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Auto Financing in Toronto
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get pre-approved fast, even if you have no credit, are new to Canada, or have past financial issues.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Local Auto Financing in Toronto</h2>
              <p className="text-gray-600 mb-6">
                ClearPath Motors proudly serves customers throughout Toronto and the GTA. We understand the unique needs of our diverse Toronto community and work tirelessly to help everyone get the vehicle they deserve.
              </p>
              <p className="text-gray-600 mb-6">
                Whether you're a young professional in downtown Toronto, a growing family in North York, or a newcomer to Canada settling in Scarborough, our specialized programs are designed to help you succeed. We believe everyone deserves a chance at auto financing.
              </p>
              <p className="text-gray-600">
                We've helped hundreds of Toronto residents get on the road with confidence. Our local expertise and strong relationships with dealers and lenders make the difference in getting you approved.
              </p>
            </div>

            <div className="bg-[#3BAA75] rounded-2xl shadow-lg p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Car className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Start Your Approval Now</h2>
              </div>
              <p className="mb-8 text-white/90">
                Join thousands of satisfied drivers in Toronto who found their perfect car financing 
                solution with ClearPath Motors. Our quick online application takes just 30 seconds to complete.
              </p>
              <Link
                to="/get-approved"
                className="block w-full bg-white text-[#3BAA75] text-center px-6 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Your Approval – It Only Takes 30 Seconds
              </Link>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-white/10 rounded-lg p-3 mb-2">
                    <Clock className="h-5 w-5 mx-auto" />
                  </div>
                  <div className="text-sm">30-Second Application</div>
                </div>
                <div className="text-center">
                  <div className="bg-white/10 rounded-lg p-3 mb-2">
                    <Shield className="h-5 w-5 mx-auto" />
                  </div>
                  <div className="text-sm">95% Approval Odds</div>
                </div>
                <div className="text-center">
                  <div className="bg-white/10 rounded-lg p-3 mb-2">
                    <BadgeCheck className="h-5 w-5 mx-auto" />
                  </div>
                  <div className="text-sm">No Credit Check</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">
              We Help All Toronto Residents Get Approved
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Bad Credit Welcome',
                  description: 'Past credit issues? No problem. We specialize in helping Toronto residents rebuild their credit.'
                },
                {
                  title: 'New to Canada',
                  description: 'Recently moved to Toronto? Our newcomer program helps you get approved without Canadian credit history.'
                },
                {
                  title: 'First-Time Buyers',
                  description: 'No credit history? Our first-time buyer program is designed to help you start building credit.'
                }
              ].map((program, index) => (
                <div key={index} className="text-center p-6 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-3">{program.title}</h3>
                  <p className="text-gray-600">{program.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-8">
              Questions about auto financing in Toronto? Our local experts are here to help.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center bg-white text-[#3BAA75] border-2 border-[#3BAA75] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#3BAA75] hover:text-white transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default TorontoServiceArea;