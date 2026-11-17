import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1.5 p-1 bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark rounded-xl overflow-x-auto ${className}`}>
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-body-sm font-medium transition-all duration-150 whitespace-nowrap min-h-[38px] select-none ${
              isActive
                ? 'bg-surface-light dark:bg-surface-dark text-content-light dark:text-content-dark shadow-subtle border border-border-light dark:border-border-dark'
                : 'text-content-light-muted dark:text-content-dark-muted hover:text-content-light dark:hover:text-content-dark hover:bg-surface-light/40 dark:hover:bg-surface-dark/40 border border-transparent'
            }`}
          >
            {tab.icon && <span className={isActive ? 'text-brand' : 'opacity-70'}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'bg-surface-light dark:bg-surface-dark text-content-light-muted dark:text-content-dark-muted'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
