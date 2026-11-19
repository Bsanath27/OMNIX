import React from 'react';
import {
  Sparkles,
  LayoutGrid,
  BarChart3,
  ImageIcon,
  Palette,
  FileText,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';

export type ActiveRightPanel =
  | 'copilot'
  | 'templates'
  | 'charts'
  | 'media'
  | 'theme'
  | 'notes'
  | 'text'
  | 'elements'
  | 'diagrams'
  | null;

export interface RightEditPanelProps {
  activePanel: ActiveRightPanel;
  setActivePanel: (panel: ActiveRightPanel | ((prev: ActiveRightPanel) => ActiveRightPanel)) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  onResetZoom?: () => void;
  isDarkMode?: boolean;
}

interface DockItem {
  id: NonNullable<ActiveRightPanel>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
}

export const DOCK_ITEMS: DockItem[] = [
  { id: 'copilot', label: 'AI Co-Pilot', icon: Sparkles, badge: 'AI', shortcut: '⌘K' },
  { id: 'templates', label: 'Templates & Layouts', icon: LayoutGrid, badge: '105+' },
  { id: 'charts', label: 'Charts & Data', icon: BarChart3 },
  { id: 'media', label: 'Media Assets', icon: ImageIcon },
  { id: 'theme', label: 'Theme Palette', icon: Palette },
  { id: 'notes', label: 'Speaker Notes', icon: FileText, shortcut: '⌘N' },
];

export const RightEditPanel: React.FC<RightEditPanelProps> = ({
  activePanel,
  setActivePanel,
  zoomLevel,
  setZoomLevel,
  onResetZoom,
  isDarkMode = true,
}) => {
  const handleToggle = (id: NonNullable<ActiveRightPanel>) => {
    setActivePanel((prev) => (prev === id ? null : id));
  };

  const handleResetZoom = () => {
    if (onResetZoom) {
      onResetZoom();
    } else {
      setZoomLevel(100);
    }
  };

  return (
    <aside
      className={`w-12 h-full flex flex-col items-center justify-between py-3.5 select-none z-30 shrink-0 border-l transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#141312] border-[#2B2926] text-slate-300'
          : 'bg-[#F7F5F0] border-[#E5E0D8] text-slate-600'
      }`}
      aria-label="Presentation Edit Dock"
    >
      {/* ── Top Tool Icon Dock ── */}
      <div className="flex flex-col items-center gap-2 w-full px-1.5">
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 relative ${
                  isActive
                    ? 'bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/60 shadow-sm shadow-orange-500/20'
                    : isDarkMode
                    ? 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#383531]'
                    : 'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-black/5 border border-transparent hover:border-slate-300'
                }`}
                aria-label={item.label}
                aria-pressed={isActive}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'scale-105' : ''}`} />

                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#FF5C00] text-white text-[9px] font-black font-mono flex items-center justify-center ring-2 ring-[#141312]">
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Hover Tooltip (Presenton floating style, positioned to the left of the dock) */}
              <div
                role="tooltip"
                className={`pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 border ${
                  isDarkMode
                    ? 'bg-[#1C1B19] text-slate-100 border-[#383531]'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/10 text-slate-400">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Zoom Controls (+ / - / Reset) ── */}
      <div
        className={`flex flex-col items-center gap-1.5 pt-3 border-t w-full px-1.5 ${
          isDarkMode ? 'border-[#262422]' : 'border-[#E5E0D8]'
        }`}
      >
        {/* Zoom In */}
        <div className="relative group w-full flex justify-center">
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-xs font-mono ${
              isDarkMode
                ? 'bg-[#1C1B19] border border-[#2B2926] text-slate-300 hover:text-white hover:border-[#444]'
                : 'bg-white border border-slate-200 text-slate-700 hover:text-black hover:border-slate-400'
            }`}
            aria-label="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium bg-[#1C1B19] text-slate-100 border border-[#383531] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Zoom In (+)
          </div>
        </div>

        {/* Zoom Level Indicator / Reset Button */}
        <div className="relative group w-full flex justify-center">
          <button
            type="button"
            onClick={handleResetZoom}
            className="text-[10px] font-mono py-1 px-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-0.5"
            aria-label="Reset Zoom to 100%"
          >
            <span>{zoomLevel}%</span>
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium bg-[#1C1B19] text-slate-100 border border-[#383531] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3 text-[#FF5C00]" />
            <span>Reset Zoom (100%)</span>
          </div>
        </div>

        {/* Zoom Out */}
        <div className="relative group w-full flex justify-center">
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-xs font-mono ${
              isDarkMode
                ? 'bg-[#1C1B19] border border-[#2B2926] text-slate-300 hover:text-white hover:border-[#444]'
                : 'bg-white border border-slate-200 text-slate-700 hover:text-black hover:border-slate-400'
            }`}
            aria-label="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium bg-[#1C1B19] text-slate-100 border border-[#383531] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Zoom Out (-)
          </div>
        </div>
      </div>
    </aside>
  );
};
