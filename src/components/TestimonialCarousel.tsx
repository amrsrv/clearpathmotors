import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  location: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Michael Chen",
    role: "First-Time Car Buyer",
    content: "As a recent graduate, I was worried about my lack of credit history. Clearpath not only got me approved but helped me understand every step of the process. Within a week, I was driving my first car - a certified pre-owned Honda Civic that fit perfectly within my budget!",
    rating: 5,
    location: "Vancouver, BC"
  },
  {
    id: 2,
    name: "Sarah Thompson",
    role: "Self-Employed Business Owner",
    content: "Being self-employed made getting a car loan seem impossible. Other lenders kept turning me down, but Clearpath looked at my whole financial picture. They understood my business income and found me a great rate. The entire process was transparent and professional.",
    rating: 5,
    location: "Toronto, ON"
  },
  {
    id: 3,
    name: "Ahmed Hassan",
    role: "Recent Immigrant",
    content: "Moving to Canada was challenging enough, and I needed a car for work. Clearpath made the impossible possible - they understood my situation as a newcomer and worked with lenders who specialize in helping immigrants. Now I have both a car and am building my Canadian credit!",
    rating: 5,
    location: "Calgary, AB"
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    role: "Healthcare Worker",
    content: "After my divorce, my credit wasn't great, and I needed reliable transportation for my hospital shifts. Clearpath found me a lender who understood my situation. Their team was compassionate and found me an SUV that was both safe and affordable. I couldn't be happier!",
    rating: 5,
    location: "Ottawa, ON"
  },
  {
    id: 5,
    name: "David Wilson",
    role: "Credit Rebuilding",
    content: "I was hesitant to apply after bankruptcy, thinking no one would approve me. Clearpath not only got me approved but also showed me how this car loan could help rebuild my credit. Six months in, my credit score has already improved by 85 points!",
    rating: 5,
    location: "Edmonton, AB"
  },
  {
    id: 6,
    name: "Lisa Chen",
    role: "Student",
    content: "As an international student, I thought getting a car loan would be impossible. Clearpath's process was incredibly straightforward - they understood my unique situation and helped me get approved despite having no Canadian credit history. I got my car within a week!",
    rating: 5,
    location: "Montreal, QC"
  }
];

export const TestimonialCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#3BAA75]/5 via-white to-[#3BAA75]/10 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Real Stories from Real Customers
          </h2>
          <p className="text-xl text-gray-600">
            Join thousands of satisfied drivers who found their perfect car financing solution
          </p>
        </div>

        <div className="relative">
          <div className="relative h-[400px] overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="absolute w-full"
              >
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>

                    <blockquote className="text-xl text-gray-700 mb-8">
                      "{testimonials[currentIndex].content}"
                    </blockquote>

                    <div className="mt-4">
                      <div className="font-semibold text-gray-900">
                        {testimonials[currentIndex].name}
                      </div>
                      <div className="text-[#3BAA75] font-medium">
                        {testimonials[currentIndex].role}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {testimonials[currentIndex].location}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-[#3BAA75] hover:text-white transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-[#3BAA75] hover:text-white transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="flex justify-center mt-4 gap-1.5">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-[#3BAA75] w-3' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};