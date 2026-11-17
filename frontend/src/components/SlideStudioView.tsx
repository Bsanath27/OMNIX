import React, { useState, useEffect } from 'react';
import {
  Artifact,
  ProjectManifest,
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
} from 'lucide-react';

interface SlideStudioViewProps {
  project: ProjectManifest | null;
  artifact: Artifact | null;
  passages?: Record<string, string>;
  isDarkMode?: boolean;
  onBack: () => void;
  onArtifactUpdated?: (art: Artifact) => void;
}

export const SlideStudioView: React.FC<SlideStudioViewProps> = ({
  project,
  artifact: initialArtifact,
  passages: _passages = {},
  isDarkMode: initialDarkMode = true,
  onBack,
  onArtifactUpdated,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [themeStyle, setThemeStyle] = useState<'solar' | 'midnight'>('solar');
  const [activeRailTab, setActiveRailTab] = useState<'outline' | 'source' | 'prompt' | 'assets' | 'assessments'>('outline');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Slides data
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(initialArtifact);
  const [editableSlides, setEditableSlides] = useState<any[]>(() => {
    if (initialArtifact?.source_data?.slides?.length) {
      return JSON.parse(JSON.stringify(initialArtifact.source_data.slides));
    }
    // Default curriculum slide set if empty
    return [
      {
        slide_number: 1,
        title: "Newton's First Law: Physical Inertia",
        subtitle: "PHYSICS · GRADE 11 · UNIT 03: DYNAMICS",
        badge: "LAW I",
        postulate: "FUNDAMENTAL POSTULATE",
        standard: "NCERT Standard P88",
        archetype: "card_grid_3",
        cards: [
          {
            badge: "Principle",
            title: "State of Rest",
            body: "A body continues in its state of rest unless acted upon by an external unbalanced force.",
            citation: "P01-S01",
          },
          {
            badge: "Dynamics",
            title: "Uniform Motion",
            body: "Maintains constant velocity along a straight line in the absence of net external influence.",
            citation: "P01-S02",
          },
          {
            badge: "Measure",
            title: "Mass as Inertia",
            body: "Inertia is an intrinsic property of matter; mass is the quantitative measure of inertia.",
            citation: "P01-S03",
          },
        ],
        speaker_notes:
          "Pedagogical Opening Strategy: Start by demonstrating Galileo's friction-free double-ramp thought experiment before writing mathematical formulas. Explicitly warn students about the common misconception that 'inertia is a force', emphasize it is an intrinsic measure of mass. Engage the class by asking why standing passengers lurch forward during sudden vehicle braking.",
        est_delivery: "3m 45s",
      },
      {
        slide_number: 2,
        title: "Momentum Derivations & Invariance",
        subtitle: "PHYSICS · GRADE 11 · VECTOR FORMULATION",
        badge: "EQUATION",
        postulate: "RATE OF CHANGE",
        standard: "NCERT Standard P90",
        archetype: "hero_stat",
        cards: [
          {
            badge: "Newtonian Flux",
            stat: "F = dp / dt",
            title: "Linear Momentum Conservation",
            body: "In the absence of external net forces, the total momentum vector of an isolated system remains strictly invariant.",
            citation: "P01-S04",
          },
        ],
        speaker_notes:
          "Walk students through vector decomposition. Emphasize that momentum is a vector quantity and directional signs matter in 2D collision calculations.",
        est_delivery: "4m 10s",
      },
      {
        slide_number: 3,
        title: "Galileo's Inclined Plane Experiment",
        subtitle: "PHYSICS · HISTORICAL THOUGHT EXPERIMENT",
        badge: "EXPERIMENT",
        postulate: "LIMITING MECHANISM",
        standard: "NCERT Standard P91",
        archetype: "split_comparison",
        cards: [
          {
            badge: "Downward Roll",
            title: "Acceleration Phase",
            body: "A sphere rolling down an inclined plane gains velocity continuously due to gravity.",
            citation: "P01-S05",
          },
          {
            badge: "Horizontal Plane",
            title: "Infinite Trajectory",
            body: "On a frictionless horizontal surface, the sphere would neither speed up nor slow down, proceeding infinitely.",
            citation: "P01-S06",
          },
        ],
        speaker_notes:
          "Highlight Galileo's departure from Aristotelian physics. Aristotle believed constant force was required for continuous motion; Galileo proved force changes motion.",
        est_delivery: "3m 30s",
      },
      {
        slide_number: 4,
        title: "Balanced vs. Unbalanced Forces",
        subtitle: "PHYSICS · GRADE 11 · EQUILIBRIUM",
        badge: "EQUILIBRIUM",
        postulate: "RESULTANT VECTOR",
        standard: "NCERT Standard P92",
        archetype: "card_grid_3",
        cards: [
          {
            badge: "Net Force = 0",
            title: "Translational Equilibrium",
            body: "Opposing forces cancel out exactly; acceleration is zero (velocity is constant).",
          },
          {
            badge: "Net Force ≠ 0",
            title: "Accelerated Dynamics",
            body: "Non-zero resultant force induces acceleration inversely proportional to mass.",
          },
        ],
        speaker_notes:
          "Draw free body diagrams (FBD) on the blackboard before asking students to solve textbook numerical example 5.1.",
        est_delivery: "4m 00s",
      },
      {
        slide_number: 5,
        title: "Inertia in Vehicles & Daily Phenomena",
        subtitle: "PHYSICS · REAL-WORLD OBSERVATIONS",
        badge: "OBSERVATION",
        postulate: "EVERYDAY DYNAMICS",
        standard: "NCERT Standard P93",
        archetype: "card_grid_3",
        cards: [
          {
            badge: "Inertia of Rest",
            title: "Sudden Vehicle Start",
            body: "Feet move forward with the bus floor while the upper torso tends to remain at rest, causing backward pitch.",
          },
          {
            badge: "Inertia of Motion",
            title: "Sudden Braking",
            body: "Vehicle halts while passenger's upper body continues forward trajectory until restrained by seatbelts.",
          },
        ],
        speaker_notes:
          "Relate this to automotive safety standards: Explain why headrests and seatbelts are essential physical safeguards against whiplash.",
        est_delivery: "3m 15s",
      },
      {
        slide_number: 6,
        title: "Summary & Classroom Checkpoint",
        subtitle: "PHYSICS · GRADE 11 · FORMATIVE ASSESSMENT",
        badge: "REVIEW",
        postulate: "CORE TAKEAWAYS",
        standard: "NCERT Standard P94",
        archetype: "key_takeaways",
        cards: [
          {
            badge: "Takeaway 1",
            title: "Inertia is Mass",
            body: "Heavier bodies require greater external net force to alter their velocity.",
          },
          {
            badge: "Takeaway 2",
            title: "Equilibrium Principle",
            body: "Rest and uniform rectilinear motion are physically equivalent inertial states.",
          },
        ],
        speaker_notes:
          "Give students 4 minutes to attempt the 3 formative checkpoint questions before conducting the live quiz.",
        est_delivery: "5m 00s",
      },
    ];
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
    }
  }, [initialArtifact]);

  const activeSlide = editableSlides[currentSlideIndex] || editableSlides[0];

  // Slide modification handlers
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
    const newSlide = {
      slide_number: editableSlides.length + 1,
      title: "New Concept Presentation",
      subtitle: "PHYSICS · GRADE 11 · LECTURE MODULE",
      badge: "CONCEPT",
      postulate: "KEY POSTULATE",
      standard: "NCERT Standard",
      archetype: "card_grid_3",
      cards: [
        { badge: "Part 1", title: "Primary Mechanism", body: "Concise description of the foundational concept." },
        { badge: "Part 2", title: "Observable Result", body: "Classroom observation and experimental proof." },
      ],
      speaker_notes: "Guide students through the physical intuition before showing the mathematical derivations.",
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
        theme: themeStyle === 'solar' ? 'col_blue' : 'midnight_tech',
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
            <span>Grade 11 Physics</span>
            <span>›</span>
            <span className="text-slate-200 font-semibold truncate max-w-xs">
              {project?.name || "Chapter 1: Newton's Laws of Motion"}
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

          {/* Theme Palette Toggle */}
          <div className="p-0.5 rounded-lg bg-[#23211F] border border-[#32302C] flex items-center text-[11px]">
            <button
              onClick={() => setThemeStyle('solar')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                themeStyle === 'solar' ? 'bg-[#FF5C00] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Solar Obsidian
            </button>
            <button
              onClick={() => setThemeStyle('midnight')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                themeStyle === 'midnight' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Midnight Minimal
            </button>
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

                    {/* Miniature visual wireframe preview */}
                    <div className="h-16 w-full rounded-xl bg-[#11100F] border border-white/5 p-2 flex flex-col justify-between overflow-hidden">
                      <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono">
                        <span>PHYSICS · U03</span>
                        <span className="text-emerald-500">VERIFIED</span>
                      </div>
                      <div className="w-3/4 h-1 rounded bg-[#FF5C00] opacity-80" />
                      <div className="grid grid-cols-3 gap-1">
                        <div className="h-4 rounded bg-white/10" />
                        <div className="h-4 rounded bg-white/10" />
                        <div className="h-4 rounded bg-white/10" />
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
                CURRICULUM MODE · PHYSICS 11
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-[11px] font-mono">
                NCERT Syllabus 2024-25 Grounding Sync: Stable
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

          {/* 16:9 Center Slide Canvas (Rendered with high typography fidelity) */}
          <div className="my-auto max-w-4xl w-full mx-auto aspect-video bg-[#18181B] border border-white/10 rounded-3xl p-8 sm:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300">
            {/* Atmospheric Lighting in Corners */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            <div className="relative z-10 space-y-4">
              {/* Metadata tags */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">
                    {activeSlide?.subtitle || "PHYSICS · GRADE 11 · UNIT 03: DYNAMICS"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">
                    SLIDE {String(currentSlideIndex + 1).padStart(2, '0')} / {String(editableSlides.length).padStart(2, '0')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>NCERT Standard P88</span>
                  </span>
                </div>
              </div>

              {/* Law Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#FF5C00] text-white font-bold text-[10px] tracking-wider uppercase">
                  {activeSlide?.badge || "LAW I"}
                </span>
                <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
                  {activeSlide?.postulate || "FUNDAMENTAL POSTULATE"}
                </span>
              </div>

              {/* Large Bold Slide Title (Click to Edit) */}
              <input
                type="text"
                value={activeSlide?.title || ''}
                onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                className="w-full text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#FF5C00] focus:outline-none transition-colors"
              />

              {/* Bento Cards Layout Archetype */}
              {activeSlide?.cards && (
                <div className={`grid gap-4 pt-3 ${
                  activeSlide.cards.length === 1 ? 'grid-cols-1' : activeSlide.cards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {activeSlide.cards.map((card: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="bg-slate-900/90 border border-slate-700/80 hover:border-[#FF5C00]/50 rounded-2xl p-4 flex flex-col justify-between transition-colors shadow-sm"
                    >
                      <div>
                        {card.badge && (
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded mb-2 font-mono">
                            {card.badge}
                          </span>
                        )}
                        {card.stat && (
                          <div className="text-3xl font-black text-[#FF5C00] font-mono my-1">{card.stat}</div>
                        )}
                        <input
                          type="text"
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'title', e.target.value)}
                          className="w-full text-sm font-bold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-600 focus:outline-none mb-1"
                        />
                        <textarea
                          rows={3}
                          value={card.body || ''}
                          onChange={(e) => handleUpdateCardField(cIdx, 'body', e.target.value)}
                          className="w-full text-xs text-slate-300 leading-relaxed bg-transparent border-b border-transparent hover:border-slate-600 focus:outline-none resize-none"
                        />
                      </div>
                      {card.citation && (
                        <span className="text-[9px] font-mono text-emerald-400 mt-2">
                          [{card.citation}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Slide Paging Dots */}
            <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-500">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                className="hover:text-white disabled:opacity-20 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <div className="flex items-center gap-1.5">
                {editableSlides.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                      i === currentSlideIndex ? 'bg-[#FF5C00] scale-125' : 'bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
              <button
                disabled={currentSlideIndex === editableSlides.length - 1}
                onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                className="hover:text-white disabled:opacity-20 flex items-center gap-1"
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
                <span className="truncate">Synced: {project?.source_filename || "Chapter_01_Physics.pdf"}</span>
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
                  <span>Formula Proof</span>
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
                Grounded in <strong className="text-white">NCERT Physics Grade 11 Ch.1</strong>, Pages 88–92 (Inertia & Motion Postulates).
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
                Synthesized 3 bento cards to contrast static rest, momentum vector invariance, and mass as an inertial scalar based on your Grade 11 curriculum prompt.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#2B2926]">
                <span>Tokens: 342</span>
                <span>Latency: 420ms</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono">Bloom's Taxonomy:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  Level 3: Apply
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Conceptual clarity score: <span className="text-emerald-400 font-bold">92/100</span>
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
