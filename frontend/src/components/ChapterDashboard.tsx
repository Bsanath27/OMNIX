import React, { useEffect, useState, useRef } from 'react';
import {
  fetchProjects,
  fetchProject,
  createProject,
  deleteProject,
  uploadChapterFile,
  fetchTools,
  runTool,
  routeCapabilityPrompt,
  fetchGeneratedVideos,
  deleteGeneratedVideo,
  ProjectManifest,
  Artifact,
  ToolMetadata,
  GeneratedVideo,
} from '../api';
import { DoctorBanner } from './DoctorBanner';
import {
  Home,
  Wrench,
  BookOpen,
  Settings,
  Menu,
  X,
  Plus,
  Search,
  CheckCircle2,
  Sun,
  Moon,
  ChevronRight,
  Presentation,
  Video,
  Film,
  FileQuestion,
  Network,
  FileText,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Palette,
  ArrowRight,
  Sparkles,
  Loader2,
  Download,
  Paperclip,
  Trash2,
  Play,
  Layers,
  Clock,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { PresentonNativeEmbed } from './PresentonNativeEmbed';
import { VideoStudioView } from './video/VideoStudioView';
import { themes, ThemeName } from '../lib/presentonThemes';

type NavView = 'home' | 'tools' | 'library' | 'settings' | 'studio' | 'video';
type CapabilityType = 'all' | 'slides' | 'video' | 'quizzes' | 'diagrams';

export const ChapterDashboard: React.FC = () => {
  // Theme state: defaults to clean modern minimalist light mode (#F8FAFC / #FFFFFF)
  // Animated cycling placeholder text for the prompt capsule
  const PLACEHOLDERS = [
    "What would you like to teach? e.g. 'Photosynthesis in Grade 10 Biology'...",
    "e.g. 'Create an interactive quiz on Newton's Laws with 5 questions'...",
    "e.g. 'Explain the Human Circulatory System and Blood Flow'...",
    "e.g. 'Mindmap of Organic Chemistry reaction mechanisms'...",
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderKey, setPlaceholderKey] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('dark') === '1' || p.get('dark') === 'true') return true;
      if (p.get('light') === '1') return false;
      const saved = localStorage.getItem('omnix_theme');
      if (saved) return saved === 'dark';
      return false; // Default to clean modern minimalist light mode
    }
    return false;
  });

  // Global Navigation & View state
  const [activeView, setActiveView] = useState<NavView>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'studio') return 'studio';
    }
    return 'home';
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [_selectedSlideArtifact, setSelectedSlideArtifact] = useState<Artifact | null>(null);

  // Sync theme with document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('omnix_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('omnix_theme', 'light');
      }
    }
  }, [isDarkMode]);


  // Project states
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
  
  // Library Asset Gallery states
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'video' | 'slides' | 'quizzes' | 'diagrams'>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySort, setLibrarySort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [activeVideoModal, setActiveVideoModal] = useState<GeneratedVideo | { title: string; video_url: string; filename?: string } | null>(null);
  const [activeQuizModal, setActiveQuizModal] = useState<{
    title: string;
    items: Array<{
      question: string;
      options: string[];
      correct_answer: any;
      explanation?: string;
      grounding?: { passage_id?: string; quote?: string };
    }>;
    currentIndex: number;
    selectedOption: number | null;
    isAnswered: boolean;
    score: number;
  } | null>(null);

  // Conversational prompt & capability states
  const [selectedCapability, setSelectedCapability] = useState<CapabilityType>('all');
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  // File attached for current creation prompt
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Cycle placeholder text every 3.5s when textarea is empty
  useEffect(() => {
    if (promptText.trim()) return;
    const timer = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
      setPlaceholderKey(k => k + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, [promptText]);

  // Tools dynamic metadata
  const [registeredTools, setRegisteredTools] = useState<ToolMetadata[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load projects, dynamic tools, and generated videos on startup
  useEffect(() => {
    loadProjects();
    fetchTools().then(setRegisteredTools).catch(() => []);
    fetchGeneratedVideos().then(setGeneratedVideos).catch(() => []);
  }, []);

  // Reload assets whenever entering Library view
  useEffect(() => {
    if (activeView === 'library') {
      fetchProjects().then(setProjects).catch(console.error);
      fetchGeneratedVideos().then(setGeneratedVideos).catch(console.error);
    }
  }, [activeView]);

  // When project changes, load its artifacts
  useEffect(() => {
    if (selectedProject) {
      fetchProject(selectedProject.project_id).then((p) => {
        if (p.artifacts) {
          const sorted = Object.values(p.artifacts).sort(
            (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
          );
          setArtifacts(sorted);
          const latestSlide = sorted.find((a) => a.tool_name === 'slides');
          if (latestSlide) setSelectedSlideArtifact(latestSlide);
        }
      });
    } else {
      setArtifacts([]);
    }
  }, [selectedProject?.project_id]);

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
      const urlParams = new URLSearchParams(window.location.search);
      const projParam = urlParams.get('project');
      const viewParam = urlParams.get('view');
      const darkParam = urlParams.get('dark');

      if (darkParam === '1' || darkParam === 'true') {
        setIsDarkMode(true);
      }

      // Do NOT auto-bind to a legacy chapter on home page:
      // Only select a project if explicitly requested in URL query params or if directly opening studio
      let matchedProj = data.find((p) => p.project_id === projParam) || null;
      if (!matchedProj && viewParam === 'studio') {
        matchedProj = data.find((p) => Object.values(p.artifacts || {}).some(a => a.tool_name === 'slides')) || null;
      }

      if (matchedProj) {
        setSelectedProject(matchedProj);
        if (matchedProj.artifacts) {
          const slideArts = Object.values(matchedProj.artifacts)
            .filter((a) => a.tool_name === 'slides')
            .sort(
              (a, b) =>
                new Date(b.updated_at || b.created_at || 0).getTime() -
                new Date(a.updated_at || a.created_at || 0).getTime()
            );
          if (slideArts[0]) setSelectedSlideArtifact(slideArts[0]);
        }
      } else {
        setSelectedProject(null);
      }

      if (viewParam === 'studio') {
        setActiveView('studio');
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const handleCreateProject = async (name: string) => {
    if (!name.trim()) return null;
    try {
      const p = await createProject(name.trim());
      setProjects((prev) => [p, ...prev]);
      setSelectedProject(p);
      return p;
    } catch (err) {
      console.error('Failed to create project', err);
      return null;
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSendPrompt = async (forcedTopic?: string) => {
    const rawPrompt = (forcedTopic || promptText).trim();
    if (!rawPrompt && !attachedFile && !selectedProject) {
      alert('Please type what you would like to teach or ask OMNIX.');
      return;
    }

    const inputToRoute = rawPrompt || attachedFile?.name.replace(/\.[^/.]+$/, '') || selectedProject?.name || 'Classroom Presentation';
    setIsGenerating(true);

    try {
      // 1. Invoke the Main LLM router to classify intent and extract clean topic
      const decision = await routeCapabilityPrompt(
        inputToRoute,
        selectedCapability,
        selectedProject?.project_id
      );

      const topicToUse = decision.topic || inputToRoute;

      // 2. Auto-provision project workspace if none is currently selected
      let currentProj = selectedProject;
      if (!currentProj) {
        currentProj = await handleCreateProject(topicToUse.slice(0, 40));
      }

      if (attachedFile && currentProj) {
        await uploadChapterFile(currentProj.project_id, attachedFile);
        const updated = await fetchProject(currentProj.project_id);
        setSelectedProject(updated);
        setAttachedFile(null);
      }

      // 3. Intelligently route to the target capability engine
      if (decision.capability === 'slides') {
        setSelectedProject(currentProj);
        setPromptText(topicToUse);
        setActiveView('studio');
        return;
      }

      if (selectedCapability === 'video' || decision.capability === 'video') {
        setSelectedProject(currentProj);
        setPromptText(topicToUse);
        setActiveView('video');
        return;
      }

      // Otherwise, execute the tool directly (quizzes, video, diagrams)
      if (!currentProj) {
        throw new Error('Project workspace could not be initialized.');
      }

      let brief: any = {
        topic: topicToUse,
        subject: currentProj.outline?.subject || 'General Science',
        grade_level: currentProj.outline?.grade_level || 'Grade 10',
        ...(decision.parameters || {}),
      };

      if (decision.capability === 'quizzes') {
        brief = {
          ...brief,
          num_questions: decision.parameters?.num_questions || 5,
          quiz_types: ['multiple_choice', 'flashcard', 'true_false'],
          difficulty: decision.parameters?.difficulty || 'intermediate',
        };
      }

      const newArtifact = await runTool(decision.capability, currentProj.project_id, brief);
      setArtifacts((prev) => [newArtifact, ...prev]);
      setPromptText('');
      loadProjects();
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render Home View: Replit / Lovable / Bolt AI-First Hero Creator
  const renderHomeView = () => {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        {/* Subtle Ambient Radial Backlight Glow (Lovable/Bolt style) */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none -z-0 lovable-glow opacity-80" />

        {/* Top Header Bar */}
        <header
          className={`h-16 px-6 sm:px-10 border-b flex items-center justify-between sticky top-0 z-30 transition-colors ${
            isDarkMode ? "bg-[#111318]/80 border-slate-800/60 backdrop-blur-md" : "bg-[#F8FAFC]/80 border-slate-200/80 backdrop-blur-md"
          }`}
        >
          {/* Left: Clean System Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold tracking-tight text-slate-700 dark:text-slate-300">OMNIX Studio</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-[11px] text-slate-400">Autonomous Pedagogical Studio</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              }`}
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>
        </header>

        {/* Centered Bolt / Lovable Hero Stage */}
        <main className="max-w-3xl w-full mx-auto px-6 py-12 sm:py-16 text-center space-y-8 my-auto z-10">
          {/* Hero Header (Sub-badge removed, better high-impact title and subtitle per feedback) */}
          <div className="space-y-3.5">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              What would you like to teach{" "}
              <span className="bg-gradient-to-r from-[#FF5C00] via-orange-500 to-amber-500 bg-clip-text text-transparent">
                today?
              </span>
            </h1>
            <p className="text-sm sm:text-base max-w-xl mx-auto text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Type any lesson topic, concept, or test question. OMNIX automatically routes and builds your presentation slides, interactive assessments, or visual explainers.
            </p>
          </div>

          {/* The Iconic Bolt / Lovable Floating Prompt Capsule */}
          <div className="relative max-w-2xl mx-auto group">
            {/* Ambient Backlight Glow behind Capsule */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FF5C00]/20 via-amber-500/15 to-orange-600/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity -z-10" />

            <div
              className={`p-3 sm:p-4 rounded-3xl border shadow-2xl transition-all ${
                isDarkMode
                  ? "bg-slate-900/90 border-slate-700/80 backdrop-blur-xl"
                  : "bg-white/95 border-slate-200/90 backdrop-blur-xl shadow-slate-200/50"
              }`}
            >
              {/* Text Input Field */}
              <div className="px-2 pt-1 pb-2">
                <textarea
                  rows={2}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendPrompt();
                    }
                  }}
                  key={placeholderKey}
                  placeholder={PLACEHOLDERS[placeholderIdx]}
                  className="w-full bg-transparent text-sm sm:text-base focus:outline-none placeholder:text-slate-400 placeholder:transition-all placeholder:duration-500 resize-none leading-relaxed placeholder-animate"
                />
              </div>

              {/* Bottom Capsule Control Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                {/* Left Attachment Button & Attached Document Badge */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-slate-400 hover:text-[#FF5C00] hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
                    title="Attach Reference Document (PDF / DOCX)"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {attachedFile && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-[#FF5C00]/30 text-[11px] font-medium text-[#FF5C00]">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{attachedFile.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFile(null);
                        }}
                        className="hover:text-red-500 p-0.5 rounded"
                        title="Remove attached file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Capability Pills & Build Send Button (NO EMOJIS, POLISHED ICONS) */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1">
                    {[
                      { id: "slides" as CapabilityType, label: "Slides", icon: Presentation },
                      { id: "quizzes" as CapabilityType, label: "Quizzes", icon: FileQuestion },
                      { id: "video" as CapabilityType, label: "Video", icon: Video },
                    ].map((cap) => {
                      const Icon = cap.icon;
                      const isSelected = selectedCapability === cap.id;
                      return (
                        <button
                          key={cap.id}
                          onClick={() => setSelectedCapability(cap.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? "bg-[#FF5C00] text-white shadow-sm"
                              : "text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                          <span>{cap.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleSendPrompt()}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-2xl bg-[#FF5C00] hover:bg-[#e05200] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/30 transition-all shrink-0"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>{isGenerating ? "Building..." : "Build"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Pills (NO EMOJIS, POLISHED ICONS) */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium pt-1 flex-wrap">
            {[
              { id: "all" as CapabilityType, label: "All Capabilities", icon: Sparkles },
              { id: "slides" as CapabilityType, label: "Slides", icon: Presentation },
              { id: "video" as CapabilityType, label: "Video", icon: Video },
              { id: "quizzes" as CapabilityType, label: "Quizzes", icon: FileQuestion },
              { id: "diagrams" as CapabilityType, label: "Diagrams", icon: Network },
            ].map((cap) => {
              const Icon = cap.icon;
              const isSelected = selectedCapability === cap.id;
              return (
                <button
                  key={cap.id}
                  onClick={() => setSelectedCapability(cap.id)}
                  className={`px-3 py-1.5 rounded-full transition-all border text-xs font-semibold flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                      : isDarkMode
                      ? "bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:text-black shadow-sm"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? (isDarkMode ? "text-slate-900" : "text-white") : "text-slate-400"}`} />
                  <span>{cap.label}</span>
                </button>
              );
            })}
          </div>

          {/* Teacher-Ready Templates (Lovable / Bolt Bento Cards) */}
          <div className="pt-4 text-left space-y-3 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Teacher-ready templates
                </h3>
                <p className="text-xs text-slate-500">
                  Click any template to load prompt into creator box above.
                </p>
              </div>

              <button
                onClick={() => setActiveView("studio")}
                className="text-xs font-semibold text-[#FF5C00] hover:underline flex items-center gap-1"
              >
                <span>Open Full Slide Studio</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Single-column horizontal template list (Linear / GitHub Copilot style) */}
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* SLIDES */}
              <button
                onClick={() => {
                  setSelectedCapability("slides");
                  setPromptText("Create a 6-slide classroom lecture presentation with clear learning objectives, core concepts, and teacher speaker notes for each slide.");
                }}
                className={`flex items-center gap-4 px-4 py-3.5 text-left w-full group transition-colors ${
                  isDarkMode
                    ? "bg-[#16181D] hover:bg-[#1E2027]"
                    : "bg-white hover:bg-orange-50/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#FF5C00]/10">
                  <Presentation className="w-4 h-4 text-[#FF5C00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF5C00] mb-0.5">Slides</p>
                  <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Classroom Lecture Presentation</h4>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">6 slides with speaker notes, every point linked to textbook passage citations.</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FF5C00] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* VIDEO */}
              <button
                onClick={() => {
                  setSelectedCapability("video");
                  setPromptText("Generate a 2D Manim physics animation with synchronized Kokoro TTS voiceover explaining key equations.");
                }}
                className={`flex items-center gap-4 px-4 py-3.5 text-left w-full group transition-colors ${
                  isDarkMode
                    ? "bg-[#16181D] hover:bg-[#1E2027]"
                    : "bg-white hover:bg-orange-50/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10">
                  <Video className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500 mb-0.5">Video</p>
                  <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>STEM Animated Explainer</h4>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">2D mathematical animations with voiceover explaining tricky formulas and mechanics.</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* QUIZZES */}
              <button
                onClick={() => {
                  setSelectedCapability("quizzes");
                  setPromptText("Create a 4-question formative assessment with multiple choice, true/false, and flashcard revision cards.");
                }}
                className={`flex items-center gap-4 px-4 py-3.5 text-left w-full group transition-colors ${
                  isDarkMode
                    ? "bg-[#16181D] hover:bg-[#1E2027]"
                    : "bg-white hover:bg-orange-50/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10">
                  <FileQuestion className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 mb-0.5">Quizzes</p>
                  <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Interactive Quiz & Study Cards</h4>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">Works offline in class, no internet needed for students to review.</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* DIAGRAMS */}
              <button
                onClick={() => {
                  setSelectedCapability("diagrams");
                  setPromptText("Build a structured concept flowchart organizing the main topics and subordinate definitions.");
                }}
                className={`flex items-center gap-4 px-4 py-3.5 text-left w-full group transition-colors ${
                  isDarkMode
                    ? "bg-[#16181D] hover:bg-[#1E2027]"
                    : "bg-white hover:bg-orange-50/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/10">
                  <Network className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500 mb-0.5">Diagrams</p>
                  <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Concept Mind Map</h4>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">Visual flowchart showing relationships between key domain concepts.</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </div>

          {/* Recent Deliverables (Replit / Bolt Style Cards) */}
          {artifacts.length > 0 && (
            <div className="pt-4 text-left space-y-3 w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Your Deliverables ({artifacts.length})
                </h3>
                <span className="text-xs text-slate-400 font-mono">Ready for classroom projection</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {artifacts.slice(0, 4).map((art) => {
                  const isSlide = art.tool_name === "slides";
                  const slideCount = art.source_data?.slides?.length || 4;
                  const pptxFile = art.files.find((f) => f.endsWith(".pptx"));
                  const htmlFile = art.files.find((f) => f.endsWith(".html"));

                  return (
                    <div
                      key={art.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 bolt-card ${
                        isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSlide ? "bg-[#FF5C00]/10 text-[#FF5C00]" : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {isSlide ? <Presentation className="w-4 h-4" /> : <FileQuestion className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {art.source_data?.title || (isSlide ? `${selectedProject?.name || "Curriculum"} Deck` : "Assessment")}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {isSlide ? `${slideCount} Slides • Grounded` : "Interactive Assessment"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSlide && (
                          <button
                            onClick={() => {
                              setSelectedSlideArtifact(art);
                              setActiveView("studio");
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white text-[11px] font-bold"
                          >
                            Studio →
                          </button>
                        )}
                        {pptxFile && selectedProject && (
                          <a
                            href={`/api/projects/${selectedProject.project_id}/files/${pptxFile}`}
                            download
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-black dark:hover:text-white"
                            title="Download .pptx"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {htmlFile && selectedProject && (
                          <a
                            href={`/api/projects/${selectedProject.project_id}/files/${htmlFile}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-black dark:hover:text-white"
                            title="Play Quiz"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Clean Modern Minimalist Footer */}
        <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 mt-auto z-10">
          OMNIX · IIT Madras / Commonwealth of Learning (COL) Training of Trainers Programme
        </footer>
      </div>
    );
  };


  // Render Tools Catalog View
  const renderToolsView = () => {
    const coreTools = [
      {
        id: 'slides',
        title: 'Slide Deck Generator',
        badge: 'F5 · python-pptx',
        icon: Presentation,
        description:
          'Transform textbook sections into academic 16:9 presentation decks with speaker notes, visual diagrams, and strict passage grounding citations.',
        capability: 'slides' as CapabilityType,
        features: ['6-Slide Academic Layout', 'Speaker Notes', 'Passage Grounding [Pxx-Sxx]'],
      },
      {
        id: 'video',
        title: 'STEM Explainer Video',
        badge: 'F7 · Manim + Kokoro',
        icon: Video,
        description:
          'Deterministic audio-synchronized 2D mathematical animations using the STEM scene template registry and zero-PyTorch CPU Kokoro-ONNX voiceover.',
        capability: 'video' as CapabilityType,
        features: ['STEM Scene Registry', 'Kokoro-ONNX CPU TTS', 'Audio-First Sync'],
      },
      {
        id: 'quizzes',
        title: 'Interactive Quizzes & Flashcards',
        badge: 'F8 · Pure-Python H5P',
        icon: FileQuestion,
        description:
          'Generate self-contained, offline-playable HTML5 classroom quizzes, formative checks, and flashcards directly grounded in textbook passages.',
        capability: 'quizzes' as CapabilityType,
        features: ['Multiple Choice', 'True/False', 'Flashcards', 'Offline HTML5 Player'],
      },
      {
        id: 'diagrams',
        title: 'Mermaid & Markmap Diagrams',
        badge: 'F6 · Syntax Generator',
        icon: Network,
        description:
          'Extract pedagogical concept maps, sequential process flows, and hierarchical taxonomies rendered deterministically via web diagram standards.',
        capability: 'diagrams' as CapabilityType,
        features: ['Concept Flowcharts', 'Hierarchical Mindmaps', 'SVG Export'],
      },
      {
        id: 'ingestion',
        title: 'Document Ingestion & Grounding',
        badge: 'F1 · pypdf & docx',
        icon: FileText,
        description:
          'Deterministic text chunking and passage indexing producing passages.json with zero vector-database overhead and instantaneous lookups.',
        capability: 'all' as CapabilityType,
        features: ['PDF/DOCX Extraction', 'Zero Vector-DB Overhead', 'Deterministic IDs'],
      },
    ];

    return (
      <div className="max-w-5xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8 flex-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Capability <span className="text-[#FF5C00]">Tools</span> Catalog
            </h2>
            {registeredTools.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20">
                {registeredTools.length} Dynamic Engines Online
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
            Deterministic pedagogical engines for transforming textbook chapters into interactive classroom packages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-[#1E1D1B]/70 border-[#32302C] hover:border-[#FF5C00]/50'
                    : 'bg-white/80 border-[#E8E2D8] hover:border-[#FF5C00]/50 shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isDarkMode
                          ? 'bg-[#151413] border-[#32302C] text-[#9CA3AF]'
                          : 'bg-[#FAF7F2] border-[#E8E2D8] text-[#716D64]'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">{tool.title}</h3>
                    <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                      {tool.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tool.features.map((f, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-md ${
                          isDarkMode ? 'bg-[#151413] text-[#9CA3AF]' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className="pt-5 mt-4 border-t flex items-center justify-between"
                  style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}
                >
                  <span className="text-[11px] text-slate-400 font-mono">Status: Ready</span>
                  <button
                    onClick={() => {
                      if (tool.id === 'video') {
                        setActiveView('video');
                      } else {
                        setSelectedCapability(tool.capability);
                        setActiveView('home');
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#FF5C00] hover:bg-[#e05200] text-white font-medium flex items-center gap-1 transition-transform active:scale-95"
                  >
                    <span>Use in Prompt</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Library View: Clean Deliverables Wireframe showing ONLY genuine user-generated assets
  const renderLibraryView = () => {
    // Collect genuine assets across projects and video studio
    const libraryAssets: Array<{
      id: string;
      type: 'video' | 'slides' | 'quizzes' | 'diagrams';
      title: string;
      projectName?: string;
      projectId?: string;
      createdAt: string;
      status: string;
      duration?: string;
      itemCount?: number;
      theme?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      rawArtifact?: Artifact;
      videoData?: GeneratedVideo;
      files?: string[];
      sourceData?: any;
    }> = [];

    // 1. Standalone generated videos from Video Studio
    generatedVideos.forEach((v) => {
      libraryAssets.push({
        id: `vid-${v.id}`,
        type: 'video',
        title: v.title,
        projectName: 'Video Studio',
        createdAt: v.created_at,
        status: 'completed',
        duration: `${Math.floor(v.duration_seconds / 60)}:${Math.round(v.duration_seconds % 60).toString().padStart(2, '0')}`,
        videoUrl: v.video_url,
        thumbnailUrl: v.thumbnail_url,
        videoData: v,
        files: [v.filename],
      });
    });

    // 2. Real project artifacts (slide decks, quizzes, diagrams, project videos)
    projects.forEach((p) => {
      if (!p.artifacts) return;
      Object.values(p.artifacts).forEach((art) => {
        const rawTool = art.tool_name?.toLowerCase();
        let type: 'video' | 'slides' | 'quizzes' | 'diagrams' = 'slides';
        if (rawTool === 'video') type = 'video';
        else if (rawTool === 'quizzes' || rawTool === 'quiz') type = 'quizzes';
        else if (rawTool === 'diagrams' || rawTool === 'diagram') type = 'diagrams';
        else type = 'slides';

        // Prevent duplicate video entries if already collected from generatedVideos
        if (type === 'video' && libraryAssets.some((item) => item.videoUrl?.includes(art.id) || item.id.includes(art.id))) {
          return;
        }

        const title = art.source_data?.title || p.name || 'Untitled Deliverable';
        let itemCount = 0;
        let theme = art.source_data?.theme || undefined;
        let slideThumbnail = art.source_data?.slides?.[0]?.cards?.find((c: any) => c.image_url)?.image_url
          || art.source_data?.slides?.[0]?.image_url
          || art.source_data?.image_url;

        if (type === 'slides') {
          itemCount = art.source_data?.slides?.length || 0;
        } else if (type === 'quizzes') {
          itemCount = art.source_data?.items?.length || art.source_data?.questions?.length || 0;
        }

        libraryAssets.push({
          id: art.id,
          type,
          title,
          projectName: p.name,
          projectId: p.project_id,
          createdAt: art.created_at || art.updated_at || p.created_at,
          status: art.status || 'completed',
          itemCount,
          theme,
          thumbnailUrl: slideThumbnail,
          rawArtifact: art,
          files: art.files || [],
          sourceData: art.source_data,
        });
      });
    });

    // Category live counts
    const counts = {
      all: libraryAssets.length,
      video: libraryAssets.filter((a) => a.type === 'video').length,
      slides: libraryAssets.filter((a) => a.type === 'slides').length,
      quizzes: libraryAssets.filter((a) => a.type === 'quizzes').length,
      diagrams: libraryAssets.filter((a) => a.type === 'diagrams').length,
    };

    // Filter and sort
    const filteredAssets = libraryAssets
      .filter((a) => {
        if (libraryFilter !== 'all' && a.type !== libraryFilter) return false;
        if (!librarySearch.trim()) return true;
        const q = librarySearch.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          (a.projectName && a.projectName.toLowerCase().includes(q)) ||
          (a.theme && a.theme.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (librarySort === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (librarySort === 'title') {
          return a.title.localeCompare(b.title);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const handleDeleteAsset = async (asset: typeof libraryAssets[0], e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm(`Are you sure you want to delete "${asset.title}"?`)) return;

      if (asset.type === 'video' && asset.videoData?.filename) {
        const ok = await deleteGeneratedVideo(asset.videoData.filename);
        if (ok) {
          setGeneratedVideos((prev) => prev.filter((v) => v.filename !== asset.videoData?.filename));
        }
      } else if (asset.projectId) {
        await deleteProject(asset.projectId);
        setProjects((prev) => prev.filter((p) => p.project_id !== asset.projectId));
        if (selectedProject?.project_id === asset.projectId) {
          setSelectedProject(null);
          setArtifacts([]);
        }
      }
    };

    const handleOpenInStudio = (asset: typeof libraryAssets[0]) => {
      if (asset.type === 'video') {
        setPromptText(asset.title);
        setActiveView('video');
      } else if (asset.type === 'slides') {
        const matchedProj = projects.find((p) => p.project_id === asset.projectId) || null;
        if (matchedProj) {
          setSelectedProject(matchedProj);
        }
        if (asset.rawArtifact) {
          setSelectedSlideArtifact(asset.rawArtifact);
        }
        setActiveView('studio');
      }
    };

    return (
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 flex-1 flex flex-col">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#FF5C00]" />
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Generated <span className="text-[#FF5C00]">Assets Library</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20">
                {counts.all} {counts.all === 1 ? 'Deliverable' : 'Deliverables'}
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
              Only your genuine user-generated learning materials across videos, presentations, quizzes, and diagrams.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveView('video')}
              className="text-xs px-3.5 py-2 rounded-xl border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Create Video</span>
            </button>
            <button
              onClick={() => setActiveView('studio')}
              className="text-xs px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Presentation</span>
            </button>
          </div>
        </div>

        {/* Controls Bar: Category Pills + Search & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setLibraryFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                libraryFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-[#FF5C00]'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All ({counts.all})</span>
            </button>

            <button
              onClick={() => setLibraryFilter('video')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                libraryFilter === 'video'
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-500'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Videos ({counts.video})</span>
            </button>

            <button
              onClick={() => setLibraryFilter('slides')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                libraryFilter === 'slides'
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-[#FF5C00]'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Slide Decks ({counts.slides})</span>
            </button>

            <button
              onClick={() => setLibraryFilter('quizzes')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                libraryFilter === 'quizzes'
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-500'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Quizzes ({counts.quizzes})</span>
            </button>

            <button
              onClick={() => setLibraryFilter('diagrams')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                libraryFilter === 'diagrams'
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-cyan-500'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Diagrams ({counts.diagrams})</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter deliverables..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className={`w-full text-xs pl-8 pr-7 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                  isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                }`}
              />
              {librarySearch && (
                <button
                  onClick={() => setLibrarySearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={librarySort}
              onChange={(e: any) => setLibrarySort(e.target.value)}
              className={`text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                isDarkMode ? 'bg-[#151413] border-[#32302C] text-slate-300' : 'bg-white border-[#E8E2D8] text-slate-700'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Deliverables Grid Wireframe */}
        {filteredAssets.length === 0 ? (
          <div className={`py-16 text-center rounded-3xl border border-dashed flex flex-col items-center justify-center p-8 ${
            isDarkMode ? 'border-[#32302C] bg-[#1E1D1B]/40' : 'border-[#E8E2D8] bg-white/60 shadow-sm'
          }`}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-orange-500/10 text-[#FF5C00]">
              {libraryFilter === 'video' && <Film className="w-8 h-8 text-purple-500" />}
              {libraryFilter === 'slides' && <Presentation className="w-8 h-8 text-[#FF5C00]" />}
              {libraryFilter === 'quizzes' && <FileQuestion className="w-8 h-8 text-emerald-500" />}
              {libraryFilter === 'diagrams' && <Network className="w-8 h-8 text-cyan-500" />}
              {libraryFilter === 'all' && <Layers className="w-8 h-8 text-[#FF5C00]" />}
            </div>

            <h3 className="text-lg font-bold">
              {libraryFilter === 'video' && 'No Videos Generated Yet'}
              {libraryFilter === 'slides' && 'No Slide Decks Generated Yet'}
              {libraryFilter === 'quizzes' && 'No Quizzes Generated Yet'}
              {libraryFilter === 'diagrams' && 'No Diagrams Generated Yet'}
              {libraryFilter === 'all' && 'No Generated Deliverables Yet'}
            </h3>

            <p className={`text-xs max-w-md mt-1.5 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
              {librarySearch
                ? `No assets match your search "${librarySearch}". Try clearing your filter or searching for a different keyword.`
                : 'Your library only shows deliverables you have actively created with OMNIX AI. Use the prompt or our dedicated studios to create your first asset.'}
            </p>

            <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
              <button
                onClick={() => setActiveView('video')}
                className="text-xs px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Open Video Studio</span>
              </button>
              <button
                onClick={() => setActiveView('studio')}
                className="text-xs px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Create Slides</span>
              </button>
              <button
                onClick={() => setActiveView('home')}
                className="text-xs px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#FF5C00] text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                <span>Ask OMNIX Prompt</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 items-start">
            {filteredAssets.map((asset) => {
              const pptxFile = asset.files?.find((f) => f.endsWith('.pptx'));
              const presentonUrl = asset.sourceData?.presenton_url || (
                asset.sourceData?.presentation_id
                  ? `http://localhost:5001/presentation?id=${asset.sourceData.presentation_id}`
                  : null
              );

              return (
                <div
                  key={asset.id}
                  className={`rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col group hover:shadow-lg ${
                    isDarkMode ? 'bg-[#1E1D1B]/80 border-[#32302C] hover:border-slate-600' : 'bg-white border-[#E8E2D8] hover:border-slate-400'
                  }`}
                >
                  {/* Card Header: Type Badge, Status, Delete */}
                  <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {asset.type === 'video' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold flex items-center gap-1">
                          <Film className="w-3 h-3" /> Video
                        </span>
                      )}
                      {asset.type === 'slides' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-[#FF5C00] border border-[#FF5C00]/20 font-bold flex items-center gap-1">
                          <Presentation className="w-3 h-3" /> Slide Deck
                        </span>
                      )}
                      {asset.type === 'quizzes' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                          <FileQuestion className="w-3 h-3" /> Quiz
                        </span>
                      )}
                      {asset.type === 'diagrams' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold flex items-center gap-1">
                          <Network className="w-3 h-3" /> Diagram
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(asset.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteAsset(asset, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete Deliverable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Visual Preview Container */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center group/preview select-none">
                    {asset.type === 'video' && (
                      <div
                        onClick={() => {
                          if (asset.videoUrl) {
                            setActiveVideoModal({
                              title: asset.title,
                              video_url: asset.videoUrl,
                              filename: asset.videoData?.filename,
                            });
                          }
                        }}
                        className="w-full h-full cursor-pointer relative flex items-center justify-center bg-slate-950 overflow-hidden"
                      >
                        {/* Authentic Video Poster Frame Thumbnail */}
                        {asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : asset.videoUrl ? (
                          <video
                            src={`${asset.videoUrl}#t=0.5`}
                            preload="metadata"
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950" />
                        )}

                        {/* Cinematic Ambient Gradient Tint Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40 group-hover/preview:via-black/10 transition-colors" />

                        {/* Film perforation strip pattern */}
                        <div className="absolute inset-x-0 top-0 h-4 bg-black/40 flex justify-between px-3 items-center pointer-events-none opacity-40">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-2.5 h-1.5 rounded-[2px] bg-white/70" />
                          ))}
                        </div>

                        {/* Central Glowing Play button */}
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-600 text-white flex items-center justify-center shadow-2xl transform transition-transform group-hover/preview:scale-110 active:scale-95 z-10 backdrop-blur-sm border border-white/20">
                          <Play className="w-5 h-5 ml-0.5 fill-white" />
                        </div>

                        {/* Duration Pill */}
                        {asset.duration && (
                          <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-lg bg-black/80 text-white font-mono text-[10px] flex items-center gap-1 z-10 backdrop-blur-sm border border-white/10">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span>{asset.duration}</span>
                          </div>
                        )}

                        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-purple-500/30 text-purple-200 border border-purple-500/40 font-mono text-[9px] flex items-center gap-1 z-10 backdrop-blur-sm">
                          <Film className="w-3 h-3" />
                          <span>LTX-Video DiT</span>
                        </div>
                      </div>
                    )}

                    {asset.type === 'slides' && (() => {
                      const firstSlide = asset.sourceData?.slides?.[0];
                      const themeKey = (asset.theme || asset.sourceData?.theme || 'editorial').toLowerCase();
                      const activeTheme = themes[themeKey as ThemeName] || themes['editorial'] || themes['cornflower'];
                      const bgStyle = activeTheme?.background?.override || activeTheme?.colors?.background || '#0b0f19';
                      const headingColor = activeTheme?.colors?.heading || activeTheme?.colors?.primary || '#ffffff';
                      const accentColor = activeTheme?.colors?.accent || '#FF5C00';
                      const textColor = activeTheme?.colors?.text || '#94a3b8';
                      const cardBg = activeTheme?.colors?.cardBackground || 'rgba(255, 255, 255, 0.05)';
                      const cardBorder = activeTheme?.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

                      // Clean presentation title and subtitle
                      let cleanTitle = firstSlide?.title && firstSlide.title !== 'Slide'
                        ? firstSlide.title
                        : (asset.sourceData?.title || asset.title || 'Slide Presentation');

                      let cleanSubtitle = firstSlide?.subtitle || '';

                      if (cleanTitle.includes('Presenter:')) {
                        const parts = cleanTitle.split('Presenter:');
                        cleanTitle = parts[0].trim();
                        if (!cleanSubtitle) cleanSubtitle = 'Presenter: ' + parts[1].split('Date:')[0].trim();
                      } else if (cleanTitle.includes('Presented by:')) {
                        const parts = cleanTitle.split('Presented by:');
                        cleanTitle = parts[0].trim();
                        if (!cleanSubtitle) cleanSubtitle = 'Presented by: ' + parts[1].split('Date:')[0].trim();
                      }
                      cleanTitle = cleanTitle.replace(/\s*\.\.\.$/, '').trim();

                      const topicBadge = firstSlide?.badge || (cleanTitle.length > 20 ? cleanTitle.split(' ')[0].toUpperCase() : 'MODULE 01');

                      return (
                        <div
                          onClick={() => handleOpenInStudio(asset)}
                          className="w-full h-full cursor-pointer relative overflow-hidden group-hover/preview:opacity-95 transition-all flex items-center justify-center select-none"
                          style={{
                            backgroundColor: bgStyle,
                            color: textColor,
                            fontFamily: activeTheme?.fonts?.body || 'system-ui, sans-serif',
                          }}
                        >
                          {/* 1. Actual First Slide Visual Image if present */}
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={cleanTitle}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-[1.03]"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}

                          {/* 2. Authentic First Slide Presentation Canvas */}
                          <div className={`w-full h-full p-4 flex flex-col justify-between relative overflow-hidden ${asset.thumbnailUrl ? 'hidden' : 'flex'}`}>
                            {/* Radial ambient glow matching theme accent */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-35 mix-blend-screen"
                              style={{
                                background: `radial-gradient(circle at 80% 20%, ${accentColor}25 0%, transparent 60%), radial-gradient(circle at 20% 80%, ${headingColor}15 0%, transparent 50%)`,
                              }}
                            />

                            {/* Top Kicker & Slide Count Bar */}
                            <div className="relative z-10 flex items-center justify-between text-[10px] font-mono">
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-xs"
                                style={{
                                  borderColor: `${accentColor}40`,
                                  backgroundColor: `${accentColor}18`,
                                  color: accentColor,
                                }}
                              >
                                {topicBadge}
                              </span>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10 backdrop-blur-xs">
                                {asset.itemCount || 1} Slides • 16:9 PPT
                              </span>
                            </div>

                            {/* Center Hero Title Block */}
                            <div className="relative z-10 my-auto space-y-1.5 text-center px-2">
                              <h4
                                className="text-sm sm:text-base lg:text-lg font-black tracking-tight leading-snug line-clamp-2 text-center"
                                style={{
                                  color: headingColor,
                                  fontFamily: activeTheme?.fonts?.heading || 'inherit',
                                }}
                              >
                                {cleanTitle}
                              </h4>

                              {cleanSubtitle && (
                                <p
                                  className="text-[10px] sm:text-[11px] font-medium line-clamp-1 opacity-80 text-center max-w-xs mx-auto"
                                  style={{ color: textColor }}
                                >
                                  {cleanSubtitle}
                                </p>
                              )}

                              {/* Dynamic Cards Snippet if Slide 1 has cards */}
                              {firstSlide?.cards && firstSlide.cards.length > 0 && (
                                <div className="grid grid-cols-3 gap-1.5 pt-1.5 max-w-sm mx-auto">
                                  {firstSlide.cards.slice(0, 3).map((card: any, cI: number) => (
                                    <div
                                      key={cI}
                                      className="p-1 rounded-md border text-left backdrop-blur-xs"
                                      style={{
                                        backgroundColor: cardBg,
                                        borderColor: cardBorder,
                                      }}
                                    >
                                      {card.badge && (
                                        <span className="block text-[6px] font-bold uppercase tracking-wider opacity-80" style={{ color: accentColor }}>
                                          {card.badge}
                                        </span>
                                      )}
                                      <span className="text-[7.5px] font-semibold text-white/90 line-clamp-1 block">
                                        {card.title || `Point ${cI + 1}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Bottom Theme Accent Bar */}
                            <div
                              className="relative z-10 h-1 w-full rounded-full opacity-80"
                              style={{ backgroundColor: accentColor }}
                            />
                          </div>

                          {/* Interactive Slide Overlay on Hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-between p-3.5 z-20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/80 text-orange-400 border border-orange-500/30 font-bold backdrop-blur-sm">
                                PowerPoint Slide 01
                              </span>
                              <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">
                                {asset.itemCount || 1} Slides
                              </span>
                            </div>

                            <div className="flex items-center justify-center">
                              <span className="px-3.5 py-1.5 rounded-xl bg-[#FF5C00] text-white text-xs font-bold shadow-xl flex items-center gap-1.5 transform transition-transform group-hover/preview:scale-105 active:scale-95">
                                <Presentation className="w-3.5 h-3.5" />
                                Open in Slide Studio
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-slate-300 font-mono">
                              <span>16:9 Widescreen</span>
                              <span className="text-orange-300 flex items-center gap-0.5 font-bold">
                                {asset.theme || 'PowerPoint Deck'}
                              </span>
                            </div>
                          </div>

                          {/* Persistent badge in bottom-right when not hovered */}
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[9px] border border-white/15 group-hover/preview:opacity-0 transition-opacity z-10 backdrop-blur-sm">
                            SLIDE 01 / {asset.itemCount || 1}
                          </div>
                        </div>
                      );
                    })()}

                    {asset.type === 'quizzes' && (
                      <div
                        onClick={() => {
                          const items = asset.sourceData?.items || asset.sourceData?.questions || [];
                          if (items.length > 0) {
                            setActiveQuizModal({
                              title: asset.title,
                              items,
                              currentIndex: 0,
                              selectedOption: null,
                              isAnswered: false,
                              score: 0,
                            });
                          }
                        }}
                        className="w-full h-full cursor-pointer relative p-4 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-950 overflow-hidden group-hover/preview:opacity-95 transition-all"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Assessment Quiz
                          </span>
                          <span className="text-[10px] font-bold text-white/90 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">
                            <FileQuestion className="w-3 h-3 text-emerald-400" />
                            {asset.itemCount || 0} Questions
                          </span>
                        </div>

                        {/* Question & Options Preview */}
                        <div className="space-y-1.5 my-auto">
                          <p className="text-white text-xs font-semibold line-clamp-1">
                            {asset.sourceData?.items?.[0]?.question || asset.title}
                          </p>

                          <div className="space-y-1 opacity-80 pointer-events-none">
                            <div className="px-2 py-1 rounded-md bg-white/10 text-[9px] text-white/90 flex items-center gap-1.5 border border-white/10">
                              <span className="w-3.5 h-3.5 rounded bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-mono font-bold text-[8px]">
                                A
                              </span>
                              <span className="truncate">
                                {asset.sourceData?.items?.[0]?.options?.[0] || 'Core curriculum concept'}
                              </span>
                            </div>
                            <div className="px-2 py-1 rounded-md bg-white/5 text-[9px] text-white/70 flex items-center gap-1.5 border border-white/5">
                              <span className="w-3.5 h-3.5 rounded bg-white/10 text-white/50 flex items-center justify-center font-mono font-bold text-[8px]">
                                B
                              </span>
                              <span className="truncate">
                                {asset.sourceData?.items?.[0]?.options?.[1] || 'Secondary derivation'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1">
                          <span>Practice Assessment</span>
                          <span className="text-emerald-400 flex items-center gap-0.5 font-bold group-hover/preview:translate-x-0.5 transition-transform">
                            Practice Quiz <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    )}

                    {asset.type === 'diagrams' && (
                      <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-cyan-950/40 to-slate-950 text-center">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Mermaid Architecture
                          </span>
                          <span className="text-[10px] font-bold text-white/90 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">
                            <Network className="w-3 h-3 text-cyan-400" />
                            Diagram
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-3 my-auto opacity-80">
                          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[9px] font-mono text-cyan-300">
                            Input Node
                          </div>
                          <div className="w-6 h-px bg-cyan-400/50" />
                          <div className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-[9px] font-mono text-purple-300">
                            Core Engine
                          </div>
                          <div className="w-6 h-px bg-cyan-400/50" />
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-mono text-emerald-300">
                            Output
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1">
                          <span className="truncate max-w-[150px]">{asset.title}</span>
                          <span className="text-cyan-400 flex items-center gap-0.5 font-bold">
                            View <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Body: Info & Actions */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold truncate" title={asset.title}>
                        {asset.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="truncate max-w-[180px] font-mono">
                          {asset.projectName}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{asset.status}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      {asset.type === 'video' && (
                        <>
                          <button
                            onClick={() => {
                              if (asset.videoUrl) {
                                setActiveVideoModal({
                                  title: asset.title,
                                  video_url: asset.videoUrl,
                                  filename: asset.videoData?.filename,
                                });
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            <span>Play Video</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setPromptText(asset.title);
                                setActiveView('video');
                              }}
                              className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-slate-600 dark:text-slate-300 hover:text-purple-500 transition-colors"
                              title="Open in Video Studio"
                            >
                              <Film className="w-3.5 h-3.5" />
                            </button>

                            {asset.videoUrl && (
                              <a
                                href={asset.videoUrl}
                                download={asset.videoData?.filename || 'video.mp4'}
                                className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#FF5C00] text-slate-600 dark:text-slate-300 hover:text-[#FF5C00] transition-colors"
                                title="Download MP4 Video"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </>
                      )}

                      {asset.type === 'slides' && (
                        <>
                          <button
                            onClick={() => handleOpenInStudio(asset)}
                            className="text-xs px-3 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Presentation className="w-3 h-3" />
                            <span>Open Studio</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {presentonUrl && (
                              <a
                                href={presentonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#FF5C00] text-slate-600 dark:text-slate-300 hover:text-[#FF5C00] transition-colors"
                                title="Open in Presenton (5001)"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {pptxFile && asset.projectId && (
                              <a
                                href={`/api/projects/${asset.projectId}/download/${encodeURIComponent(pptxFile)}`}
                                download
                                className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#FF5C00] text-slate-600 dark:text-slate-300 hover:text-[#FF5C00] transition-colors"
                                title="Download PowerPoint Deck (.pptx)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </>
                      )}

                      {asset.type === 'quizzes' && (
                        <>
                          <button
                            onClick={() => {
                              const items = asset.sourceData?.items || asset.sourceData?.questions || [];
                              if (items.length > 0) {
                                setActiveQuizModal({
                                  title: asset.title,
                                  items,
                                  currentIndex: 0,
                                  selectedOption: null,
                                  isAnswered: false,
                                  score: 0,
                                });
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <FileQuestion className="w-3 h-3" />
                            <span>Practice Quiz</span>
                          </button>

                          {asset.files && asset.files[0] && asset.projectId && (
                            <a
                              href={`/api/projects/${asset.projectId}/download/${encodeURIComponent(asset.files[0])}`}
                              download
                              className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors"
                              title="Download Quiz JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </>
                      )}

                      {asset.type === 'diagrams' && (
                        <>
                          <button
                            onClick={() => {
                              alert(`Diagram Content:\n\n${asset.sourceData?.mermaid_code || asset.title}`);
                            }}
                            className="text-xs px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Diagram</span>
                          </button>

                          {asset.files && asset.files[0] && asset.projectId && (
                            <a
                              href={`/api/projects/${asset.projectId}/download/${encodeURIComponent(asset.files[0])}`}
                              download
                              className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                              title="Download Diagram"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  // Render Settings View
  const renderSettingsView = () => (
    <div className="max-w-4xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8 flex-1">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Settings & <span className="text-[#FF5C00]">Diagnostics</span>
        </h2>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
          System health inspection, visual theme preferences, and deterministic pipeline configuration.
        </p>
      </div>

      {/* System Health Diagnostics */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
        }`}
      >
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#FF5C00]" />
            <h3 className="font-bold text-xs uppercase tracking-wider">System Capability Status</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            /api/doctor
          </span>
        </div>
        <div>
          <DoctorBanner />
        </div>
      </div>

      {/* Appearance & Themes */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#FF5C00]" />
          <h3 className="font-bold text-xs uppercase tracking-wider">Appearance & Aesthetic Theme</h3>
        </div>
        <p className={`text-xs ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
          Select between Lovable Warm Creme and Warm Obsidian color palettes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div
            onClick={() => setIsDarkMode(false)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              !isDarkMode
                ? 'border-[#FF5C00] bg-orange-50/50 shadow-sm'
                : 'border-[#32302C] hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-xs font-bold text-black">Warm Creme (Light)</p>
                <p className="text-[10px] text-slate-500 font-mono">#FAF7F2 · Solar Orange Mesh</p>
              </div>
            </div>
            {!isDarkMode && <CheckCircle2 className="w-4 h-4 text-[#FF5C00]" />}
          </div>

          <div
            onClick={() => setIsDarkMode(true)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              isDarkMode
                ? 'border-[#FF5C00] bg-[#FF5C00]/10 shadow-sm'
                : 'border-[#E8E2D8] hover:border-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs font-bold">Warm Obsidian (Dark)</p>
                <p className="text-[10px] text-slate-400 font-mono">#151413 · Deep Mesh Aura</p>
              </div>
            </div>
            {isDarkMode && <CheckCircle2 className="w-4 h-4 text-[#FF5C00]" />}
          </div>
        </div>
      </div>

      {/* Educational & Pipeline Parameters */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#FF5C00]" />
          <h3 className="font-bold text-xs uppercase tracking-wider">Pedagogical Governance & Grounding</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div
            className={`p-3 rounded-xl border ${
              isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
            }`}
          >
            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Target Audience</span>
            <span className="font-semibold">IIT Madras / COL Master Trainers</span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
            }`}
          >
            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Passage Grounding</span>
            <span className="font-semibold text-emerald-500">Zero Vector-DB Deterministic IDs [Pxx-Sxx]</span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
            }`}
          >
            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">TTS Voice Model</span>
            <span className="font-semibold">kokoro-onnx (CPU, Zero-PyTorch Footprint)</span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
            }`}
          >
            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Classroom Bundle Format</span>
            <span className="font-semibold">Standalone Offline HTML + Media Assets</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Seamless Full-App Presenton Integration (Themes -> Outline -> Studio)
  if (activeView === 'studio') {
    return (
      <PresentonNativeEmbed
        project={selectedProject}
        initialPrompt={promptText}
        isDarkMode={isDarkMode}
        onBack={() => setActiveView('home')}
      />
    );
  }

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 flex flex-col md:flex-row font-sans overflow-x-hidden ${
        isDarkMode ? 'dark textured-canvas-dark text-slate-100' : 'textured-canvas-light text-slate-900'
      }`}
    >
      {/* Global Navigation Sidebar */}
      <aside
        className={`hidden md:flex flex-col w-64 shrink-0 border-r z-20 min-h-screen sticky top-0 h-screen justify-between p-4 transition-colors duration-300 ${
          isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-[#FF5C00] text-white flex items-center justify-center font-bold text-base shadow-sm">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight">OMNIX</span>

              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">IIT Madras · COL</p>
            </div>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="space-y-1.5" aria-label="Global Navigation">
            {[
              { id: 'home' as NavView, label: 'Home', icon: Home, desc: 'Conversational Studio' },
              { id: 'video' as NavView, label: 'Video Studio', icon: Video, desc: 'Leap Storyboard & Animations' },
              { id: 'studio' as NavView, label: 'Slide Studio', icon: Presentation, desc: 'Presenton 16:9 Stage' },
              { id: 'tools' as NavView, label: 'Tools', icon: Wrench, desc: 'Pedagogical Engines' },
              { id: 'library' as NavView, label: 'Library', icon: BookOpen, desc: 'Generated Deliverables' },
              { id: 'settings' as NavView, label: 'Settings', icon: Settings, desc: 'Diagnostics & System' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#FF5C00]/15 text-[#FF5C00] font-semibold border border-[#FF5C00]/30 shadow-sm'
                      : isDarkMode
                      ? 'text-[#9CA3AF] hover:text-white hover:bg-[#252422] border border-transparent'
                      : 'text-[#716D64] hover:text-[#18181B] hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF5C00]' : 'opacity-70'}`} />
                  <div className="text-left flex-1">
                    <div className="font-medium">{item.label}</div>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Engine Status & Theme Controls */}
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Presenton 5001</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">v0.5.0</span>
          </div>

          {/* Theme & Status Controls */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className={`text-[11px] ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>Theme</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-[#151413] border-[#32302C] text-amber-400 hover:bg-[#252422]'
                  : 'bg-white border-[#E8E2D8] text-slate-700 hover:bg-slate-50 shadow-sm'
              }`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* 4. Foreground Application Canvas with Active View Router */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        {/* Mobile Navigation Header */}
        <div
          className="md:hidden h-14 px-4 flex items-center justify-between border-b"
          style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className={`p-1.5 rounded-lg border ${
                isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="w-6 h-6 rounded-lg bg-[#FF5C00] text-white flex items-center justify-center font-bold text-xs">
              Ω
            </div>
            <span className="font-bold text-sm tracking-tight capitalize">OMNIX · {activeView}</span>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 rounded-lg border ${
              isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Mobile Slide-Over Navigation (Strictly 4 Items) */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            <div
              className={`relative w-72 max-w-[80vw] h-full shadow-2xl z-50 p-5 flex flex-col justify-between border-r ${
                isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
              }`}
            >
              <div className="space-y-6">
                <div
                  className="flex items-center justify-between pb-3 border-b"
                  style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#FF5C00] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      Ω
                    </div>
                    <span className="font-bold text-base tracking-tight">OMNIX</span>
                  </div>
                  <button
                    onClick={() => setIsMobileNavOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-black"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {[
                    { id: 'home' as NavView, label: 'Home', icon: Home },
                    { id: 'video' as NavView, label: 'Video Studio', icon: Video },
                    { id: 'studio' as NavView, label: 'Slide Studio', icon: Presentation },
                    { id: 'tools' as NavView, label: 'Tools', icon: Wrench },
                    { id: 'library' as NavView, label: 'Library', icon: BookOpen },
                    { id: 'settings' as NavView, label: 'Settings', icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id);
                          setIsMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#FF5C00]/15 text-[#FF5C00] font-semibold border border-[#FF5C00]/30'
                            : isDarkMode
                            ? 'text-[#9CA3AF] hover:text-white hover:bg-[#252422]'
                            : 'text-[#716D64] hover:text-[#18181B] hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF5C00]' : 'opacity-70'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t space-y-3" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
                <div className="flex items-center justify-between text-xs">
                  <span>Theme</span>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-1.5 rounded-lg border"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher Routing */}
        {activeView === 'home' && renderHomeView()}
        {activeView === 'video' && (
          <VideoStudioView
            initialTopic={promptText}
            isDarkMode={isDarkMode}
            onBack={() => setActiveView('home')}
          />
        )}
        {activeView === 'tools' && renderToolsView()}
        {activeView === 'library' && renderLibraryView()}
        {activeView === 'settings' && renderSettingsView()}

        {/* Global Video Player Modal */}
        {activeVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className={`w-full max-w-4xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col ${
              isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
            }`}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Film className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-base sm:text-lg truncate max-w-lg">
                    {activeVideoModal.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-black flex items-center justify-center aspect-video max-h-[68vh] overflow-hidden">
                <video
                  src={activeVideoModal.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151413]">
                <span className="text-xs text-slate-400 font-mono">
                  Standard Format: 704x512 MP4 • Zero-Looping Master • Edge-TTS Narration
                </span>
                <div className="flex items-center gap-2.5">
                  <a
                    href={activeVideoModal.video_url}
                    download={activeVideoModal.filename || 'omnix_video.mp4'}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MP4</span>
                  </a>
                  <button
                    onClick={() => setActiveVideoModal(null)}
                    className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Interactive Quiz Practice Modal */}
        {activeQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className={`w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col ${
              isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
            }`}>
              {/* Quiz Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <FileQuestion className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base truncate max-w-md">
                      {activeQuizModal.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Question {activeQuizModal.currentIndex + 1} of {activeQuizModal.items.length} · Score: {activeQuizModal.score}/{activeQuizModal.items.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveQuizModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quiz Question Body */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {activeQuizModal.items[activeQuizModal.currentIndex] ? (
                  <>
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                        Question {activeQuizModal.currentIndex + 1}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold leading-snug">
                        {activeQuizModal.items[activeQuizModal.currentIndex].question}
                      </h4>
                    </div>

                    {/* Options list */}
                    <div className="space-y-2.5">
                      {(activeQuizModal.items[activeQuizModal.currentIndex].options || []).map((opt: string, optIdx: number) => {
                        const curQ = activeQuizModal.items[activeQuizModal.currentIndex];
                        const isCorrectAnswer =
                          curQ.correct_answer === optIdx ||
                          curQ.correct_answer === opt ||
                          curQ.correct_answer === String.fromCharCode(65 + optIdx);
                        const isSelected = activeQuizModal.selectedOption === optIdx;

                        let btnClasses = isDarkMode
                          ? 'bg-[#151413] border-[#32302C] hover:border-slate-500 text-slate-200'
                          : 'bg-[#FAF7F2] border-[#E8E2D8] hover:border-slate-400 text-slate-800';

                        if (activeQuizModal.isAnswered) {
                          if (isCorrectAnswer) {
                            btnClasses = 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold';
                          } else if (isSelected) {
                            btnClasses = 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 font-semibold';
                          } else {
                            btnClasses = 'opacity-50 border-transparent';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={activeQuizModal.isAnswered}
                            onClick={() => {
                              const wasCorrect = isCorrectAnswer;
                              setActiveQuizModal((prev) => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  selectedOption: optIdx,
                                  isAnswered: true,
                                  score: wasCorrect ? prev.score + 1 : prev.score,
                                };
                              });
                            }}
                            className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${btnClasses}`}
                          >
                            <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="text-xs sm:text-sm leading-relaxed flex-1">{opt}</span>
                            {activeQuizModal.isAnswered && isCorrectAnswer && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback & Grounding Section */}
                    {activeQuizModal.isAnswered && (
                      <div className={`p-4 rounded-2xl border space-y-2 animate-fadeIn ${
                        isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Pedagogical Explanation
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeQuizModal.items[activeQuizModal.currentIndex].explanation ||
                            'Based on the verified curriculum passages for this chapter.'}
                        </p>
                        {activeQuizModal.items[activeQuizModal.currentIndex].grounding?.passage_id && (
                          <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-[#FF5C00] border border-[#FF5C00]/20">
                            Source Citation: [{activeQuizModal.items[activeQuizModal.currentIndex].grounding?.passage_id}]
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h4 className="text-xl font-bold">Quiz Complete!</h4>
                    <p className="text-sm text-slate-400 font-mono">
                      Your Final Score: {activeQuizModal.score} / {activeQuizModal.items.length} (
                      {Math.round((activeQuizModal.score / activeQuizModal.items.length) * 100)}%)
                    </p>
                    <button
                      onClick={() => {
                        setActiveQuizModal((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            currentIndex: 0,
                            selectedOption: null,
                            isAnswered: false,
                            score: 0,
                          };
                        });
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retake Quiz</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quiz Footer Controls */}
              {activeQuizModal.items[activeQuizModal.currentIndex] && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151413]">
                  <button
                    disabled={activeQuizModal.currentIndex === 0}
                    onClick={() => {
                      setActiveQuizModal((prev) => {
                        if (!prev || prev.currentIndex === 0) return prev;
                        return {
                          ...prev,
                          currentIndex: prev.currentIndex - 1,
                          selectedOption: null,
                          isAnswered: false,
                        };
                      });
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Previous
                  </button>

                  <button
                    disabled={!activeQuizModal.isAnswered}
                    onClick={() => {
                      setActiveQuizModal((prev) => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          currentIndex: prev.currentIndex + 1,
                          selectedOption: null,
                          isAnswered: false,
                        };
                      });
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>
                      {activeQuizModal.currentIndex + 1 >= activeQuizModal.items.length
                        ? 'Finish Quiz'
                        : 'Next Question'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
