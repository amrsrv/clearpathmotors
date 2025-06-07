import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ScrollReveal = ({ children, delay = 0, className = '' }: ScrollRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-10% 0px -10% 0px"
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20, rotateX: 10 }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        rotateX: 0,
        transition: {
          type: "spring",
          damping: 20,
          stiffness: 100,
          duration: 0.8,
          delay
        }
      } : {
        opacity: 0,
        y: 20,
        rotateX: 10
      }}
      style={{
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden"
      }}
    >
      {children}
    </motion.div>
  );
};