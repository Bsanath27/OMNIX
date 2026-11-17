import React from 'react';

export type StatusType = 'ready' | 'generating' | 'working' | 'review' | 'approved' | 'attention';

export interface StatusDotProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  label,
  className = '',
}) => {
  const configs: Record<StatusType, { dotColor: string; defaultLabel: string; pulse?: boolean }> = {
    ready: {
      dotColor: 'bg-emerald-500',
      defaultLabel: 'Ready',
    },
    generating: {
      dotColor: 'bg-amber-500',
      defaultLabel: 'Generating',
      pulse: true,
    },
    working: {
      dotColor: 'bg-amber-500',
      defaultLabel: 'Processing',
      pulse: true,
    },
    review: {
      dotColor: 'bg-sky-500',
      defaultLabel: 'Ready for review',
    },
    approved: {
      dotColor: 'bg-emerald-600',
      defaultLabel: 'Approved',
    },
    attention: {
      dotColor: 'bg-rose-500',
      defaultLabel: 'Needs setup',
    },
  };

  const config = configs[status] || configs.ready;
  const displayLabel = label || config.defaultLabel;

  return (
    <span className={`inline-flex items-center gap-2 text-body-sm text-content-light dark:text-content-dark ${className}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor}`} />
      </span>
      <span className="font-medium text-content-light-muted dark:text-content-dark-muted">{displayLabel}</span>
    </span>
  );
};
