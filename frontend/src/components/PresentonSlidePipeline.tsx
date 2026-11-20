import React, { useState, useEffect } from 'react';
import {
  Artifact,
  ProjectManifest,
  SlideOutlineItem,
  SlideTemplateItem,
  generateSlideOutline,
  compileSlideFromOutline,
  fetchSlideTemplates,
} from '../api';
import { SlideStudioView } from './SlideStudioView';
import { MiniSlidePreview } from './MiniSlidePreview';
import { themes, ThemeProperties } from '../lib/presentonThemes';
import { loadGoogleFont } from '../lib/fontLoader';
import {
  ArrowLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  X,
  Check,
  Sparkles,
  GripVertical,
  Palette,
  CheckCircle2,
  Search,
} from 'lucide-react';

export type PipelineStep = 'input' | 'outline' | 'theme' | 'studio';

export interface PresentonSlidePipelineProps {
  project: ProjectManifest | null;
  initialPrompt?: string;
  initialArtifact?: Artifact | null;
  passages?: Record<string, string>;
  isDarkMode?: boolean;
  initialStep?: PipelineStep;
  onBack: () => void;
  onArtifactUpdated?: (art: Artifact) => void;
}

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  themeKey: string;
  previewBg: string;
  accentColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  isDark: boolean;
  tags: string[];
}

const MASTER_DESIGN_SYSTEMS = new Set([
  'editorial', 'verdant', 'horizon', 'nova', 'civic', 'executive',
  'landmark', 'momentum', 'dynamic', 'mosaic', 'pulse', 'signal',
  'standard', 'swift', 'modern', 'general'
]);

export const TEMPLATE_OPTIONS: TemplateOption[] = (Object.entries(themes) as [string, ThemeProperties][]).map(([key, t]) => ({
  id: key,
  name: t.name,
  description: t.description,
  themeKey: key,
  previewBg: t.background?.override || t.colors.background,
  accentColor: t.colors.accent || t.colors.primary,
  textColor: t.colors.text,
  headingFont: t.fonts.heading,
  bodyFont: t.fonts.body,
  isDark: t.mode === 'dark',
  tags: [
    t.mode === 'dark' ? 'Dark Mode' : 'Light Canvas',
    `${t.fonts.heading} / ${t.fonts.body}`,
    'Presenton Native',
  ],
}));

export const PresentonSlidePipeline: React.FC<PresentonSlidePipelineProps> = ({
  project,
  initialPrompt = '',
  initialArtifact = null,
  passages = {},
  isDarkMode: initialDarkMode = true,
  initialStep,
  onBack,
  onArtifactUpdated,
}) => {
  const [isDarkMode] = useState(initialDarkMode);

  // Determine starting step:
  // If an artifact already exists and no new prompt was passed, start in 'studio'
  // If prompt was passed, start in 'outline'
  const [currentStep, setCurrentStep] = useState<PipelineStep>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlStep = p.get('step') as PipelineStep;
      if (urlStep && ['input', 'outline', 'theme', 'studio'].includes(urlStep)) {
        return urlStep;
      }
    }
    if (initialStep) return initialStep;
    if (initialPrompt && initialPrompt.trim().length > 0) return 'outline';
    if (initialArtifact?.source_data?.slides?.length) return 'studio';
    return 'input';
  });

  // Step 1: Input & Configuration states
  const [promptText, setPromptText] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlPrompt = p.get('prompt');
      if (urlPrompt && urlPrompt.trim()) return urlPrompt.trim();
    }
    const raw = (initialPrompt || '').trim();
    if (raw && !['slides', 'slide', 'presentation', 'deck', 'ppt'].includes(raw.toLowerCase())) {
      return raw;
    }
    return project?.outline?.title || project?.name || '';
  });
  const [slideCount, setSlideCount] = useState<number>(6);
  const [language, setLanguage] = useState<string>('en');

  // Step 2: Outline states
  const [outlines, setOutlines] = useState<SlideOutlineItem[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // Step 3: Theme selection with 16 Presenton templates
  const [templates, setTemplates] = useState<SlideTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('verdant');
  const [themeFilter, setThemeFilter] = useState<'all' | 'packs' | 'palettes' | 'dark' | 'light'>('all');
  const [themeSearch, setThemeSearch] = useState<string>('');
  const [useRealPreviewContent, setUseRealPreviewContent] = useState<boolean>(true);

  // Fetch dynamic templates from Presenton service
  useEffect(() => {
    let mounted = true;
    fetchSlideTemplates().then((tpls) => {
      if (mounted && tpls && tpls.length > 0) {
        setTemplates(tpls);
        // Default to verdant, or fallback
        if (!selectedTemplateId || selectedTemplateId === 'tpl-solar') {
          setSelectedTemplateId(tpls[0].id);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Step 4: Compiled Slide Artifact & Compilation loading
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(initialArtifact);
  const [isCompiling, setIsCompiling] = useState(false);

  // Automatically trigger outline generation when entering 'outline' step without outlines
  useEffect(() => {
    if (currentStep === 'outline' && outlines.length === 0 && project) {
      handleGenerateOutline();
    }
  }, [currentStep, project?.project_id]);

  // Generate Outline API call with active LLM synthesis
  const handleGenerateOutline = async () => {
    if (!project) return;
    const cleanRaw = promptText.trim();
    const effectivePrompt =
      cleanRaw && !['slides', 'slide', 'presentation', 'deck', 'ppt'].includes(cleanRaw.toLowerCase())
        ? cleanRaw
        : project.outline?.title || project.name || 'Lesson Presentation';

    setIsGeneratingOutline(true);
    try {
      const res = await generateSlideOutline(project.project_id, effectivePrompt, slideCount, language);
      setOutlines(res.outlines);
      if (res.prompt && !['slides', 'slide'].includes(res.prompt.toLowerCase())) {
        setPromptText(res.prompt);
      }
    } catch (err) {
      console.error('Failed to generate outline:', err);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Compile Presentation from Outline API call
  const handleCompilePresentation = async () => {
    if (!project || outlines.length === 0) return;
    setIsCompiling(true);
    try {
      const chosenTemplate = templates.find((t) => t.id === selectedTemplateId) || TEMPLATE_OPTIONS.find((t) => t.id === selectedTemplateId);
      const themeKey = chosenTemplate ? (chosenTemplate.themeKey || chosenTemplate.id) : selectedTemplateId;
      const compiled = await compileSlideFromOutline(
        project.project_id,
        outlines,
        themeKey,
        currentArtifact?.id,
        'smart_dual',
        themeKey
      );
      setCurrentArtifact(compiled);
      if (onArtifactUpdated) onArtifactUpdated(compiled);
      setCurrentStep('studio');
    } catch (err) {
      console.error('Failed to compile presentation:', err);
      alert('Failed to generate presentation slides. Please try again.');
    } finally {
      setIsCompiling(false);
    }
  };

  // Outline manipulation handlers
  const handleUpdateOutlineTitle = (index: number, newTitle: string) => {
    setOutlines((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], title: newTitle };
      }
      return next;
    });
  };

  // Bullet item controls: Add and Delete
  const handleAddOutlineBullet = (slideIdx: number) => {
    setOutlines((prev) => {
      const next = [...prev];
      if (next[slideIdx]) {
        const bullets = [...next[slideIdx].bullets, 'New key concept checkpoint'];
        next[slideIdx] = {
          ...next[slideIdx],
          bullets,
          content: `### ${next[slideIdx].title}\n` + bullets.map((b) => `- ${b}`).join('\n'),
        };
      }
      return next;
    });
  };

  const handleDeleteOutlineBullet = (slideIdx: number, bulletIdx: number) => {
    setOutlines((prev) => {
      const next = [...prev];
      if (next[slideIdx] && next[slideIdx].bullets.length > 1) {
        const bullets = next[slideIdx].bullets.filter((_, i) => i !== bulletIdx);
        next[slideIdx] = {
          ...next[slideIdx],
          bullets,
          content: `### ${next[slideIdx].title}\n` + bullets.map((b) => `- ${b}`).join('\n'),
        };
      }
      return next;
    });
  };

  const handleUpdateOutlineBullet = (slideIdx: number, bulletIdx: number, text: string) => {
    setOutlines((prev) => {
      const next = [...prev];
      if (next[slideIdx]) {
        const bullets = [...next[slideIdx].bullets];
        bullets[bulletIdx] = text;
        next[slideIdx] = {
          ...next[slideIdx],
          bullets,
          content: `### ${next[slideIdx].title}\n` + bullets.map((b) => `- ${b}`).join('\n'),
        };
      }
      return next;
    });
  };

  const handleAddSlide = () => {
    const nextNum = outlines.length + 1;
    const newSlide: SlideOutlineItem = {
      id: Math.random().toString(36).substring(2, 9),
      slide_number: nextNum,
      title: 'New Analytical Concept',
      content: '### New Analytical Concept\n- Foundational definition from chapter\n- Mathematical formulation and proof\n- Real-world observation and exercise',
      bullets: [
        'Foundational definition from chapter',
        'Mathematical formulation and proof',
        'Real-world observation and exercise',
      ],
    };
    setOutlines((prev) => [...prev, newSlide]);
  };

  const handleDeleteSlide = (index: number) => {
    if (outlines.length <= 1) return;
    setOutlines((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, idx) => ({ ...item, slide_number: idx + 1 }));
    });
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= outlines.length) return;
    setOutlines((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((item, idx) => ({ ...item, slide_number: idx + 1 }));
    });
  };

  // =========================================================================
  // STEP 4: RENDER SLIDE STUDIO WORKSPACE DIRECTLY
  // =========================================================================
  if (currentStep === 'studio') {
    return (
      <div className="relative h-screen w-screen overflow-hidden flex flex-col">
        {/* Subtle sub-header banner linking back to the pipeline steps */}
        <div className="h-7 bg-[#11100F] border-b border-[#2B2926] px-4 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>PRESENTATION PIPELINE:</span>
            <button
              onClick={() => setCurrentStep('input')}
              className="hover:text-white transition-colors"
            >
              1. Input
            </button>
            <span>›</span>
            <button
              onClick={() => setCurrentStep('outline')}
              className="hover:text-[#FF5C00] font-semibold transition-colors"
            >
              2. Outline ({outlines.length || currentArtifact?.source_data?.slides?.length || 6} Slides)
            </button>
            <span>›</span>
            <button
              onClick={() => setCurrentStep('theme')}
              className="hover:text-[#FF5C00] font-semibold transition-colors"
            >
              3. Theme & Layout
            </button>
            <span>›</span>
            <span className="text-[#FF5C00] font-bold">4. Studio Active</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStep('outline')}
              className="text-[#FF5C00] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>← Edit Full Outline</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <SlideStudioView
            project={project}
            artifact={currentArtifact}
            passages={passages}
            isDarkMode={isDarkMode}
            onBack={onBack}
            onArtifactUpdated={(updated) => {
              setCurrentArtifact(updated);
              if (onArtifactUpdated) onArtifactUpdated(updated);
            }}
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEPS 1-3 PIPELINE SHELL (Exact Presenton Pipeline Design)
  // =========================================================================
  return (
    <div
      className={`min-h-screen w-screen flex flex-col font-sans select-none overflow-x-hidden ${
        isDarkMode ? 'bg-[#151413] text-[#F5F2EB]' : 'bg-[#FAF7F2] text-[#18181B]'
      }`}
    >
      {/* 1. PIPELINE STANDARD HEADER */}
      <header
        className={`h-16 px-6 border-b flex items-center justify-between shrink-0 sticky top-0 z-30 ${
          isDarkMode ? 'bg-[#181715] border-[#2B2926]' : 'bg-white border-[#E8E2D8]'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (currentStep === 'outline') setCurrentStep('input');
              else if (currentStep === 'theme') setCurrentStep('outline');
              else onBack();
            }}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode
                ? 'bg-[#23211F] border-[#32302C] text-slate-300 hover:text-white hover:bg-[#2F2C28]'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black hover:bg-slate-200'
            }`}
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-sm font-bold truncate max-w-xs sm:max-w-md ml-1">
            {currentStep === 'input' && '1. Presentation Input & Brief'}
            {currentStep === 'outline' && '2. Outline Review & Agenda'}
            {currentStep === 'theme' && '3. Template & Visual Palette'}
          </h1>
        </div>

        {/* Pipeline Step Breadcrumb Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
          {[
            { step: 'input', label: '1. Input' },
            { step: 'outline', label: '2. Outline' },
            { step: 'theme', label: '3. Template' },
            { step: 'studio', label: '4. Studio' },
          ].map((item, idx) => {
            const isCurrent = currentStep === item.step;
            return (
              <React.Fragment key={item.step}>
                {idx > 0 && <span className="text-slate-500">›</span>}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                    isCurrent
                      ? 'bg-[#FF5C00] text-white shadow-sm'
                      : 'text-slate-400 bg-black/10 dark:bg-white/5'
                  }`}
                >
                  {item.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          {currentArtifact && (
            <button
              onClick={() => setCurrentStep('studio')}
              className="text-xs font-semibold text-[#FF5C00] hover:underline"
            >
              Open Studio →
            </button>
          )}
        </div>
      </header>

      {/* =====================================================================
          STEP 1: PRESENTATION INPUT & BRIEF (Upload / Prompt / Settings)
      ===================================================================== */}
      {currentStep === 'input' && (
        <main className="max-w-3xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center space-y-8">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 1 of 4 · Context Setup</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              What do you want to <span className="text-[#FF5C00]">Present</span>?
            </h2>
            <p className={`text-sm max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Input your teaching topic or chapter concept. OMNIX will generate a structured outline for your review.
            </p>
          </div>

          <div
            className={`p-6 rounded-3xl border shadow-xl space-y-6 ${
              isDarkMode ? 'bg-[#181715] border-[#2B2926]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            {/* Chapter context badge */}
            {project && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">Grounded in Chapter:</span>
                  <span className="font-medium text-slate-300 truncate max-w-xs">{project.name}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-500">
                  {Object.keys(passages).length} Passages Extracted
                </span>
              </div>
            )}

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Instructional Focus or Lecture Topic
              </label>
              <textarea
                rows={3}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={project?.outline?.title ? `e.g. In-depth lecture module on ${project.outline.title}...` : "e.g. Foundational principles, key mechanisms, and real-world applications..."}
                className={`w-full p-4 rounded-2xl border text-sm focus:outline-none transition-all ${
                  isDarkMode
                    ? 'bg-[#151413] border-[#32302C] text-white focus:border-[#FF5C00]'
                    : 'bg-[#FAF7F2] border-[#E8E2D8] text-black focus:border-[#FF5C00]'
                }`}
              />
            </div>

            {/* Slide Count Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Number of Slides
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[4, 6, 8, 10, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSlideCount(num)}
                    className={`py-2.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                      slideCount === num
                        ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-md'
                        : isDarkMode
                        ? 'bg-[#23211F] border-[#32302C] text-slate-300 hover:border-slate-500'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {num} Slides
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Instructional Language
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'Hindi' },
                  { code: 'ta', label: 'Tamil' },
                  { code: 'te', label: 'Telugu' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                      language === lang.code
                        ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-md'
                        : isDarkMode
                        ? 'bg-[#23211F] border-[#32302C] text-slate-300 hover:border-slate-500'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button: Generate Outline */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setCurrentStep('outline');
                  handleGenerateOutline();
                }}
                className="w-full py-4 rounded-2xl bg-[#FF5C00] hover:bg-[#e05200] active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
              >
                <span>Generate Structured Outline</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          STEP 2: OUTLINE REVIEW & REORDER (Exact Presenton Outline Stage)
      ===================================================================== */}
      {currentStep === 'outline' && (
        <main className="max-w-4xl w-full mx-auto px-6 py-8 pb-32 space-y-6 flex-1">
          {/* Top Prompt Configuration Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${
              isDarkMode ? 'bg-[#181715] border-[#2B2926]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <div className="flex-1 w-full">
              <span className="text-[10px] font-mono font-bold uppercase text-[#FF5C00] tracking-wider block mb-1">
                Active Outline Prompt
              </span>
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateOutline()}
                placeholder="Adjust topic and regenerate outline..."
                className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                  isDarkMode ? 'text-white' : 'text-black'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-[#23211F] px-2.5 py-1.5 rounded-xl border border-[#32302C] text-xs font-mono text-slate-300">
                <span>{outlines.length} slides</span>
              </div>

              <button
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline}
                className="px-3 py-1.5 rounded-xl bg-[#23211F] hover:bg-[#2F2C28] border border-[#32302C] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                title="Regenerate outline with current prompt"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isGeneratingOutline ? 'animate-spin text-[#FF5C00]' : ''}`} />
                <span>{isGeneratingOutline ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>

          {/* Outline Cards Stream */}
          {isGeneratingOutline && outlines.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-[#FF5C00] animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-400">
                Synthesizing structured presentation outline from chapter passages...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
                <span>Review, edit, or reorder slide topics before choosing a template:</span>
                <span>{outlines.length} Slides Planned</span>
              </div>

              {outlines.map((item, idx) => {
                const formattedNum = String(idx + 1).padStart(2, '0');
                const isFirst = idx === 0;
                const isLast = idx === outlines.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`group relative p-5 rounded-2xl border transition-all ${
                      isDarkMode
                        ? 'bg-[#181715] border-[#2B2926] hover:border-slate-500 shadow-md'
                        : 'bg-white border-[#E8E2D8] hover:border-slate-400 shadow-sm'
                    }`}
                  >
                    {/* Header: Slide Number, Drag Handle, Move & Delete Actions */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-500 opacity-60" />
                        <span className="px-2 py-0.5 rounded-lg bg-[#FF5C00]/15 text-[#FF5C00] font-mono text-xs font-bold border border-[#FF5C00]/30">
                          SLIDE {formattedNum}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-slate-500">
                          {isFirst ? 'Title Module' : isLast ? 'Summary Checkpoint' : 'Concept Section'}
                        </span>
                      </div>

                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={() => handleMoveSlide(idx, 'up')}
                          disabled={isFirst}
                          className="p-1 rounded hover:text-white disabled:opacity-20 transition-colors"
                          title="Move Slide Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveSlide(idx, 'down')}
                          disabled={isLast}
                          className="p-1 rounded hover:text-white disabled:opacity-20 transition-colors"
                          title="Move Slide Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlide(idx)}
                          className="p-1 rounded text-red-400/80 hover:text-red-400 transition-colors ml-1"
                          title="Delete Slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Editable Slide Title */}
                    <div className="mb-3">
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Slide Heading
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateOutlineTitle(idx, e.target.value)}
                        className={`w-full bg-transparent font-bold text-base sm:text-lg focus:outline-none focus:border-b border-[#FF5C00] pb-0.5 ${
                          isDarkMode ? 'text-white' : 'text-black'
                        }`}
                      />
                    </div>

                    {/* Bullet Points List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-slate-500 block">
                          Core Key Points & Grounding
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOutlineBullet(idx)}
                          className="text-[10px] font-bold text-[#FF5C00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Key Point</span>
                        </button>
                      </div>
                      {item.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2 group/bullet">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] shrink-0" />
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => handleUpdateOutlineBullet(idx, bIdx, e.target.value)}
                            className={`flex-1 bg-transparent text-xs sm:text-sm focus:outline-none focus:border-b border-[#FF5C00]/50 py-0.5 ${
                              isDarkMode ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          />
                          {item.bullets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOutlineBullet(idx, bIdx)}
                              className="opacity-0 group-hover/bullet:opacity-100 text-slate-400 hover:text-red-400 p-0.5 transition-opacity"
                              title="Delete this point"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Add New Slide Button */}
              <button
                onClick={handleAddSlide}
                className="w-full py-3 rounded-2xl border border-dashed border-[#FF5C00]/50 hover:border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Slide to Outline</span>
              </button>
            </div>
          )}

          {/* Floating Bottom Action Dock: Back & Next */}
          <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
            <div className={`pointer-events-auto flex items-center gap-2 p-1.5 pl-3 rounded-full border shadow-2xl backdrop-blur-xl transition-all ${
              isDarkMode
                ? 'bg-[#181715]/90 border-white/10 text-white shadow-black/50'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-900/10'
            }`}>
              <button
                onClick={() => setCurrentStep('input')}
                className={`px-3.5 py-2 rounded-full font-semibold text-xs tracking-tight flex items-center gap-1.5 transition-colors ${
                  isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-black hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Brief</span>
              </button>

              <div className={`h-4 w-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

              <button
                onClick={() => setCurrentStep('theme')}
                disabled={outlines.length === 0}
                className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-2 bg-[#FF5C00] hover:bg-[#e05200] active:scale-95 shadow-md shadow-orange-500/25 transition-all disabled:opacity-50"
              >
                <span>Next: Choose Template ({outlines.length} Slides)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          STEP 3: TEMPLATE & THEME SELECTION (Exact Presenton Template Stage)
      ===================================================================== */}
      {currentStep === 'theme' && (
        <main className="max-w-4xl w-full mx-auto px-6 py-10 pb-32 space-y-8 flex-1">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20 mb-2">
              <Palette className="w-3.5 h-3.5" />
              <span>Step 3 of 4 · Design System & Typography</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Select Your <span className="text-[#FF5C00]">Visual Palette</span>
            </h2>
            <p className={`text-sm max-w-lg mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              38 official Presenton production themes with paired Google Web Fonts, custom radial gradients, and smart layout palettes.
            </p>

            {/* Filter Pills and Search */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <div className="flex items-center p-1 rounded-xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-semibold">
                <button
                  onClick={() => setThemeFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${themeFilter === 'all' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  All ({TEMPLATE_OPTIONS.length})
                </button>
                <button
                  onClick={() => setThemeFilter('packs')}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${themeFilter === 'packs' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  <span>🏛️ Design Systems (16)</span>
                </button>
                <button
                  onClick={() => setThemeFilter('palettes')}
                  className={`px-3 py-1 rounded-lg transition-colors ${themeFilter === 'palettes' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  🎨 Palettes
                </button>
                <button
                  onClick={() => setThemeFilter('dark')}
                  className={`px-3 py-1 rounded-lg transition-colors ${themeFilter === 'dark' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setThemeFilter('light')}
                  className={`px-3 py-1 rounded-lg transition-colors ${themeFilter === 'light' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  Light
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by theme or font..."
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF5C00] w-48 sm:w-56"
                />
              </div>

              {/* Content Mode Toggle */}
              <button
                type="button"
                onClick={() => setUseRealPreviewContent(!useRealPreviewContent)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  useRealPreviewContent
                    ? 'bg-[#FF5C00]/20 border-[#FF5C00]/60 text-[#FF5C00]'
                    : 'bg-black/10 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Toggle between live chapter content preview and theme style"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{useRealPreviewContent ? 'Preview: My Content' : 'Preview: Sample Style'}</span>
              </button>
            </div>
          </div>

          {/* Template Cards Grid: All 53 Master Design Systems and Palettes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATE_OPTIONS.filter((t) => {
              if (themeFilter === 'packs' && !MASTER_DESIGN_SYSTEMS.has(t.id)) return false;
              if (themeFilter === 'palettes' && MASTER_DESIGN_SYSTEMS.has(t.id)) return false;
              if (themeFilter === 'dark' && !t.isDark) return false;
              if (themeFilter === 'light' && t.isDark) return false;
              if (themeSearch.trim()) {
                const q = themeSearch.toLowerCase();
                return t.name.toLowerCase().includes(q) ||
                       t.headingFont.toLowerCase().includes(q) ||
                       t.bodyFont.toLowerCase().includes(q) ||
                       t.description.toLowerCase().includes(q);
              }
              return true;
            }).map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              const isMasterPack = MASTER_DESIGN_SYSTEMS.has(tpl.id);
              // Preload Google Fonts for preview
              loadGoogleFont(tpl.headingFont);
              loadGoogleFont(tpl.bodyFont);

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`group relative p-4 rounded-3xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#FF5C00] ring-2 ring-[#FF5C00] shadow-xl shadow-orange-950/20'
                      : isDarkMode
                      ? 'bg-[#181715] border-[#2B2926] hover:border-slate-500'
                      : 'bg-white border-[#E8E2D8] hover:border-slate-400'
                  }`}
                  style={{
                    backgroundColor: isDarkMode ? '#181715' : '#FFFFFF',
                  }}
                >
                  {/* Official Rendered Design System Thumbnail or Dynamic Mini-Canvas */}
                  {isMasterPack ? (
                    <div className="w-full aspect-video rounded-2xl mb-3 border overflow-hidden relative shadow-md bg-black/40 border-black/10 dark:border-white/10 group-hover:scale-[1.02] transition-transform">
                      <img
                        src={`/templates/${tpl.id}/static/thumbnail.png`}
                        alt={tpl.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-[#FF5C00]">
                        🏛️ 16:9 Design System
                      </div>
                    </div>
                  ) : (
                    <MiniSlidePreview
                      slideTitle={outlines[0]?.title || project?.name || 'Lesson Presentation'}
                      slideSubtitle={project?.outline?.subject ? `${project.outline.subject.toUpperCase()} • GRADE 10` : 'FOUNDATIONAL PRINCIPLES • CURRICULUM MODULE'}
                      bullets={outlines[0]?.bullets || []}
                      themeProperties={(themes as Record<string, ThemeProperties>)[tpl.id]}
                      themeName={tpl.name}
                      previewBg={tpl.previewBg}
                      accentColor={tpl.accentColor}
                      headingFont={tpl.headingFont}
                      bodyFont={tpl.bodyFont}
                      textColor={tpl.textColor}
                      isDark={tpl.isDark}
                      useRealContent={useRealPreviewContent}
                    />
                  )}

                  {/* Template Meta Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold flex items-center gap-2">
                        <span>{tpl.name}</span>
                        {isMasterPack && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] font-mono font-bold">
                            🏛️ Design System
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] text-[10px] font-mono font-bold">
                            Selected
                          </span>
                        )}
                      </h4>
                      <p className={`text-xs mt-1 line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {tpl.headingFont} & {tpl.bodyFont}
                      </p>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#FF5C00] border-[#FF5C00] text-white'
                          : 'border-slate-500/40 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  {/* Tags */}
                  {tpl.tags && tpl.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/5">
                      {tpl.tags.map((tag: string, tIdx: number) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Bottom Action Dock: Back & Generate */}
          <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
            <div className={`pointer-events-auto flex items-center gap-2 p-1.5 pl-3 rounded-full border shadow-2xl backdrop-blur-xl transition-all ${
              isDarkMode
                ? 'bg-[#181715]/90 border-white/10 text-white shadow-black/50'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-900/10'
            }`}>
              <button
                onClick={() => setCurrentStep('outline')}
                className={`px-3.5 py-2 rounded-full font-semibold text-xs tracking-tight flex items-center gap-1.5 transition-colors ${
                  isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-black hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Outline</span>
              </button>

              <div className={`h-4 w-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

              <button
                onClick={handleCompilePresentation}
                disabled={isCompiling}
                className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-2 bg-[#FF5C00] hover:bg-[#e05200] active:scale-95 shadow-md shadow-orange-500/25 transition-all disabled:opacity-50"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Compiling 16:9 Presentation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Presentation ({outlines.length} Slides)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
