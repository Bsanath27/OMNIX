import React from 'react';

export interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  count?: number | string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  active = false,
  onClick,
  className = '',
  count,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-body-sm font-medium transition-all duration-150 min-h-[36px] select-none ${
        active
          ? 'bg-brand/10 border border-brand text-brand shadow-sm'
          : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-content-light-muted dark:text-content-dark-muted hover:text-content-light dark:hover:text-content-dark hover:border-border-light-strong dark:hover:border-border-dark-strong shadow-subtle'
      } ${className}`}
    >
      {icon && <span className={active ? 'text-brand' : 'opacity-70'}>{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[11px] opacity-75 font-mono">({count})</span>
      )}
    </button>
  );
};
