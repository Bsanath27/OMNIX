import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeStyles = {
    sm: 'text-body-sm px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-body px-4 py-2.5 min-h-[44px] gap-2', // Meets 44px touch target guidelines
    lg: 'text-body px-6 py-3.5 min-h-[52px] font-semibold gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-brand hover:bg-brand-hover active:bg-brand-active text-white shadow-sm shadow-brand/20',
    secondary: 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-content-light dark:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle hover:border-border-light-strong dark:hover:border-border-dark-strong shadow-subtle',
    ghost: 'bg-transparent text-content-light-muted dark:text-content-dark-muted hover:text-content-light dark:hover:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle',
    outline: 'bg-transparent border border-border-light dark:border-border-dark text-content-light dark:text-content-dark hover:border-brand hover:text-brand',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
