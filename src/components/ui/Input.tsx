import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, required, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const hasValue =
      (value !== undefined && value !== '') ||
      (props.defaultValue !== undefined && props.defaultValue !== '');

    const active = isFocused || hasValue;

    return (
      <div className={cn('relative w-full', className)}>
        <div
          className={cn(
            'relative border rounded-[14px] bg-white/80 backdrop-blur-sm transition-all duration-200',
            error
              ? 'border-semantic-destructive bg-semantic-destructive/5'
              : isFocused
              ? 'border-brand shadow-glow'
              : 'border-brand-light/70 hover:border-brand/40'
          )}
        >
          {label && (
            <label
              className={cn(
                'absolute left-3.5 transition-all duration-200 pointer-events-none text-text-soft',
                active
                  ? 'text-[11.5px] -translate-y-1/2 top-0 bg-white px-1 font-semibold text-brand rounded'
                  : 'text-[15px] top-1/2 -translate-y-1/2'
              )}
            >
              {label}
              {required && <span className="text-semantic-destructive ml-0.5">*</span>}
            </label>
          )}
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
              setTimeout(() => setIsFocused(false), 0);
              props.onBlur?.(e);
            }}
            className="w-full bg-transparent px-3.5 pb-2 pt-3 outline-none text-base text-text-main h-11 font-medium"
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-[12px] text-semantic-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
