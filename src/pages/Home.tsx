import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Gauge, Shield, Wrench, ChevronRight, Calculator, DollarSign, Calendar, Mail, Phone, Clock, FileText, Cpu, Star, Award, TrendingUp, Users, BadgeCheck, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock3, Wine as Engine, ServerCrash as CarCrash, Disc } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { TestimonialCarousel } from '../components/TestimonialCarousel';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { LogoScroll } from '../components/LogoScroll';

const Home = () => {
  const [rotatingWord, setRotatingWord] = useState('Financing');
  const words = ['Financing', 'Credit', 'Approval'];
  const [isMobile, setIsMobile] = useState(false);

  const vehicleTypes = [
    {
      type: "Car",
      image: "https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//mercedes-benz-a-class-car-mercedes-benz-e-class-mercedes-benz-r-class-mercedes-43295074c535bf2d7661e3ab5d194d87.png",
      description: "Sedans & Coupes"
    },
    {
      type: "Truck",
      image: "https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//2025%20F150%20Lightning%20VHP%20Model%20Walkthrough.avif",
      description: "Pickup Trucks"
    },
    {
      type: "SUV",
      image: "https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//2025%20Acura%20MDX%20Overview%20Key%20Features.avif",
      description: "Sport Utility Vehicles"
    },
    {
      type: "Van",
      image: "https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//minivan2.png",
      description: "Minivans & Cargo Vans"
    }
  ];

  const avatars = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
  ];

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setRotatingWord(current => {
        const currentIndex = words.indexOf(current);
        return words[(currentIndex + 1) % words.length];
      });
    }, 3000);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      clearInterval(wordInterval);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const stats = [
    { 
      from: 28, 
      to: 95, 
      label: "Approval Rate",
      format: (value: number) => `${Math.round(value)}%`
    },
    { 
      from: 7.5, 
      to: 25, 
      label: "Loans Funded",
      format: (value: number) => `$${value.toFixed(1)}M+`
    },
    { 
      from: 600, 
      to: 2000, 
      label: "Happy Drivers",
      format: (value: number) => `${Math.round(value).toLocaleString()}+`
    },
    { 
      from: 4.3, 
      to: 4.8, 
      label: "Rating",
      format: (value: number) => value.toFixed(1) + '/5'
    }
  ];

  return (
    <div className="relative">
      {/* Video Background - shared across header & hero */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
        {isMobile ? (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A7A5B] to-[#3BAA75]"></div>
        ) : (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
          >
            <source src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//0607.mp4" type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Page Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="min-h-[72vh] md:min-h-[80vh] flex items-center px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl mx-auto">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                  <Clock3 className="w-4 h-4 mr-2" />
                  Quick Approval Process
                </span>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                  Easy{' '}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={rotatingWord}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-[#3BAA75] relative inline-block"
                    >
                      {rotatingWord}
                    </motion.span>
                  </AnimatePresence>
                </h1>
              </div>
              
              <div className="mt-6 space-y-4">
                <p className="text-lg md:text-xl text-white font-medium">
                  Pre-approval in under a minute.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-white bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75] mr-3 flex-shrink-0" />
                    <span className="text-base">95% approval rate for all credit situations</span>
                  </li>
                  <li className="flex items-center text-white bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <Clock3 className="h-5 w-5 text-[#3BAA75] mr-3 flex-shrink-0" />
                    <span className="text-base">Quick online application, instant decision</span>
                  </li>
                  <li className="flex items-center text-white bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <Calendar className="h-5 w-5 text-[#3BAA75] mr-3 flex-shrink-0" />
                    <span className="text-base">Flexible terms up to 84 months</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/get-approved"
                className="w-full sm:w-auto bg-[#3BAA75] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#A3D9B1] transition-colors group inline-flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                Get Started
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/calculator"
                className="w-full sm:w-auto bg-white text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center border-2 border-gray-200"
              >
                Calculate Payment
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="flex -space-x-3">
                {avatars.map((avatar, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-md"
                  >
                    <img
                      src={avatar}
                      alt={`Happy customer ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="font-semibold text-lg text-white">Trusted by 2,000+</div>
                <div className="text-white/80">Happy drivers</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section - White background starts here */}
      <div className="bg-white">
        <section className="py-4 md:py-4 bg-[#3BAA75]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
              {stats.map((stat, index) => (
                <ScrollReveal key={stat.label} delay={index * 0.1}>
                  <div className="text-center py-2 md:py-2">
                    <div className="text-2xl md:text-3xl font-bold">
                      <AnimatedNumber
                        from={stat.from}
                        to={stat.to}
                        format={stat.format}
                      />
                    </div>
                    <div className="text-sm md:text-base text-white/80">{stat.label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Bad Credit Approval Section */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <ScrollReveal>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                    Bad Credit? You're Still Approved.
                  </h1>
                  <h3 className="text-xl text-gray-600 mt-4">
                    Fast approvals. Flexible terms. Starting at just 4.99% O.A.C.
                  </h3>
                </ScrollReveal>

                <ScrollReveal delay={0.1}>
                  <p className="text-gray-700 text-lg">
                    At Clearpath, we understand that life happens. Whether you've missed a few payments or are starting fresh with no credit history, we make it easy to get approved for the car you need — without the judgment.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.2}>
                  <ul className="space-y-4">
                    {[
                      'All credit scores accepted — even if you\'ve been declined before',
                      'Secure your rate online in seconds',
                      'Rebuild your credit while driving',
                      'Loans from 4.99% O.A.C.'
                    ].map((item, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-6 w-6 text-[#3BAA75] flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollReveal>
              </div>

              <div className="lg:pl-8">
                <ScrollReveal delay={0.3}>
                  <div className="bg-gray-50 rounded-2xl p-8 shadow-lg">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Start Your Application</h3>
                      <p className="text-gray-600 mt-2">Get approved in under 60 seconds</p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 text-gray-700">
                        <Clock3 className="h-5 w-5 text-[#3BAA75]" />
                        <span>Quick 2-minute application</span>
                      </div>
                      <div className="flex items-center space-x-4 text-gray-700">
                        <Shield className="h-5 w-5 text-[#3BAA75]" />
                        <span>Bank-level security</span>
                      </div>
                      <div className="flex items-center space-x-4 text-gray-700">
                        <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                        <span>95% approval rate</span>
                      </div>

                      <Link
                        to="/get-approved"
                        className="block w-full bg-[#3BAA75] text-white text-center px-6 py-4 rounded-lg text-lg font-semibold hover:bg-[#2D8259] transition-colors mt-8"
                      >
                        Apply Now
                      </Link>

                      <p className="text-center text-sm text-gray-500">
                        No credit check required to see your rate
                      </p>
                    </div>
                  </div>

                  <div className="text-center mt-8 text-gray-600 italic">
                    "Thousands of Canadians with bad credit have already driven off approved — and you can too."
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* Logo Scroll Section */}
        <LogoScroll />

        {/* Coverage Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-6">Coverage That Moves With You</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  When you secure your vehicle through ClearPath Motors, you build real protection into your financing — focused on the parts of your car that matter most.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {[
                {
                  icon: <Engine className="h-12 w-12 text-[#3BAA75]" />,
                  title: "Powertrain Warranty",
                  subtitle: "Engine & Transmission Coverage",
                  description: "Protect the heart of your vehicle. Our extended coverage focuses where it counts — the engine and transmission — covering major repairs that could otherwise cost thousands."
                },
                {
                  icon: <CarCrash className="h-12 w-12 text-[#3BAA75]" />,
                  title: "GAP Coverage",
                  subtitle: "Total Loss Protection",
                  description: "If your vehicle is totaled or stolen, GAP protection covers the difference between your insurance payout and your remaining loan — so you're never stuck paying for a car you no longer have."
                },
                {
                  icon: <Disc className="h-12 w-12 text-[#3BAA75]" />,
                  title: "Wheel & Rim Protection",
                  subtitle: "Road Hazard Coverage",
                  description: "Everyday roads aren't perfect. Wheel and rim protection covers the real-world damage from potholes, curb strikes, and road debris — repairs most standard policies leave out."
                }
              ].map((coverage, index) => (
                <ScrollReveal key={coverage.title} delay={index * 0.1}>
                  <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="bg-[#3BAA75]/10 rounded-full p-4 mb-6">
                        {coverage.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {coverage.title}
                      </h3>
                      <p className="text-[#3BAA75] font-medium text-sm mb-4">
                        {coverage.subtitle}
                      </p>
                      <p className="text-gray-600 leading-relaxed">
                        {coverage.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center">
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />
                <h3 className="text-2xl font-bold mb-4">Simple Claims, Handled By Us</h3>
                <p className="text-gray-600 leading-relaxed">
                  If you ever need to use your coverage, we keep it simple: Reach out to ClearPath, open a support ticket, and we'll handle the entire process from start to finish. No endless paperwork, no third-party runaround — just real support, when you need it most.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Vehicle Types Section */}
        <section className="py-16 bg-gradient-to-br from-[#3BAA75]/10 via-white to-[#3BAA75]/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Find Your Perfect Car</h2>
                <p className="text-xl text-gray-600">Choose from our wide selection of vehicles</p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {vehicleTypes.map((vehicle, index) => (
                <ScrollReveal key={vehicle.type} delay={index * 0.1}>
                  <Link
                    to={{
                      pathname: "/get-approved",
                      search: "?vehicle=" + vehicle.type.toLowerCase()
                    }}
                    className="block"
                  >
                    <div className="bg-gray-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={vehicle.image}
                          alt={vehicle.type}
                          className="absolute inset-0 w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4 text-center">
                        <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
                          {vehicle.type}
                        </h4>
                        <p className="text-sm md:text-base text-gray-600">
                          {vehicle.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-gradient-to-r from-[#3BAA75]/5 via-white to-[#3BAA75]/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-20">
                <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
                  Your Path to the Driver's Seat
                </h2>
                <p className="text-xl text-gray-600">
                  Three simple steps to get you behind the wheel
                </p>
              </div>
            </ScrollReveal>

            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#3BAA75]/20 via-[#3BAA75] to-[#3BAA75]/20 transform -translate-y-1/2 hidden lg:block" />

              <div className="grid lg:grid-cols-3 gap-16 relative">
                {[
                  {
                    icon: <Calculator className="h-16 w-16 text-[#3BAA75]" />,
                    title: <>Build Your <Link to="/calculator" className="text-[#3BAA75] hover:text-[#2D8259] transition-colors">Financing Plan</Link></>,
                    description: "Start with our payment calculator. Tweak the numbers, explore possibilities, and discover a monthly payment that fits your budget like a glove."
                  },
                  {
                    icon: <FileText className="h-16 w-16 text-[#3BAA75]" />,
                    title: <>Secure Your <Link to="/get-approved" className="text-[#3BAA75] hover:text-[#2D8259] transition-colors">Pre-Approval</Link></>,
                    description: "We mirror the underwriting systems used by banks — reviewing income, debt ratios, credit behavior, and loan-to-value — to deliver a real-world pre-approval you can trust."
                  },
                  {
                    icon: <Car className="h-16 w-16 text-[#3BAA75]" />,
                    title: "Schedule a Meeting",
                    description: "Pick a time to meet with us. We'll help you find the right car, handle the hard work, and deliver your vehicle straight to your door. Easy, simple, and built around you."
                  }
                ].map((step, index) => (
                  <ScrollReveal key={index} delay={index * 0.2}>
                    <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-b from-[#3BAA75]/10 to-white rounded-full p-6">
                          {step.icon}
                        </div>
                      </div>
                      <div className="pt-12 text-center">
                        <h3 className="text-2xl font-bold mb-4 text-gray-900">
                          {step.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <ScrollReveal delay={0.6}>
              <div className="text-center mt-16">
                <Link
                  to="/get-approved"
                  className="inline-flex items-center px-8 py-4 bg-[#3BAA75] text-white rounded-lg text-lg font-semibold hover:bg-[#2D8259] transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Start Your Journey
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Why us?</h2>
                <p className="text-xl text-gray-600">We make auto financing easy</p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { icon: <Shield />, title: "Bank-Level Security", description: "256-bit encryption for your data" },
                { icon: <TrendingUp />, title: "95% Approval Rate", description: "Higher chance of getting approved" },
                { icon: <Users />, title: "2000+ Happy Drivers", description: "Join our satisfied customers" },
                { icon: <BadgeCheck />, title: "Licensed & Regulated", description: "Fully compliant with regulations" }
              ].map((feature, index) => (
                <ScrollReveal key={feature.title} delay={index * 0.1}>
                  <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-[#3BAA75]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-[#3BAA75]">{feature.icon}</div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <TestimonialCarousel />

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-[#3BAA75]/10 to-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <ScrollReveal>
              <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
              <p className="text-xl text-gray-600 mb-8">
                Apply now and get approved in minutes. No obligation to proceed.
              </p>
              <Link
                to="/get-approved"
                className="inline-flex items-center justify-center bg-[#3BAA75] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#A3D9B1] transition-colors group"
              >
                Apply Now
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* GTA Service Area Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Proudly Serving Drivers Ontario-Wide</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  ClearPath Motors is proud to serve drivers across the Greater Toronto Area as well as the province of Ontario. Whether you're in the heart of the city or in one of the surrounding towns, we're here to help you get pre-approved fast with 95% approval odds — even with no or bad credit.
                </p>
              </div>

              <div className="mt-12">
                <ul className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-3 text-center">
                  {[
                    'Toronto', 'North York', 'Scarborough', 'Etobicoke', 'York', 'East York',
                    'Downtown Toronto', 'Midtown Toronto', 'Old Toronto', 'Mississauga', 'Brampton',
                    'Caledon', 'Vaughan', 'Woodbridge', 'Richmond Hill', 'Markham',
                    'Thornhill', 'Maple', 'King City', 'Aurora', 'Newmarket', 'Stouffville',
                    'Georgina', 'Oakville', 'Burlington', 'Milton', 'Halton Hills', 'Georgetown',
                    'Acton', 'Pickering', 'Ajax', 'Whitby', 'Oshawa', 'Clarington', 
                    'Bowmanville', 'Courtice', 'Uxbridge', 'Port Perry'
                  ].map((town) => (
                    <li key={town}
                      className="text-gray-600 hover:text-[#3BAA75] transition-colors"
                    >
                      {town}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;