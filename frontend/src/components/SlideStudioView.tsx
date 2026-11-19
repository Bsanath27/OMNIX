import React, { useState, useEffect } from 'react';
import {
  Artifact,
  ProjectManifest,
  ConceptItem,
  VocabularyItem,
  updateProjectSlides,
  suggestSlideEdits,
  SuggestEditsResponse,
  generateSlideScript,
} from '../api';
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
  AlignLeft,
  SlidersHorizontal,
  ChevronDown as ChevronDownIcon,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { RightEditDock, RightToolDrawer, ActiveToolPanel } from './SlideEditPanels';

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


// ── Presenton Slide Studio Dynamic Design System Tokens ─────────────────────
export interface SlideThemeTokens {
  canvasBg: string;
  canvasBorder: string;
  titleColor: string;
  subtitleColor: string;
  cardBg: string;
  cardBorder: string;
  cardTitleColor: string;
  cardBodyColor: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  isDark: boolean;
}

export const PRESENTON_STUDIO_THEMES: Record<string, SlideThemeTokens> = {
  verdant: {
    canvasBg: '#F6FAF7',
    canvasBorder: '#D1E7D6',
    titleColor: '#15803D',
    subtitleColor: '#6B7D70',
    cardBg: '#FFFFFF',
    cardBorder: '#D1E7D6',
    cardTitleColor: '#142319',
    cardBodyColor: '#2D3A30',
    accentColor: '#15803D',
    badgeBg: '#15803D18',
    badgeText: '#15803D',
    isDark: false,
  },
  nova: {
    canvasBg: '#0B132B',
    canvasBorder: '#1C2541',
    titleColor: '#48CAE4',
    subtitleColor: '#8D99AE',
    cardBg: '#1C2541',
    cardBorder: '#3A506B',
    cardTitleColor: '#F0F8FF',
    cardBodyColor: '#CAD2C5',
    accentColor: '#00B4D8',
    badgeBg: '#00B4D825',
    badgeText: '#48CAE4',
    isDark: true,
  },
  pulse: {
    canvasBg: '#F8FAFC',
    canvasBorder: '#E2E8F0',
    titleColor: '#0284C7',
    subtitleColor: '#64748B',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardTitleColor: '#0F172A',
    cardBodyColor: '#334155',
    accentColor: '#0284C7',
    badgeBg: '#0284C718',
    badgeText: '#0284C7',
    isDark: false,
  },
  signal: {
    canvasBg: '#181715',
    canvasBorder: '#383531',
    titleColor: '#FF5C00',
    subtitleColor: '#A09B91',
    cardBg: '#23211F',
    cardBorder: '#383531',
    cardTitleColor: '#FAF8F5',
    cardBodyColor: '#D6D3D1',
    accentColor: '#FF5C00',
    badgeBg: '#FF5C0020',
    badgeText: '#FF5C00',
    isDark: true,
  },
  solar_obsidian: {
    canvasBg: '#151413',
    canvasBorder: '#332F2B',
    titleColor: '#FF5C00',
    subtitleColor: '#9CA3AF',
    cardBg: '#201E1C',
    cardBorder: '#332F2B',
    cardTitleColor: '#F5F2EB',
    cardBodyColor: '#D1D5DB',
    accentColor: '#FF5C00',
    badgeBg: '#FF5C0020',
    badgeText: '#FF5C00',
    isDark: true,
  },
  academic_clean: {
    canvasBg: '#FFFFFF',
    canvasBorder: '#E2E8F0',
    titleColor: '#1E3A8A',
    subtitleColor: '#64748B',
    cardBg: '#F8FAFC',
    cardBorder: '#E2E8F0',
    cardTitleColor: '#1E293B',
    cardBodyColor: '#475569',
    accentColor: '#1E3A8A',
    badgeBg: '#1E3A8A18',
    badgeText: '#1E3A8A',
    isDark: false,
  },
  standard: {
    canvasBg: '#FFFFFF',
    canvasBorder: '#E2E8F0',
    titleColor: '#0F172A',
    subtitleColor: '#64748B',
    cardBg: '#F8FAFC',
    cardBorder: '#E2E8F0',
    cardTitleColor: '#0F172A',
    cardBodyColor: '#334155',
    accentColor: '#0EA5E9',
    badgeBg: '#0EA5E918',
    badgeText: '#0284C7',
    isDark: false,
  },
  dynamic: {
    canvasBg: '#111318',
    canvasBorder: '#2D323E',
    titleColor: '#F97316',
    subtitleColor: '#9CA3AF',
    cardBg: '#1C1F26',
    cardBorder: '#2D323E',
    cardTitleColor: '#F8FAFC',
    cardBodyColor: '#CBD5E1',
    accentColor: '#F97316',
    badgeBg: '#F9731620',
    badgeText: '#F97316',
    isDark: true,
  },
  col_blue: {
    canvasBg: '#FAF7F2',
    canvasBorder: '#E8E2D8',
    titleColor: '#0369A1',
    subtitleColor: '#716D64',
    cardBg: '#FFFFFF',
    cardBorder: '#E8E2D8',
    cardTitleColor: '#18181B',
    cardBodyColor: '#3F3F46',
    accentColor: '#0369A1',
    badgeBg: '#0369A118',
    badgeText: '#0369A1',
    isDark: false,
  },
  executive: {
    canvasBg: '#0F0E17',
    canvasBorder: '#2E2A4A',
    titleColor: '#A78BFA',
    subtitleColor: '#938BAA',
    cardBg: '#1E1B2E',
    cardBorder: '#2E2A4A',
    cardTitleColor: '#F5F3FF',
    cardBodyColor: '#DDD6FE',
    accentColor: '#A78BFA',
    badgeBg: '#A78BFA20',
    badgeText: '#C084FC',
    isDark: true,
  },
  modern: {
    canvasBg: '#FFFFFF',
    canvasBorder: '#E5E7EB',
    titleColor: '#2563EB',
    subtitleColor: '#6B7280',
    cardBg: '#F9FAFB',
    cardBorder: '#E5E7EB',
    cardTitleColor: '#111827',
    cardBodyColor: '#374151',
    accentColor: '#2563EB',
    badgeBg: '#2563EB18',
    badgeText: '#2563EB',
    isDark: false,
  },
  mosaic: {
    canvasBg: '#FAFAFA',
    canvasBorder: '#E4E4E7',
    titleColor: '#D97706',
    subtitleColor: '#71717A',
    cardBg: '#FFFFFF',
    cardBorder: '#E4E4E7',
    cardTitleColor: '#18181B',
    cardBodyColor: '#3F3F46',
    accentColor: '#D97706',
    badgeBg: '#D9770618',
    badgeText: '#D97706',
    isDark: false,
  },
  momentum: {
    canvasBg: '#131416',
    canvasBorder: '#272A30',
    titleColor: '#38BDF8',
    subtitleColor: '#94A3B8',
    cardBg: '#1E2025',
    cardBorder: '#272A30',
    cardTitleColor: '#F1F5F9',
    cardBodyColor: '#CBD5E1',
    accentColor: '#38BDF8',
    badgeBg: '#38BDF820',
    badgeText: '#38BDF8',
    isDark: true,
  },
  swift: {
    canvasBg: '#F8FAFC',
    canvasBorder: '#E2E8F0',
    titleColor: '#2563EB',
    subtitleColor: '#64748B',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardTitleColor: '#0F172A',
    cardBodyColor: '#334155',
    accentColor: '#2563EB',
    badgeBg: '#2563EB18',
    badgeText: '#2563EB',
    isDark: false,
  },
  editorial: {
    canvasBg: '#FDFBF7',
    canvasBorder: '#E7E1D7',
    titleColor: '#1C1917',
    subtitleColor: '#78716C',
    cardBg: '#FFFFFF',
    cardBorder: '#E7E1D7',
    cardTitleColor: '#1C1917',
    cardBodyColor: '#44403C',
    accentColor: '#1C1917',
    badgeBg: '#1C191715',
    badgeText: '#1C1917',
    isDark: false,
  },
  civic: {
    canvasBg: '#F0F4F8',
    canvasBorder: '#D6E0EA',
    titleColor: '#1E40AF',
    subtitleColor: '#64748B',
    cardBg: '#FFFFFF',
    cardBorder: '#D6E0EA',
    cardTitleColor: '#1E293B',
    cardBodyColor: '#334155',
    accentColor: '#1E40AF',
    badgeBg: '#1E40AF18',
    badgeText: '#1E40AF',
    isDark: false,
  },
  landmark: {
    canvasBg: '#14181E',
    canvasBorder: '#232B35',
    titleColor: '#E2E8F0',
    subtitleColor: '#94A3B8',
    cardBg: '#1C222B',
    cardBorder: '#232B35',
    cardTitleColor: '#F8FAFC',
    cardBodyColor: '#CBD5E1',
    accentColor: '#94A3B8',
    badgeBg: '#94A3B820',
    badgeText: '#E2E8F0',
    isDark: true,
  },
  horizon: {
    canvasBg: '#0E1525',
    canvasBorder: '#1E293B',
    titleColor: '#60A5FA',
    subtitleColor: '#94A3B8',
    cardBg: '#172136',
    cardBorder: '#1E293B',
    cardTitleColor: '#F8FAFC',
    cardBodyColor: '#CBD5E1',
    accentColor: '#60A5FA',
    badgeBg: '#60A5FA20',
    badgeText: '#60A5FA',
    isDark: true,
  },
};

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
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('sidebar') === '0' || p.get('sidebar') === 'false') return false;
    }
    return true;
  });
  const [activeToolPanel, setActiveToolPanel] = useState<ActiveToolPanel>(() => {
    const p = new URLSearchParams(window.location.search).get('tool');
    if (p && ['text', 'elements', 'charts', 'diagrams', 'theme', 'copilot'].includes(p)) {
      return p as ActiveToolPanel;
    }
    return 'copilot';
  });
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get('slide') || '0', 10);
    return isNaN(s) ? 0 : Math.max(0, s);
  });

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

  const activeTheme: SlideThemeTokens = PRESENTON_STUDIO_THEMES[activeThemeKey] || PRESENTON_STUDIO_THEMES['solar_obsidian'];

  const activeSlide = editableSlides[currentSlideIndex] || editableSlides[0];

  // Slide modification handlers
  // Switch slide layout archetype on the fly (Presenton style)
  const handleSwitchLayout = (newArchetype: string) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const target = { ...updated[currentSlideIndex] };
      target.archetype = newArchetype;

      // Adapt cards structure if switching to comparison or list
      if (newArchetype === 'split_comparison' && (!target.cards || target.cards.length < 2)) {
        target.cards = [
          { badge: 'Column 1', title: 'Primary Principle', body: target.bullets?.[0] || 'Foundational mechanism.' },
          { badge: 'Column 2', title: 'Comparative Outcome', body: target.bullets?.[1] || 'Observable effect.' },
        ];
      } else if (newArchetype === 'card_grid_3' && (!target.cards || target.cards.length < 3)) {
        target.cards = [
          { badge: 'Part 1', title: 'Concept 1', body: target.bullets?.[0] || 'Core principle definition.' },
          { badge: 'Part 2', title: 'Concept 2', body: target.bullets?.[1] || 'Experimental observation.' },
          { badge: 'Part 3', title: 'Concept 3', body: target.bullets?.[2] || 'Theoretical application.' },
        ];
      }

      updated[currentSlideIndex] = target;
      return updated;
    });
    setIsLayoutMenuOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const layout = params.get('layout');
    if (layout) {
      handleSwitchLayout(layout);
    }
  }, []);

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

          <span className="text-sm font-semibold text-slate-200 truncate max-w-md ml-1">
            {activeSlide?.title || project?.outline?.title || "Presentation"}
          </span>
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
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="verdant" className="bg-[#1C1B19]">Verdant (Life Sciences)</option>
              <option value="nova" className="bg-[#1C1B19]">Nova (Tech/Physics)</option>
              <option value="pulse" className="bg-[#1C1B19]">Pulse (Clinical Blue)</option>
              <option value="signal" className="bg-[#1C1B19]">Signal (Solar Amber)</option>
              <option value="momentum" className="bg-[#1C1B19]">Momentum (Deep Carbon)</option>
              <option value="swift" className="bg-[#1C1B19]">Swift (Electric Blue)</option>
              <option value="mosaic" className="bg-[#1C1B19]">Mosaic (Warm Terracotta)</option>
              <option value="editorial" className="bg-[#1C1B19]">Editorial (Warm Ivory)</option>
              <option value="civic" className="bg-[#1C1B19]">Civic (Steel Blue)</option>
              <option value="landmark" className="bg-[#1C1B19]">Landmark (Dark Slate)</option>
              <option value="modern" className="bg-[#1C1B19]">Modern (Clean Blue)</option>
              <option value="horizon" className="bg-[#1C1B19]">Horizon (Dusk Navy)</option>
              <option value="solar_obsidian" className="bg-[#1C1B19]">Solar Obsidian (Dark)</option>
              <option value="academic_clean" className="bg-[#1C1B19]">Academic Clean (Light)</option>
              <option value="standard" className="bg-[#1C1B19]">Standard (Classroom)</option>
              <option value="dynamic" className="bg-[#1C1B19]">Dynamic (High Contrast)</option>
              <option value="executive" className="bg-[#1C1B19]">Executive (Violet)</option>
              <option value="col_blue" className="bg-[#1C1B19]">COL Sky Blue (Creme)</option>
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
                      {slide.archetype === 'split_comparison' ? (
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
        <div className={`flex-1 min-w-0 flex flex-col justify-between overflow-y-auto overflow-x-auto p-3 sm:p-5 select-text transition-colors duration-200 ${
          isDarkMode ? 'bg-[#121214]' : 'bg-[#EDEEEF]'
        }`}>
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
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 dark:bg-[#1C1B19]/90 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg text-xs">
              {/* Left: Layout Switcher Button & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5C00]" />
                  <span>
                    {activeSlide?.archetype === 'split_comparison' ? '2-Column Split' : activeSlide?.archetype === 'hero_title' || activeSlide?.archetype === 'hero_stat' ? 'Title Slide' : activeSlide?.archetype === 'bullet_list' ? 'Concept List' : '3-Card Grid'}
                  </span>
                  <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                </button>

                {isLayoutMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-[#1C1B19] border border-black/10 dark:border-[#383531] shadow-2xl p-1.5 z-50 space-y-1">
                    {[
                      { id: 'hero_title', label: 'Title / Hero Slide', icon: FileText, desc: 'Large headline & curriculum thesis' },
                      { id: 'card_grid_3', label: '3-Card Bento Grid', icon: LayoutGrid, desc: 'Balanced 3 concept cards' },
                      { id: 'split_comparison', label: '2-Column Comparison', icon: Columns, desc: 'Side-by-side contrast' },
                      { id: 'bullet_list', label: 'Structured Concept List', icon: AlignLeft, desc: 'Sequential points & definitions' },
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
            className="my-auto w-full max-w-4xl xl:max-w-5xl min-w-[560px] md:min-w-[640px] aspect-video min-h-[360px] md:min-h-[400px] mx-auto rounded-2xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 border border-black/5 dark:border-white/10"
            style={{
              backgroundColor: activeTheme.canvasBg,
              borderColor: activeTheme.canvasBorder,
            }}
          >
            {/* Corner Ambient Glow */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-25"
              style={{ backgroundColor: activeTheme.accentColor }}
            />

            <div className="relative z-10 space-y-2.5">
              {/* Slide Header: Metadata & Subject Standard */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: activeTheme.badgeBg,
                      color: activeTheme.accentColor,
                    }}
                  >
                    {activeSlide?.subtitle || `${(project?.outline?.subject || 'Curriculum').toUpperCase()} · ${(project?.outline?.grade_level || 'Grade 10').toUpperCase()}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: activeTheme.subtitleColor }} className="font-bold text-[11px]">
                    SLIDE {String(currentSlideIndex + 1).padStart(2, '0')} / {String(editableSlides.length).padStart(2, '0')}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full flex items-center gap-1 font-medium text-[10px] border"
                    style={{
                      backgroundColor: activeTheme.badgeBg,
                      color: activeTheme.badgeText,
                      borderColor: activeTheme.accentColor + '30',
                    }}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{activeSlide?.standard || `${project?.outline?.subject || 'Curriculum'} Standard`}</span>
                  </span>
                </div>
              </div>

              {/* Large Bold Slide Title (Clean Editorial Typography, No Form Borders) */}
              <textarea
                rows={activeSlide?.title && activeSlide.title.length > 40 ? 2 : 1}
                value={activeSlide?.title || ''}
                onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                className="w-full text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight bg-transparent border-none focus:outline-none resize-none leading-tight"
                style={{ color: activeTheme.titleColor }}
              />

              {/* ── DYNAMIC ARCHETYPE 1: HERO TITLE / STAT SLIDE (Presenton 12-Column Split) ── */}
              {(activeSlide?.archetype === 'hero_title' || activeSlide?.archetype === 'hero_stat' || currentSlideIndex === 0) && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 items-stretch">
                  <div
                    className="md:col-span-7 p-4 sm:p-5 rounded-2xl border flex flex-col justify-between shadow-xs transition-colors"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: activeTheme.cardBorder,
                    }}
                  >
                    <div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono inline-block mb-1.5"
                        style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accentColor }}
                      >
                        Core Conceptual Thesis
                      </span>
                      <textarea
                        rows={2}
                        value={activeSlide?.cards?.[0]?.body || activeSlide?.bullets?.[0] || 'Synthesized deterministically from primary textbook chapter passages.'}
                        onChange={(e) => handleUpdateCardField(0, 'body', e.target.value)}
                        className="w-full text-xs sm:text-sm leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                        style={{ color: activeTheme.cardBodyColor }}
                      />
                    </div>
                    {activeSlide?.cards?.[0]?.citation && (
                      <span className="text-[9px] font-mono mt-1 opacity-70" style={{ color: activeTheme.accentColor }}>
                        [{activeSlide.cards[0].citation}]
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-5 flex flex-col gap-2 justify-between">
                    <div
                      className="p-3 rounded-xl border flex-1 flex flex-col justify-between shadow-xs"
                      style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono block" style={{ color: activeTheme.accentColor }}>
                        Learning Competency
                      </span>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[1]?.body || activeSlide?.bullets?.[1] || 'Foundational conceptual inquiry.'}
                        onChange={(e) => handleUpdateCardField(1, 'body', e.target.value)}
                        className="w-full text-xs mt-0.5 bg-transparent border-none focus:outline-none resize-none leading-snug"
                        style={{ color: activeTheme.cardBodyColor }}
                      />
                    </div>
                    <div
                      className="p-3 rounded-xl border flex-1 flex flex-col justify-between shadow-xs"
                      style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono block" style={{ color: activeTheme.accentColor }}>
                        Key Application
                      </span>
                      <textarea
                        rows={1}
                        value={activeSlide?.cards?.[2]?.body || activeSlide?.bullets?.[2] || 'Aligned with state curriculum guidelines.'}
                        onChange={(e) => handleUpdateCardField(2, 'body', e.target.value)}
                        className="w-full text-xs mt-0.5 bg-transparent border-none focus:outline-none resize-none leading-snug"
                        style={{ color: activeTheme.cardBodyColor }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── DYNAMIC ARCHETYPE 2: 2-COLUMN SPLIT COMPARISON ── */}
              {activeSlide?.archetype === 'split_comparison' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {(activeSlide.cards?.slice(0, 2) || []).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="p-5 rounded-2xl border flex flex-col justify-between transition-colors shadow-xs"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
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
                          style={{ color: activeTheme.cardTitleColor }}
                        />
                        <textarea
                          rows={4}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor }}
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
                      className="p-3.5 rounded-xl border flex items-start gap-3 transition-colors shadow-xs"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
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
                          style={{ color: activeTheme.cardTitleColor }}
                        />
                        <textarea
                          rows={2}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-[11px] leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DYNAMIC ARCHETYPE 4: PRESENTON CARDS / BENTO GRID ── */}
              {activeSlide?.archetype !== 'hero_title' && activeSlide?.archetype !== 'hero_stat' && currentSlideIndex !== 0 && activeSlide?.archetype !== 'split_comparison' && activeSlide?.archetype !== 'bullet_list' && (
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
                        className="group relative p-4 rounded-2xl border flex flex-col justify-between transition-all shadow-xs hover:shadow-md"
                        style={{
                          backgroundColor: activeTheme.cardBg,
                          borderColor: activeTheme.cardBorder,
                        }}
                      >
                        {/* Hover Quick Action Capsule */}
                        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10 z-10">
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
                            style={{ color: activeTheme.cardTitleColor }}
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
        <div className="flex shrink-0">
          <RightEditDock
            activeToolPanel={activeToolPanel}
            setActiveToolPanel={setActiveToolPanel}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
          />
          <RightToolDrawer
            activeToolPanel={activeToolPanel}
            setActiveToolPanel={setActiveToolPanel}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            activeThemeKey={activeThemeKey}
            setActiveThemeKey={setActiveThemeKey}
            themes={PRESENTON_STUDIO_THEMES}
            onAddCard={handleAddCardToActiveSlide}
            onSetArchetype={(arch) => handleUpdateSlideField('archetype', arch)}
            isSuggesting={isSuggesting}
            onTriggerRefinement={(type) => handleTriggerRefinement(type)}
            coPilotPrompt={copilotPrompt}
            setCoPilotPrompt={setCopilotPrompt}
            onApplyCustomRefinement={() => {
              if (copilotPrompt.trim()) {
                handleTriggerRefinement('custom', copilotPrompt.trim());
              }
            }}
            activeSlide={activeSlide}
            activeSuggestion={activeSuggestion}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={() => setActiveSuggestion(null)}
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
    </div>
  );
};
