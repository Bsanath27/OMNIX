import React, { useEffect, useState } from 'react';
import { useRouter } from '../../router';
import { useTheme, ThemeChoice } from '../../context/ThemeContext';
import { STRINGS } from '../../strings';
import { fetchDoctor, DoctorReport } from '../../api';
import { StatusDot } from '../ui/StatusDot';
import { X, Sun, Moon, Laptop, Wrench, ShieldCheck } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, closeSettings } = useRouter();
  const { theme, setTheme } = useTheme();
  const [report, setReport] = useState<DoctorReport | null>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      fetchDoctor()
        .then(setReport)
        .catch(() => null);
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeSettings}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl p-6 sm:p-8 z-10 text-content-light dark:text-content-dark transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h3 font-bold">{STRINGS.settings.title}</h2>
              <p className="text-caption text-content-light-muted dark:text-content-dark-muted">
                {STRINGS.app.programme}
              </p>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="p-2 rounded-xl text-content-light-muted dark:text-content-dark-muted hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle hover:text-content-light dark:hover:text-content-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Theme selection */}
          <div>
            <h3 className="text-body-sm font-semibold mb-2.5">
              {STRINGS.settings.themeHeading}
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'system', label: STRINGS.sidebar.systemTheme, icon: <Laptop className="w-4 h-4" /> },
                  { id: 'light', label: STRINGS.sidebar.lightTheme, icon: <Sun className="w-4 h-4" /> },
                  { id: 'dark', label: STRINGS.sidebar.darkTheme, icon: <Moon className="w-4 h-4" /> },
                ] as { id: ThemeChoice; label: string; icon: React.ReactNode }[]
              ).map((item) => {
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id)}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-body-sm font-medium transition-all ${
                      isSelected
                        ? 'border-brand bg-brand/10 text-brand font-semibold shadow-subtle'
                        : 'border-border-light dark:border-border-dark hover:border-border-light-strong dark:hover:border-border-dark-strong text-content-light-muted dark:text-content-dark-muted'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System readiness diagnostic list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {STRINGS.settings.systemHealthHeading}
              </h3>
            </div>

            <div className="border border-border-light dark:border-border-dark rounded-xl divide-y divide-border-light dark:divide-border-dark overflow-hidden bg-surface-light-subtle/30 dark:bg-surface-dark-subtle/30">
              {report ? (
                Object.entries(report.components).map(([name, comp]) => {
                  const statusMap: Record<string, 'ready' | 'working' | 'attention'> = {
                    ok: 'ready',
                    warning: 'working',
                    missing: 'attention',
                    info: 'ready',
                  };
                  const statusType = statusMap[comp.status] || 'ready';

                  return (
                    <div key={name} className="p-3.5 flex items-center justify-between gap-3 text-body-sm">
                      <div>
                        <div className="font-medium capitalize">{name.replace(/_/g, ' ')}</div>
                        <div className="text-caption text-content-light-muted dark:text-content-dark-muted">
                          {comp.message}
                        </div>
                      </div>
                      <StatusDot
                        status={statusType}
                        label={
                          statusType === 'ready'
                            ? STRINGS.settings.healthStatus.ready
                            : statusType === 'working'
                            ? STRINGS.settings.healthStatus.working
                            : STRINGS.settings.healthStatus.attention
                        }
                      />
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-body-sm text-content-light-muted dark:text-content-dark-muted">
                  Checking system components...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-border-light dark:border-border-dark flex justify-end">
          <button
            onClick={closeSettings}
            className="px-5 py-2.5 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark text-body-sm font-medium text-content-light dark:text-content-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
