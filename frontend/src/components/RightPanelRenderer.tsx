import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  LayoutGrid,
  BarChart3,
  ImageIcon,
  Palette,
  FileText,
  X,
  Check,
  ArrowRight,
  TrendingUp,
  PieChart,
  LineChart,
  Layers,
  Lightbulb,
  Scissors,
  MessageSquare,
  HelpCircle,
  Loader2,
  Mic,
  Compass,
} from 'lucide-react';
import { ActiveRightPanel } from './RightEditPanel';
import { TEMPLATE_LIBRARY, TEMPLATE_CATEGORIES } from './SlideTemplateLibraryModal';
import { ChartStudioPanel, MediaAssetPickerDrawer, SpeakerNotesDrawer } from './panels';

export interface RightPanelRendererProps {
  activePanel: ActiveRightPanel;
  setActivePanel: (panel: ActiveRightPanel | ((prev: ActiveRightPanel) => ActiveRightPanel)) => void;
  // Theme props
  activeThemeKey: string;
  setActiveThemeKey: (themeKey: string) => void;
  themes: Record<string, any>;
  // Slide & card props
  activeSlide: any;
  onUpdateSlideField: (field: string, value: any) => void;
  onAddCard: (card: {
    badge?: string;
    title: string;
    body: string;
    stat?: string;
    citation?: string;
    isFormula?: boolean;
    isChart?: boolean;
    chartType?: string;
    chartData?: { label: string; value: number }[];
    media_url?: string;
  }) => void;
  onSetArchetype: (archetype: string) => void;
  // Templates modal trigger
  onOpenTemplateLibrary: () => void;
  // Co-Pilot props
  isSuggesting: boolean;
  onTriggerRefinement: (
    type: 'make_concise' | 'add_teacher_tip' | 'discussion_prompt' | 'key_principles' | 'custom',
    customPrompt?: string
  ) => void;
  coPilotPrompt: string;
  setCoPilotPrompt: (val: string) => void;
  isListening?: boolean;
  onToggleVoiceInput?: () => void;
  onApplyCustomRefinement: () => void;
  activeSuggestion?: any;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
  // Speaker notes
  isGeneratingScript?: boolean;
  onGenerateScript?: () => void;
  // Appearance
  isDarkMode?: boolean;
}

export const RightPanelRenderer: React.FC<RightPanelRendererProps> = ({
  activePanel,
  setActivePanel,
  activeThemeKey,
  setActiveThemeKey,
  themes,
  activeSlide,
  onUpdateSlideField,
  onAddCard,
  onSetArchetype,
  onOpenTemplateLibrary,
  isSuggesting,
  onTriggerRefinement,
  coPilotPrompt,
  setCoPilotPrompt,
  isListening,
  onToggleVoiceInput,
  onApplyCustomRefinement,
  activeSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
  isGeneratingScript,
  onGenerateScript,
  isDarkMode = true,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>('all');
  const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);

  // Auto-dismiss cleanly on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanel) {
        setActivePanel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel, setActivePanel]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const panelMeta = useMemo(() => {
    switch (activePanel) {
      case 'copilot':
        return { title: 'Slide Co-Pilot', icon: Sparkles, badge: 'AI Engine' };
      case 'templates':
        return { title: 'Templates & Layouts', icon: LayoutGrid, badge: '105+ Presets' };
      case 'charts':
        return { title: 'Charts & Data', icon: BarChart3, badge: 'Visualization' };
      case 'media':
        return { title: 'Media & Assets', icon: ImageIcon, badge: 'Curated' };
      case 'theme':
        return { title: 'Theme & Typography', icon: Palette, badge: 'Design System' };
      case 'notes':
        return { title: 'Speaker Notes', icon: FileText, badge: 'Teacher Script' };
      case 'text':
        return { title: 'Text Blocks', icon: FileText, badge: 'Content' };
      case 'elements':
        return { title: 'Elements & Cards', icon: Layers, badge: 'Structure' };
      case 'diagrams':
        return { title: 'Diagrams & Flows', icon: Compass, badge: 'Process' };
      default:
        return { title: 'Panel', icon: Sparkles, badge: '' };
    }
  }, [activePanel]);

  if (!activePanel) return null;

  const PanelIcon = panelMeta.icon;

  return (
    <aside
      className={`w-80 sm:w-96 h-full flex flex-col justify-between shrink-0 select-none z-20 border-l animate-in slide-in-from-right duration-200 transition-colors shadow-2xl relative ${
        isDarkMode
          ? 'bg-[#181715] border-[#2B2926] text-slate-100'
          : 'bg-[#FCFAF7] border-[#E8E3DA] text-slate-800'
      }`}
      aria-label={`${panelMeta.title} Panel`}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-3 left-4 right-4 z-40 bg-[#FF5C00] text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header ── */}
      <div
        className={`p-3.5 border-b shrink-0 flex items-center justify-between ${
          isDarkMode ? 'border-[#282624] bg-[#1C1B19]/50' : 'border-[#E8E3DA] bg-white/50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30 flex items-center justify-center shrink-0">
            <PanelIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-tight truncate">{panelMeta.title}</h3>
              {panelMeta.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#FF5C00]/15 text-[#FF5C00] font-bold">
                  {panelMeta.badge}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActivePanel(null)}
          className={`p-1.5 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
          title="Close Drawer (Esc)"
          aria-label="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ==============================================================
            PANEL 1: AI CO-PILOT
        ============================================================== */}
        {activePanel === 'copilot' && (
          <div className="space-y-4">
            <div
              className={`p-3 rounded-2xl border ${
                isDarkMode
                  ? 'bg-gradient-to-br from-[#24211D] to-[#1C1A18] border-[#38332E]'
                  : 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-[#FF5C00]" />
                <span className="text-xs font-bold text-[#FF5C00] uppercase tracking-wider">
                  Instructional AI Assistant
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300 dark:text-slate-300">
                Enhance, clarify, or reformat this slide using pedagogical prompts tailored for classroom engagement.
              </p>
            </div>

            {/* Quick Refinements */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Instant Slide Refinements
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'make_concise' as const,
                    label: 'Make Concise',
                    icon: Scissors,
                    desc: 'Trim prose for impact',
                  },
                  {
                    id: 'add_teacher_tip' as const,
                    label: 'Teacher Tip',
                    icon: Lightbulb,
                    desc: 'Pedagogical delivery tip',
                  },
                  {
                    id: 'discussion_prompt' as const,
                    label: 'Discussion',
                    icon: MessageSquare,
                    desc: 'Socratic inquiry prompt',
                  },
                  {
                    id: 'key_principles' as const,
                    label: 'Core Formula',
                    icon: HelpCircle,
                    desc: 'Highlight essentials',
                  },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => onTriggerRefinement(action.id)}
                      disabled={isSuggesting}
                      className={`p-2.5 rounded-xl border text-left transition-all group flex flex-col justify-between ${
                        isDarkMode
                          ? 'bg-[#201F1C] border-[#2E2C28] hover:border-[#FF5C00]/60 hover:bg-[#262421]'
                          : 'bg-white border-slate-200 hover:border-[#FF5C00] hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-slate-200 group-hover:text-[#FF5C00] transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold truncate">{action.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">{action.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom AI Prompt Input */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Custom Instruction
              </span>
              <div
                className={`relative rounded-xl border p-2 ${
                  isDarkMode ? 'bg-[#1F1E1B] border-[#2E2C28]' : 'bg-white border-slate-200'
                }`}
              >
                <textarea
                  rows={3}
                  value={coPilotPrompt}
                  onChange={(e) => setCoPilotPrompt(e.target.value)}
                  placeholder="e.g., Rewrite cards with real-world biotechnology examples..."
                  className="w-full bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  {onToggleVoiceInput && (
                    <button
                      type="button"
                      onClick={onToggleVoiceInput}
                      className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                        isListening
                          ? 'bg-red-500/20 text-red-400 animate-pulse'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={isListening ? 'Listening...' : 'Voice Dictation'}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{isListening ? 'Listening...' : 'Dictate'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onApplyCustomRefinement}
                    disabled={isSuggesting || !coPilotPrompt.trim()}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5C00] hover:bg-[#e05200] disabled:opacity-40 text-white font-bold text-xs transition-all"
                  >
                    {isSuggesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Thinking...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Suggestion Diff Card Preview */}
            {activeSuggestion && (
              <div
                className={`p-3 rounded-2xl border space-y-2 animate-in fade-in slide-in-from-bottom-2 ${
                  isDarkMode ? 'bg-[#22201D] border-[#FF5C00]/40' : 'bg-orange-50 border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#FF5C00] uppercase">
                    Suggested Revision
                  </span>
                  <div className="flex items-center gap-1">
                    {onApplySuggestion && (
                      <button
                        onClick={onApplySuggestion}
                        className="px-2 py-1 rounded bg-[#FF5C00] text-white text-[11px] font-bold flex items-center gap-1 hover:bg-[#e05200]"
                      >
                        <Check className="w-3 h-3" /> Apply
                      </button>
                    )}
                    {onDismissSuggestion && (
                      <button
                        onClick={onDismissSuggestion}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {activeSuggestion.title && (
                  <div className="text-xs font-bold text-slate-100">{activeSuggestion.title}</div>
                )}
                {activeSuggestion.cards && (
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {activeSuggestion.cards.map((c: any, i: number) => (
                      <div key={i} className="p-1.5 rounded bg-black/20 border border-white/5">
                        <span className="font-semibold text-slate-100">{c.title}:</span> {c.body}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            PANEL 2: TEMPLATES & LAYOUTS
        ============================================================== */}
        {activePanel === 'templates' && (
          <div className="space-y-4">
            {/* Top Modal Launch Banner */}
            <button
              type="button"
              onClick={onOpenTemplateLibrary}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#FF5C00]/20 via-[#FF5C00]/10 to-transparent border border-[#FF5C00]/40 hover:border-[#FF5C00] text-left transition-all group flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-[#FF5C00] uppercase tracking-wider">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Browse 105+ Template Library</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Explore categorized interactive layout presets with visual live previews.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#FF5C00] group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </button>

            {/* Quick Archetype Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {TEMPLATE_CATEGORIES.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedTemplateCat(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                    selectedTemplateCat === cat.id
                      ? 'bg-[#FF5C00] text-white'
                      : isDarkMode
                      ? 'bg-[#22201D] text-slate-400 hover:text-white'
                      : 'bg-slate-200 text-slate-700 hover:text-black'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Quick Layout Presets Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Apply Layout to Current Slide
              </span>
              <div className="space-y-1.5">
                {TEMPLATE_LIBRARY.filter(
                  (t) => selectedTemplateCat === 'all' || t.category === selectedTemplateCat
                )
                  .slice(0, 8)
                  .map((tmpl) => {
                    const isCurrent = activeSlide?.archetype === tmpl.archetype;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          onSetArchetype(tmpl.archetype);
                          showToast(`Applied ${tmpl.name}`);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start justify-between group ${
                          isCurrent
                            ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-[#FF5C00]'
                            : isDarkMode
                            ? 'bg-[#201F1C] border-[#2C2A26] hover:border-[#FF5C00]/50 hover:bg-[#252320] text-slate-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{tmpl.name}</span>
                            {isCurrent && (
                              <Check className="w-3.5 h-3.5 text-[#FF5C00] shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {tmpl.description}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase shrink-0">
                          {tmpl.tag}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            PANEL 3: CHARTS & DATA
        ============================================================== */}
        {activePanel === 'charts' && (
          <div className="space-y-4">
            {/* Interactive Visual Data Studio */}
            <ChartStudioPanel
              chartData={
                activeSlide?.chart_data || [
                  { label: 'Control Baseline', value: 35 },
                  { label: 'Sample Condition A', value: 72 },
                  { label: 'Sample Condition B', value: 89 },
                ]
              }
              chartType={(activeSlide?.chart_type as any) || 'horizontal_bars'}
              onChangeChartData={(data) => {
                onUpdateSlideField('chart_data', data);
                showToast('Updated slide chart data');
              }}
              onChangeChartType={(type) => {
                onUpdateSlideField('chart_type', type);
                showToast(`Switched chart style to ${type}`);
              }}
            />

            <div
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-[#201F1C] border-[#2E2C28]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[#FF5C00]" />
                <span className="text-xs font-bold">Data & Chart Presets</span>
              </div>
              <p className="text-xs text-slate-400">
                Insert interactive data charts or convert this slide into a quantitative analysis archetype.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Transform Slide Layout
              </span>
              <button
                type="button"
                onClick={() => {
                  onSetArchetype('chart_data');
                  showToast('Converted to Data Chart Hero archetype');
                }}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                  activeSlide?.archetype === 'chart_data'
                    ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-[#FF5C00]'
                    : isDarkMode
                    ? 'bg-[#201F1C] border-[#2C2A26] hover:border-[#FF5C00]/40'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Data Chart Hero Slide</div>
                  <div className="text-[10px] text-slate-400">Full visual chart with key takeaway callouts</div>
                </div>
                <BarChart3 className="w-4 h-4 text-[#FF5C00]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onSetArchetype('stats_grid');
                  showToast('Converted to KPI Stats Grid');
                }}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                  activeSlide?.archetype === 'stats_grid'
                    ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-[#FF5C00]'
                    : isDarkMode
                    ? 'bg-[#201F1C] border-[#2C2A26] hover:border-[#FF5C00]/40'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">KPI Stats & Metrics Grid</div>
                  <div className="text-[10px] text-slate-400">Oversized quantitative numbers & progress bars</div>
                </div>
                <TrendingUp className="w-4 h-4 text-[#FF5C00]" />
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Insert Chart Card
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    type: 'bar',
                    label: 'Bar Chart',
                    icon: BarChart3,
                    data: [
                      { label: 'Control', value: 35 },
                      { label: 'Sample A', value: 72 },
                      { label: 'Sample B', value: 89 },
                    ],
                  },
                  {
                    type: 'pie',
                    label: 'Proportions',
                    icon: PieChart,
                    data: [
                      { label: 'Group 1', value: 55 },
                      { label: 'Group 2', value: 30 },
                      { label: 'Group 3', value: 15 },
                    ],
                  },
                  {
                    type: 'line',
                    label: 'Trend Line',
                    icon: LineChart,
                    data: [
                      { label: 'Q1', value: 20 },
                      { label: 'Q2', value: 45 },
                      { label: 'Q3', value: 80 },
                    ],
                  },
                  {
                    type: 'stat',
                    label: 'Metric Callout',
                    icon: TrendingUp,
                    stat: '94.6%',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.stat) {
                          onAddCard({
                            badge: 'KPI STAT',
                            title: 'Observed Efficacy',
                            body: 'Statistically significant improvement recorded across all cohorts.',
                            stat: item.stat,
                          });
                        } else {
                          onAddCard({
                            badge: 'DATA METRIC',
                            title: `${item.label} Analysis`,
                            body: 'Quantitative comparative metrics across observed experimental variables.',
                            isChart: true,
                            chartType: item.type,
                            chartData: item.data,
                          });
                        }
                        showToast(`Inserted ${item.label}`);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group ${
                        isDarkMode
                          ? 'bg-[#201F1C] border-[#2C2A26] hover:border-[#FF5C00]/50 hover:bg-[#252320]'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-slate-400 group-hover:text-[#FF5C00] transition-colors" />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            PANEL 4: MEDIA & ASSETS
        ============================================================== */}
        {activePanel === 'media' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIsMediaDrawerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Open Unsplash & Lucide Media Picker</span>
            </button>

            <div
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-[#201F1C] border-[#2E2C28]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-[#FF5C00]" />
                <span className="text-xs font-bold">Curated Photographic Assets</span>
              </div>
              <p className="text-xs text-slate-400">
                High-resolution scientific and curriculum imagery with automatic dark-mode contrast.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Apply Hero Visual Archetype
              </span>
              <button
                type="button"
                onClick={() => {
                  onSetArchetype('hero_visual_split');
                  showToast('Applied Split Visual Hero (60/40)');
                }}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                  activeSlide?.archetype === 'hero_visual_split'
                    ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-[#FF5C00]'
                    : isDarkMode
                    ? 'bg-[#201F1C] border-[#2C2A26] hover:border-[#FF5C00]/40'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Split Visual Hero (60% Content + 40% Visual)</div>
                  <div className="text-[10px] text-slate-400">Presenton signature photographic layout</div>
                </div>
                <ImageIcon className="w-4 h-4 text-[#FF5C00]" />
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Insert Educational Visual Card
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    name: 'Cell Biology',
                    category: 'Biology',
                    query: 'mitochondria microscope',
                    img: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=500&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Wave Mechanics',
                    category: 'Physics',
                    query: 'physics laser optics',
                    img: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Chemical Lattice',
                    category: 'Chemistry',
                    query: 'chemical reaction molecules',
                    img: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=500&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Calculus Geometry',
                    category: 'Math',
                    query: 'mathematics geometry black board',
                    img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80',
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      onAddCard({
                        badge: preset.category.toUpperCase(),
                        title: preset.name,
                        body: `Curated photographic asset supporting ${preset.category.toLowerCase()} conceptual understanding.`,
                        media_url: preset.img,
                      });
                      showToast(`Added ${preset.name} visual card`);
                    }}
                    className={`relative rounded-xl overflow-hidden border group text-left transition-all ${
                      isDarkMode ? 'border-[#2C2A26] hover:border-[#FF5C00]' : 'border-slate-200'
                    }`}
                  >
                    <div className="h-20 w-full overflow-hidden bg-black/40">
                      <img
                        src={preset.img}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-80 group-hover:opacity-100"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-1.5 bg-[#1C1B19]">
                      <div className="text-[11px] font-bold text-white truncate">{preset.name}</div>
                      <div className="text-[9px] text-[#FF5C00] font-mono">{preset.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            PANEL 5: THEME & TYPOGRAPHY
        ============================================================== */}
        {activePanel === 'theme' && (
          <div className="space-y-4">
            <div
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-[#201F1C] border-[#2E2C28]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-[#FF5C00]" />
                <span className="text-xs font-bold">Presenton Studio Themes</span>
              </div>
              <p className="text-xs text-slate-400">
                Curated palette pairs with tuned typographic contrast and mathematical clarity.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Available Color & Font Themes
              </span>
              <div className="space-y-2">
                {Object.entries(themes).map(([key, t]) => {
                  const isSelected = activeThemeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveThemeKey(key);
                        showToast(`Theme changed to ${t.name}`);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'ring-2 ring-[#FF5C00] border-transparent shadow-lg shadow-orange-500/10'
                          : isDarkMode
                          ? 'bg-[#201F1C] border-[#2C2A26] hover:border-slate-500'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                      style={{
                        backgroundColor: isDarkMode ? undefined : t.bgColor,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Swatch Pill */}
                        <div
                          className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-sm"
                          style={{
                            backgroundColor: t.cardBg,
                            borderColor: t.cardBorder,
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: t.accentColor }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate text-slate-100">{t.name}</span>
                            <span className="text-[9px] font-mono px-1.5 rounded-full bg-white/10 text-slate-400">
                              {t.mode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {t.fonts?.heading || 'Sans'} / {t.fonts?.body || 'Sans'}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#FF5C00] flex items-center justify-center text-white shrink-0 ml-2">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            PANEL 6: SPEAKER NOTES & TEACHER SCRIPT
        ============================================================== */}
        {activePanel === 'notes' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIsNotesDrawerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Open Speaker Delivery Drawer (Full View)</span>
            </button>

            <div
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-[#201F1C] border-[#2E2C28]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF5C00]" />
                  <span className="text-xs font-bold">Teacher Speaker Script</span>
                </div>
                {/* Delivery Time Estimation */}
                <span className="text-[10px] font-mono text-[#FF5C00] bg-[#FF5C00]/10 px-2 py-0.5 rounded-full font-bold">
                  ~
                  {Math.max(
                    1,
                    Math.ceil(
                      ((activeSlide?.speaker_notes || '').trim().split(/\s+/).filter(Boolean).length || 0) /
                        130
                    )
                  )}{' '}
                  min delivery
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Word-for-word classroom teaching notes, Bloom's questioning cues, and pedagogical explanations.
              </p>
            </div>

            {/* AI Generator Button */}
            {onGenerateScript && (
              <button
                type="button"
                onClick={onGenerateScript}
                disabled={isGeneratingScript}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20"
              >
                {isGeneratingScript ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Classroom Script...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Draft Script with LLM</span>
                  </>
                )}
              </button>
            )}

            {/* Notes Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Notes Content</span>
                <span>
                  {(activeSlide?.speaker_notes || '').trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={9}
                value={activeSlide?.speaker_notes || ''}
                onChange={(e) => onUpdateSlideField('speaker_notes', e.target.value)}
                placeholder="Write step-by-step teacher guidance, questions to ask students, or click 'Auto-Draft Script with LLM' above..."
                className={`w-full p-3 rounded-xl border text-xs leading-relaxed focus:outline-none focus:border-[#FF5C00] resize-y ${
                  isDarkMode
                    ? 'bg-[#1F1E1B] border-[#2C2A26] text-slate-200 placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Formative Discussion Prompt */}
            {activeSlide?.discussion_prompt && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-[#FF5C00]">
                  <MessageSquare className="w-3 h-3" />
                  <span>Discussion Question</span>
                </div>
                <p className="leading-relaxed">{activeSlide.discussion_prompt}</p>
              </div>
            )}
          </div>
        )}
        {/* ==============================================================
            PANEL 7: ELEMENTS & CARDS
        ============================================================== */}
        {activePanel === 'elements' && (
          <div className="space-y-4">
            <div
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-[#201F1C] border-[#2E2C28]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-[#FF5C00]" />
                <span className="text-xs font-bold">Structural Elements & Cards</span>
              </div>
              <p className="text-xs text-slate-400">
                Insert pre-styled pedagogical components directly into your current slide.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pre-Styled Cards
              </span>

              {/* Metric Stat Card */}
              <button
                type="button"
                onClick={() => {
                  onAddCard({
                    badge: 'MEASURED VALUE',
                    stat: '1000 kg/m³',
                    title: 'Core Reference Metric',
                    body: 'Standard physical reference value used in quantitative curriculum problem solving.',
                  });
                  showToast('Added Metric Stat Card');
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all group flex items-start gap-3 ${
                  isDarkMode
                    ? 'bg-[#201F1C] border-[#2C2A26] hover:border-[#FF5C00]/60 hover:bg-[#252320]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-lg bg-orange-500/10 text-[#FF5C00] shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-white">Metric Stat Card</h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-[#FF5C00]">1000 kg/m³</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Big bold numeric callout with contextual definition.</p>
                </div>
              </button>

              {/* Pros & Cons Card */}
              <button
                type="button"
                onClick={() => {
                  onAddCard({
                    badge: 'COMPARATIVE ANALYSIS',
                    title: 'Positive vs Negative Trade-offs',
                    body: '✓ Positive: High structural integrity and minimal thermal deformation.\n✗ Limitation: Sensitive to concentrated point shear loads.',
                  });
                  showToast('Added Pros & Cons Card');
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all group flex items-start gap-3 ${
                  isDarkMode
                    ? 'bg-[#201F1C] border-[#2C2A26] hover:border-emerald-500/60 hover:bg-[#252320]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-white">Pros & Cons Card</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Side-by-side trade-off review card.</p>
                </div>
              </button>

              {/* Formula Card */}
              <button
                type="button"
                onClick={() => {
                  onAddCard({
                    badge: 'MATHEMATICAL THEOREM',
                    title: 'Governing Formula',
                    body: 'P = \\rho \\cdot g \\cdot h',
                    isFormula: true,
                  });
                  showToast('Added Mathematical Formula Card');
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all group flex items-start gap-3 ${
                  isDarkMode
                    ? 'bg-[#201F1C] border-[#2C2A26] hover:border-amber-500/60 hover:bg-[#252320]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 font-mono font-bold text-xs">
                  ∑
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-white">Formula / Derivation</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Centered mathematical LaTeX formulation.</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Media & Icon Asset Picker Drawer */}
      <MediaAssetPickerDrawer
        isOpen={isMediaDrawerOpen}
        onClose={() => setIsMediaDrawerOpen(false)}
        onSelectImage={(url, q) => {
          onUpdateSlideField('image_url', url);
          if (q) onUpdateSlideField('image_query', q);
          showToast('Applied image asset to slide');
        }}
        onSelectIcon={(icon) => {
          onAddCard({
            badge: 'CONCEPT',
            title: icon,
            body: `Curated vector iconography illustrating foundational ${icon.toLowerCase()} concept.`,
          });
          showToast(`Attached ${icon} icon to active slide`);
        }}
        currentImageUrl={activeSlide?.image_url}
        currentImageQuery={activeSlide?.image_query}
      />

      {/* Speaker Notes Delivery Guide Drawer */}
      <SpeakerNotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        activeSlide={activeSlide}
        onUpdateNotes={(notes) => onUpdateSlideField('speaker_notes', notes)}
        onUpdateDiscussionPrompt={(prompt) => onUpdateSlideField('discussion_prompt', prompt)}
      />
    </aside>
  );
};
