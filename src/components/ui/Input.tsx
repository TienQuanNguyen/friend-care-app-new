import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, required, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    
    // Check if there is a value either from uncontrolled or controlled usage
    const hasValue = value !== undefined && value !== '' || (props.defaultValue !== undefined && props.defaultValue !== '');

    const active = isFocused || hasValue;

    return (
      <div className={cn("relative w-full", className)}>
        <div className={cn(
          "relative border rounded bg-white transition-colors duration-200",
          error ? "border-semantic-destructive bg-semantic-destructive/5" : 
          isFocused ? "border-brand-accent" : "border-gray-300"
        )}>
          <label
            className={cn(
              "absolute left-3 transition-all duration-300 pointer-events-none text-text-soft",
              active 
                ? "text-[13px] -translate-y-1/2 top-0 bg-white px-1 font-semibold text-brand-accent"
                : "text-[16px] top-1/2 -translate-y-1/2"
            )}
          >
            {label}
            {required && <span className="text-semantic-destructive ml-1">*</span>}
          </label>
          <input
            ref={ref}
            required={required}
            value={value}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              // Wait a tick to allow the input value to update if controlled
              setTimeout(() => setIsFocused(false), 0);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full bg-transparent px-3 pb-2 pt-3 outline-none text-[16px] text-text-main h-12"
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-semantic-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
