import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Loader2,
  Download,
  Palette,
  FileCode,
  Layers,
} from 'lucide-react';
import { themes } from '../../../lib/presentonThemes';

interface TopToolbarProps {
  title: string;
  themeKey: string;
  onThemeChange: (theme: string) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  currentSlideIndex: number;
  totalSlides: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onExportJson: () => void;
  onExportPptx: () => void;
  onBack: () => void;
  currentMode?: 'pro' | 'classic';
  onSwitchMode?: (mode: 'pro' | 'classic') => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  title,
  themeKey,
  onThemeChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  currentSlideIndex,
  totalSlides,
  onPrevSlide,
  onNextSlide,
  isSaving,
  saveSuccess,
  hasUnsavedChanges,
  onSave,
  onExportJson,
  onExportPptx,
  onBack,
  currentMode = 'pro',
  onSwitchMode,
}) => {
  const themeList = Object.keys(themes);

  return (
    <header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Back button & Deck Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Exit Studio</span>
        </button>

        <div className="h-4 w-px bg-slate-800 shrink-0" />

        <div className="min-w-0 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-100 truncate max-w-[220px]">
            {title || 'Lesson Presentation'}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Studio Pro
          </span>
        </div>
      </div>

      {/* Center: Studio Switcher Toggle */}
      {onSwitchMode && (
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => onSwitchMode('pro')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
              currentMode === 'pro'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Pro (Presenton)</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('classic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
              currentMode === 'classic'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Classic Studio</span>
          </button>
        </div>
      )}

      {/* Right: Controls, Theme, Zoom, Save & Export */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Slide pager */}
        <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-xs">
          <button
            type="button"
            disabled={currentSlideIndex <= 0}
            onClick={onPrevSlide}
            className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded"
            title="Previous slide"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-300 font-semibold px-1">
            {currentSlideIndex + 1} / {Math.max(totalSlides, 1)}
          </span>
          <button
            type="button"
            disabled={currentSlideIndex >= totalSlides - 1}
            onClick={onNextSlide}
            className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded"
            title="Next slide"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Picker Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1">
          <Palette className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <select
            value={themeKey}
            onChange={(e) => onThemeChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer capitalize font-medium"
            title="Select slide design theme"
          >
            {themeList.map((t) => (
              <option key={t} value={t} className="bg-slate-900 text-slate-200">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-lg px-1.5 py-1 text-xs text-slate-300">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 font-semibold text-slate-400">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-px bg-slate-800 mx-0.5" />
          <button
            type="button"
            onClick={onZoomFit}
            className="p-1 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Save Status & Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
            saveSuccess
              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
              : hasUnsavedChanges
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
            </>
          )}
        </button>

        {/* Export JSON / PPTX */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExportJson}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            title="Export Presentation JSON"
            aria-label="Export JSON"
          >
            <FileCode className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onExportPptx}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Export Presentation Deck"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
