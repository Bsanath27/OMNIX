import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark shadow-card',
    subtle: 'bg-surface-light-subtle dark:bg-surface-dark-subtle border-border-light dark:border-border-dark',
    interactive: 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark shadow-subtle hover:border-brand/50 hover:shadow-card cursor-pointer transition-all duration-200',
  };

  return (
    <div
      className={`border rounded-card p-6 text-content-light dark:text-content-dark transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
