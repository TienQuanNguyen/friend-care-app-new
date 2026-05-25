import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', animate = true, ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    if (animate) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          whileHover={{ 
            y: -3, 
            boxShadow: '0 12px 28px -4px rgba(59, 130, 246, 0.12), 0 4px 12px -2px rgba(59, 130, 246, 0.08)',
            backgroundColor: 'rgba(239, 246, 255, 0.3)' // Subtle blue/mint shift (bg-blue-50 with opacity)
          }}
          className={cn('bg-white rounded-card shadow-card border border-canvas-dark transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', paddings[padding], className)}
          {...(props as React.ComponentProps<typeof motion.div>)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn('bg-white rounded-card shadow-card border border-canvas-dark transition-colors duration-300 hover:bg-[#EFF6FF]/30 hover:-translate-y-[3px] hover:shadow-[0_12px_28px_-4px_rgba(59,130,246,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', paddings[padding], className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
