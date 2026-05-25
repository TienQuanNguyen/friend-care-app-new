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
          className={cn('bg-white rounded-card shadow-card border border-canvas-dark', paddings[padding], className)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.14)' }}
          {...(props as React.ComponentProps<typeof motion.div>)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn('bg-white rounded-card shadow-card border border-canvas-dark', paddings[padding], className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
