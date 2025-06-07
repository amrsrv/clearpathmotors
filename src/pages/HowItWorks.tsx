import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Cpu, Car, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../components/ScrollReveal';

const HowItWorks = () => {
  const steps = [
    {
      icon: <FileText className="h-12 w-12 text-[#3BAA75]" />,
      title: "Apply Online",
      description: "Fill out our simple application form in under 5 minutes. No paperwork needed!"
    },
    {
      icon: <Cpu className="h-12 w-12 text-[#3BAA75]" />,
      title: "Get Matched",
      description: "Our AI-powered system finds the best financing options for your situation."
    },
    {
      icon: <Car className="h-12 w-12 text-[#3BAA75]" />,
      title: "Drive Away",
      description: "Get approved and pick up your car from our trusted dealer network."
    }
  ];

  const blogPosts = [
    {
      title: "Can You Get a Car Loan with Bad Credit in Canada? (Yes, Here's How)",
      slug: "car-loan-bad-credit-canada",
      metaDescription: "Struggling with bad credit? Learn how you can still get approved for a car loan in Canada, even with a low credit score. Instant options available!"
    },
    {
      title: "No Credit History? Here's How to Finance Your First Vehicle",
      slug: "no-credit-car-financing",
      metaDescription: "First-time buyer with no credit? Discover how you can still qualify for vehicle financing and start building your credit today."
    },
    {
      title: "How to Improve Your Credit Score Before Applying for a Car Loan",
      slug: "improve-credit-before-car-loan",
      metaDescription: "Increase your approval chances by improving your credit score. Here are 7 smart tips to prepare before applying for auto financing."
    },
    {
      title: "What Credit Score Do You Need to Get a Car Loan in 2025?",
      slug: "credit-score-car-loan-2025",
      metaDescription: "Wondering what credit score you need for auto financing? Here's what lenders are looking for in 2025 and how to qualify."
    },
    {
      title: "Why You Got Declined for a Car Loan — and How to Still Get Approved",
      slug: "declined-car-loan-what-next",
      metaDescription: "Don't give up! Learn the top reasons people get declined and what you can do right now to still get your car loan approved."
    },
    {
      title: "What's the Difference Between Dealer Financing and Bank Loans?",
      slug: "dealer-vs-bank-car-loans",
      metaDescription: "Should you finance through a dealership or your bank? We break down the pros and cons of each to help you decide."
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-bold mb-4">How Clearpath Works</h1>
          <p className="text-xl text-gray-600">Three simple steps to your new car</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-[#F9FAFB] p-8 rounded-lg text-center"
            >
              <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-md flex items-center justify-center">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
              <p className="text-gray-600 mb-6">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <ScrollReveal>
          <div className="bg-[#F9FAFB] rounded-2xl p-8 shadow-lg mb-16">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">Expert Resources</h2>
              <p className="text-lg text-gray-600 text-center mb-12">
                Explore our comprehensive guides to make informed decisions about your auto financing
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                {blogPosts.map((post, index) => (
                  <div 
                    key={post.slug}
                    className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <Link 
                      to={`/blog/${post.slug}`}
                      className="block h-full"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">
                          <CheckCircle className="h-6 w-6 text-[#3BAA75]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-[#3BAA75] transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {post.metaDescription}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <Link
            to="/get-approved"
            className="inline-block bg-[#3BAA75] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#A3D9B1] transition-colors"
          >
            Check If You Qualify
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HowItWorks;