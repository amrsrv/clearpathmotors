import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, ChevronRight, Shield, Award, TrendingUp, Users, BadgeCheck, Car, FileText, Calculator as CalculatorIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const Calculator = () => {
  const [searchParams] = useSearchParams();
  const [calculationType, setCalculationType] = useState<'price' | 'payment'>('price');
  const [vehiclePrice, setVehiclePrice] = useState(Number(searchParams.get('price')) || 20000);
  const [downPayment, setDownPayment] = useState(2000);
  const [interestRate, setInterestRate] = useState(Number(searchParams.get('rate')) || 5.9);
  const [term, setTerm] = useState(Number(searchParams.get('term')) || 60);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [desiredMonthlyPayment, setDesiredMonthlyPayment] = useState(Number(searchParams.get('budget')) || 500);
  const [totalLoan, setTotalLoan] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [maxVehiclePrice, setMaxVehiclePrice] = useState(0);

  useEffect(() => {
    if (calculationType === 'price') {
      calculateLoanFromPrice();
    } else {
      calculatePriceFromPayment();
    }
  }, [vehiclePrice, downPayment, interestRate, term, desiredMonthlyPayment, calculationType]);

  const calculateLoanFromPrice = () => {
    const loanAmount = vehiclePrice - downPayment;
    const monthlyRate = interestRate / 1200;
    const monthlyPaymentCalc = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                              (Math.pow(1 + monthlyRate, term) - 1);
    
    const totalAmount = monthlyPaymentCalc * term;
    const totalInterestPaid = totalAmount - loanAmount;

    setMonthlyPayment(monthlyPaymentCalc);
    setTotalLoan(loanAmount);
    setTotalInterest(totalInterestPaid);
  };

  const calculatePriceFromPayment = () => {
    const monthlyRate = interestRate / 1200;
    const denominator = monthlyRate * Math.pow(1 + monthlyRate, term);
    const numerator = Math.pow(1 + monthlyRate, term) - 1;
    const maxLoanAmount = (desiredMonthlyPayment * numerator) / denominator;
    const calculatedVehiclePrice = maxLoanAmount + downPayment;
    
    setMaxVehiclePrice(calculatedVehiclePrice);
    setVehiclePrice(calculatedVehiclePrice);
    setTotalLoan(maxLoanAmount);
    setMonthlyPayment(desiredMonthlyPayment);
    setTotalInterest((desiredMonthlyPayment * term) - maxLoanAmount);
  };

  return (
    <div className="bg-gradient-to-b from-white via-[#3BAA75]/5 to-white">
      <section className="pt-12 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4">Monthly Payment Calculator</h1>
            <p className="text-xl text-gray-600">Plan your auto loan with confidence</p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3 bg-[#F9FAFB] p-8 rounded-2xl shadow-lg"
            >
              <div className="space-y-6">
                {/* Calculator Type Toggle */}
                <div className="flex gap-4 mb-8">
                  <button
                    onClick={() => setCalculationType('price')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      calculationType === 'price'
                        ? 'bg-[#3BAA75] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Start with Price
                  </button>
                  <button
                    onClick={() => setCalculationType('payment')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      calculationType === 'payment'
                        ? 'bg-[#3BAA75] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Start with Payment
                  </button>
                </div>

                {calculationType === 'payment' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desired Monthly Payment
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="200"
                        max="2000"
                        step="50"
                        value={desiredMonthlyPayment}
                        onChange={(e) => setDesiredMonthlyPayment(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                      />
                      <div className="mt-2 text-lg font-semibold text-[#3BAA75]">
                        ${desiredMonthlyPayment.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Price
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="5000"
                        max="100000"
                        step="1000"
                        value={vehiclePrice}
                        onChange={(e) => setVehiclePrice(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                      />
                      <div className="mt-2 text-lg font-semibold text-[#3BAA75]">
                        ${vehiclePrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Down Payment
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max={vehiclePrice * 0.5}
                      step="500"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3BAA75]"
                    />
                    <div className="mt-2 text-lg font-semibold text-[#3BAA75]">
                      ${downPayment.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interest Rate (%)
                    </label>
                    <select
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value={3.9}>3.9%</option>
                      <option value={4.9}>4.9%</option>
                      <option value={5.9}>5.9%</option>
                      <option value={6.9}>6.9%</option>
                      <option value={7.9}>7.9%</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loan Term
                    </label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                    >
                      <option value={36}>36 months</option>
                      <option value={48}>48 months</option>
                      <option value={60}>60 months</option>
                      <option value={72}>72 months</option>
                      <option value={84}>84 months</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-2"
            >
              <div className="bg-[#3BAA75] text-white p-8 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-semibold mb-6">Payment Summary</h3>
                <div className="space-y-6">
                  <div>
                    <div className="text-sm opacity-90 mb-1">Monthly Payment</div>
                    <div className="text-4xl font-bold">
                      ${monthlyPayment.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                    <div>
                      <div className="text-sm opacity-90 mb-1">
                        {calculationType === 'payment' ? 'Max Vehicle Price' : 'Loan Amount'}
                      </div>
                      <div className="text-xl font-semibold">
                        ${(calculationType === 'payment' ? maxVehiclePrice : totalLoan).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm opacity-90 mb-1">Total Interest</div>
                      <div className="text-xl font-semibold">
                        ${totalInterest.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={{
                      pathname: "/get-prequalified",
                      search: `?amount=${totalLoan}&term=${term}&rate=${interestRate}&budget=${monthlyPayment}`
                    }}
                    className="block w-full bg-white text-[#3BAA75] text-center px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors mt-6 group"
                  >
                    Apply Now
                    <ChevronRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gradient-to-br from-[#3BAA75]/10 via-white to-[#3BAA75]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose ClearPath?</h2>
            <p className="text-xl text-gray-600">Experience hassle-free auto financing</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="h-12 w-12 text-[#3BAA75]" />,
                title: "Secure Process",
                description: "Your information is protected with bank-level security"
              },
              {
                icon: <Award className="h-12 w-12 text-[#3BAA75]" />,
                title: "Best Rates",
                description: "We match you with the most competitive rates available"
              },
              {
                icon: <TrendingUp className="h-12 w-12 text-[#3BAA75]" />,
                title: "Quick Approval",
                description: "Get approved in minutes, not days"
              }
            ].map((benefit, index) => (
              <div key={benefit.title} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-[#3BAA75]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
            {[
              { number: "95%", label: "Approval Rate" },
              { number: "$25M+", label: "Loans Funded" },
              { number: "2,000+", label: "Happy Drivers" },
              { number: "4.8/5", label: "Rating" }
            ].map((stat, index) => (
              <div key={stat.label} className="text-center py-4">
                <div className="text-2xl md:text-3xl font-bold">{stat.number}</div>
                <div className="text-sm md:text-base text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-gradient-to-br from-white via-[#3BAA75]/5 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to your new car</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CalculatorIcon className="h-12 w-12 text-[#3BAA75]" />,
                title: "Calculate Payment",
                description: "Use our calculator to find your ideal monthly payment"
              },
              {
                icon: <FileText className="h-12 w-12 text-[#3BAA75]" />,
                title: "Quick Application",
                description: "Fill out our simple online application"
              },
              {
                icon: <Car className="h-12 w-12 text-[#3BAA75]" />,
                title: "Get Your Car",
                description: "Get approved and drive away in your new car"
              }
            ].map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="bg-[#3BAA75]/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#3BAA75]/10 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Apply now and get approved in minutes. No obligation to proceed.
          </p>
          <Link
            to="/get-prequalified"
            className="inline-flex items-center justify-center bg-[#3BAA75] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#A3D9B1] transition-colors group"
          >
            Apply Now
            <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Calculator;