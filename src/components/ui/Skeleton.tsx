import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'rectangular',
  width,
  height
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldAnimate(!mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setShouldAnimate(!e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const baseClasses = "bg-canvas-cool relative overflow-hidden";
  
  const variantClasses = {
    rectangular: "rounded-card",
    circular: "rounded-full",
    text: "rounded-md",
  };

  return (
    <div 
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
    >
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          }}
          animate={{
            translateX: ['-100%', '100%']
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );
};
