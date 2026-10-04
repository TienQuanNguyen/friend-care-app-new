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
      md: 'p-5',
      lg: 'p-7',
    };

    const base = cn(
      'bg-white/78 backdrop-blur-xl rounded-card shadow-card border border-white/85',
      'transition-[transform,box-shadow] duration-250 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
      paddings[padding],
      className
    );

    if (animate) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
          whileHover={{
            y: -2,
            boxShadow: '0 8px 32px -8px rgba(13, 53, 71, 0.16), 0 2px 8px rgba(59, 153, 188, 0.10)',
          }}
          className={base}
          {...(props as React.ComponentProps<typeof motion.div>)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(base, 'hover:-translate-y-0.5 hover:shadow-card-hover')}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
