import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold">Clearpath</h3>
            <p className="text-sm text-gray-600">
              Making auto financing accessible for everyone.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#3BAA75]">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#3BAA75]">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#3BAA75]">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#3BAA75]">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/how-it-works" className="text-gray-600 hover:text-[#3BAA75]">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/get-approved" className="text-gray-600 hover:text-[#3BAA75]">
                  Get Approved
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="text-gray-600 hover:text-[#3BAA75]">
                  Calculator
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-600 hover:text-[#3BAA75]">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-[#3BAA75]">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-[#3BAA75]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-[#3BAA75]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/admin-login" className="text-gray-600 hover:text-[#3BAA75]">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-600">
              <li>+1 (647) 451-3830</li>
              <li>info@clearpathmotors.com</li>
              <li>Mon-Fri: 9AM-6PM EST</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-600 text-sm">
            <p>© 2025 Clearpath Inc. All rights reserved.</p>
            <p className="mt-2 text-xs">
              Approval not guaranteed. Terms subject to lender review.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;