import React, { useState, useEffect, useMemo } from 'react';
import {
  Artifact,
  ProjectManifest,
  ConceptItem,
  VocabularyItem,
  updateProjectSlides,
  suggestSlideEdits,
  SuggestEditsResponse,
  refineSingleCard,
  generateSlideScript,
  compileSlideFromOutline,
} from '../api';
// @ts-ignore
import { templateV2UiToHtml } from '../lib/presenton_renderer.mjs';
import {
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Sparkles,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Check,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Copy,
  ArrowLeft,
  Columns,
  LayoutGrid,
  FileText,
  SlidersHorizontal,
  ChevronDown as ChevronDownIcon,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Clock,
  ArrowRight,
  Repeat,
  Image as ImageIcon,
  BarChart3,
  RefreshCw,
  GitCompare,
  ShieldAlert,
  ArrowUpRight,
  Triangle,
  Quote,
  Mic,
  GripVertical,
} from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RightEditPanel, ActiveRightPanel } from './RightEditPanel';
import { RightPanelRenderer } from './RightPanelRenderer';
import { SlideElementFloatingToolbar } from './SlideElementFloatingToolbar';
import { SlideTemplateLibraryModal } from './SlideTemplateLibraryModal';
import { ChartStudioPanel, MediaAssetPickerDrawer, SpeakerNotesDrawer, AIImageStudioModal } from './panels';
import { themes, ThemeProperties, ThemeName } from '../lib/presentonThemes';
import { useThemeFonts } from '../lib/fontLoader';
import { ensureTailwindBrowserScript } from '../lib/tailwind-browser';

interface SlideStudioViewProps {
  project: ProjectManifest | null;
  artifact: Artifact | null;
  passages?: Record<string, string>;
  isDarkMode?: boolean;
  onBack: () => void;
  onArtifactUpdated?: (art: Artifact) => void;
}

function buildDynamicSlidesFromProject(proj: ProjectManifest | null, passages: Record<string, string> = {}) {
  const subject = proj?.outline?.subject || 'Curriculum';
  const grade = proj?.outline?.grade_level || 'Grade 10';
  const title = proj?.outline?.title || proj?.name || 'Lesson Presentation';
  const summary = proj?.outline?.summary || 'Comprehensive instructional unit aligned with textbook grounding.';
  const concepts = proj?.outline?.concepts || [];
  const objectives = proj?.outline?.learning_objectives || [];
  const vocabulary = proj?.outline?.vocabulary || [];
  const passageEntries = Object.entries(passages || {});

  const slides: any[] = [];

  // Slide 1: Hero / Overview
  const conceptNames = concepts.slice(0, 3).map((c: ConceptItem) => c.concept).join(', ');
  slides.push({
    slide_number: 1,
    title: title,
    subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · FOUNDATIONAL UNIT`,
    badge: 'UNIT OVERVIEW',
    postulate: 'PEDAGOGICAL FOUNDATION',
    standard: `${subject} Standard`,
    archetype: 'hero_stat',
    cards: [
      {
        badge: 'Curriculum Focus',
        stat: grade,
        title: `${subject} Scope`,
        body: summary.length > 150 ? summary.slice(0, 147) + '...' : summary,
      },
      {
        badge: 'Core Concepts',
        title: `${concepts.length || 3} Key Topics`,
        body: conceptNames ? `Key areas: ${conceptNames}.` : `Structured lesson module for direct classroom delivery.`,
      },
      {
        badge: 'Grounding',
        title: 'Textbook Verified',
        body: `Synthesized deterministically from verified textbook passages with rigorous grounding.`,
      },
    ],
    speaker_notes: `Welcome students to ${title}. Introduce the overarching chapter goal and connect it to foundational ${subject} concepts.`,
    est_delivery: '3m 30s',
  });

  // Slide 2: Learning Objectives
  if (objectives.length > 0) {
    slides.push({
      slide_number: 2,
      title: 'Learning Objectives & Competencies',
      subtitle: `${subject.toUpperCase()} · PEDAGOGICAL TARGETS`,
      badge: 'OBJECTIVES',
      postulate: "BLOOM'S TAXONOMY ALIGNMENT",
      standard: `${subject} Standard`,
      archetype: 'card_grid_3',
      cards: objectives.slice(0, 3).map((obj: string, i: number) => ({
        badge: `Competency 0${i + 1}`,
        title: `Goal 0${i + 1}`,
        body: obj,
      })),
      speaker_notes: `Walk students through these Bloom's taxonomy objectives before diving into detailed mechanisms.`,
      est_delivery: '3m 45s',
    });
  }

  // Slide 3..N: Real Concepts from Outline
  if (concepts.length > 0) {
    concepts.slice(0, 4).forEach((c: ConceptItem, idx: number) => {
      const gRef = c.grounding?.passage_id || (passageEntries[idx] ? passageEntries[idx][0] : undefined);
      const quote = c.grounding?.quote || (gRef && passages[gRef] ? passages[gRef].slice(0, 120) : '');
      slides.push({
        slide_number: slides.length + 1,
        title: c.concept,
        subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · CONCEPT EXPLORATION`,
        badge: `CONCEPT 0${idx + 1}`,
        postulate: gRef ? `GROUNDED IN [${gRef}]` : 'CORE PRINCIPLE',
        standard: gRef ? `Passage [${gRef}]` : `${subject} Standard`,
        archetype: 'card_grid_3',
        cards: [
          {
            badge: 'Mechanism',
            title: 'Core Explanation',
            body: c.explanation || `Fundamental mechanism governing ${c.concept}.`,
            citation: gRef,
          },
          {
            badge: 'Application',
            title: 'Classroom Context',
            body: `Examine practical implications, scientific models, and analytical methods for ${c.concept}.`,
          },
          {
            badge: 'Grounding',
            title: 'Textbook Evidence',
            body: quote || `Verified understanding grounded in primary curriculum reference.`,
            citation: gRef,
          },
        ],
        speaker_notes: `Deep-dive discussion on ${c.concept}. Prompt students for real-world examples and clarify theoretical misconceptions.${gRef ? ` [Ref: ${gRef}]` : ''}`,
        est_delivery: '4m 15s',
      });
    });
  } else if (passageEntries.length > 0) {
    // Fallback to passages
    passageEntries.slice(0, 4).forEach(([pid, text]: [string, string], idx: number) => {
      slides.push({
        slide_number: slides.length + 1,
        title: `Core Concept 0${idx + 1}`,
        subtitle: `${subject.toUpperCase()} · SECTION GROUNDED IN ${pid}`,
        badge: `SECTION 0${idx + 1}`,
        postulate: 'PRIMARY SOURCE TEXT',
        standard: `Passage [${pid}]`,
        archetype: 'card_grid_3',
        cards: [
          {
            badge: 'Excerpt',
            title: `Source [${pid}]`,
            body: text.slice(0, 160),
            citation: pid,
          },
          {
            badge: 'Pedagogy',
            title: 'Key Mechanism',
            body: 'Critical concept extracted from primary chapter text for focused student review.',
          },
          {
            badge: 'Reflection',
            title: 'Discussion Anchor',
            body: 'Ask students how this principle applies to observable natural phenomena.',
          },
        ],
        speaker_notes: `Discuss ${pid}: ${text.slice(0, 120)}... [Ref: ${pid}]`,
        est_delivery: '3m 45s',
      });
    });
  } else if (vocabulary.length > 0) {
    slides.push({
      slide_number: slides.length + 1,
      title: 'Foundational Terminology',
      subtitle: `${subject.toUpperCase()} · SCIENTIFIC VOCABULARY`,
      badge: 'TERMS',
      postulate: 'CURRICULUM LEXICON',
      standard: `${subject} Standard`,
      archetype: 'card_grid_3',
      cards: vocabulary.slice(0, 3).map((v: VocabularyItem, i: number) => ({
        badge: `Term 0${i + 1}`,
        title: v.term,
        body: v.definition,
      })),
      speaker_notes: 'Reinforce essential terminology before moving on to quantitative problem solving.',
      est_delivery: '3m 30s',
    });
  }

  // Final Slide: Summary & Checkpoint
  slides.push({
    slide_number: slides.length + 1,
    title: 'Summary & Classroom Checkpoint',
    subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · FORMATIVE ASSESSMENT`,
    badge: 'REVIEW',
    postulate: 'CORE TAKEAWAYS',
    standard: `${subject} Standard`,
    archetype: 'key_takeaways',
    cards: [
      {
        badge: 'Takeaway 1',
        title: 'Consolidated Principle',
        body: `Synthesize foundational principles of ${title} covered in this instructional unit.`,
      },
      {
        badge: 'Takeaway 2',
        title: 'Formative Checkpoint',
        body: 'Evaluate student comprehension through open discussion questions and clarify ambiguities.',
      },
    ],
    speaker_notes: 'Conclude lesson with key takeaways. Formulate open discussion questions before proceeding to interactive practice.',
    est_delivery: '4m 00s',
  });

  return slides;
}


// ── Presenton Slide Studio Theme Architecture ──────────────────────────────
export const THEME_ALIAS_MAP: Record<string, ThemeName> = {
  verdant: 'forest',
  nova: 'orbit',
  pulse: 'indigo',
  signal: 'sunset',
  momentum: 'noir',
  swift: 'ocean',
  mosaic: 'sand',
  editorial: 'piano',
  civic: 'cornflower',
  landmark: 'ebony',
  modern: 'mint',
  horizon: 'dusk',
  solar_obsidian: 'noir',
  academic_clean: 'daktilo',
  standard: 'cornflower',
  dynamic: 'ember',
  executive: 'mystique',
  col_blue: 'orbit',
};

export function resolvePresentonTheme(key: string): ThemeProperties {
  const normalizedKey = (THEME_ALIAS_MAP[key] || key) as ThemeName;
  return themes[normalizedKey] || themes['cornflower'];
}

export const PRESENTON_STUDIO_THEMES: Record<string, any> = themes;

export type SlideThemeTokens = any;

const CURATED_TOPIC_IMAGES: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ['photosynthesis', 'chloroplast', 'plant', 'leaf', 'botany', 'light absorption', 'respiration'],
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['cell', 'mitochondria', 'membrane', 'nucleus', 'biology', 'microscopic', 'tissue', 'objective', 'competency'],
    url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['dna', 'genetics', 'rna', 'chromosome', 'genome', 'heredity', 'molecular'],
    url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['physics', 'force', 'gravity', 'motion', 'buoyancy', 'mechanics', 'energy', 'velocity'],
    url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['fluid', 'liquid', 'water', 'hydrostatics', 'density', 'archimedes'],
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['chemistry', 'chemical', 'reaction', 'atom', 'compound', 'acid', 'base', 'solution'],
    url: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['laboratory', 'lab', 'experiment', 'beaker', 'flask', 'science', 'research'],
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['space', 'astronomy', 'planet', 'solar', 'galaxy', 'universe', 'orbit'],
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['math', 'mathematics', 'calculus', 'geometry', 'algebra', 'equation', 'formula'],
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1000&q=80',
  },
  {
    keywords: ['technology', 'computer', 'digital', 'algorithm', 'code', 'data', 'circuit'],
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
  },
];

export function resolveSlideVisual(query?: string, customUrl?: string): string {
  if (customUrl) return customUrl;
  if (!query) return CURATED_TOPIC_IMAGES[0].url;

  const lower = query.toLowerCase();
  for (const entry of CURATED_TOPIC_IMAGES) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry.url;
    }
  }

  const hash = query.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = Math.abs(hash) % CURATED_TOPIC_IMAGES.length;
  return CURATED_TOPIC_IMAGES[idx].url;
}

export const SlideStudioView: React.FC<SlideStudioViewProps> = ({
  project,
  artifact: initialArtifact,
  passages: _passages = {},
  isDarkMode: initialDarkMode = true,
  onBack,
  onArtifactUpdated,
}) => {
  const [isDarkMode] = useState(initialDarkMode);
  // Resolve active theme from artifact source data or URL param with graceful fallback
  const [activeThemeKey, setActiveThemeKey] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme') || initialArtifact?.source_data?.theme || 'verdant';
  });
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('menu') === 'layout';
    }
    return false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('sidebar') === '0' || p.get('sidebar') === 'false') return false;
    }
    return true;
  });
  const [activeToolPanel, setActiveToolPanel] = useState<ActiveRightPanel>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tool');
      if (p && ['text', 'elements', 'charts', 'diagrams', 'theme', 'copilot', 'templates', 'media', 'notes'].includes(p)) {
        return p as ActiveRightPanel;
      }
    }
    return null;
  });
  const [presentationTitle, setPresentationTitle] = useState<string>(() => {
    return initialArtifact?.source_data?.title || project?.outline?.title || project?.name || 'Presentation';
  });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get('slide') || '0', 10);
    return isNaN(s) ? 0 : Math.max(0, s);
  });
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedCardIndex(null);
  }, [currentSlideIndex]);

  useEffect(() => {
    ensureTailwindBrowserScript();
  }, []);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);
  const [isSpeakerNotesDrawerOpen, setIsSpeakerNotesDrawerOpen] = useState(false);
  const [isChartStudioOpen, setIsChartStudioOpen] = useState(false);

  // Slides data
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(initialArtifact);
  const [editableSlides, setEditableSlides] = useState<any[]>(() => {
    if (initialArtifact?.source_data?.slides?.length) {
      return JSON.parse(JSON.stringify(initialArtifact.source_data.slides));
    }
    return buildDynamicSlidesFromProject(project, _passages);
  });

  // State for AI Refinements & Editing
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestEditsResponse | null>(null);
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(85);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Dual-Engine Slide Rendering State (Bespoke 1280x720 Direct HTML vs Structured Cards)
  const [slideViewMode, setSlideViewMode] = useState<'bespoke' | 'cards'>('bespoke');
  const [isRegeneratingSlide, setIsRegeneratingSlide] = useState(false);
  const canvasCardRef = React.useRef<HTMLDivElement>(null);
  const [canvasCardWidth, setCanvasCardWidth] = useState<number>(960);

  useEffect(() => {
    if (!canvasCardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setCanvasCardWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(canvasCardRef.current);
    return () => ro.disconnect();
  }, []);

  const canvasScale = Math.min(1, Math.max(0.2, (canvasCardWidth || 960) / 1280));

  // Free-form Drag and Drop positioning state
  const [draggingCardIndex, setDraggingCardIndex] = useState<number | null>(null);
  const [cardOffsets, setCardOffsets] = useState<Record<string, { x: number; y: number }>>({});

  const handleStartCardDrag = (cIdx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingCardIndex(cIdx);
    const key = `${currentSlideIndex}_${cIdx}`;
    const initialOffset = cardOffsets[key] || { x: 0, y: 0 };
    const startX = e.clientX;
    const startY = e.clientY;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;
      setCardOffsets((prev) => ({
        ...prev,
        [key]: {
          x: Math.round(initialOffset.x + dx),
          y: Math.round(initialOffset.y + dy),
        },
      }));
    };

    const onPointerUp = () => {
      setDraggingCardIndex(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResetCardOffsets = () => {
    setCardOffsets((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${currentSlideIndex}_`)) {
          delete next[k];
        }
      });
      return next;
    });
  };

  const hasCurrentSlideOffsets = Object.keys(cardOffsets).some(
    (k) => k.startsWith(`${currentSlideIndex}_`) && (cardOffsets[k].x !== 0 || cardOffsets[k].y !== 0)
  );

  const getCardDragProps = (cIdx: number) => {
    const key = `${currentSlideIndex}_${cIdx}`;
    const offset = cardOffsets[key] || { x: 0, y: 0 };
    const isDragging = draggingCardIndex === cIdx;
    return {
      style: {
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: isDragging ? 50 : selectedCardIndex === cIdx ? 25 : 1,
        transition: isDragging ? 'none' : 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
      },
      isMoved: offset.x !== 0 || offset.y !== 0,
      dragHandle: (
        <div
          onPointerDown={(e) => handleStartCardDrag(cIdx, e)}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/15 dark:hover:bg-white/15 text-slate-400 hover:text-[#FF5C00] transition-colors"
          title="Drag to freely reposition on canvas"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      ),
    };
  };

  useEffect(() => {
    if (initialArtifact?.source_data?.slides?.length) {
      setCurrentArtifact(initialArtifact);
      setEditableSlides(JSON.parse(JSON.stringify(initialArtifact.source_data.slides)));
      if (initialArtifact.source_data.theme && !new URLSearchParams(window.location.search).get('theme')) {
        setActiveThemeKey(initialArtifact.source_data.theme);
      }
    } else if (project) {
      setEditableSlides(buildDynamicSlidesFromProject(project, _passages));
    }
  }, [initialArtifact, project]);

  const rawTheme = resolvePresentonTheme(activeThemeKey);
  useThemeFonts(rawTheme);

  const themeTokens = useMemo(() => {
    const isDark = rawTheme.mode === 'dark';
    const colors = rawTheme.colors;

    return {
      raw: rawTheme,
      name: rawTheme.name,
      canvasBg: rawTheme.background?.override || colors.background,
      canvasBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      accentColor: colors.accent || colors.primary,
      primaryColor: colors.primary,
      titleColor: colors.heading || colors.text,
      subtitleColor: isDark ? '#94A3B8' : '#64748B',
      badgeBg: colors.smartLayout ? `${colors.smartLayout}20` : (colors.accent ? `${colors.accent}1a` : 'rgba(255,92,0,0.12)'),
      badgeText: colors.accent || colors.primary,
      cardBg: colors.cardBackground || colors.background,
      cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      cardTitleColor: colors.heading || colors.text,
      cardBodyColor: colors.text || (isDark ? '#E2E8F0' : '#334155'),
      headingFont: rawTheme.fonts.heading || 'system-ui, sans-serif',
      bodyFont: rawTheme.fonts.body || 'system-ui, sans-serif',
      slideRadius: rawTheme.borderRadius?.slide || '1.25rem',
      cardRadius: rawTheme.borderRadius?.card || '1rem',
      slideShadow: rawTheme.shadows?.slide || '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
      cardShadow: rawTheme.shadows?.card || '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      smartLayout: colors.smartLayout,
      isDark,
    };
  }, [activeThemeKey, rawTheme]);

  const activeTheme = themeTokens;

  const activeSlide = editableSlides[currentSlideIndex] || editableSlides[0];

  // Slide modification handlers
  // Switch slide layout archetype on the fly (Presenton style)
  const handleSwitchLayout = (newArchetype: string) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const target = { ...updated[currentSlideIndex] };
      target.archetype = newArchetype;
      const bullets = target.bullets || [];

      if (newArchetype === 'hero_visual_split') {
        if (!target.cards || target.cards.length < 2) {
          target.cards = [
            { badge: 'Core Mechanism', title: 'Primary Principle', body: bullets[0] || 'Foundational conceptual process explained with scientific clarity.' },
            { badge: 'Observable Proof', title: 'Empirical Application', body: bullets[1] || 'Experimental observation confirming the theoretical framework.' },
          ];
        }
        if (!target.image_query) {
          target.image_query = `${target.title} scientific 3d illustration`;
        }
      } else if (newArchetype === 'chart_data') {
        target.cards = [
          {
            badge: 'Empirical Data',
            title: 'Quantitative Measurements',
            body: bullets[0] || 'Empirical comparison observed under controlled curriculum parameters.',
            isChart: true,
            chartData: [
              { label: 'Wavelength 450nm (Blue)', value: 92 },
              { label: 'Wavelength 550nm (Green)', value: 18 },
              { label: 'Wavelength 680nm (Red)', value: 85 },
              { label: 'Dark Respiration Baseline', value: 24 },
            ]
          }
        ];
        target.chart_data = [
          { label: 'Wavelength 450nm (Blue)', value: 92 },
          { label: 'Wavelength 550nm (Green)', value: 18 },
          { label: 'Wavelength 680nm (Red)', value: 85 },
          { label: 'Dark Respiration Baseline', value: 24 },
        ];
      } else if (newArchetype === 'timeline') {
        target.cards = [
          { badge: 'Phase 01', stat: 'Week 1', title: 'Initiation & Hypothesis', body: bullets[0] || 'Establish baseline parameters and research assumptions.' },
          { badge: 'Phase 02', stat: 'Week 3', title: 'Empirical Testing', body: bullets[1] || 'Run controlled trials and document observation variances.' },
          { badge: 'Phase 03', stat: 'Week 6', title: 'Synthesis & Proof', body: bullets[2] || 'Evaluate statistical significance and confirm thesis.' },
        ];
      } else if (newArchetype === 'sequence_steps') {
        target.cards = [
          { badge: 'Step 01', title: 'Problem Discovery', body: bullets[0] || 'Isolate the core physical variable and establish boundary conditions.' },
          { badge: 'Step 02', title: 'Mechanistic Execution', body: bullets[1] || 'Apply the primary governing law and compute deterministic values.' },
          { badge: 'Step 03', title: 'Mastery Verification', body: bullets[2] || 'Confirm equilibrium and cross-validate against textbook standards.' },
        ];
      } else if (newArchetype === 'stat_callout') {
        target.cards = [
          { badge: 'Key Metric', stat: '94.8%', title: 'Curriculum Mastery', body: bullets[0] || 'Empirical comprehension gain measured across structured textbook modules.' },
          { badge: 'Velocity', stat: '3.2x', title: 'Synthesis Speed', body: bullets[1] || 'Faster retention rate achieved through multi-card bento decomposition.' },
        ];
      } else if (newArchetype === 'process_cycle') {
        target.cards = [
          { badge: 'Node 01', title: 'Intake & Perception', body: bullets[0] || 'Absorption of initial textbook postulates and definitions.' },
          { badge: 'Node 02', title: 'Relational Synthesis', body: bullets[1] || 'Mapping components into interconnected functional structures.' },
          { badge: 'Node 03', title: 'Feedback Loop', body: bullets[2] || 'Formative checkpoint verifying zero conceptual hallucination.' },
          { badge: 'Node 04', title: 'Equilibrium', body: bullets[3] || 'Continuous iterative refinement ensuring sustained mastery.' },
        ];
      } else if (newArchetype === 'split_comparison' && (!target.cards || target.cards.length < 2)) {
        target.cards = [
          { badge: 'Condition A', title: 'Baseline Paradigm', body: bullets[0] || 'Fragmented instruction with manual lesson assembly.' },
          { badge: 'Condition B', title: 'Grounded Intelligence', body: bullets[1] || 'Deterministic textbook alignment with instant smart layouts.' },
        ];
      } else if (newArchetype === 'card_grid_3' && (!target.cards || target.cards.length < 3)) {
        target.cards = [
          { badge: 'Part 1', title: 'Core Principle', body: bullets[0] || 'Primary foundational mechanism.' },
          { badge: 'Part 2', title: 'Observation', body: bullets[1] || 'Experimental evidence and proof.' },
          { badge: 'Part 3', title: 'Application', body: bullets[2] || 'Classroom exercise and derivation.' },
        ];
      } else if (newArchetype === 'before_after') {
        target.cards = [
          {
            badge: 'BEFORE / TRADITIONAL',
            title: 'Fragmented Classroom Assembly',
            body: bullets[0] || 'Manual lesson preparation with fragmented textbook chapters and disconnected assessment targets.',
            points: ['High teacher cognitive fatigue', 'Frequent conceptual omissions', 'Disconnected question pools']
          },
          {
            badge: 'AFTER / TRANSFORMED',
            title: 'Grounded Intelligence & Sync',
            body: bullets[1] || 'Deterministic textbook grounding compiles 16:9 presentation slides with verified citations in seconds.',
            points: ['Zero-hallucination textbook citations', 'Instant 105+ Presenton smart layouts', 'Live teacher delivery co-pilot']
          }
        ];
      } else if (newArchetype === 'pros_cons') {
        target.cards = [
          {
            badge: 'PROS & ADVANTAGES',
            title: 'Pedagogical Strengths',
            body: bullets[0] || 'Structured visual decomposition significantly improves learner comprehension.',
            points: ['Accelerated concept comprehension', 'Empirical scientific proof', 'Consistent state exam alignment']
          },
          {
            badge: 'CONS & BOUNDARIES',
            title: 'Boundary Constraints',
            body: bullets[1] || 'Requires foundational grasp of preliminary mathematical and scientific axioms.',
            points: ['Prerequisite knowledge dependency', 'Higher initial cognitive load', 'Demands guided teacher walkthrough']
          }
        ];
      } else if (newArchetype === 'pyramid_hierarchy') {
        target.cards = [
          { badge: 'TIER 03 • PEAK MASTERY', title: 'System Synthesis & Autonomous Application', body: bullets[2] || 'Transfer knowledge to solve novel unseen examination scenarios.' },
          { badge: 'TIER 02 • CORE MECHANICS', title: 'Mathematical Laws & Empirical Relationships', body: bullets[1] || 'Governing relationships and quantitative calculations.' },
          { badge: 'TIER 01 • FOUNDATIONAL DEFINITIONS', title: 'Core Nomenclature, Axioms, and Observable Postulates', body: bullets[0] || 'Core definitions, units, and observable baseline concepts.' }
        ];
      } else if (newArchetype === 'staircase_progression') {
        target.cards = [
          { badge: '01 Foundation', title: 'Conceptual Priming', body: bullets[0] || 'Establish key vocabulary and fundamental physical units.' },
          { badge: '02 Application', title: 'Mechanistic Derivation', body: bullets[1] || 'Apply empirical formulas to derive observable values.' },
          { badge: '03 Peak Mastery', title: 'Autonomous Synthesis', body: bullets[2] || 'Cross-disciplinary connection to advanced state curriculum.' }
        ];
      } else if (newArchetype === 'snake_roadmap') {
        target.cards = [
          { badge: 'Phase 01', title: 'Problem Framing', body: bullets[0] || 'Isolate variables and articulate central inquiry.' },
          { badge: 'Phase 02', title: 'Laboratory Trials', body: bullets[1] || 'Conduct controlled empirical observations.' },
          { badge: 'Phase 03', title: 'Data Modelling', body: bullets[2] || 'Analyze variances and calibrate predictive curves.' },
          { badge: 'Phase 04', title: 'Curriculum Proof', body: bullets[3] || 'Publish validated findings aligned with grade benchmarks.' }
        ];
      } else if (newArchetype === 'circular_hub') {
        target.cards = [
          { badge: 'Satellite A', title: 'Direct Observation', body: bullets[0] || 'Empirical evidence captured in textbook labs.' },
          { badge: 'Satellite B', title: 'Governing Formula', body: bullets[1] || 'Mathematical equation linking input variables.' },
          { badge: 'Satellite C', title: 'Physical Constraints', body: bullets[2] || 'Conservation laws and boundary limits.' },
          { badge: 'Satellite D', title: 'Practical Application', body: bullets[3] || 'Everyday technology utilizing this principle.' }
        ];
      } else if (newArchetype === 'editorial_quote') {
        target.cards = [
          { badge: 'Core Maxim', title: bullets[0] || 'Scientific inquiry begins with direct observation, but only achieves permanence when unified under universal physical law.', body: 'Foundational curriculum thesis on scientific inquiry.' }
        ];
      } else if (newArchetype === 'bento_4') {
        target.cards = [
          { badge: 'Part 01', title: 'Primary Axiom', body: bullets[0] || 'Foundational premise of the governing theory.' },
          { badge: 'Part 02', title: 'System Variable', body: bullets[1] || 'Key observable physical parameter.' },
          { badge: 'Part 03', title: 'Empirical Law', body: bullets[2] || 'Mathematical relationship describing the reaction.' },
          { badge: 'Part 04', title: 'Real Application', body: bullets[3] || 'Practical manifestation in engineering and life.' }
        ];
      } else if (newArchetype === 'stats_grid') {
        target.cards = [
          { badge: 'Retention', stat: '94.8%', title: 'Comprehension Gain', body: 'Measurable mastery over traditional textbook delivery.' },
          { badge: 'Speed', stat: '3.2x', title: 'Learning Velocity', body: 'Accelerated pedagogical assimilation with smart layouts.' },
          { badge: 'Accuracy', stat: '100%', title: 'Grounding Sync', body: 'Deterministic verification against textbook source passages.' }
        ];
      } else if (newArchetype === 'image_hero_full') {
        if (!target.image_query) target.image_query = `${target.title} scientific 3d visualization`;
        target.cards = [
          { badge: 'Visual Feature Insight', title: target.title, body: bullets[0] || 'A comprehensive macroscopic visual exploration of the core physical phenomenon.' }
        ];
      } else if (newArchetype === 'bullet_list' && (!target.cards || target.cards.length < 3)) {
        target.cards = [
          { badge: 'Point 01', title: 'Fundamental Postulate', body: bullets[0] || 'Governing principle established by physical laws.' },
          { badge: 'Point 02', title: 'Operational Constraint', body: bullets[1] || 'Boundary conditions determining practical limits.' },
          { badge: 'Point 03', title: 'Pedagogical Takeaway', body: bullets[2] || 'Critical concept for high-retention examinations.' },
        ];
      }

      updated[currentSlideIndex] = target;
      return updated;
    });
    setIsLayoutMenuOpen(false);
  };

  // Apply a template (either from 16 Design Packs or smart archetype)
  const handleApplyTemplate = (layoutIdOrArchetype: string, packId?: string, layoutObject?: any) => {
    if (layoutObject && packId) {
      try {
        let html = templateV2UiToHtml(layoutObject, { width: 1280, height: 720 });
        if (html) {
          html = html.replace(/http:\/\/127\.0\.0\.1:5001\/static\//g, `/templates/${packId}/static/`);
          html = html.replace(/\/static\//g, `/templates/${packId}/static/`);
          setEditableSlides((prev) => {
            const updated = [...prev];
            updated[currentSlideIndex] = {
              ...updated[currentSlideIndex],
              template_layout_id: layoutIdOrArchetype,
              html_content: html,
            };
            return updated;
          });
          setSlideViewMode('bespoke');
          setIsLayoutMenuOpen(false);
          return;
        }
      } catch (e) {
        console.warn('Failed to render layout to HTML:', e);
      }
    }
    handleSwitchLayout(layoutIdOrArchetype);
  };

  // Regenerate current slide with Dual-Engine (Direct HTML + Structured Cards)
  const handleRegenerateActiveSlide = async () => {
    if (!project?.project_id) return;
    setIsRegeneratingSlide(true);
    try {
      const outlineBullets = (activeSlide?.cards?.map((c: any) => c.body || c.title) || activeSlide?.bullets || ['Core thesis', 'Observable evidence', 'Synthesis']).slice(0, 4);
      const outlineItem = {
        id: `slide_${currentSlideIndex}`,
        slide_number: currentSlideIndex + 1,
        title: activeSlide?.title || 'Slide',
        content: activeSlide?.title || 'Slide',
        bullets: outlineBullets,
      };
      const res = await compileSlideFromOutline(
        project.project_id,
        [outlineItem],
        activeThemeKey,
        currentArtifact?.id,
        'smart_dual'
      );
      const newSlide = res?.source_data?.slides?.[0];
      if (newSlide) {
        setEditableSlides((prev) => {
          const updated = [...prev];
          updated[currentSlideIndex] = {
            ...updated[currentSlideIndex],
            ...newSlide,
          };
          return updated;
        });
        if (newSlide.html_content) {
          setSlideViewMode('bespoke');
        }
      }
    } catch (err) {
      console.error('Failed to regenerate slide:', err);
    } finally {
      setIsRegeneratingSlide(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('templateModal') === '1') {
      setIsTemplateModalOpen(true);
    }
    const cardParam = params.get('card');
    if (cardParam !== null) {
      setSelectedCardIndex(parseInt(cardParam, 10));
    }
    const layout = params.get('layout');
    if (layout) {
      const timer = setTimeout(() => {
        handleSwitchLayout(layout);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentSlideIndex, initialArtifact]);

  const handleUpdateSlideField = (field: string, value: any) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      if (updated[currentSlideIndex]) {
        updated[currentSlideIndex] = { ...updated[currentSlideIndex], [field]: value };
      }
      return updated;
    });
  };

  const handleUpdateCardField = (cardIdx: number, field: string, value: any) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      const cards = [...(slide.cards || [])];
      if (cards[cardIdx]) {
        cards[cardIdx] = { ...cards[cardIdx], [field]: value };
      }
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  const handleAddCardToActiveSlide = (newCard: any) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      const cards = [...(slide.cards || []), newCard];
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  const handleDuplicateCard = (cIdx: number) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      if (!Array.isArray(slide.cards) || !slide.cards[cIdx]) return prev;
      const cardToDupe = { ...slide.cards[cIdx] };
      const cards = [...slide.cards];
      cards.splice(cIdx + 1, 0, cardToDupe);
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  const handleDeleteCard = (cIdx: number) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      if (!Array.isArray(slide.cards)) return prev;
      const cards = slide.cards.filter((_: any, i: number) => i !== cIdx);
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  const handleAddNewSlide = () => {
    const subject = project?.outline?.subject || 'Curriculum';
    const grade = project?.outline?.grade_level || 'Grade 10';
    const newSlide = {
      slide_number: editableSlides.length + 1,
      title: "New Concept Presentation",
      subtitle: `${subject.toUpperCase()} · ${grade.toUpperCase()} · LECTURE MODULE`,
      badge: `CONCEPT 0${editableSlides.length + 1}`,
      postulate: "KEY POSTULATE",
      standard: `${subject} Standard`,
      archetype: "card_grid_3",
      cards: [
        { badge: "Part 1", title: "Primary Mechanism", body: "Concise description of the foundational concept." },
        { badge: "Part 2", title: "Observable Result", body: "Classroom observation and experimental proof." },
      ],
      speaker_notes: `Guide students through the core intuition of this concept before showing mathematical derivations or practical applications.`,
      est_delivery: "3m 30s",
    };
    setEditableSlides((prev) => [...prev, newSlide]);
    setCurrentSlideIndex(editableSlides.length);
  };

  const handleDuplicateSlide = (idx: number) => {
    const target = editableSlides[idx];
    if (!target) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(target)),
      title: `${target.title} (Copy)`,
      slide_number: editableSlides.length + 1,
    };
    const next = [...editableSlides];
    next.splice(idx + 1, 0, duplicated);
    setEditableSlides(next);
    setCurrentSlideIndex(idx + 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (editableSlides.length <= 1) return;
    const next = editableSlides.filter((_, i) => i !== idx);
    setEditableSlides(next);
    setCurrentSlideIndex((prev) => Math.min(prev, next.length - 1));
  };

  // Recompile PPTX
  const handleSaveAndRecompile = async () => {
    if (!project) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatedArt = await updateProjectSlides(project.project_id, {
        artifact_id: currentArtifact?.id,
        theme: activeThemeKey,
        slides: editableSlides,
      });
      setCurrentArtifact(updatedArt);
      setSaveSuccess(true);
      if (onArtifactUpdated) onArtifactUpdated(updatedArt);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save slides:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // AI Suggestion Trigger
  const handleTriggerRefinement = async (instruction: string, promptText?: string) => {
    if (!project) return;
    setIsSuggesting(true);
    try {
      const res = await suggestSlideEdits(project.project_id, activeSlide, instruction, promptText);
      setActiveSuggestion(res);
      setCopilotPrompt('');
    } catch (err) {
      console.error('Refinement failed:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    setEditableSlides((prev) => {
      const updated = [...prev];
      updated[currentSlideIndex] = {
        ...updated[currentSlideIndex],
        ...activeSuggestion.suggested_slide,
      };
      return updated;
    });
    setActiveSuggestion(null);
  };

  // Targeted Single Card AI Refinement
  const handleRefineSingleCard = async (cardIndex: number, promptText: string) => {
    if (!project || !activeSlide) return;
    setIsSuggesting(true);
    try {
      const res = await refineSingleCard(project.project_id, activeSlide, cardIndex, 'custom', promptText);
      if (res && res.suggested_card) {
        setEditableSlides((prev) => {
          const updated = [...prev];
          const curSlide = { ...updated[currentSlideIndex] };
          const cards = [...(curSlide.cards || [])];
          if (cards[cardIndex]) {
            cards[cardIndex] = { ...cards[cardIndex], ...res.suggested_card };
            curSlide.cards = cards;
            updated[currentSlideIndex] = curSlide;
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Single card refinement failed:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Live LLM Teacher Lecture Script Synthesis
  const handleGenerateLiveScript = async () => {
    if (!project || !activeSlide) return;
    setIsGeneratingScript(true);
    try {
      const res = await generateSlideScript(project.project_id, {
        slide_number: activeSlide.slide_number || currentSlideIndex + 1,
        title: activeSlide.title,
        subtitle: activeSlide.subtitle,
        archetype: activeSlide.archetype,
        cards: activeSlide.cards,
        bullets: activeSlide.bullets,
        grade_level: project.outline?.grade_level || 'Grade 10',
        subject: project.outline?.subject || 'Science',
      });
      if (res && res.speaker_notes) {
        setEditableSlides((prev) => {
          const updated = [...prev];
          if (updated[currentSlideIndex]) {
            updated[currentSlideIndex] = {
              ...updated[currentSlideIndex],
              speaker_notes: res.speaker_notes,
              est_delivery: res.est_delivery || updated[currentSlideIndex].est_delivery,
            };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to generate script:', err);
      alert('Failed to generate teacher script with LLM. Please check connectivity.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const renderFloatingToolbar = (cIdx: number, card?: any) => {
    if (selectedCardIndex !== cIdx) return null;
    return (
      <SlideElementFloatingToolbar
        cardIndex={cIdx}
        totalCards={activeSlide?.cards?.length || 1}
        card={card}
        currentArchetype={activeSlide?.archetype}
        onSwitchLayout={(arch) => handleSwitchLayout(arch)}
        onDuplicateCard={(idx) => handleDuplicateCard(idx)}
        onDeleteCard={(idx) => {
          handleDeleteCard(idx);
          setSelectedCardIndex(null);
        }}
        onAIPromptRefine={(prompt, idx) => {
          if (idx !== undefined && idx !== null) {
            handleRefineSingleCard(idx, prompt);
          } else {
            handleTriggerRefinement('custom', prompt);
          }
        }}
        onStartDrag={(e) => handleStartCardDrag(cIdx, e)}
        onClose={() => setSelectedCardIndex(null)}
        isDarkMode={isDarkMode}
      />
    );
  };

  const pptxFile = currentArtifact?.files?.find((f) => f.endsWith('.pptx')) || 'slides/slides.pptx';

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden select-none font-sans ${
      isDarkMode ? 'bg-[#151413] text-[#F5F2EB]' : 'bg-[#FAF7F2] text-[#18181B]'
    }`}>
      {/* 1. TOP STUDIO HEADER */}
      <header className="h-14 px-4 sm:px-6 bg-[#181715] border-b border-[#2B2926] flex items-center justify-between shrink-0 z-20">
        {/* Left: Navigation & Clean Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Return to Home / Chapters"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] text-slate-400 hover:text-white transition-colors"
            title={isSidebarOpen ? "Collapse Filmstrip (⌘B)" : "Show Filmstrip"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-[#FF5C00]" />}
          </button>

          {/* Inline Editable Presentation Title (Presenton Header Parity) */}
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="text"
              value={presentationTitle}
              onChange={(e) => setPresentationTitle(e.target.value)}
              className="bg-transparent hover:bg-white/5 focus:bg-white/10 border border-transparent hover:border-[#383531] focus:border-[#FF5C00]/60 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-100 focus:outline-none transition-all max-w-xs sm:max-w-md truncate"
              placeholder="Presentation Title"
              title="Click to rename presentation"
            />
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-3">
          {/* Save / Recompile Button */}
          <button
            onClick={handleSaveAndRecompile}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            title="Save and compile changes to presentation"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF5C00]" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#FF5C00]" />
            )}
            <span className="hidden sm:inline">{isSaving ? 'Compiling...' : saveSuccess ? 'Saved' : 'Save'}</span>
          </button>

          {/* Presenton Theme Selector */}
          <div className="flex items-center gap-1.5 bg-[#23211F] px-2.5 py-1 rounded-xl border border-[#32302C] text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTheme.accentColor }} />
            <span className="text-slate-400 text-[11px] font-mono">Theme:</span>
            <select
              value={activeThemeKey}
              onChange={(e) => setActiveThemeKey(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer max-w-[220px]"
            >
              {Object.entries(themes).map(([key, t]) => (
                <option key={key} value={key} className="bg-[#1C1B19] text-slate-200">
                  {t.name} ({t.fonts.heading} / {t.fonts.body}) {t.mode === 'dark' ? '• Dark' : '• Light'}
                </option>
              ))}
            </select>
          </div>

          {/* Presenton-Style Fullscreen Present Mode */}
          <button
            onClick={() => setIsProjectorMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            title="Present Presentation (Fullscreen)"
          >
            <Play className="w-3.5 h-3.5 text-[#FF5C00] fill-current" />
            <span className="hidden sm:inline">Present</span>
          </button>

          {/* Primary Action: Download .pptx */}
          <a
            href={project ? `/api/projects/${project.project_id}/download/${pptxFile}` : '#'}
            download
            className="bg-[#FF5C00] hover:bg-[#e05200] active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm shadow-orange-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .pptx</span>
          </a>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE BODY (Presenton 3-Pane Architecture: Filmstrip + Stage + Floating Tool Dock) */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================
            PANE 1: SLIDES FILMSTRIP SIDEBAR (Presenton Parity)
        ======================================================== */}
        {isSidebarOpen ? (
          <div className="w-44 bg-white/70 dark:bg-[#181715]/90 backdrop-blur-md border-r border-black/5 dark:border-[#2B2926] flex flex-col justify-between shrink-0 p-2 select-none transition-all duration-300">
          <div className="space-y-1.5 flex-1 flex flex-col overflow-hidden">
            {/* Filmstrip Header */}
            <div className="flex items-center justify-between pb-1 px-1 border-b border-black/5 dark:border-[#2B2926]">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                Slides <span className="text-slate-400 font-mono">({editableSlides.length})</span>
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleAddNewSlide}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[#FF5C00] transition-colors"
                  title="Add New Slide"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Collapse Filmstrip"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ordered Slide Thumbnails List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {editableSlides.map((slide, idx) => {
                const isSelected = idx === currentSlideIndex;
                const formattedNumber = String(idx + 1).padStart(2, '0');
                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`group relative p-2 rounded-xl text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-black/5 dark:bg-[#262421] ring-2 ring-[#FF5C00] shadow-sm'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`text-[10px] font-mono font-bold px-1 rounded shrink-0 ${
                          isSelected ? 'bg-[#FF5C00] text-white' : 'bg-black/10 dark:bg-white/10 text-slate-500'
                        }`}>
                          {formattedNumber}
                        </span>
                        <h5 className="text-[11px] font-semibold truncate leading-tight flex-1 min-w-0 text-slate-800 dark:text-slate-200">
                          {slide.title || `Slide ${idx + 1}`}
                        </h5>
                      </div>
                    </div>

                    {/* Miniature visual thumbnail preview reflecting theme */}
                    <div
                      className="h-16 w-full rounded-lg p-1.5 flex flex-col justify-between overflow-hidden border shadow-inner relative"
                      style={{
                        backgroundColor: activeTheme.canvasBg,
                        borderColor: isSelected ? activeTheme.accentColor : activeTheme.cardBorder,
                      }}
                    >
                      <div className="flex items-center justify-between text-[7px] font-mono">
                        <span style={{ color: activeTheme.subtitleColor }} className="truncate max-w-[70px]">
                          SL{idx + 1}
                        </span>
                        <span className="text-[6px] px-1 rounded font-bold" style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}>
                          16:9
                        </span>
                      </div>
                      <div className="w-3/4 h-1 rounded" style={{ backgroundColor: activeTheme.accentColor }} />
                      
                      {/* Dynamic Miniature Layout snippet */}
                      {slide.archetype === 'hero_visual_split' ? (
                        <div className="flex gap-1 h-4">
                          <div className="w-7/12 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          <div className="w-5/12 rounded bg-[#FF5C00]/30 border border-[#FF5C00]/50" />
                        </div>
                      ) : slide.archetype === 'chart_data' ? (
                        <div className="grid grid-cols-2 gap-1 h-4">
                          <div className="rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          <div className="flex flex-col justify-between py-0.5">
                            <div className="h-0.5 w-full bg-blue-500 rounded" />
                            <div className="h-0.5 w-2/3 bg-blue-400 rounded" />
                            <div className="h-0.5 w-4/5 bg-blue-500 rounded" />
                          </div>
                        </div>
                      ) : slide.archetype === 'before_after' || slide.archetype === 'pros_cons' ? (
                        <div className="grid grid-cols-2 gap-1 h-4">
                          <div className="rounded border border-rose-500/40 bg-rose-500/10" />
                          <div className="rounded border border-emerald-500/40 bg-emerald-500/10" />
                        </div>
                      ) : slide.archetype === 'pyramid_hierarchy' ? (
                        <div className="flex flex-col items-center justify-between h-4 py-0.5">
                          <div className="w-1/3 h-0.5 bg-[#FF5C00] rounded" />
                          <div className="w-2/3 h-0.5 bg-white/40 rounded" />
                          <div className="w-full h-0.5 bg-white/20 rounded" />
                        </div>
                      ) : slide.archetype === 'staircase_progression' ? (
                        <div className="flex items-end gap-0.5 h-4">
                          <div className="w-1/3 h-1.5 rounded-t bg-white/20" />
                          <div className="w-1/3 h-2.5 rounded-t bg-white/40" />
                          <div className="w-1/3 h-full rounded-t bg-[#FF5C00]" />
                        </div>
                      ) : slide.archetype === 'bento_4' ? (
                        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-4">
                          <div className="rounded bg-white/10" />
                          <div className="rounded bg-white/10" />
                          <div className="rounded bg-white/10" />
                          <div className="rounded bg-white/10" />
                        </div>
                      ) : slide.archetype === 'split_comparison' ? (
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                        </div>
                      ) : slide.archetype === 'hero_title' || idx === 0 ? (
                        <div className="grid grid-cols-12 gap-1">
                          <div className="col-span-7 h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          <div className="col-span-5 flex flex-col gap-0.5">
                            <div className="h-1.5 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                            <div className="h-1.5 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-0.5">
                          <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                          <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                        </div>
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-black/70 p-0.5 rounded border border-white/20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSlide(idx);
                        }}
                        className="text-white hover:text-[#FF5C00] p-0.5"
                        title="Duplicate"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(idx);
                        }}
                        className="text-white hover:text-red-400 p-0.5"
                        title="Delete"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filmstrip Footer: Drag to Order & Scale Slider */}
          <div className="pt-3 border-t border-[#2B2926] space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="font-bold">::</span> Drag to order
              </span>
              <span>Scale</span>
            </div>
            <input
              type="range"
              min="50"
              max="120"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-full accent-[#FF5C00] h-1 bg-[#2B2926] rounded-lg cursor-pointer"
            />
          </div>
        </div>
        ) : (
          /* Slim Collapsed Filmstrip Tab Bar */
          <div className="w-9 bg-[#181715] border-r border-[#2B2926] flex flex-col items-center justify-between py-3 shrink-0 select-none z-10">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Expand Slides Filmstrip"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#FF5C00]" />
            </button>
            <span className="text-[10px] font-mono text-slate-500 [writing-mode:vertical-lr] rotate-180 tracking-wider uppercase font-semibold">
              Slides ({editableSlides.length})
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]/40" />
          </div>
        )}

        {/* ========================================================
            PANE 2: 16:9 PRESENTATION STAGE & SPEAKER NOTES
        ======================================================== */}
        <div
          onClick={() => {
            setSelectedCardIndex(null);
            if (activeToolPanel) setActiveToolPanel(null);
          }}
          className={`flex-1 min-w-0 flex flex-col justify-between overflow-y-auto overflow-x-auto p-3 sm:p-5 select-text transition-colors duration-200 ${
            isDarkMode ? 'bg-[#121214]' : 'bg-[#EDEEEF]'
          }`}
        >
          {/* Canvas Subheader Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 mb-2 text-xs border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5C00]">
                CURRICULUM MODE: ACTIVE
              </span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                Grounding Sync: Verified Stable
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">|</span>
              <span className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-[#1C1B19] border border-black/10 dark:border-[#2B2926] text-[10px] font-mono font-bold text-slate-400">
                SLIDE {String(currentSlideIndex + 1).padStart(2, '0')} / {String(editableSlides.length).padStart(2, '0')}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-[#1C1B19] border border-black/10 dark:border-[#2B2926] text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{activeSlide?.standard || 'Curriculum Standard'}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/70 dark:bg-[#1C1B19] border border-black/10 dark:border-[#2B2926] shadow-xs">
                <Maximize2 className="w-3 h-3 text-[#FF5C00]" />
                <span>16:9 Widescreen</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} className="p-1 hover:text-[#FF5C00] transition-colors"><RotateCcw className="w-3 h-3" /></button>
                <button onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))} className="p-1 hover:text-[#FF5C00] transition-colors"><RotateCw className="w-3 h-3" /></button>
              </div>
              <div className="flex items-center gap-1">
                <span>{zoomLevel}%</span>
              </div>
            </div>
          </div>

          {/* Presenton Centered Floating Action Pill */}
          <div className="flex items-center justify-center mb-3 relative z-30">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 dark:bg-[#1C1B19]/90 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg text-xs">
              {/* Left: Layout Switcher Button & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5C00]" />
                  <span>
                    {activeSlide?.archetype === 'hero_visual_split' ? 'Split Visual Hero' :
                     activeSlide?.archetype === 'chart_data' ? 'Data Chart Hero' :
                     activeSlide?.archetype === 'before_after' ? 'Before & After' :
                     activeSlide?.archetype === 'pros_cons' ? 'Pros & Cons' :
                     activeSlide?.archetype === 'pyramid_hierarchy' ? 'Hierarchy Pyramid' :
                     activeSlide?.archetype === 'staircase_progression' ? 'Staircase Steps' :
                     activeSlide?.archetype === 'snake_roadmap' ? 'Snake Roadmap' :
                     activeSlide?.archetype === 'circular_hub' ? 'Circular Hub' :
                     activeSlide?.archetype === 'editorial_quote' ? 'Editorial Quote' :
                     activeSlide?.archetype === 'bento_4' ? '4-Card Bento' :
                     activeSlide?.archetype === 'stats_grid' ? 'KPI Stats Grid' :
                     activeSlide?.archetype === 'image_hero_full' ? 'Full-Bleed Image' :
                     activeSlide?.archetype === 'split_comparison' ? '2-Column Split' :
                     activeSlide?.archetype === 'hero_title' || activeSlide?.archetype === 'hero_stat' ? 'Title Slide' :
                     activeSlide?.archetype === 'bullet_list' ? 'Concept List' :
                     activeSlide?.archetype === 'timeline' ? 'Timeline Track' :
                     activeSlide?.archetype === 'sequence_steps' ? 'Sequence Steps' :
                     activeSlide?.archetype === 'stat_callout' ? 'Stat Hero' :
                     activeSlide?.archetype === 'process_cycle' ? 'Process Cycle' :
                     '3-Card Grid'}
                  </span>
                  <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                </button>

                {isLayoutMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 max-h-96 overflow-y-auto rounded-2xl bg-white dark:bg-[#1C1B19] border border-black/10 dark:border-[#383531] shadow-2xl p-2 z-50 space-y-1">
                    {/* Browse Full Library Button */}
                    <button
                      onClick={() => {
                        setIsLayoutMenuOpen(false);
                        setIsTemplateModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-[#FF5C00]/10 hover:bg-[#FF5C00]/20 text-[#FF5C00] font-bold text-xs border border-[#FF5C00]/30 transition-all mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        <span>Browse 105+ Template Library</span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-px bg-black/10 dark:bg-white/10 my-1" />

                    {[
                      { id: 'hero_visual_split', label: 'Split Visual Hero', icon: ImageIcon, desc: '60% content + 40% photo visual' },
                      { id: 'image_hero_full', label: 'Full-Bleed Image', icon: ImageIcon, desc: 'Full photographic hero with insight overlay' },
                      { id: 'chart_data', label: 'Data Chart Hero', icon: BarChart3, desc: 'Interactive visual data chart with metrics' },
                      { id: 'before_after', label: 'Before & After', icon: GitCompare, desc: 'Problem state vs transformed solution' },
                      { id: 'pros_cons', label: 'Pros & Cons', icon: Check, desc: 'Structured evaluation matrix' },
                      { id: 'pyramid_hierarchy', label: 'Hierarchy Pyramid', icon: Triangle, desc: '3-tier ascending mastery pyramid' },
                      { id: 'staircase_progression', label: 'Staircase Steps', icon: ArrowUpRight, desc: 'Ascending elevation steps' },
                      { id: 'snake_roadmap', label: 'Snake Roadmap', icon: Clock, desc: 'S-curve meandering roadmap' },
                      { id: 'circular_hub', label: 'Circular Hub', icon: Repeat, desc: 'Center core thesis with satellite nodes' },
                      { id: 'stats_grid', label: 'KPI Stats Grid', icon: TrendingUp, desc: 'Oversized metrics & progress bars' },
                      { id: 'stat_callout', label: 'Stat Hero Callout', icon: TrendingUp, desc: 'Dual giant numeric proof points' },
                      { id: 'bento_4', label: '4-Card Quad Bento', icon: LayoutGrid, desc: 'Balanced 2x2 multi-concept grid' },
                      { id: 'editorial_quote', label: 'Editorial Quote', icon: Quote, desc: 'Large typography pullquote' },
                      { id: 'hero_title', label: 'Title / Hero Slide', icon: FileText, desc: 'Large headline & curriculum thesis' },
                      { id: 'bullet_list', label: 'Concept List', icon: FileText, desc: 'Vertical sequential checklist items' },
                      { id: 'card_grid_3', label: '3-Card Bento Grid', icon: LayoutGrid, desc: 'Balanced 3 concept cards' },
                      { id: 'split_comparison', label: '2-Column Comparison', icon: Columns, desc: 'Side-by-side contrast' },
                      { id: 'timeline', label: 'Timeline Track', icon: Clock, desc: 'Chronological phases & milestone track' },
                      { id: 'sequence_steps', label: 'Sequence Chevrons', icon: ArrowRight, desc: 'Step-by-step process flow with arrows' },
                      { id: 'process_cycle', label: 'Process Cycle', icon: Repeat, desc: 'Closed-loop continuous workflow' },
                    ].map((archetype) => {
                      const ArchIcon = archetype.icon;
                      const isCurrent = (activeSlide?.archetype || 'card_grid_3') === archetype.id;
                      return (
                        <button
                          key={archetype.id}
                          onClick={() => handleSwitchLayout(archetype.id)}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${
                            isCurrent
                              ? 'bg-[#FF5C00]/15 text-[#FF5C00] font-bold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <ArchIcon className="w-4 h-4 text-[#FF5C00] mt-0.5 shrink-0" />
                          <div>
                            <div className="font-bold text-xs">{archetype.label}</div>
                            <div className="text-[10px] text-slate-400">{archetype.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {hasCurrentSlideOffsets && (
                <>
                  <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
                  <button
                    onClick={handleResetCardOffsets}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF5C00]/15 text-[#FF5C00] hover:bg-[#FF5C00]/25 border border-[#FF5C00]/30 text-xs font-mono font-bold transition-all shadow-xs"
                    title="Reset moved cards back to original layout grid"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Grid</span>
                  </button>
                </>
              )}

              <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

              {/* View Mode Toggle: Bespoke (HTML) vs Cards (Interactive) */}
              <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-black/5 dark:border-white/5">
                <button
                  onClick={() => setSlideViewMode('bespoke')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
                    slideViewMode === 'bespoke'
                      ? 'bg-[#FF5C00] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                  title="View Bespoke 1280x720 Direct HTML Layout"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Bespoke</span>
                </button>
                <button
                  onClick={() => setSlideViewMode('cards')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
                    slideViewMode === 'cards'
                      ? 'bg-[#FF5C00] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                  title="View Interactive Card Archetype Editor"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Cards</span>
                </button>
              </div>

              <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

              {/* Regenerate Slide Button */}
              <button
                onClick={handleRegenerateActiveSlide}
                disabled={isRegeneratingSlide}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#FF5C00]/15 text-slate-700 dark:text-slate-300 hover:text-[#FF5C00] text-xs font-semibold border border-black/5 dark:border-white/5 transition-all"
                title="Regenerate full slide with Dual-Engine (Direct HTML + Structured Cards)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingSlide ? 'animate-spin text-[#FF5C00]' : ''}`} />
                <span>{isRegeneratingSlide ? 'Regen...' : 'Regen'}</span>
              </button>

              <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

              <button
                onClick={() => setIsAIStudioOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#FF5C00]/15 to-amber-500/15 hover:from-[#FF5C00]/25 hover:to-amber-500/25 text-[#FF5C00] font-semibold text-xs border border-[#FF5C00]/25 transition-all shadow-xs"
                title="Open AI Image Studio (Diffusion, Wikimedia, Styles)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Visual</span>
              </button>

              <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

              <button
                onClick={() => handleDuplicateSlide(currentSlideIndex)}
                className="p-1.5 hover:text-[#FF5C00] text-slate-500 dark:text-slate-400 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Duplicate Current Slide"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteSlide(currentSlideIndex)}
                disabled={editableSlides.length <= 1}
                className="p-1.5 hover:text-red-500 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 transition-colors"
                title="Delete Current Slide"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

              <button
                onClick={handleAddNewSlide}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF5C00] hover:bg-[#e05200] text-white font-bold text-xs shadow-sm transition-all"
                title="Add New Slide"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 16:9 Center Slide Canvas (Presenton-Style Floating Card on Neutral Backdrop) */}
          <div
            ref={canvasCardRef}
            className="my-auto w-full max-w-4xl xl:max-w-5xl min-w-[560px] md:min-w-[640px] aspect-video min-h-[360px] md:min-h-[400px] mx-auto p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300 border"
            style={{
              background: activeTheme.canvasBg,
              borderColor: activeTheme.canvasBorder,
              borderRadius: activeTheme.slideRadius,
              boxShadow: activeTheme.slideShadow,
              fontFamily: activeTheme.bodyFont,
            }}
          >
            {slideViewMode === 'bespoke' && (activeSlide?.html_content || activeSlide?.raw_html) ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/5 dark:bg-black/20">
                <div
                  data-tailwind-runtime-scope="true"
                  style={{
                    width: 1280,
                    height: 720,
                    transform: `scale(${canvasScale})`,
                    transformOrigin: 'center center',
                    pointerEvents: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: activeSlide.html_content || activeSlide.raw_html }}
                />
              </div>
            ) : (
              <>
                {/* Corner Ambient Glow */}
                <div
                  className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-25"
                  style={{ backgroundColor: activeTheme.accentColor }}
                />

            <div className="relative z-10 space-y-2.5">
              {/* Clean Editorial Kicker (Presenton Style - Uncluttered Canvas) */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span
                  className="font-bold uppercase tracking-widest text-[10px] font-mono opacity-80"
                  style={{ color: activeTheme.accentColor }}
                >
                  {activeSlide?.subtitle || `${(project?.outline?.subject || 'Curriculum').toUpperCase()} · ${(project?.outline?.grade_level || 'Grade 10').toUpperCase()}`}
                </span>
              </div>

              {/* Large Bold Slide Title (Clean Editorial Typography, No Form Borders) */}
              <textarea
                rows={activeSlide?.title && activeSlide.title.length > 40 ? 2 : 1}
                value={activeSlide?.title || ''}
                onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                className="w-full text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight bg-transparent border-none focus:outline-none resize-none leading-tight"
                style={{ color: activeTheme.titleColor, fontFamily: activeTheme.headingFont }}
              />

              {/* ── DYNAMIC ARCHETYPE 1: HERO TITLE / STAT SLIDE (Full-Bleed Hero) ── */}
              {(activeSlide?.archetype === 'hero_title' || activeSlide?.archetype === 'hero_stat' || (currentSlideIndex === 0 && !activeSlide?.archetype)) && (
                <div className="relative flex flex-col items-center justify-center pt-2 pb-4 overflow-hidden min-h-[260px]">
                  {/* Full-bleed radial gradient glow */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse 80% 70% at 50% 60%, ${activeTheme.accentColor}22 0%, transparent 70%)`,
                    }}
                  />

                  {/* Metadata chips row */}
                  <div className="relative z-10 flex flex-wrap gap-2 justify-center mb-5">
                    {[
                      activeSlide?.cards?.[0]?.badge || activeSlide?.subject || 'Subject',
                      activeSlide?.cards?.[1]?.badge || activeSlide?.grade || 'Grade',
                      activeSlide?.cards?.[2]?.badge || (activeSlide?.date ? String(activeSlide.date) : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })),
                    ].map((chip: string, ci: number) => (
                      <span
                        key={ci}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full font-mono border"
                        style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor, borderColor: activeTheme.cardBorder }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  {/* Giant centered title */}
                  <div className="relative z-10 w-full px-4 text-center">
                    <textarea
                      rows={2}
                      value={activeSlide?.title || ''}
                      onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                      className="w-full text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-transparent border-none focus:outline-none resize-none text-center leading-tight"
                      style={{ color: activeTheme.titleColor, fontFamily: activeTheme.headingFont }}
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="relative z-10 w-full px-4 text-center mt-3">
                    <textarea
                      rows={1}
                      value={activeSlide?.cards?.[0]?.body || activeSlide?.subtitle || 'Synthesized from primary textbook passages'}
                      onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                      className="w-full text-lg bg-transparent border-none focus:outline-none resize-none text-center opacity-80"
                      style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                    />
                  </div>

                  {/* Decorative accent bar at bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 rounded-b-lg"
                    style={{ backgroundColor: activeTheme.accentColor }}
                  />

                  {/* Hidden cards for data wiring */}
                  <div className="hidden">
                    <textarea value={activeSlide?.cards?.[1]?.body || ''} onChange={(e) => handleUpdateCardField(1, 'body', e.target.value)} />
                    <textarea value={activeSlide?.cards?.[2]?.body || ''} onChange={(e) => handleUpdateCardField(2, 'body', e.target.value)} />
                  </div>

                  {/* Dummy for original card 2 wiring — keep */}
                  {false && (<div>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono block" style={{ color: activeTheme.accentColor }}>
                        Learning Competency
                      </span>
                    </div>)}
                  {false && (<div>
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono block" style={{ color: activeTheme.accentColor }}>
                        Key Application
                      </span>
                    </div>)}
                </div>
              )}

              {/* ── DYNAMIC ARCHETYPE 2: 2-COLUMN SPLIT COMPARISON ── */}
              {activeSlide?.archetype === 'split_comparison' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {(activeSlide.cards?.slice(0, 2) || []).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCardIndex(cIdx);
                      }}
                      className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-colors shadow-xs cursor-pointer ${
                        selectedCardIndex === cIdx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                      }`}
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {renderFloatingToolbar(cIdx, card)}
                      <div>
                        <span
                          className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2 font-mono"
                          style={{
                            backgroundColor: activeTheme.badgeBg,
                            color: activeTheme.badgeText,
                          }}
                        >
                          {card.badge || `Column 0${cIdx + 1}`}
                        </span>
                        <textarea
                          rows={1}
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-base font-bold bg-transparent border-none focus:outline-none mb-1.5 resize-none leading-snug break-words"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />
                        <textarea
                          rows={4}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                        />
                      </div>
                      {card.citation && (
                        <span className="text-[9px] font-mono mt-2 opacity-70" style={{ color: activeTheme.accentColor }}>
                          [{card.citation}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── DYNAMIC ARCHETYPE 3: STRUCTURED CONCEPT LIST ── */}
              {activeSlide?.archetype === 'bullet_list' && (
                <div className="space-y-2 pt-1">
                  {(activeSlide.cards || []).slice(0, 4).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCardIndex(cIdx);
                      }}
                      className={`relative p-3.5 rounded-xl border flex items-start gap-3 transition-colors shadow-xs cursor-pointer ${
                        selectedCardIndex === cIdx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                      }`}
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      {renderFloatingToolbar(cIdx, card)}
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-mono"
                        style={{
                          backgroundColor: activeTheme.badgeBg,
                          color: activeTheme.badgeText,
                        }}
                      >
                        {cIdx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <textarea
                          rows={1}
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-none focus:outline-none mb-0.5 resize-none leading-snug break-words"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />
                        <textarea
                          rows={2}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-[11px] leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PRESENTON SIGNATURE SMART LAYOUT: SPLIT VISUAL HERO (60% Content + 40% Photographic Card) ── */}
              {activeSlide?.archetype === 'hero_visual_split' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 items-stretch">
                  {/* Left Column: 7 cols (approx 60%) */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-2.5">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCardIndex(0);
                      }}
                      className={`relative p-4 sm:p-5 border flex flex-col justify-between flex-1 transition-all cursor-pointer ${
                        selectedCardIndex === 0 ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                      }`}
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                        borderRadius: activeTheme.cardRadius,
                        boxShadow: activeTheme.cardShadow,
                      }}
                    >
                      {renderFloatingToolbar(0, activeSlide.cards?.[0])}
                      <div>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono inline-block mb-1.5"
                          style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                        >
                          {activeSlide.cards?.[0]?.badge || 'Core Principle'}
                        </span>
                        <textarea
                          rows={1}
                          value={activeSlide.cards?.[0]?.title || 'Primary Mechanism'}
                          onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                          className="w-full text-base font-bold bg-transparent border-none focus:outline-none mb-1 resize-none"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />
                        <textarea
                          rows={3}
                          value={activeSlide.cards?.[0]?.body || activeSlide.bullets?.[0] || 'Foundational conceptual process explained with scientific clarity.'}
                          onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                        />
                      </div>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCardIndex(1);
                      }}
                      className={`relative p-3.5 border flex flex-col justify-between transition-all cursor-pointer ${
                        selectedCardIndex === 1 ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                      }`}
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                        borderRadius: activeTheme.cardRadius,
                        boxShadow: activeTheme.cardShadow,
                      }}
                    >
                      {renderFloatingToolbar(1, activeSlide.cards?.[1])}
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono inline-block mb-1 w-max"
                        style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                      >
                        {activeSlide.cards?.[1]?.badge || 'Observable Proof'}
                      </span>
                      <textarea
                        rows={2}
                        value={activeSlide.cards?.[1]?.body || activeSlide.bullets?.[1] || 'Experimental observation confirming the theoretical framework.'}
                        onChange={(e) => handleUpdateCardField(1, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                    </div>
                  </div>

                  {/* Right Column: 5 cols (approx 40%) - Topic Visual Photographic Card */}
                  <div
                    className="lg:col-span-5 relative rounded-2xl overflow-hidden border flex flex-col justify-end group shadow-lg min-h-[220px]"
                    style={{
                      borderColor: activeTheme.cardBorder,
                      borderRadius: activeTheme.cardRadius,
                    }}
                  >
                    <img
                      src={resolveSlideVisual(activeSlide.image_query, activeSlide.image_url)}
                      alt={activeSlide.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Bottom Caption & Live Image Query Editor */}
                    <div className="relative z-10 p-3 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white font-mono flex-1 min-w-0">
                        <ImageIcon className="w-3 h-3 text-[#FF5C00] shrink-0" />
                        <input
                          type="text"
                          value={activeSlide.image_query || `${activeSlide.title} diagram`}
                          onChange={(e) => handleUpdateSlideField('image_query', e.target.value)}
                          className="bg-transparent border-none focus:outline-none text-[10px] text-white w-full truncate"
                          title="Click to edit image search query"
                        />
                      </div>
                      <button
                        onClick={() => setIsAIStudioOpen(true)}
                        className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white border border-orange-500/30 transition-colors shadow-sm shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                        title="Open AI Image Studio (Diffusion, Wikimedia, Styles)"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Studio</span>
                      </button>
                      <button
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-colors shadow-sm shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                        title="Open Media Asset Picker (Stock Photography & Icons)"
                      >
                        <ImageIcon className="w-3 h-3 text-slate-300" />
                        <span>Stock</span>
                      </button>
                      <button
                        onClick={() => setIsAIStudioOpen(true)}
                        className="p-1 rounded-lg bg-black/60 hover:bg-[#FF5C00] text-white border border-white/10 transition-colors shadow-sm shrink-0"
                        title="Regenerate / Synthesize with AI"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: DATA CHART HERO ── */}
              {activeSlide?.archetype === 'chart_data' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 items-stretch">
                  {/* Left Column: 6 cols - Analytical Context */}
                  <div
                    className="lg:col-span-6 p-5 border flex flex-col justify-between transition-all"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: activeTheme.cardBorder,
                      borderRadius: activeTheme.cardRadius,
                      boxShadow: activeTheme.cardShadow,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono"
                          style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                        >
                          Empirical Data Analysis
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsChartStudioOpen(true)}
                            className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#FF5C00]/40 text-[#FF5C00] bg-[#FF5C00]/10 hover:bg-[#FF5C00] hover:text-white transition-all shadow-sm"
                            title="Open Interactive Chart & Data Studio"
                          >
                            <BarChart3 className="w-3 h-3" />
                            <span>Edit in Chart Studio</span>
                          </button>
                          <div className="flex items-center gap-1 text-[11px] font-mono font-bold" style={{ color: activeTheme.accentColor }}>
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Curriculum Benchmark</span>
                          </div>
                        </div>
                      </div>

                      <textarea
                        rows={1}
                        value={activeSlide.cards?.[0]?.title || 'Rate of Reaction Comparison'}
                        onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                        className="w-full text-base font-bold bg-transparent border-none focus:outline-none mb-1.5 resize-none leading-snug"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />

                      <textarea
                        rows={4}
                        value={activeSlide.cards?.[0]?.body || activeSlide.bullets?.[0] || 'Quantitative evidence demonstrating variance across tested conditions.'}
                        onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                    </div>
                  </div>

                  {/* Right Column: 6 cols - Interactive Recharts Bar Chart */}
                  <div
                    className="lg:col-span-6 p-5 border flex flex-col justify-between transition-all"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: activeTheme.cardBorder,
                      borderRadius: activeTheme.cardRadius,
                      boxShadow: activeTheme.cardShadow,
                    }}
                  >
                    {(() => {
                      const chartDataPoints: any[] = activeSlide.chart_data || activeSlide.cards?.[0]?.chartData || [
                        { label: 'A', value: 92 },
                        { label: 'B', value: 45 },
                        { label: 'C', value: 78 },
                        { label: 'D', value: 60 },
                      ];
                      return (
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono uppercase font-bold tracking-wider" style={{ color: activeTheme.subtitleColor }}>
                              Relative Performance
                            </span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: activeTheme.accentColor }}>
                              Chart View
                            </span>
                          </div>
                          <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={chartDataPoints} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                  {chartDataPoints.map((_: any, index: number) => (
                                    <Cell key={index} fill={activeTheme.accentColor} fillOpacity={index === 0 ? 1.0 : 0.7} />
                                  ))}
                                </Bar>
                                <Tooltip
                                  contentStyle={{
                                    background: activeTheme.cardBg,
                                    border: `1px solid ${activeTheme.cardBorder}`,
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontFamily: activeTheme.bodyFont,
                                    color: activeTheme.cardBodyColor,
                                  }}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                            {/* Manual X-axis labels */}
                            <div className="flex justify-around mt-1 px-2">
                              {chartDataPoints.map((pt: any, i: number) => (
                                <span key={i} className="text-[9px] font-mono text-center truncate max-w-[60px]" style={{ color: activeTheme.subtitleColor }}>
                                  {pt.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] font-mono" style={{ color: activeTheme.subtitleColor }}>
                            <span>Source: Textbook Empirical Data</span>
                            <span>Variance: ±1.2%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: TIMELINE TRACK ── */}
              {activeSlide?.archetype === 'timeline' && (
                <div className="pt-2">
                  <div className="relative mb-6 mx-4">
                    <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full" style={{ backgroundColor: activeTheme.badgeBg }} />
                    <div
                      className="absolute top-1/2 left-0 w-2/3 h-1 -translate-y-1/2 rounded-full"
                      style={{ backgroundColor: activeTheme.accentColor }}
                    />
                    <div className="relative flex justify-between">
                      {(activeSlide.cards || []).slice(0, 3).map((card: any, cIdx: number) => (
                        <div key={cIdx} className="flex flex-col items-center">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2"
                            style={{
                              backgroundColor: cIdx <= 1 ? activeTheme.accentColor : activeTheme.cardBg,
                              borderColor: activeTheme.accentColor,
                              color: cIdx <= 1 ? '#FFFFFF' : activeTheme.accentColor,
                              fontFamily: activeTheme.headingFont,
                            }}
                          >
                            {cIdx + 1}
                          </div>
                          <span
                            className="mt-1 text-[10px] font-mono font-bold uppercase tracking-wider"
                            style={{ color: activeTheme.accentColor }}
                          >
                            {card.stat || `Phase ${cIdx + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {(activeSlide.cards || []).slice(0, 3).map((card: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="p-4 border flex flex-col justify-between transition-all"
                        style={{
                          backgroundColor: activeTheme.cardBg,
                          borderColor: activeTheme.cardBorder,
                          borderRadius: activeTheme.cardRadius,
                          boxShadow: activeTheme.cardShadow,
                        }}
                      >
                        <div>
                          <span
                            className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1.5 font-mono"
                            style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                          >
                            {card.badge || `Milestone 0${cIdx + 1}`}
                          </span>
                          <textarea
                            rows={1}
                            value={card.title || ''}
                            onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                            className="w-full text-sm font-bold bg-transparent border-none focus:outline-none mb-1 leading-snug resize-none"
                            style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                          />
                          <textarea
                            rows={3}
                            value={card.body || ''}
                            onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                            className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                            style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: SEQUENCE CHEVRONS / STEPS ── */}
              {activeSlide?.archetype === 'sequence_steps' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 items-stretch">
                  {(activeSlide.cards || []).slice(0, 3).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="relative p-4 border flex flex-col justify-between transition-all"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                        borderRadius: activeTheme.cardRadius,
                        boxShadow: activeTheme.cardShadow,
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono"
                            style={{
                              backgroundColor: activeTheme.accentColor,
                              color: '#FFFFFF',
                            }}
                          >
                            {cIdx + 1}
                          </span>
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono"
                            style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                          >
                            {card.badge || `Step 0${cIdx + 1}`}
                          </span>
                        </div>

                        <textarea
                          rows={1}
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-sm font-bold bg-transparent border-none focus:outline-none mb-1.5 leading-snug resize-none"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />
                        <textarea
                          rows={4}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                        />
                      </div>
                      {cIdx < 2 && (
                        <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full items-center justify-center shadow-sm"
                             style={{ backgroundColor: activeTheme.accentColor, color: '#FFFFFF' }}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: STAT CALLOUT / METRICS HERO ── */}
              {activeSlide?.archetype === 'stat_callout' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {(activeSlide.cards || []).slice(0, 2).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="p-6 border flex flex-col justify-between transition-all"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                        borderRadius: activeTheme.cardRadius,
                        boxShadow: activeTheme.cardShadow,
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded font-mono"
                            style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}
                          >
                            {card.badge || 'Benchmark Metric'}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-mono font-bold" style={{ color: activeTheme.accentColor }}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Verified Focus</span>
                          </div>
                        </div>

                        <div className="my-2">
                          <textarea
                            rows={1}
                            value={card.stat || (cIdx === 0 ? '94.8%' : '3.2x')}
                            onChange={(e) => handleUpdateCardField(cIdx, 'stat', e.target.value)}
                            className="w-full text-4xl sm:text-5xl lg:text-6xl font-black bg-transparent border-none focus:outline-none resize-none tracking-tight leading-none"
                            style={{ color: activeTheme.accentColor, fontFamily: activeTheme.headingFont }}
                          />
                        </div>

                        <textarea
                          rows={1}
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-base font-bold bg-transparent border-none focus:outline-none mb-1.5 resize-none leading-snug"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />

                        <textarea
                          rows={3}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: PROCESS CYCLE ── */}
              {activeSlide?.archetype === 'process_cycle' && (
                <div className="pt-1 relative">
                  {/* Animated outer ring */}
                  <div
                    className="absolute inset-0 rounded-3xl pointer-events-none animate-pulse"
                    style={{ boxShadow: `0 0 0 2px ${activeTheme.accentColor}30, 0 0 40px ${activeTheme.accentColor}10` }}
                  />

                  <div className="relative grid grid-cols-2 gap-6 p-2">
                    {(activeSlide.cards || []).slice(0, 4).map((card: any, cIdx: number) => {
                      /* Arrow directions: → (0→1), ↓ (1→3), ← (3→2), ↑ (2→0) */
                      const arrowRight = cIdx === 0;
                      const arrowDown = cIdx === 1;
                      const arrowLeft = cIdx === 3;
                      const arrowUp = cIdx === 2;
                      return (
                        <div key={cIdx} className="relative">
                          <div
                            onClick={(e) => { e.stopPropagation(); setSelectedCardIndex(cIdx); }}
                            className={`relative p-4 border flex flex-col cursor-pointer transition-all ${selectedCardIndex === cIdx ? 'ring-2' : ''}`}
                            style={{
                              backgroundColor: activeTheme.cardBg,
                              borderColor: selectedCardIndex === cIdx ? activeTheme.accentColor : activeTheme.cardBorder,
                              borderRadius: activeTheme.cardRadius,
                              boxShadow: selectedCardIndex === cIdx ? `0 0 20px ${activeTheme.accentColor}30` : activeTheme.cardShadow,
                            }}
                          >
                            {renderFloatingToolbar(cIdx, card)}
                            {/* Step number circle */}
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm font-mono text-white mb-3 shrink-0"
                              style={{ backgroundColor: activeTheme.accentColor }}
                            >
                              {String(cIdx + 1).padStart(2, '0')}
                            </div>
                            <span
                              className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2 inline-block"
                              style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor }}
                            >
                              {card.badge || `Stage ${cIdx + 1}`}
                            </span>
                            <textarea
                              rows={1}
                              value={card.title || ''}
                              onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                              className="w-full text-xs font-bold bg-transparent border-none focus:outline-none mb-1 leading-snug resize-none"
                              style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                            />
                            <textarea
                              rows={2}
                              value={card.body || ''}
                              onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                              className="w-full text-[11px] leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                              style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                            />
                          </div>

                          {/* SVG Arrows between cards */}
                          {arrowRight && (
                            <svg className="absolute top-1/2 -right-5 -translate-y-1/2 w-6 h-6 z-10" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12h14M14 7l5 5-5 5" stroke={activeTheme.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {arrowDown && (
                            <svg className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-6 h-6 z-10" viewBox="0 0 24 24" fill="none">
                              <path d="M12 5v14M7 14l5 5 5-5" stroke={activeTheme.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {arrowLeft && (
                            <svg className="absolute top-1/2 -left-5 -translate-y-1/2 w-6 h-6 z-10" viewBox="0 0 24 24" fill="none">
                              <path d="M19 12H5M10 17l-5-5 5-5" stroke={activeTheme.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {arrowUp && (
                            <svg className="absolute -top-5 left-1/2 -translate-x-1/2 w-6 h-6 z-10" viewBox="0 0 24 24" fill="none">
                              <path d="M12 19V5M7 10l5-5 5 5" stroke={activeTheme.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: BEFORE & AFTER CONTRAST ── */}
              {activeSlide?.archetype === 'before_after' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-stretch">
                  {/* Before Side (Problem State) */}
                  <div
                    className="p-5 rounded-2xl border flex flex-col justify-between shadow-xs relative overflow-hidden transition-all"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: 'rgba(244, 63, 94, 0.4)',
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {activeSlide?.cards?.[0]?.badge || 'BEFORE / TRADITIONAL'}
                        </span>
                        <span className="text-[10px] font-mono text-rose-400/80 font-semibold">Challenge State</span>
                      </div>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[0]?.title || 'Fragmented Classroom Assembly'}
                        onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                        className="w-full text-base font-bold bg-transparent border-none focus:outline-none resize-none leading-snug"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={2}
                        value={activeSlide?.cards?.[0]?.body || 'Manual slide creation with fragmented textbook chapters and disconnected assessments.'}
                        onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                      <div className="space-y-1.5 pt-2 border-t border-rose-500/20">
                        {(activeSlide?.cards?.[0]?.points || ['Manual lesson preparation fatigue', 'Frequent conceptual omissions', 'Disconnected question pools']).map((pt: string, pIdx: number) => (
                          <div key={pIdx} className="flex items-center gap-2 text-[11px] text-rose-300/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* After Side (Transformed State) */}
                  <div
                    className="p-5 rounded-2xl border flex flex-col justify-between shadow-xs relative overflow-hidden transition-all"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: 'rgba(16, 185, 129, 0.5)',
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {activeSlide?.cards?.[1]?.badge || 'AFTER / TRANSFORMED'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">Solution State</span>
                      </div>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[1]?.title || 'Grounded Intelligence & Sync'}
                        onChange={(e) => handleUpdateCardField(1, 'title', e.target.value)}
                        className="w-full text-base font-bold bg-transparent border-none focus:outline-none resize-none leading-snug"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={2}
                        value={activeSlide?.cards?.[1]?.body || 'Deterministic textbook grounding compiles 16:9 editorial slides with verified citations in seconds.'}
                        onChange={(e) => handleUpdateCardField(1, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                      <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                        {(activeSlide?.cards?.[1]?.points || ['Zero-hallucination textbook citations', 'Instant 105+ Presenton smart layouts', 'Live teacher delivery co-pilot']).map((pt: string, pIdx: number) => (
                          <div key={pIdx} className="flex items-center gap-2 text-[11px] text-emerald-300">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: PROS & CONS EVALUATION ── */}
              {activeSlide?.archetype === 'pros_cons' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-stretch">
                  {/* Pros */}
                  <div
                    className="p-5 rounded-2xl border flex flex-col justify-between shadow-xs"
                    style={{ backgroundColor: activeTheme.cardBg, borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                          {activeSlide?.cards?.[0]?.badge || 'PROS & ADVANTAGES'}
                        </span>
                      </div>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[0]?.title || 'Pedagogical Strengths'}
                        onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                        className="w-full text-base font-bold bg-transparent border-none focus:outline-none resize-none leading-snug mb-1"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={2}
                        value={activeSlide?.cards?.[0]?.body || 'High learner engagement through structured visual decomposition.'}
                        onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                      <div className="space-y-1.5 pt-3">
                        {(activeSlide?.cards?.[0]?.points || ['Accelerated concept comprehension', 'Empirical scientific proof', 'Consistent state exam alignment']).map((p: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cons */}
                  <div
                    className="p-5 rounded-2xl border flex flex-col justify-between shadow-xs"
                    style={{ backgroundColor: activeTheme.cardBg, borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                          <ShieldAlert className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                          {activeSlide?.cards?.[1]?.badge || 'CONS & BOUNDARY CONSTRAINTS'}
                        </span>
                      </div>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[1]?.title || 'Boundary Considerations'}
                        onChange={(e) => handleUpdateCardField(1, 'title', e.target.value)}
                        className="w-full text-base font-bold bg-transparent border-none focus:outline-none resize-none leading-snug mb-1"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={2}
                        value={activeSlide?.cards?.[1]?.body || 'Requires foundational grasp of preliminary mathematical and chemical axioms.'}
                        onChange={(e) => handleUpdateCardField(1, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                      <div className="space-y-1.5 pt-3">
                        {(activeSlide?.cards?.[1]?.points || ['Prerequisite knowledge dependency', 'Higher initial cognitive load', 'Demands guided teacher walkthrough']).map((p: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-amber-300/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: PYRAMID HIERARCHY / FUNNEL ── */}
              {activeSlide?.archetype === 'pyramid_hierarchy' && (
                <div className="flex flex-col items-center justify-center gap-0 pt-2 relative select-none">
                  {/* Full-width SVG triangle background */}
                  <svg
                    viewBox="0 0 400 220"
                    className="absolute inset-0 w-full h-full opacity-5 pointer-events-none"
                    preserveAspectRatio="none"
                  >
                    <polygon points="200,10 10,210 390,210" fill={activeTheme.accentColor} />
                  </svg>

                  {/* Tier 01 — PEAK (narrowest, top) */}
                  <div className="relative flex items-center justify-center w-full mb-1">
                    <div
                      className="relative flex items-center gap-3 px-5 py-3 transition-all shadow-lg"
                      style={{
                        width: '42%',
                        clipPath: 'polygon(6% 0%, 94% 0%, 100% 100%, 0% 100%)',
                        backgroundColor: activeTheme.accentColor,
                        borderRadius: '4px',
                      }}
                    >
                      <span className="text-white/60 font-black text-xs font-mono shrink-0">01</span>
                      <div className="flex-1 min-w-0">
                        <textarea
                          rows={1}
                          value={activeSlide?.cards?.[0]?.title || 'Peak Mastery'}
                          onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-none focus:outline-none resize-none leading-snug text-white placeholder:text-white/40"
                          style={{ fontFamily: activeTheme.headingFont }}
                        />
                        <div className="text-[9px] font-mono uppercase tracking-wider text-white/70">
                          {activeSlide?.cards?.[0]?.badge || 'TIER 03 • PEAK'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier 02 — MIDDLE */}
                  <div className="relative flex items-center justify-center w-full mb-1">
                    <div
                      className="relative flex items-center gap-3 px-5 py-3 transition-all"
                      style={{
                        width: '68%',
                        clipPath: 'polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)',
                        backgroundColor: activeTheme.cardBg,
                        border: `1.5px solid ${activeTheme.accentColor}60`,
                        borderRadius: '4px',
                      }}
                    >
                      <span className="font-black text-xs font-mono shrink-0" style={{ color: `${activeTheme.accentColor}80` }}>02</span>
                      <div className="flex-1 min-w-0">
                        <textarea
                          rows={1}
                          value={activeSlide?.cards?.[1]?.title || 'Core Mechanics'}
                          onChange={(e) => handleUpdateCardField(1, 'title', e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-none focus:outline-none resize-none leading-snug"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />
                        <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: activeTheme.accentColor }}>
                          {activeSlide?.cards?.[1]?.badge || 'TIER 02 • CORE'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier 03 — FOUNDATION (widest, bottom) */}
                  <div className="relative flex items-center justify-center w-full">
                    <div
                      className="relative flex items-center gap-3 px-5 py-3 transition-all"
                      style={{
                        width: '94%',
                        clipPath: 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)',
                        backgroundColor: activeTheme.cardBg,
                        border: `1.5px solid ${activeTheme.cardBorder}`,
                        borderRadius: '4px',
                      }}
                    >
                      <span className="font-black text-xs font-mono shrink-0" style={{ color: `${activeTheme.accentColor}50` }}>03</span>
                      <div className="flex-1 min-w-0">
                        <textarea
                          rows={1}
                          value={activeSlide?.cards?.[2]?.title || 'Foundational Definitions'}
                          onChange={(e) => handleUpdateCardField(2, 'title', e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-none focus:outline-none resize-none leading-snug"
                          style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                        />
                        <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: activeTheme.cardBodyColor }}>
                          {activeSlide?.cards?.[2]?.badge || 'TIER 01 • FOUNDATION'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: STAIRCASE ELEVATION STEPS ── */}
              {activeSlide?.archetype === 'staircase_progression' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
                  {/* Step 1 */}
                  <div
                    className="p-4 rounded-2xl border flex flex-col justify-between shadow-xs transition-all h-36"
                    style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                  >
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor }}>
                        {activeSlide?.cards?.[0]?.badge || '01 Foundation'}
                      </span>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[0]?.title || 'Conceptual Priming'}
                        onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                        className="w-full text-xs font-bold bg-transparent border-none focus:outline-none mt-1 resize-none"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={2}
                        value={activeSlide?.cards?.[0]?.body || 'Establish vocabulary and fundamental physical units.'}
                        onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                        className="w-full text-[11px] leading-relaxed bg-transparent border-none focus:outline-none resize-none mt-1"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    className="p-4 rounded-2xl border flex flex-col justify-between shadow-xs transition-all h-48"
                    style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                  >
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor }}>
                        {activeSlide?.cards?.[1]?.badge || '02 Application'}
                      </span>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[1]?.title || 'Mechanistic Derivation'}
                        onChange={(e) => handleUpdateCardField(1, 'title', e.target.value)}
                        className="w-full text-xs font-bold bg-transparent border-none focus:outline-none mt-1 resize-none"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={3}
                        value={activeSlide?.cards?.[1]?.body || 'Apply formulas and quantitative analysis to laboratory findings.'}
                        onChange={(e) => handleUpdateCardField(1, 'body', e.target.value)}
                        className="w-full text-[11px] leading-relaxed bg-transparent border-none focus:outline-none resize-none mt-1"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    className="p-4 rounded-2xl border flex flex-col justify-between shadow-md transition-all h-60 relative"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: activeTheme.accentColor,
                      boxShadow: `0 0 25px ${activeTheme.accentColor}20`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF5C00] text-white">
                          {activeSlide?.cards?.[2]?.badge || '03 Peak Mastery'}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-[#FF5C00]" />
                      </div>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[2]?.title || 'Autonomous Synthesis'}
                        onChange={(e) => handleUpdateCardField(2, 'title', e.target.value)}
                        className="w-full text-sm font-bold bg-transparent border-none focus:outline-none mt-2 resize-none"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={4}
                        value={activeSlide?.cards?.[2]?.body || 'Transfer conceptual principles to solve novel unseen examination scenarios.'}
                        onChange={(e) => handleUpdateCardField(2, 'body', e.target.value)}
                        className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none mt-1"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: S-CURVE SNAKE ROADMAP ── */}
              {activeSlide?.archetype === 'snake_roadmap' && (
                <div className="pt-2 relative">
                  {/* Subtle S-curve connector trail */}
                  <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 border-t-2 border-dashed pointer-events-none -translate-y-1/2" style={{ borderColor: `${activeTheme.accentColor}40` }} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                    {([0, 1, 2, 3]).map((idx) => {
                      const card = activeSlide?.cards?.[idx] || {};
                      const defaultBadges = ['Phase 01', 'Phase 02', 'Phase 03', 'Phase 04'];
                      const defaultTitles = ['Discovery & Axioms', 'Mechanistic Flow', 'Empirical Testing', 'Systemic Rollout'];
                      const defaultBodies = ['Survey canonical textbooks.', 'Synthesize key formulas.', 'Verify across problem sets.', 'Final curriculum deployment.'];
                      const badgeVal = card.badge || defaultBadges[idx];
                      const titleVal = card.title || defaultTitles[idx];
                      const bodyVal = card.body || defaultBodies[idx];
                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCardIndex(idx);
                          }}
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between shadow-xs transition-all cursor-pointer ${
                            idx % 2 === 1 ? 'md:translate-y-4' : ''
                          } ${selectedCardIndex === idx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''}`}
                          style={{
                            backgroundColor: activeTheme.cardBg,
                            borderColor: selectedCardIndex === idx ? activeTheme.accentColor : activeTheme.cardBorder,
                            borderRadius: activeTheme.cardRadius,
                          }}
                        >
                          {renderFloatingToolbar(idx, card)}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor }}
                              >
                                {badgeVal}
                              </span>
                              <span className="text-xs font-mono font-black" style={{ color: activeTheme.accentColor }}>
                                0{idx + 1}
                              </span>
                            </div>
                            <textarea
                              rows={1}
                              value={titleVal}
                              onChange={(e) => handleUpdateCardField(idx, 'title', e.target.value)}
                              className="w-full font-bold text-xs bg-transparent border-none focus:outline-none resize-none leading-snug"
                              style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                            />
                            <textarea
                              rows={3}
                              value={bodyVal}
                              onChange={(e) => handleUpdateCardField(idx, 'body', e.target.value)}
                              className="w-full text-[11px] bg-transparent border-none focus:outline-none resize-none leading-relaxed mt-1"
                              style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: CIRCULAR HUB & SPOKE ── */}
              {activeSlide?.archetype === 'circular_hub' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 items-center relative">
                  {/* Left satellites (2 cards) */}
                  <div className="md:col-span-4 space-y-3">
                    {([0, 1]).map((idx) => {
                      const card = activeSlide?.cards?.[idx] || {};
                      const defaultBadges = ['Pillar 01', 'Pillar 02'];
                      const defaultTitles = ['Primary Mechanism', 'Thermodynamic Limit'];
                      const defaultBodies = ['Governed by kinetic rate constants.', 'Constrained by entropy conservation.'];
                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCardIndex(idx);
                          }}
                          className={`relative p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                            selectedCardIndex === idx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                          }`}
                          style={{
                            backgroundColor: activeTheme.cardBg,
                            borderColor: selectedCardIndex === idx ? activeTheme.accentColor : activeTheme.cardBorder,
                            borderRadius: activeTheme.cardRadius,
                          }}
                        >
                          {renderFloatingToolbar(idx, card)}
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider block mb-1" style={{ color: activeTheme.accentColor }}>
                            {card.badge || defaultBadges[idx]}
                          </span>
                          <textarea
                            rows={1}
                            value={card.title || defaultTitles[idx]}
                            onChange={(e) => handleUpdateCardField(idx, 'title', e.target.value)}
                            className="w-full font-bold text-xs bg-transparent border-none focus:outline-none resize-none leading-snug"
                            style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                          />
                          <textarea
                            rows={2}
                            value={card.body || defaultBodies[idx]}
                            onChange={(e) => handleUpdateCardField(idx, 'body', e.target.value)}
                            className="w-full text-[11px] bg-transparent border-none focus:outline-none resize-none leading-relaxed mt-1"
                            style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Center Hub */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-4 text-center">
                    <div
                      className="w-32 h-32 rounded-full border-2 flex flex-col items-center justify-center p-3 shadow-xl transition-transform hover:scale-105 relative"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.accentColor,
                        boxShadow: `0 0 30px ${activeTheme.accentColor}30`,
                      }}
                    >
                      <Sparkles className="w-5 h-5 mb-1" style={{ color: activeTheme.accentColor }} />
                      <span className="text-[11px] font-bold text-center leading-tight font-mono uppercase tracking-tight" style={{ color: activeTheme.cardTitleColor }}>
                        {activeSlide?.title?.slice(0, 24) || 'Core Thesis'}
                      </span>
                      <span className="text-[9px] font-mono mt-1 opacity-70" style={{ color: activeTheme.accentColor }}>
                        System Hub
                      </span>
                    </div>
                  </div>

                  {/* Right satellites (2 cards) */}
                  <div className="md:col-span-4 space-y-3">
                    {([2, 3]).map((idx) => {
                      const card = activeSlide?.cards?.[idx] || {};
                      const defaultBadges = ['Pillar 03', 'Pillar 04'];
                      const defaultTitles = ['Catalytic Influence', 'Equilibrium State'];
                      const defaultBodies = ['Lowers activation threshold.', 'Dynamic balance at endpoint.'];
                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCardIndex(idx);
                          }}
                          className={`relative p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                            selectedCardIndex === idx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                          }`}
                          style={{
                            backgroundColor: activeTheme.cardBg,
                            borderColor: selectedCardIndex === idx ? activeTheme.accentColor : activeTheme.cardBorder,
                            borderRadius: activeTheme.cardRadius,
                          }}
                        >
                          {renderFloatingToolbar(idx, card)}
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider block mb-1" style={{ color: activeTheme.accentColor }}>
                            {card.badge || defaultBadges[idx - 2]}
                          </span>
                          <textarea
                            rows={1}
                            value={card.title || defaultTitles[idx - 2]}
                            onChange={(e) => handleUpdateCardField(idx, 'title', e.target.value)}
                            className="w-full font-bold text-xs bg-transparent border-none focus:outline-none resize-none leading-snug"
                            style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                          />
                          <textarea
                            rows={2}
                            value={card.body || defaultBodies[idx - 2]}
                            onChange={(e) => handleUpdateCardField(idx, 'body', e.target.value)}
                            className="w-full text-[11px] bg-transparent border-none focus:outline-none resize-none leading-relaxed mt-1"
                            style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: EDITORIAL PULLQUOTE ── */}
              {activeSlide?.archetype === 'editorial_quote' && (
                <div
                  className="p-8 sm:p-10 rounded-3xl border flex flex-col justify-between shadow-xl my-auto min-h-[280px]"
                  style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                >
                  <div className="text-5xl sm:text-6xl font-serif leading-none italic opacity-40 select-none" style={{ color: activeTheme.accentColor }}>
                    “
                  </div>
                  <div className="my-auto px-4 sm:px-8 text-center">
                    <textarea
                      rows={3}
                      value={activeSlide?.cards?.[0]?.title || activeSlide?.bullets?.[0] || 'Scientific inquiry begins with direct observation, but only achieves permanence when unified under universal physical law.'}
                      onChange={(e) => handleUpdateCardField(0, 'title', e.target.value)}
                      className="w-full text-xl sm:text-2xl font-serif italic font-bold bg-transparent border-none focus:outline-none text-center resize-none leading-relaxed"
                      style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t pt-4 px-2" style={{ borderColor: activeTheme.cardBorder }}>
                    <span className="text-xs font-mono font-bold" style={{ color: activeTheme.accentColor }}>
                      {activeSlide?.cards?.[0]?.badge || 'Pedagogical Axiom'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Grounded in Primary State Curriculum
                    </span>
                  </div>
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: 4-CARD QUAD BENTO ── */}
              {activeSlide?.archetype === 'bento_4' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {(activeSlide?.cards || []).slice(0, 4).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCardIndex(cIdx);
                      }}
                      className={`relative p-4 rounded-2xl border flex flex-col justify-between shadow-xs transition-all hover:shadow-md cursor-pointer ${
                        selectedCardIndex === cIdx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                      }`}
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                        ...getCardDragProps(cIdx).style,
                      }}
                    >
                      {renderFloatingToolbar(cIdx, card)}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block" style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor }}>
                          {card.badge || `Concept 0${cIdx + 1}`}
                        </span>
                        {getCardDragProps(cIdx).dragHandle}
                      </div>
                      <textarea
                        rows={1}
                        value={card.title || ''}
                        onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                        className="w-full text-xs font-bold bg-transparent border-none focus:outline-none mb-1 leading-snug resize-none"
                        style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                      />
                      <textarea
                        rows={2}
                        value={card.body || ''}
                        onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                        className="w-full text-[11px] leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor, fontFamily: activeTheme.bodyFont }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: KPI STATS GRID ── */}
              {activeSlide?.archetype === 'stats_grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 items-stretch">
                  {([0, 1, 2]).map((idx) => {
                    const card = activeSlide?.cards?.[idx] || {};
                    const defaultStats = ['94.8%', '3.2x', '100%'];
                    const defaultBadges = ['Retention', 'Speed', 'Accuracy'];
                    const defaultTitles = ['Comprehension Gain', 'Faster Synthesis', 'Curriculum Grounding'];
                    const statVal = card.stat || defaultStats[idx];
                    const badgeVal = card.badge || defaultBadges[idx];
                    const titleVal = card.title || defaultTitles[idx];
                    return (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardIndex(idx);
                        }}
                        className={`group relative p-5 rounded-2xl border flex flex-col justify-between text-center shadow-xs transition-all hover:shadow-md cursor-pointer ${
                          selectedCardIndex === idx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                        }`}
                        style={{
                          backgroundColor: activeTheme.cardBg,
                          borderColor: selectedCardIndex === idx ? activeTheme.accentColor : activeTheme.cardBorder,
                          borderRadius: activeTheme.cardRadius,
                          boxShadow: activeTheme.cardShadow,
                        }}
                      >
                        {renderFloatingToolbar(idx, card)}
                        <div>
                          <input
                            type="text"
                            value={badgeVal}
                            onChange={(e) => handleUpdateCardField(idx, 'badge', e.target.value)}
                            className="text-[10px] font-mono font-bold uppercase tracking-wider block w-full text-center bg-transparent border-none focus:outline-none"
                            style={{ color: activeTheme.accentColor }}
                          />
                          <input
                            type="text"
                            value={statVal}
                            onChange={(e) => handleUpdateCardField(idx, 'stat', e.target.value)}
                            className="w-full text-center text-3xl sm:text-4xl font-black my-2 tracking-tight bg-transparent border-none focus:outline-none"
                            style={{ color: activeTheme.titleColor, fontFamily: activeTheme.headingFont }}
                          />
                          <textarea
                            rows={1}
                            value={titleVal}
                            onChange={(e) => handleUpdateCardField(idx, 'title', e.target.value)}
                            className="w-full text-center text-xs font-semibold bg-transparent border-none focus:outline-none resize-none"
                            style={{ color: activeTheme.cardTitleColor }}
                          />
                        </div>
                        <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: idx === 0 ? '94%' : idx === 1 ? '75%' : '100%',
                              backgroundColor: activeTheme.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PRESENTON SMART LAYOUT: FULL-BLEED IMAGE HERO ── */}
              {activeSlide?.archetype === 'image_hero_full' && (
                <div
                  className="relative w-full h-[300px] rounded-3xl overflow-hidden border shadow-xl flex items-end p-6"
                  style={{ borderColor: activeTheme.cardBorder }}
                >
                  <img
                    src={resolveSlideVisual(activeSlide?.image_query || activeSlide?.title, activeSlide?.image_url)}
                    alt={activeSlide?.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="relative z-10 w-full bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/20 text-white space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF5C00] text-white inline-block">
                        Visual Feature Insight
                      </span>
                      <button
                        onClick={() => setIsAIStudioOpen(true)}
                        className="px-2 py-0.5 rounded-lg bg-black/60 hover:bg-[#FF5C00] text-white border border-white/20 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        title="Open AI Image Studio"
                      >
                        <Sparkles className="w-3 h-3 text-[#FF5C00]" />
                        <span>AI Studio</span>
                      </button>
                    </div>
                    <div className="text-sm font-bold leading-snug">
                      {activeSlide?.cards?.[0]?.title || activeSlide?.title}
                    </div>
                    <div className="text-xs text-slate-200 line-clamp-2">
                      {activeSlide?.cards?.[0]?.body || 'Authentic macroscopic photography demonstrating the theoretical mechanism in action.'}
                    </div>
                  </div>
                </div>
              )}

              {/* ── DYNAMIC ARCHETYPE: PRESENTON CARDS / BENTO GRID ── */}
              {activeSlide?.archetype !== 'hero_visual_split' &&
               activeSlide?.archetype !== 'chart_data' &&
               activeSlide?.archetype !== 'before_after' &&
               activeSlide?.archetype !== 'pros_cons' &&
               activeSlide?.archetype !== 'pyramid_hierarchy' &&
               activeSlide?.archetype !== 'staircase_progression' &&
               activeSlide?.archetype !== 'snake_roadmap' &&
               activeSlide?.archetype !== 'circular_hub' &&
               activeSlide?.archetype !== 'editorial_quote' &&
               activeSlide?.archetype !== 'bento_4' &&
               activeSlide?.archetype !== 'stats_grid' &&
               activeSlide?.archetype !== 'image_hero_full' &&
               activeSlide?.archetype !== 'hero_title' &&
               activeSlide?.archetype !== 'hero_stat' &&
               !(currentSlideIndex === 0 && !activeSlide?.archetype) &&
               activeSlide?.archetype !== 'split_comparison' &&
               activeSlide?.archetype !== 'bullet_list' &&
               activeSlide?.archetype !== 'timeline' &&
               activeSlide?.archetype !== 'sequence_steps' &&
               activeSlide?.archetype !== 'stat_callout' &&
               activeSlide?.archetype !== 'process_cycle' && (
                <div>
                  <div className={`grid gap-3.5 pt-1 ${
                    (activeSlide?.cards?.length || 3) === 1
                      ? 'grid-cols-1'
                      : (activeSlide?.cards?.length || 3) === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                  }`}>
                    {(activeSlide?.cards || []).map((card: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardIndex(cIdx);
                        }}
                        className={`group relative p-4 rounded-2xl border flex flex-col justify-between transition-all shadow-xs hover:shadow-md cursor-pointer ${
                          selectedCardIndex === cIdx ? 'ring-2 ring-[#FF5C00] shadow-lg shadow-orange-500/10' : ''
                        }`}
                        style={{
                          backgroundColor: activeTheme.cardBg,
                          borderColor: activeTheme.cardBorder,
                          ...getCardDragProps(cIdx).style,
                        }}
                      >
                        {renderFloatingToolbar(cIdx, card)}
                        {/* Hover Quick Action Capsule */}
                        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10 z-10">
                          {getCardDragProps(cIdx).dragHandle}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateCard(cIdx);
                            }}
                            className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                            title="Duplicate Card"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCard(cIdx);
                            }}
                            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10 transition-colors"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div>
                          {card.badge && (
                            <span
                              className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1.5 font-mono"
                              style={{
                                backgroundColor: activeTheme.badgeBg,
                                color: activeTheme.badgeText,
                              }}
                            >
                              {card.badge}
                            </span>
                          )}

                          {card.stat && (
                            <div className="mb-2 py-0.5 px-2 rounded-lg bg-orange-500/10 border border-orange-500/20 max-w-max">
                              <span className="text-lg font-black font-mono tracking-tight" style={{ color: activeTheme.accentColor }}>
                                {card.stat}
                              </span>
                            </div>
                          )}

                          <textarea
                            rows={1}
                            value={card.title || ''}
                            onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                            className="w-full text-sm font-bold bg-transparent border-none focus:outline-none mb-1 leading-snug resize-none break-words"
                            style={{ color: activeTheme.cardTitleColor, fontFamily: activeTheme.headingFont }}
                          />

                          {card.isFormula ? (
                            <div className="my-2 p-2.5 rounded-xl bg-black/30 border border-white/10 font-mono text-center text-sm font-bold text-amber-300">
                              {card.body}
                            </div>
                          ) : card.isChart && card.chartData ? (
                            <div className="my-2 space-y-1.5 p-2 rounded-xl bg-black/20 border border-white/5">
                              {card.chartData.map((d: any, i: number) => (
                                <div key={i} className="space-y-0.5">
                                  <div className="flex justify-between text-[10px] font-mono text-slate-300">
                                    <span>{d.label}</span>
                                    <span>{d.value}</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(100, Math.max(10, (d.value / 1000) * 100))}%`,
                                        backgroundColor: activeTheme.accentColor,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <textarea
                              rows={3}
                              value={card.body || ''}
                              onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                              className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                              style={{ color: activeTheme.cardBodyColor }}
                            />
                          )}
                        </div>

                        {card.citation && (
                          <span className="text-[9px] font-mono mt-1 opacity-70" style={{ color: activeTheme.accentColor }}>
                            [{card.citation}]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Card / Element Action Button */}
                  <button
                    onClick={() => setActiveToolPanel('elements')}
                    className="w-full py-2 rounded-xl border border-dashed border-slate-400/30 hover:border-[#FF5C00]/60 hover:bg-[#FF5C00]/5 text-slate-400 hover:text-[#FF5C00] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Card / Element</span>
                  </button>
                </div>
              )}
            </div>
              </>
            )}

            {/* Bottom Slide Paging Dots */}
            <div className="relative z-10 pt-3 flex items-center justify-between text-xs" style={{ color: activeTheme.subtitleColor }}>
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                className="hover:opacity-100 opacity-70 disabled:opacity-20 flex items-center gap-1 font-semibold transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <div className="flex items-center gap-1.5">
                {editableSlides.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                      i === currentSlideIndex ? 'scale-125' : 'opacity-30 hover:opacity-60'
                    }`}
                    style={{ backgroundColor: activeTheme.accentColor }}
                  />
                ))}
              </div>
              <button
                disabled={currentSlideIndex === editableSlides.length - 1}
                onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                className="hover:opacity-100 opacity-70 disabled:opacity-20 flex items-center gap-1 font-semibold transition-opacity"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Teacher Speaker Notes Collapsible Drawer Bar (Presenton Uncluttered Stage Parity) */}
          <div className="mt-3 max-w-4xl lg:max-w-5xl w-full mx-auto">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#1C1B19]/80 backdrop-blur-md border border-black/10 dark:border-[#2B2926] shadow-sm text-xs">
              <button
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[#FF5C00]" />
                <span className="font-semibold text-xs">Speaker Notes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  Grounded
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {activeSlide?.est_delivery || "3m 45s"}
                </span>
                <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isNotesOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSpeakerNotesDrawerOpen(true)}
                  className="text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#252422] hover:bg-[#2e2d2a] border border-[#383531] transition-all cursor-pointer"
                  title="Open Dedicated Presenter Delivery Guide Drawer"
                >
                  <Mic className="w-3 h-3 text-[#FF5C00]" />
                  <span>Delivery Drawer</span>
                </button>

                <button
                  disabled={isGeneratingScript}
                  onClick={handleGenerateLiveScript}
                  className="text-[10px] font-semibold text-[#FF5C00] hover:text-orange-400 disabled:opacity-50 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer"
                  title="Use LLM to generate an authentic classroom teacher lecture script"
                >
                  {isGeneratingScript ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-[#FF5C00]" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-[#FF5C00]" />
                      <span>AI Generate Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Notes Drawer */}
            {isNotesOpen && (
              <div className="mt-2 p-3.5 rounded-2xl bg-white dark:bg-[#1C1B19] border border-black/10 dark:border-[#2B2926] shadow-lg space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <textarea
                  rows={3}
                  value={activeSlide?.speaker_notes || ''}
                  onChange={(e) => handleUpdateSlideField('speaker_notes', e.target.value)}
                  placeholder="Enter teacher lecture notes or click 'AI Generate Script' above..."
                  className="w-full text-xs text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-[#151413] p-3 rounded-xl border border-black/10 dark:border-[#2B2926] focus:border-[#FF5C00] focus:outline-none leading-relaxed resize-y"
                />
                {activeSlide?.discussion_prompt && (
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200">
                    <MessageSquare className="w-3.5 h-3.5 text-[#FF5C00] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-[#FF5C00] block">
                        Formative Discussion Prompt
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200">{activeSlide.discussion_prompt}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            PANE 3: PRESENTON FLOATING TOOL DOCK & INTERACTIVE DRAWERS
        ======================================================== */}
        <div className="flex shrink-0 relative">
          <RightPanelRenderer
            activePanel={activeToolPanel}
            setActivePanel={setActiveToolPanel}
            activeThemeKey={activeThemeKey}
            setActiveThemeKey={setActiveThemeKey}
            themes={PRESENTON_STUDIO_THEMES}
            activeSlide={activeSlide}
            onUpdateSlideField={handleUpdateSlideField}
            onAddCard={handleAddCardToActiveSlide}
            onSetArchetype={(arch) => handleSwitchLayout(arch)}
            onOpenTemplateLibrary={() => setIsTemplateModalOpen(true)}
            isSuggesting={isSuggesting}
            onTriggerRefinement={(type, promptText) => handleTriggerRefinement(type, promptText)}
            coPilotPrompt={copilotPrompt}
            setCoPilotPrompt={setCopilotPrompt}
            onApplyCustomRefinement={() => {
              if (copilotPrompt.trim()) {
                handleTriggerRefinement('custom', copilotPrompt.trim());
              }
            }}
            activeSuggestion={activeSuggestion}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={() => setActiveSuggestion(null)}
            isGeneratingScript={isGeneratingScript}
            onGenerateScript={handleGenerateLiveScript}
            isDarkMode={isDarkMode}
          />
          <RightEditPanel
            activePanel={activeToolPanel}
            setActivePanel={setActiveToolPanel}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            onResetZoom={() => setZoomLevel(100)}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* ========================================================
          FULL-SCREEN CLASSROOM PROJECTOR MODAL
      ======================================================== */}
      {isProjectorMode && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 sm:p-12 animate-in fade-in select-none">
          {/* Top Projector Toolbar */}
          <div className="flex items-center justify-between text-white/80">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm bg-[#FF5C00] text-white px-3 py-0.5 rounded-full font-bold">
                {currentSlideIndex + 1} / {editableSlides.length}
              </span>
              <h2 className="text-sm font-semibold truncate max-w-md">{activeSlide?.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50 hidden sm:inline">
                Use Arrow Keys / Space to navigate • Esc to exit
              </span>
              <button
                onClick={() => setIsProjectorMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Exit Projector Mode"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 16:9 Cinema Projection Stage */}
          <div className="my-auto max-w-5xl w-full mx-auto aspect-video bg-[#18181B] border border-white/10 rounded-3xl p-8 sm:p-14 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-400">
                  SLIDE {String(currentSlideIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  NCERT Standard P88
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">
                {activeSlide?.title}
              </h1>
              {activeSlide?.subtitle && (
                <p className="text-base sm:text-lg text-slate-400 mb-6">{activeSlide.subtitle}</p>
              )}

              {activeSlide?.cards && (
                <div className={`grid gap-5 my-6 ${
                  activeSlide.cards.length === 1 ? 'grid-cols-1' : activeSlide.cards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {activeSlide.cards.map((c: any, i: number) => (
                    <div key={i} className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        {c.badge && (
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded mb-2 inline-block">
                            {c.badge}
                          </span>
                        )}
                        {c.stat && (
                          <div className="text-4xl font-black text-[#FF5C00] font-mono my-2">{c.stat}</div>
                        )}
                        <h4 className="text-lg font-bold text-white mb-2">{c.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher Notes on Projector Stage */}
            {activeSlide?.speaker_notes && (
              <div className="pt-4 border-t border-white/10 text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="truncate">{activeSlide.speaker_notes}</span>
              </div>
            )}
          </div>

          {/* Bottom Projector Controls */}
          <div className="flex items-center justify-between text-white/80 max-w-5xl w-full mx-auto">
            <button
              disabled={currentSlideIndex === 0}
              onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Previous Slide
            </button>
            <div className="flex items-center gap-2">
              {editableSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'bg-[#FF5C00] scale-125' : 'bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <button
              disabled={currentSlideIndex === editableSlides.length - 1}
              onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              Next Slide <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {/* 4. PRESENTON 105+ TEMPLATE LIBRARY MODAL */}
      <SlideTemplateLibraryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        activeArchetype={activeSlide?.archetype}
        onSelectTemplate={(newArch, packId, layout) => handleApplyTemplate(newArch, packId, layout)}
        onInsertNewSlideWithTemplate={(newArch) => {
          handleAddNewSlide();
          setTimeout(() => {
            handleSwitchLayout(newArch);
          }, 50);
        }}
        isDarkMode={isDarkMode}
      />

      {/* PRESENTON MEDIA & ICON ASSET PICKER DRAWER */}
      <MediaAssetPickerDrawer
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelectImage={(imageUrl, query) => {
          handleUpdateSlideField('image_url', imageUrl);
          if (query) handleUpdateSlideField('image_query', query);
        }}
        onSelectIcon={(iconName) => {
          handleAddCardToActiveSlide({
            badge: 'CONCEPT',
            title: iconName,
            body: `Curated vector iconography illustrating foundational ${iconName.toLowerCase()} concept.`,
          });
        }}
        currentImageQuery={activeSlide?.image_query || activeSlide?.title}
        currentImageUrl={activeSlide?.image_url}
      />

      {/* PRESENTON SPEAKER NOTES DELIVERY GUIDE DRAWER */}
      <SpeakerNotesDrawer
        isOpen={isSpeakerNotesDrawerOpen}
        onClose={() => setIsSpeakerNotesDrawerOpen(false)}
        activeSlide={activeSlide}
        projectId={project?.project_id}
        gradeLevel={project?.outline?.grade_level}
        subject={project?.outline?.subject}
        onUpdateNotes={(notes) => handleUpdateSlideField('speaker_notes', notes)}
        onUpdateDiscussionPrompt={(prompt) => handleUpdateSlideField('discussion_prompt', prompt)}
      />

      {/* PRESENTON AI IMAGE STUDIO & REGENERATE MODAL */}
      <AIImageStudioModal
        isOpen={isAIStudioOpen}
        onClose={() => setIsAIStudioOpen(false)}
        slideTitle={activeSlide?.title || 'Slide Visual'}
        currentQuery={activeSlide?.image_query || activeSlide?.title}
        currentImageUrl={activeSlide?.image_url}
        onApplyImage={(imageUrl, query) => {
          handleUpdateSlideField('image_url', imageUrl);
          if (query) handleUpdateSlideField('image_query', query);
          if (activeSlide && activeSlide.archetype !== 'hero_visual_split' && activeSlide.archetype !== 'image_hero_full') {
            handleSwitchLayout('hero_visual_split');
          }
        }}
        onRemoveImage={() => {
          handleUpdateSlideField('image_url', null);
          handleUpdateSlideField('image_query', null);
          if (activeSlide?.archetype === 'hero_visual_split') {
            handleSwitchLayout('card_grid_3');
          }
        }}
        isDarkMode={isDarkMode}
      />

      {/* PRESENTON INTERACTIVE CHART & DATA STUDIO MODAL */}
      {isChartStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl animate-in zoom-in-95 duration-200">
            <ChartStudioPanel
              chartData={
                activeSlide?.chart_data || [
                  { label: 'Wavelength 450nm (Blue)', value: 92 },
                  { label: 'Wavelength 550nm (Green)', value: 18 },
                  { label: 'Wavelength 680nm (Red)', value: 85 },
                  { label: 'Dark Respiration Baseline', value: 24 },
                ]
              }
              chartType={(activeSlide?.chart_type as any) || 'horizontal_bars'}
              onChangeChartData={(data) => handleUpdateSlideField('chart_data', data)}
              onChangeChartType={(type) => handleUpdateSlideField('chart_type', type)}
              onClose={() => setIsChartStudioOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
