import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'inverted' | 'ghost' | 'frap' | 'black' | 'success' | 'cactus';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center font-semibold rounded-pill',
      'transition-all duration-200',
      'disabled:opacity-50 disabled:pointer-events-none',
      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/30',
    ].join(' ');

    const variants = {
      primary:  'bg-gradient-to-r from-brand to-brand-accent text-white border border-brand/20 hover:brightness-105 shadow-frap-base',
      outline:  'bg-white/70 text-brand border border-brand/25 hover:bg-brand-pale hover:border-brand/35',
      inverted: 'bg-white text-brand border border-white/90 hover:bg-canvas-cool',
      black:    'bg-text-main text-white border border-text-main/80 hover:bg-text-main/85',
      ghost:    'bg-transparent text-text-main hover:bg-white/75 border border-transparent',
      success:  'bg-cactus text-white border border-cactus/20 hover:brightness-105 shadow-cactus',
      cactus:   'bg-gradient-to-r from-cactus to-cactus-dark text-white border border-cactus/20 hover:brightness-105 shadow-cactus',
      frap:     'bg-brand text-white shadow-frap-ambient hover:shadow-frap-base !rounded-full',
    };

    const sizes = {
      sm:   'h-8 px-3 text-[13px]',
      md:   'h-10 px-4 text-[14px]',
      lg:   'h-12 px-7 text-[15px]',
      icon: 'h-10 w-10',
    };

    const frapSizes = {
      sm:   'w-10 h-10',
      md:   'w-13 h-13',
      lg:   'w-15 h-15',
      icon: 'w-13 h-13',
    };

    const appliedSize = variant === 'frap' ? frapSizes[size] : sizes[size];

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], appliedSize, className)}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.015 }}
        transition={{ type: 'spring', stiffness: 440, damping: 22 }}
        {...(props as React.ComponentProps<typeof motion.button>)}
      />
    );
  }
);
Button.displayName = 'Button';
