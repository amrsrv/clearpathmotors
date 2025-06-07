import React, { useEffect, useRef } from 'react';
import { useInView, motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  from: number;
  to: number;
  duration?: number;
  format?: (value: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  from, 
  to, 
  duration = 3.5,
  format = (value) => value.toString()
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { 
    once: true, 
    margin: "-20% 0px -20% 0px",
    amount: 0.5
  });
  
  const springValue = useSpring(from, {
    stiffness: 30,
    damping: 30,
    duration: duration * 1000,
    restDelta: 0.001
  });

  const value = useTransform(springValue, (current) => format(current));

  useEffect(() => {
    if (inView) {
      springValue.set(to);
    }
  }, [inView, to, springValue]);

  return (
    <motion.span ref={ref} className="tabular-nums">
      {value}
    </motion.span>
  );
};