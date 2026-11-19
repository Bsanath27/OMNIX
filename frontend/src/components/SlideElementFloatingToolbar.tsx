import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  LayoutGrid,
  Copy,
  Trash2,
  X,
  ChevronDown,
  ArrowRight,
  Check,
  ImageIcon,
  BarChart3,
  GitCompare,
  TrendingUp,
  Columns,
  List,
  Quote,
  SlidersHorizontal,
  GripVertical,
} from 'lucide-react';

export interface SlideElementFloatingToolbarProps {
  cardIndex: number;
  totalCards?: number;
  card?: {
    badge?: string;
    title?: string;
    body?: string;
    stat?: string;
  };
  currentArchetype?: string;
  onSwitchLayout: (archetypeId: string) => void;
  onDuplicateCard: (cardIdx: number) => void;
  onDeleteCard: (cardIdx: number) => void;
  onAIPromptRefine: (prompt: string, cardIdx?: number) => void;
  onStartDrag?: (e: React.PointerEvent) => void;
  onClose?: () => void;
  isDarkMode?: boolean;
}

const ARCHETYPE_OPTIONS = [
  { id: 'card_grid_3', label: '3-Card Bento Grid', icon: LayoutGrid },
  { id: 'bento_4', label: '4-Card Quad Bento', icon: LayoutGrid },
  { id: 'hero_visual_split', label: 'Split Visual Hero (60/40)', icon: ImageIcon },
  { id: 'chart_data', label: 'Data Chart Hero', icon: BarChart3 },
  { id: 'before_after', label: 'Before & After', icon: GitCompare },
  { id: 'stats_grid', label: 'KPI Stats Grid', icon: TrendingUp },
  { id: 'bullet_list', label: 'Concept List', icon: List },
  { id: 'split_comparison', label: '2-Column Contrast', icon: Columns },
  { id: 'editorial_quote', label: 'Editorial Quote', icon: Quote },
];

const QUICK_AI_PROMPTS = [
  'Make concise',
  'Add real-life example',
  'Add metrics',
  'Simplify for students',
];

export const SlideElementFloatingToolbar: React.FC<SlideElementFloatingToolbarProps> = ({
  cardIndex,
  totalCards = 1,
  card: _card,
  currentArchetype = 'card_grid_3',
  onSwitchLayout,
  onDuplicateCard,
  onDeleteCard,
  onAIPromptRefine,
  onStartDrag,
  onClose,
  isDarkMode = true,
}) => {
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsLayoutDropdownOpen(false);
        setIsAIPromptOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleApplyPrompt = (prompt: string) => {
    if (!prompt.trim()) return;
    onAIPromptRefine(prompt.trim(), cardIndex);
    setCustomPrompt('');
    setIsAIPromptOpen(false);
  };

  const currentArchMeta = ARCHETYPE_OPTIONS.find((a) => a.id === currentArchetype) || {
    id: currentArchetype,
    label: 'Layout',
    icon: SlidersHorizontal,
  };
  const ArchIcon = currentArchMeta.icon;

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-40 -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shadow-2xl backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-150 ${
        isDarkMode
          ? 'bg-[#181715]/95 border-[#383531] text-slate-100'
          : 'bg-white/95 border-slate-300 text-slate-800'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag & Move Handle */}
      {onStartDrag && (
        <>
          <div
            onPointerDown={onStartDrag}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-[#FF5C00] cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reposition card freely on canvas"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className={`h-4 w-px ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />
        </>
      )}

      {/* ── 1. Archetype / Layout Switcher Dropdown ── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsLayoutDropdownOpen(!isLayoutDropdownOpen);
            setIsAIPromptOpen(false);
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold transition-colors ${
            isDarkMode
              ? 'hover:bg-white/10 text-slate-200 hover:text-white'
              : 'hover:bg-black/5 text-slate-700 hover:text-black'
          }`}
          title="Switch Slide Layout Archetype"
        >
          <ArchIcon className="w-3.5 h-3.5 text-[#FF5C00]" />
          <span className="max-w-[110px] truncate">{currentArchMeta.label}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isLayoutDropdownOpen && (
          <div
            className={`absolute left-0 top-full mt-2 w-56 max-h-72 overflow-y-auto rounded-2xl border shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in slide-in-from-top-2 ${
              isDarkMode ? 'bg-[#1C1B19] border-[#383531]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1">
              Switch Card Layout
            </div>
            {ARCHETYPE_OPTIONS.map((item) => {
              const ItemIcon = item.icon;
              const isCurrent = item.id === currentArchetype;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSwitchLayout(item.id);
                    setIsLayoutDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-left text-xs transition-colors ${
                    isCurrent
                      ? 'bg-[#FF5C00]/20 text-[#FF5C00] font-bold'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'text-slate-700 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <ItemIcon className="w-3.5 h-3.5 text-[#FF5C00] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-[#FF5C00] shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={`h-4 w-px ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />

      {/* ── 2. Quick AI Refine Trigger & Prompt Input ── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsAIPromptOpen(!isAIPromptOpen);
            setIsLayoutDropdownOpen(false);
            setTimeout(() => aiInputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#FF5C00]/15 text-[#FF5C00] hover:bg-[#FF5C00]/25 border border-[#FF5C00]/30 transition-all"
          title="Refine this card with AI"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Refine</span>
        </button>

        {isAIPromptOpen && (
          <div
            className={`absolute left-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-2.5 z-50 space-y-2 animate-in fade-in slide-in-from-top-2 ${
              isDarkMode ? 'bg-[#1C1B19] border-[#383531]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1 text-[#FF5C00]">
                <Sparkles className="w-3 h-3" /> Refine Card #{cardIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setIsAIPromptOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Prompt Pills */}
            <div className="flex flex-wrap gap-1">
              {QUICK_AI_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleApplyPrompt(p)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom AI Prompt Input */}
            <div className="flex items-center gap-1 pt-1 border-t border-white/5">
              <input
                ref={aiInputRef}
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyPrompt(customPrompt);
                  }
                }}
                placeholder="Custom instruction..."
                className={`flex-1 px-2 py-1 rounded-lg text-xs border focus:outline-none focus:border-[#FF5C00] ${
                  isDarkMode
                    ? 'bg-[#151413] border-[#2C2A26] text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={() => handleApplyPrompt(customPrompt)}
                disabled={!customPrompt.trim()}
                className="p-1 rounded-lg bg-[#FF5C00] hover:bg-[#e05200] disabled:opacity-40 text-white transition-colors"
                title="Submit Prompt"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`h-4 w-px ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />

      {/* ── 3. Duplicate Card ── */}
      <button
        type="button"
        onClick={() => onDuplicateCard(cardIndex)}
        className={`p-1.5 rounded-lg transition-colors ${
          isDarkMode
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-black hover:bg-black/5'
        }`}
        title="Duplicate Card"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* ── 4. Delete Card ── */}
      <button
        type="button"
        onClick={() => onDeleteCard(cardIndex)}
        disabled={totalCards <= 1}
        className={`p-1.5 rounded-lg transition-colors ${
          totalCards <= 1
            ? 'opacity-30 cursor-not-allowed'
            : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
        }`}
        title={totalCards <= 1 ? 'Cannot delete only card' : 'Delete Card'}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* ── 5. Close / Deselect ── */}
      {onClose && (
        <>
          <div className={`h-4 w-px ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Deselect Card (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
};
