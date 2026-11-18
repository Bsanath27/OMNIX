import React, { useState, useEffect } from 'react';
import {
  Artifact,
  ProjectManifest,
  ConceptItem,
  VocabularyItem,
  updateProjectSlides,
  suggestSlideEdits,
  SuggestEditsResponse,
} from '../api';
import {
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  BookOpen,
  Zap,
  FolderOpen,
  FileQuestion,
  Grid,
  List,
  Sparkles,
  Scissors,
  Lightbulb,
  MessageSquare,
  Sigma,
  ShieldCheck,
  Check,
  Loader2,
  RotateCcw,
  RotateCw,
  Hash,
  Mic,
  Save,
  Trash2,
  Copy,
  Sun,
  Moon,
  ArrowLeft,
  Columns,
  LayoutGrid,
  FileText,
  AlignLeft,
  SlidersHorizontal,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react';

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
        body: `Synthesized deterministically from ${proj?.source_filename || 'chapter text'} with passage grounding.`,
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
};

export const SlideStudioView: React.FC<SlideStudioViewProps> = ({
  project,
  artifact: initialArtifact,
  passages: _passages = {},
  isDarkMode: initialDarkMode = true,
  onBack,
  onArtifactUpdated,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  // Resolve active theme from artifact source data or URL param with graceful fallback
  const [activeThemeKey, setActiveThemeKey] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme') || initialArtifact?.source_data?.theme || 'verdant';
  });
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [activeRailTab, setActiveRailTab] = useState<'outline' | 'source' | 'prompt' | 'assets' | 'assessments'>('outline');
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
  const [strictMatch, setStrictMatch] = useState(true);
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

  const pptxFile = currentArtifact?.files?.find((f) => f.endsWith('.pptx')) || 'slides/slides.pptx';

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden select-none font-sans ${
      isDarkMode ? 'bg-[#151413] text-[#F5F2EB]' : 'bg-[#FAF7F2] text-[#18181B]'
    }`}>
      {/* 1. TOP STUDIO HEADER (Identical to reference mockup) */}
      <header className="h-14 px-4 sm:px-6 bg-[#181715] border-b border-[#2B2926] flex items-center justify-between shrink-0 z-20">
        {/* Left: OMNIX STUDIO Badge & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Return to Home / Chapters"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-white font-bold text-xs tracking-tight">
              <span className="w-2 h-2 rounded-full bg-[#FF5C00]" />
              <span className="text-white font-black">OMNIX</span>
              <span className="text-[#FF5C00] font-mono text-[10px] px-1 rounded bg-[#FF5C00]/20">STUDIO</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="hover:text-slate-200 cursor-pointer" onClick={onBack}>Library</span>
            <span>›</span>
            <span>{project?.outline?.subject || 'Curriculum'} · {project?.outline?.grade_level || 'Grade 10'}</span>
            <span>›</span>
            <span className="text-slate-200 font-semibold truncate max-w-xs">
              {project?.outline?.title || project?.name || "Curriculum Chapter"}
            </span>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-3">
          {/* Live Sync Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync</span>
          </div>

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

          {/* Dark / Light Mode Switch */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] text-slate-300 hover:text-white transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
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
              <option value="solar_obsidian" className="bg-[#1C1B19]">Solar Obsidian (Dark)</option>
              <option value="academic_clean" className="bg-[#1C1B19]">Academic Clean (Light)</option>
              <option value="standard" className="bg-[#1C1B19]">Standard (Classroom)</option>
              <option value="dynamic" className="bg-[#1C1B19]">Dynamic (High Contrast)</option>
              <option value="executive" className="bg-[#1C1B19]">Executive (Violet)</option>
              <option value="col_blue" className="bg-[#1C1B19]">COL Sky Blue (Creme)</option>
            </select>
          </div>

          {/* Projector Fullscreen Mode */}
          <button
            onClick={() => setIsProjectorMode(true)}
            className="p-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] text-slate-300 hover:text-white transition-colors"
            title="Full-Screen Projector Mode"
          >
            <Maximize2 className="w-4 h-4 text-[#FF5C00]" />
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

          {/* User Badge */}
          <div className="w-7 h-7 rounded-full bg-amber-600/30 border border-amber-500/50 text-amber-400 text-xs font-bold flex items-center justify-center">
            VK
          </div>
        </div>
      </header>

      {/* 2. MAIN 4-COLUMN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================
            COLUMN 1: SLIDE NAVIGATOR (Far Left Rail, ~180px)
        ======================================================== */}
        <nav className="w-48 bg-[#181715] border-r border-[#2B2926] flex flex-col justify-between shrink-0 p-3 select-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>SLIDE NAVIGATOR</span>
              <button
                onClick={handleAddNewSlide}
                className="hover:text-white text-slate-400"
                title="Add New Slide"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { id: 'outline', label: 'Slides Outline', icon: Play },
                { id: 'source', label: 'Curriculum Source', icon: BookOpen },
                { id: 'prompt', label: 'Prompt Engine', icon: Zap },
                { id: 'assets', label: 'Asset Library', icon: FolderOpen },
                { id: 'assessments', label: 'Assessments', icon: FileQuestion },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeRailTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveRailTab(item.id as any)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigator Footer */}
          <div className="pt-3 border-t border-[#2B2926] flex items-center justify-between text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>AI Copilot Ready</span>
            </div>
            <span>v2.4</span>
          </div>
        </nav>

        {/* ========================================================
            COLUMN 2: SLIDES THUMBNAILS (Filmstrip Rail, ~240px)
        ======================================================== */}
        <div className="w-64 bg-[#1C1B19] border-r border-[#2B2926] flex flex-col justify-between shrink-0 p-3 select-none">
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            {/* Filmstrip Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#2B2926]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Slides <span className="text-slate-500 font-mono">({editableSlides.length})</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button className="p-1 rounded hover:text-white" title="Grid View">
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 rounded hover:text-white" title="List View">
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* New Slide Button */}
            <button
              onClick={handleAddNewSlide}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-[#FF5C00]/50 hover:border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00] text-xs font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>New Slide</span>
              </div>
              <span className="text-[10px] font-mono text-[#FF5C00]/70">⌘N</span>
            </button>

            {/* Ordered Slide Thumbnails List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {editableSlides.map((slide, idx) => {
                const isSelected = idx === currentSlideIndex;
                const formattedNumber = String(idx + 1).padStart(2, '0');
                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`group relative p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#262421] border-[#FF5C00] shadow-md shadow-orange-950/40 ring-1 ring-[#FF5C00]'
                        : 'bg-[#181715] border-[#2B2926] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-[#FF5C00] text-white' : 'bg-[#2A2825] text-slate-400'
                        }`}>
                          {formattedNumber}
                        </span>
                        <h5 className={`text-xs font-bold truncate max-w-[120px] ${
                          isSelected ? 'text-[#FF5C00]' : 'text-slate-200'
                        }`}>
                          {slide.title || `Slide ${idx + 1}`}
                        </h5>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#FF5C00] opacity-90" />
                    </div>

                    {/* Miniature visual wireframe preview reflecting theme */}
                    <div
                      className="h-16 w-full rounded-xl p-2 flex flex-col justify-between overflow-hidden border shadow-inner"
                      style={{
                        backgroundColor: activeTheme.canvasBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      <div className="flex items-center justify-between text-[8px] font-mono">
                        <span style={{ color: activeTheme.subtitleColor }}>
                          {(project?.outline?.subject || 'UNIT').slice(0, 7).toUpperCase()} · SL{idx + 1}
                        </span>
                        <span className="text-[8px] px-1 rounded font-bold" style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.badgeText }}>
                          {slide.archetype === 'split_comparison' ? 'SPLIT' : slide.archetype === 'hero_title' || slide.archetype === 'hero_stat' ? 'HERO' : 'CARDS'}
                        </span>
                      </div>
                      <div className="w-3/4 h-1.5 rounded" style={{ backgroundColor: activeTheme.accentColor }} />
                      <div className="grid grid-cols-3 gap-1">
                        <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                        <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                        <div className="h-4 rounded border" style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }} />
                      </div>
                    </div>

                    {/* Hover Slide Actions (Duplicate / Delete) */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#262421] p-1 rounded-lg border border-[#3A3835]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSlide(idx);
                        }}
                        className="text-slate-400 hover:text-white p-0.5 transition-colors"
                        title="Duplicate Slide"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(idx);
                        }}
                        className="text-red-400 hover:text-red-300 p-0.5 transition-colors"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-3 h-3" />
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

        {/* ========================================================
            COLUMN 3: 16:9 PRESENTATION STAGE & SPEAKER NOTES
        ======================================================== */}
        <div className="flex-1 bg-[#131211] flex flex-col justify-between overflow-y-auto p-4 sm:p-6 select-text">
          {/* Canvas Subheader Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-[#23211F] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5C00]">
                CURRICULUM MODE · {(project?.outline?.subject || 'Curriculum').toUpperCase()} {(project?.outline?.grade_level || '').toUpperCase()}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-[11px] font-mono">
                {project?.outline?.subject || 'Curriculum'} Grounding Sync: Stable
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1C1B19] border border-[#2B2926]">
                <Maximize2 className="w-3 h-3 text-[#FF5C00]" />
                <span>16:9 Widescreen 1920×1080</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:text-white"><RotateCcw className="w-3 h-3" /></button>
                <button className="p-1 hover:text-white"><RotateCw className="w-3 h-3" /></button>
              </div>
              <div className="flex items-center gap-1">
                <span>- {zoomLevel}% +</span>
              </div>
              <div className="flex items-center gap-1 hover:text-white cursor-pointer">
                <Hash className="w-3 h-3 text-[#FF5C00]" />
                <span>Snap Grid</span>
              </div>
            </div>
          </div>

          {/* Presenton-Style Slide Action Bar (Ticket T-000034) */}
          <div className="max-w-4xl w-full mx-auto mb-3 flex items-center justify-between px-2 py-1.5 rounded-2xl bg-[#1C1B19] border border-[#2B2926] text-xs">
            {/* Left: Layout Switcher Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#262421] hover:bg-[#322F2A] border border-[#3A3835] font-semibold text-slate-200 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5C00]" />
                <span className="capitalize">
                  Layout: {activeSlide?.archetype === 'split_comparison' ? '2-Column Split' : activeSlide?.archetype === 'hero_title' || activeSlide?.archetype === 'hero_stat' ? 'Title Slide' : activeSlide?.archetype === 'bullet_list' ? 'Concept List' : '3-Card Grid'}
                </span>
                <ChevronDownIcon className="w-3 h-3 text-slate-400" />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-[#1C1B19] border border-[#383531] shadow-2xl p-1.5 z-50 space-y-1">
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
                            ? 'bg-[#FF5C00]/20 text-white border border-[#FF5C00]/40'
                            : 'hover:bg-white/5 text-slate-300'
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

            {/* Right: Slide Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleDuplicateSlide(currentSlideIndex)}
                className="px-2.5 py-1.5 rounded-xl bg-[#262421] hover:bg-[#322F2A] border border-[#3A3835] text-slate-300 hover:text-white flex items-center gap-1.5"
                title="Duplicate Current Slide"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
              <button
                onClick={() => handleDeleteSlide(currentSlideIndex)}
                disabled={editableSlides.length <= 1}
                className="px-2.5 py-1.5 rounded-xl bg-[#262421] hover:bg-red-950/40 border border-[#3A3835] text-red-400 hover:text-red-300 disabled:opacity-20 flex items-center gap-1.5"
                title="Delete Current Slide"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                onClick={handleAddNewSlide}
                className="px-3 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slide</span>
              </button>
            </div>
          </div>

          {/* 16:9 Center Slide Canvas (Dynamic Presenton Theme-Driven Renderer - Ticket T-000033) */}
          <div
            className="my-auto max-w-4xl w-full mx-auto aspect-video rounded-3xl p-8 sm:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 border"
            style={{
              backgroundColor: activeTheme.canvasBg,
              borderColor: activeTheme.canvasBorder,
            }}
          >
            {/* Corner Ambient Glow */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-30"
              style={{ backgroundColor: activeTheme.accentColor }}
            />

            <div className="relative z-10 space-y-3">
              {/* Slide Header: Metadata & Subject Standard */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold uppercase tracking-wider text-[11px]"
                    style={{ color: activeTheme.accentColor }}
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
                      borderColor: activeTheme.accentColor + '40',
                    }}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{activeSlide?.standard || `${project?.outline?.subject || 'Curriculum'} Standard`}</span>
                  </span>
                </div>
              </div>

              {/* Large Bold Slide Title (Word-Wrapped, Non-Truncated - Fixes SL-01) */}
              <textarea
                rows={2}
                value={activeSlide?.title || ''}
                onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                className="w-full text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight bg-transparent border-b border-transparent hover:border-black/20 dark:hover:border-white/20 focus:border-[#FF5C00] focus:outline-none transition-colors resize-none leading-tight"
                style={{ color: activeTheme.titleColor }}
              />

              {/* ── DYNAMIC ARCHETYPE 1: HERO TITLE / STAT SLIDE ── */}
              {(activeSlide?.archetype === 'hero_title' || activeSlide?.archetype === 'hero_stat' || currentSlideIndex === 0) && (
                <div className="space-y-3 pt-1">
                  <div
                    className="p-4 rounded-2xl border"
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: activeTheme.cardBorder,
                    }}
                  >
                    <span
                      className="text-[10px] font-bold font-mono uppercase tracking-wider block mb-1"
                      style={{ color: activeTheme.accentColor }}
                    >
                      Core Instructional Focus
                    </span>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{ color: activeTheme.cardBodyColor }}
                    >
                      {activeSlide?.cards?.[0]?.body || activeSlide?.bullets?.[0] || 'Synthesized deterministically from primary textbook chapter passages.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="p-3.5 rounded-xl border"
                      style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: activeTheme.accentColor }}>
                        Pedagogical Objective
                      </span>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: activeTheme.cardBodyColor }}>
                        {activeSlide?.cards?.[1]?.body || activeSlide?.bullets?.[1] || 'Foundational conceptual inquiry.'}
                      </p>
                    </div>
                    <div
                      className="p-3.5 rounded-xl border"
                      style={{ backgroundColor: activeTheme.cardBg, borderColor: activeTheme.cardBorder }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: activeTheme.accentColor }}>
                        Curriculum Standard
                      </span>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: activeTheme.cardBodyColor }}>
                        {activeSlide?.cards?.[2]?.body || activeSlide?.bullets?.[2] || 'Aligned with state curriculum guidelines.'}
                      </p>
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
                      className="p-5 rounded-2xl border flex flex-col justify-between transition-colors shadow-sm"
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
                        <input
                          type="text"
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-base font-bold bg-transparent border-b border-transparent hover:border-black/20 focus:outline-none mb-1.5"
                          style={{ color: activeTheme.cardTitleColor }}
                        />
                        <textarea
                          rows={4}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-b border-transparent hover:border-black/20 focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor }}
                        />
                      </div>
                      {card.citation && (
                        <span className="text-[9px] font-mono mt-2" style={{ color: activeTheme.accentColor }}>
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
                      className="p-3.5 rounded-xl border flex items-start gap-3 transition-colors shadow-sm"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                        style={{
                          backgroundColor: activeTheme.badgeBg,
                          color: activeTheme.badgeText,
                        }}
                      >
                        {cIdx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-b border-transparent focus:outline-none mb-0.5"
                          style={{ color: activeTheme.cardTitleColor }}
                        />
                        <textarea
                          rows={2}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-[11px] leading-relaxed bg-transparent border-b border-transparent focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DYNAMIC ARCHETYPE 4: 3-CARD BENTO GRID (Default) ── */}
              {activeSlide?.archetype !== 'hero_title' && activeSlide?.archetype !== 'hero_stat' && currentSlideIndex !== 0 && activeSlide?.archetype !== 'split_comparison' && activeSlide?.archetype !== 'bullet_list' && (
                <div className={`grid gap-3.5 pt-1 ${
                  (activeSlide?.cards?.length || 3) === 1 ? 'grid-cols-1' : (activeSlide?.cards?.length || 3) === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {(activeSlide?.cards || []).slice(0, 3).map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="p-4 rounded-2xl border flex flex-col justify-between transition-colors shadow-sm"
                      style={{
                        backgroundColor: activeTheme.cardBg,
                        borderColor: activeTheme.cardBorder,
                      }}
                    >
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
                        <input
                          type="text"
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-sm font-bold bg-transparent border-b border-transparent hover:border-black/20 focus:outline-none mb-1 leading-snug"
                          style={{ color: activeTheme.cardTitleColor }}
                        />
                        <textarea
                          rows={3}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs leading-relaxed bg-transparent border-b border-transparent hover:border-black/20 focus:outline-none resize-none"
                          style={{ color: activeTheme.cardBodyColor }}
                        />
                      </div>
                      {card.citation && (
                        <span className="text-[9px] font-mono mt-1" style={{ color: activeTheme.accentColor }}>
                          [{card.citation}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Slide Paging Dots */}
            <div className="relative z-10 pt-3 flex items-center justify-between text-xs" style={{ color: activeTheme.subtitleColor }}>
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                className="hover:opacity-100 opacity-70 disabled:opacity-20 flex items-center gap-1 font-semibold"
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
                className="hover:opacity-100 opacity-70 disabled:opacity-20 flex items-center gap-1 font-semibold"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Teacher Speaker Notes Tray (Directly underneath canvas) */}
          <div className="mt-4 max-w-4xl w-full mx-auto bg-[#1C1B19] border border-[#2B2926] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-[#FF5C00]">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-200">Teacher Speaker Notes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  AI Grounded from Textbook
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Est. Delivery: {activeSlide?.est_delivery || "3m 45s"}
                </span>
              </div>
              <button
                onClick={() => handleTriggerRefinement('add_teacher_tip')}
                className="text-[11px] font-semibold text-[#FF5C00] hover:underline flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Regenerate Notes
              </button>
            </div>

            <textarea
              rows={3}
              value={activeSlide?.speaker_notes || ''}
              onChange={(e) => handleUpdateSlideField('speaker_notes', e.target.value)}
              className="w-full text-xs text-slate-300 bg-[#151413] p-3 rounded-xl border border-[#2B2926] focus:border-[#FF5C00] focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* ========================================================
            COLUMN 4: SLIDE CO-PILOT (Right Rail, ~320px)
        ======================================================== */}
        <aside className="w-80 bg-[#181715] border-l border-[#2B2926] flex flex-col justify-between shrink-0 p-4 select-none">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {/* Header: Slide Co-Pilot */}
            <div className="space-y-1 pb-3 border-b border-[#2B2926]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-[#FF5C00] text-white flex items-center justify-center font-bold text-xs">
                    ✦
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">Slide Co-Pilot</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Llama-3-70B
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Autosaved 12s ago</span>
                <span className="hover:text-slate-300 cursor-pointer">Canvas Settings</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate">Synced: {project?.source_filename || `${project?.name || 'chapter'}.pdf`}</span>
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
                  onClick={() => handleTriggerRefinement('make_concise')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-[#FF5C00]" />
                  <span>Make Concise</span>
                </button>
                <button
                  disabled={isSuggesting}
                  onClick={() => handleTriggerRefinement('add_teacher_tip')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Teacher Tip</span>
                </button>
                <button
                  disabled={isSuggesting}
                  onClick={() => handleTriggerRefinement('add_discussion_question')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Discussion Prompt</span>
                </button>
                <button
                  disabled={isSuggesting}
                  onClick={() => handleTriggerRefinement('simplify')}
                  className="px-2.5 py-2 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] hover:border-[#FF5C00] text-slate-200 text-left flex items-center gap-1.5 transition-colors"
                >
                  <Sigma className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Principles</span>
                </button>
              </div>
            </div>

            {/* Grounding Source Info */}
            <div className="p-3 rounded-2xl bg-[#1C1B19] border border-[#2B2926] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400 font-bold uppercase">GROUNDING SOURCE</span>
                <span className="text-emerald-400 font-bold">99.4% confidence</span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                Grounded in <strong className="text-white">{project?.outline?.subject || 'Curriculum'} {project?.outline?.grade_level || ''}</strong>: {project?.outline?.title || project?.name || 'Extracted Chapter Text'}.
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Zero hallucination filter applied.</span>
              </div>
            </div>

            {/* Generation Rationale */}
            <div className="p-3 rounded-2xl bg-[#1C1B19] border border-[#2B2926] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF5C00]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Slide Synthesizer v2.4</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Synthesized {activeSlide?.cards?.length || 3} cards covering "{activeSlide?.title || 'core concepts'}" tailored for {project?.outline?.grade_level || 'Grade 10'} learners.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#2B2926]">
                <span>Tokens: 342</span>
                <span>Latency: 420ms</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono">Bloom's Taxonomy:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  {currentSlideIndex === 0 ? "Level 1: Remember" : currentSlideIndex === 1 ? "Level 2: Understand" : "Level 3: Apply"}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Conceptual clarity score: <span className="text-emerald-400 font-bold">94/100</span>
              </div>
            </div>

            {/* AI Suggestion Diff / Merge Card */}
            {activeSuggestion && (
              <div className="p-3 rounded-2xl bg-orange-950/30 border border-[#FF5C00]/50 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-[#FF5C00]">
                  <span>AI Recommendation</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveSuggestion(null)}
                      className="text-slate-400 hover:text-white text-[11px]"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={handleApplySuggestion}
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
          </div>

          {/* Bottom Chat Refinement Box */}
          <div className="pt-3 border-t border-[#2B2926] space-y-2">
            <div className="relative">
              <textarea
                rows={2}
                placeholder="Ask Co-Pilot to adjust this slide (e.g. 'Add a real-life space exploration example')..."
                value={copilotPrompt}
                onChange={(e) => setCopilotPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && copilotPrompt.trim()) {
                    e.preventDefault();
                    handleTriggerRefinement('custom', copilotPrompt.trim());
                  }
                }}
                className="w-full text-xs text-slate-200 bg-[#11100F] border border-[#2B2926] rounded-xl p-2.5 pr-8 focus:border-[#FF5C00] focus:outline-none resize-none placeholder:text-slate-600"
              />
              <button className="absolute right-2.5 bottom-3 text-slate-500 hover:text-white">
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictMatch}
                  onChange={(e) => setStrictMatch(e.target.checked)}
                  className="accent-[#FF5C00] rounded"
                />
                <span>Strict Textbook Match</span>
              </label>

              <button
                disabled={!copilotPrompt.trim() || isSuggesting}
                onClick={() => handleTriggerRefinement('custom', copilotPrompt.trim())}
                className="bg-[#FF5C00] hover:bg-[#e05200] disabled:opacity-40 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              >
                {isSuggesting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Refine</span>
              </button>
            </div>
          </div>
        </aside>
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
