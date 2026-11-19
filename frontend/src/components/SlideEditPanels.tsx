import React, { useState } from 'react';
import {
  CaseSensitive,
  Blocks,
  ChartPie,
  Workflow,
  Palette,
  Sparkles,
  Search,
  X,
  Heading,
  List,
  Quote,
  AlertCircle,
  Sigma,
  Columns,
  LayoutGrid,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  PieChart,
  Gauge,
  Repeat,
  Layers,
  ArrowRight,
  Scissors,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Check,
  Loader2,
  Mic,
} from 'lucide-react';

export type ActiveToolPanel = 'text' | 'elements' | 'charts' | 'diagrams' | 'theme' | 'copilot' | null;

export interface SlideEditPanelsProps {
  activeToolPanel: ActiveToolPanel;
  setActiveToolPanel: (panel: ActiveToolPanel) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  activeThemeKey: string;
  setActiveThemeKey: (themeKey: string) => void;
  themes: Record<string, any>;
  onAddCard: (card: {
    badge?: string;
    title: string;
    body: string;
    stat?: string;
    isFormula?: boolean;
    isChart?: boolean;
    chartType?: string;
    chartData?: { label: string; value: number }[];
  }) => void;
  onSetArchetype: (archetype: string) => void;
  // Co-Pilot props
  isSuggesting: boolean;
  onTriggerRefinement: (type: 'make_concise' | 'add_teacher_tip' | 'discussion_prompt' | 'key_principles') => void;
  coPilotPrompt: string;
  setCoPilotPrompt: (val: string) => void;
  isListening?: boolean;
  onToggleVoiceInput?: () => void;
  onApplyCustomRefinement: () => void;
  activeSlide: any;
  activeSuggestion?: any;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

export function RightEditDock({
  activeToolPanel,
  setActiveToolPanel,
  zoomLevel,
  setZoomLevel,
}: {
  activeToolPanel: ActiveToolPanel;
  setActiveToolPanel: (panel: ActiveToolPanel) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
}) {
  const tools = [
    { id: 'copilot' as ActiveToolPanel, icon: Sparkles, label: 'Slide Co-Pilot (AI)', badge: 'AI' },
    { id: 'text' as ActiveToolPanel, icon: CaseSensitive, label: 'Text & Basic Blocks' },
    { id: 'elements' as ActiveToolPanel, icon: Blocks, label: 'Elements & Cards' },
    { id: 'charts' as ActiveToolPanel, icon: ChartPie, label: 'Charts & Metrics' },
    { id: 'diagrams' as ActiveToolPanel, icon: Workflow, label: 'Diagrams & Flow' },
    { id: 'theme' as ActiveToolPanel, icon: Palette, label: 'Themes & Styles' },
  ];

  return (
    <div className="w-12 bg-[#141312] border-l border-[#2B2926] flex flex-col items-center justify-between py-3.5 select-none z-20 shrink-0">
      {/* Tool Icon Capsule */}
      <div className="flex flex-col items-center gap-2">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeToolPanel === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveToolPanel(isActive ? null : t.id)}
              className={`relative p-2.5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-[#FF5C00]/20 border-[#FF5C00]/60 text-[#FF5C00] shadow-sm'
                  : 'bg-[#1C1B19] border-[#2B2926] text-slate-400 hover:text-white hover:border-slate-500 hover:bg-[#252422]'
              }`}
              title={t.label}
            >
              <Icon className="w-4 h-4" />
              {t.badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF5C00] ring-2 ring-[#141312]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Zoom & Canvas Scale Controls */}
      <div className="flex flex-col items-center gap-1.5 text-slate-400 pt-2 border-t border-[#23211F] w-full px-1">
        <button
          onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
          className="w-7 h-7 rounded-lg bg-[#1C1B19] border border-[#2B2926] flex items-center justify-center hover:text-white hover:border-slate-500 text-xs font-mono transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <span className="text-[10px] font-mono text-slate-500">{zoomLevel}%</span>
        <button
          onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
          className="w-7 h-7 rounded-lg bg-[#1C1B19] border border-[#2B2926] flex items-center justify-center hover:text-white hover:border-slate-500 text-xs font-mono transition-colors"
          title="Zoom Out"
        >
          -
        </button>
      </div>
    </div>
  );
}

export function RightToolDrawer({
  activeToolPanel,
  setActiveToolPanel,
  activeThemeKey,
  setActiveThemeKey,
  themes,
  onAddCard,
  onSetArchetype,
  isSuggesting,
  onTriggerRefinement,
  coPilotPrompt,
  setCoPilotPrompt,
  isListening,
  onToggleVoiceInput,
  onApplyCustomRefinement,
  activeSlide,
  activeSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
}: SlideEditPanelsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addedToast, setAddedToast] = useState<string | null>(null);

  if (!activeToolPanel) return null;

  const triggerToast = (msg: string) => {
    setAddedToast(msg);
    setTimeout(() => setAddedToast(null), 1800);
  };

  const q = searchQuery.toLowerCase();

  return (
    <aside className="w-76 sm:w-80 bg-[#181715] border-l border-[#2B2926] flex flex-col justify-between shrink-0 select-none animate-in slide-in-from-right duration-200 z-10">
      {/* Toast Notification */}
      {addedToast && (
        <div className="absolute top-3 left-4 right-4 z-30 bg-[#FF5C00] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Drawer Header */}
      <div className="p-3.5 border-b border-[#2B2926] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/40 flex items-center justify-center font-bold text-xs">
              {activeToolPanel === 'text' && <CaseSensitive className="w-3.5 h-3.5" />}
              {activeToolPanel === 'elements' && <Blocks className="w-3.5 h-3.5" />}
              {activeToolPanel === 'charts' && <ChartPie className="w-3.5 h-3.5" />}
              {activeToolPanel === 'diagrams' && <Workflow className="w-3.5 h-3.5" />}
              {activeToolPanel === 'theme' && <Palette className="w-3.5 h-3.5" />}
              {activeToolPanel === 'copilot' && <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <h3 className="font-bold text-sm text-slate-100 capitalize">
              {activeToolPanel === 'text' && 'Text & Basic Blocks'}
              {activeToolPanel === 'elements' && 'Elements & Cards'}
              {activeToolPanel === 'charts' && 'Charts & Metrics'}
              {activeToolPanel === 'diagrams' && 'Diagrams & Flows'}
              {activeToolPanel === 'theme' && 'Themes & Typography'}
              {activeToolPanel === 'copilot' && 'Slide Co-Pilot'}
            </h3>
          </div>
          <button
            onClick={() => setActiveToolPanel(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search / Filter for tool panels */}
        {activeToolPanel !== 'copilot' && activeToolPanel !== 'theme' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeToolPanel}...`}
              className="w-full bg-[#1F1E1B] border border-[#2E2C28] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF5C00]"
            />
          </div>
        )}
      </div>

      {/* Drawer Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ==============================================================
            PANEL 1: TEXT & BASIC BLOCKS
        ============================================================== */}
        {activeToolPanel === 'text' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              INSERT TEXT BLOCKS
            </span>

            {/* Block 1: Paragraph / Explanation Card */}
            {('paragraph explanation body'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'EXPLANATION',
                    title: 'Core Concept Note',
                    body: 'Click here to write concise instructional notes or step-by-step conceptual guidance for students.',
                  });
                  triggerToast('Added Explanation Block');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <Heading className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Explanation Card</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Structured title and descriptive paragraph block.</p>
                </div>
              </button>
            )}

            {/* Block 2: Bulleted List */}
            {('bullet list key points'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'KEY PRINCIPLES',
                    title: 'Guiding Rules',
                    body: '• First key governing law\n• Secondary observable property\n• Practical experimental takeaway',
                  });
                  triggerToast('Added Bullet List Block');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <List className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Bullet Points</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">3-item concise list block for rapid classroom recall.</p>
                </div>
              </button>
            )}

            {/* Block 3: Formula / Math Callout */}
            {('math formula latex equation'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'MATHEMATICAL LAW',
                    title: 'Governing Formula',
                    body: 'F_b = \\rho \\cdot V \\cdot g',
                    isFormula: true,
                  });
                  triggerToast('Added Formula Block');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-amber-400 group-hover:text-amber-300 shrink-0">
                  <Sigma className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">LaTeX / Math Formula</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">High-contrast formula card with notation support.</p>
                </div>
              </button>
            )}

            {/* Block 4: Callout / Important Warning */}
            {('callout alert note warning'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'IMPORTANT NOTE',
                    title: 'Common Misconception',
                    body: 'Students frequently confuse mass with density. Clarify that buoyant force depends on fluid density, not object weight alone.',
                  });
                  triggerToast('Added Callout Block');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-amber-500/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:text-amber-300 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Teacher Callout Alert</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">High-visibility card to flag critical exam points or pitfalls.</p>
                </div>
              </button>
            )}

            {/* Block 5: Editorial Pull Quote */}
            {('quote postulate citation'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'HISTORICAL POSTULATE',
                    title: "Archimedes' Principle (c. 246 BC)",
                    body: '"Any object, wholly or partially immersed in a fluid, is buoyed up by a force equal to the weight of the fluid displaced by the object."',
                  });
                  triggerToast('Added Quote Block');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <Quote className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Editorial Quote</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Italicized postulate block with attribution header.</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ==============================================================
            PANEL 2: ELEMENTS & LAYOUT CARDS
        ============================================================== */}
        {activeToolPanel === 'elements' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              PRE-STYLED ELEMENTS
            </span>

            {/* Element 1: Stat Metric Card */}
            {('stat number metric counter'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'MEASURED VALUE',
                    stat: '1000 kg/m³',
                    title: 'Pure Water Density',
                    body: 'Standard reference density at 4°C used in hydrostatic calculations.',
                  });
                  triggerToast('Added Stat Metric Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:text-orange-300 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Metric Stat Card</h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">1000 kg/m³</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Big bold numeric callout with contextual definition.</p>
                </div>
              </button>
            )}

            {/* Element 2: 2-Column Split */}
            {('2-column split comparison versus'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onSetArchetype('split_comparison');
                  triggerToast('Switched to 2-Column Split');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <Columns className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">2-Column Comparison</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Side-by-side split layout for comparing two concepts.</p>
                </div>
              </button>
            )}

            {/* Element 3: 3-Card Bento Grid */}
            {('bento 3-card grid tripartite'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onSetArchetype('card_grid_3');
                  triggerToast('Switched to 3-Card Bento');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">3-Card Bento Grid</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Balanced three-card layout for concepts or properties.</p>
                </div>
              </button>
            )}

            {/* Element 4: Pros & Cons Card */}
            {('pros cons comparison advantages'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'COMPARATIVE ANALYSIS',
                    title: 'Positive vs Negative Factors',
                    body: '✓ Positive: High stability in deep water.\n✗ Limitation: Susceptible to dynamic wave turbulence.',
                  });
                  triggerToast('Added Pros/Cons Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-emerald-500/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Pros & Cons Card</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Side-by-side trade-off review card.</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ==============================================================
            PANEL 3: CHARTS & METRICS
        ============================================================== */}
        {activeToolPanel === 'charts' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              DYNAMIC VISUALIZATIONS
            </span>

            {/* Chart 1: Bar Comparison */}
            {('bar chart distribution'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'DENSITY DISTRIBUTION',
                    title: 'Fluid Densities Comparison (kg/m³)',
                    body: 'Air: 1.2 | Gasoline: 680 | Water: 1000 | Mercury: 13,600',
                    isChart: true,
                    chartType: 'bar',
                    chartData: [
                      { label: 'Air', value: 1.2 },
                      { label: 'Gasoline', value: 680 },
                      { label: 'Water', value: 1000 },
                      { label: 'Seawater', value: 1025 },
                    ],
                  });
                  triggerToast('Added Bar Chart Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:text-sky-300 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Bar Chart</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Horizontal or vertical comparative bars with dynamic values.</p>
                </div>
              </button>
            )}

            {/* Chart 2: Donut Breakdown */}
            {('donut pie percentage ratio'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'SUBMERSION RATIO',
                    title: 'Iceberg Volume Ratio',
                    body: 'Submerged: 91.7% | Exposed: 8.3%',
                    isChart: true,
                    chartType: 'donut',
                    chartData: [
                      { label: 'Submerged', value: 92 },
                      { label: 'Exposed', value: 8 },
                    ],
                  });
                  triggerToast('Added Donut Breakdown Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:text-indigo-300 shrink-0">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Donut Breakdown</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Percentage distribution ring for ratios and splits.</p>
                </div>
              </button>
            )}

            {/* Chart 3: Progress Gauge */}
            {('progress gauge meter stat'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'EXPERIMENT CONFIDENCE',
                    title: 'Curriculum Grounding Score',
                    stat: '98.4%',
                    body: 'Verified against NCERT Chapter 10 Textbook Guidelines.',
                  });
                  triggerToast('Added Gauge Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-emerald-500/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:text-emerald-300 shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Metric Stat Gauge</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">High-impact numeric metric with certainty indicator.</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ==============================================================
            PANEL 4: DIAGRAMS & FLOWS
        ============================================================== */}
        {activeToolPanel === 'diagrams' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              STRUCTURAL DIAGRAMS
            </span>

            {/* Diagram 1: Step-by-Step Flow */}
            {('process step flow sequence'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'PROCEDURAL FLOW',
                    title: 'Experimental Protocol',
                    body: 'Step 1: Measure dry mass → Step 2: Submerge in beaker → Step 3: Compute displaced fluid volume',
                  });
                  triggerToast('Added Process Flow Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Step-by-Step Flow</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Linear sequence of 3 interconnected procedural steps.</p>
                </div>
              </button>
            )}

            {/* Diagram 2: Feedback Cycle Loop */}
            {('cycle loop circular feedback'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'SYSTEM CYCLE',
                    title: 'Hydrologic Circulation Cycle',
                    body: 'Evaporation ➔ Atmospheric Condensation ➔ Precipitation ➔ Runoff Collection',
                  });
                  triggerToast('Added Cycle Diagram');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Circular Feedback Cycle</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Closed repeating process loop diagram.</p>
                </div>
              </button>
            )}

            {/* Diagram 3: Hierarchical Pyramid */}
            {('pyramid hierarchy bloom levels'.includes(q) || !q) && (
              <button
                onClick={() => {
                  onAddCard({
                    badge: 'TAXONOMY PYRAMID',
                    title: "Cognitive Mastery Hierarchy",
                    body: 'Level 1: Recall Facts ➔ Level 2: Deduce Pressure Vectors ➔ Level 3: Formulate Submersion Equations',
                  });
                  triggerToast('Added Hierarchy Card');
                }}
                className="w-full text-left p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] hover:border-[#FF5C00]/60 hover:bg-[#252421] transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[#2A2824] text-slate-300 group-hover:text-[#FF5C00] shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white">Hierarchical Pyramid</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Foundational to advanced multi-tier conceptual pyramid.</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ==============================================================
            PANEL 5: THEMES & TYPOGRAPHY
        ============================================================== */}
        {activeToolPanel === 'theme' && (
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              16 PRESENTON COLOR PALETTES
            </span>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(themes).map(([key, t]) => {
                const isSelected = activeThemeKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveThemeKey(key);
                      triggerToast(`Applied ${t.name || key} Palette`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-[#FF5C00] bg-[#2A2420] ring-1 ring-[#FF5C00]/50'
                        : 'border-[#2E2C28] bg-[#1E1D1A] hover:border-slate-500 hover:bg-[#24231F]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: t.accentColor }} />
                      <div className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: t.cardBg }} />
                      <div className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: t.canvasBg }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {t.name || key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {t.isDark ? 'Dark Studio' : 'Editorial Light'}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 text-[#FF5C00]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==============================================================
            PANEL 6: SLIDE CO-PILOT (AI ENGINE)
        ============================================================== */}
        {activeToolPanel === 'copilot' && (
          <div className="space-y-4">
            <div className="space-y-1 pb-2 border-b border-[#2B2926]">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Autosaved 12s ago</span>
                <span className="hover:text-slate-300 cursor-pointer">Canvas Settings</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate">Synced: Verified Primary Curriculum</span>
              </div>
            </div>

            {/* Quick Refinements 2x2 Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                QUICK REFINEMENTS
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  disabled={isSuggesting}
                  onClick={() => onTriggerRefinement('make_concise')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-[#FF5C00]" />
                  <span>Make Concise</span>
                </button>
                <button
                  disabled={isSuggesting}
                  onClick={() => onTriggerRefinement('add_teacher_tip')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Teacher Tip</span>
                </button>
                <button
                  disabled={isSuggesting}
                  onClick={() => onTriggerRefinement('discussion_prompt')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Discussion Prompt</span>
                </button>
                <button
                  disabled={isSuggesting}
                  onClick={() => onTriggerRefinement('key_principles')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <Sigma className="w-3.5 h-3.5 text-purple-400" />
                  <span>Key Principles</span>
                </button>
              </div>
            </div>

            {/* Grounding Source Badge */}
            <div className="p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-slate-400 font-mono">GROUNDING SOURCE</span>
                <span className="text-[10px] font-mono text-emerald-400">99.4% confidence</span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate">
                Grounded in <span className="text-white font-semibold">Primary Curriculum Standard</span>.
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Zero hallucination filter applied.</span>
              </div>
            </div>

            {/* Slide Synthesizer Box */}
            <div className="p-3 rounded-xl bg-[#201F1C] border border-[#2B2926] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
                  <span className="text-xs font-semibold text-slate-200">Active Slide Intelligence</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
                  Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Pedagogical cards synthesized for "{activeSlide?.title || 'Current Slide'}" aligned with grade standards.
              </p>
            </div>

            {/* AI Suggestion Diff / Merge Card */}
            {activeSuggestion && (
              <div className="p-3 rounded-2xl bg-orange-950/30 border border-[#FF5C00]/50 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-[#FF5C00]">
                  <span>AI Recommendation</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onDismissSuggestion}
                      className="text-slate-400 hover:text-white text-[11px]"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={onApplySuggestion}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3 h-3" /> Apply
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  {activeSuggestion.explanation}
                </p>
              </div>
            )}

            {/* Custom AI Refinement Prompt */}
            <div className="space-y-2 pt-1">
              <div className="relative">
                <textarea
                  rows={2}
                  value={coPilotPrompt}
                  onChange={(e) => setCoPilotPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onApplyCustomRefinement();
                    }
                  }}
                  placeholder="Ask Co-Pilot to adjust this slide (e.g. 'Add a real-life space exploration example')..."
                  className="w-full bg-[#201F1C] border border-[#2B2926] rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF5C00] resize-none"
                />
                <button
                  onClick={onToggleVoiceInput}
                  className={`absolute right-2.5 bottom-3.5 p-1 rounded-lg transition-colors ${
                    isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-400 hover:text-white'
                  }`}
                  title={isListening ? 'Listening...' : 'Voice input'}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-transparent text-[#FF5C00] focus:ring-0" />
                  <span>Strict Textbook Match</span>
                </label>
                <button
                  disabled={isSuggesting || !coPilotPrompt.trim()}
                  onClick={onApplyCustomRefinement}
                  className="px-3 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] disabled:opacity-40 disabled:hover:bg-[#FF5C00] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {isSuggesting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Refine</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
