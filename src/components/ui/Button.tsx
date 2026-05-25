import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'inverted' | 'ghost' | 'frap' | 'black' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-pill transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: "bg-brand text-white border border-brand hover:bg-brand-accent shadow-frap-base",
      outline: "bg-transparent text-brand border border-brand hover:bg-brand-light/30",
      inverted: "bg-white text-brand border border-white hover:bg-canvas-cool",
      black: "bg-[#0F172A] text-white border border-[#0F172A] hover:bg-[#1E293B]",
      ghost: "bg-transparent text-text-main hover:bg-canvas-cool border border-transparent",
      success: "bg-green text-white border border-green hover:bg-green-deep shadow-glow-green",
      frap: "bg-brand text-white shadow-frap-ambient hover:shadow-frap-base !rounded-full",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-[14px]",
      lg: "h-14 px-8 text-base",
      icon: "h-11 w-11",
    };

    const frapSizes = {
      sm: "w-10 h-10",
      md: "w-14 h-14",
      lg: "w-16 h-16",
      icon: "w-14 h-14",
    };

    const appliedSize = variant === 'frap' ? frapSizes[size] : sizes[size];

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], appliedSize, className)}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        {...(props as React.ComponentProps<typeof motion.button>)}
      />
    );
  }
);
Button.displayName = 'Button';
