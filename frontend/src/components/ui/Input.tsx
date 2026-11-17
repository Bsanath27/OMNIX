import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full text-left">
      {label && (
        <label htmlFor={inputId} className="block text-body-sm font-medium text-content-light dark:text-content-dark mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-content-light-subtle dark:text-content-dark-subtle pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-surface-light dark:bg-surface-dark border text-body text-content-light dark:text-content-dark rounded-xl px-4 py-2.5 min-h-[44px] transition-colors placeholder:text-content-light-subtle dark:placeholder:text-content-dark-subtle focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand ${
            leftIcon ? 'pl-11' : ''
          } ${rightIcon ? 'pr-11' : ''} ${
            error
              ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
              : 'border-border-light dark:border-border-dark hover:border-border-light-strong dark:hover:border-border-dark-strong'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 text-content-light-subtle dark:text-content-dark-subtle pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
      {!error && hint && <p className="mt-1 text-caption text-content-light-muted dark:text-content-dark-muted">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
