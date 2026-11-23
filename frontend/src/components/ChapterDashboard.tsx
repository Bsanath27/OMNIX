import React, { useEffect, useState, useRef } from 'react';
import {
  fetchProjects,
  fetchProject,
  createProject,
  uploadChapterFile,
  fetchPassages,
  fetchTools,
  runTool,
  routeCapabilityPrompt,
  ProjectManifest,
  Artifact,
  ToolMetadata,
} from '../api';
import { ArtifactCard } from './ArtifactCard';
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
  Copy,
  ChevronRight,
  Presentation,
  Video,
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
} from 'lucide-react';
import { PresentonNativeEmbed } from './PresentonNativeEmbed';

type NavView = 'home' | 'tools' | 'library' | 'settings' | 'studio';
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


  // Project & Ingestion states
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Passages & search states
  const [passages, setPassages] = useState<Record<string, string>>({});
  const [passageSearch, setPassageSearch] = useState('');
  const [copiedPassageId, setCopiedPassageId] = useState<string | null>(null);

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
  const libraryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load projects and dynamic tools on startup
  useEffect(() => {
    loadProjects();
    fetchTools().then(setRegisteredTools).catch(() => []);
  }, []);

  // When project changes, load its passages and artifacts
  useEffect(() => {
    if (selectedProject) {
      fetchPassages(selectedProject.project_id).then(setPassages);
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
      setPassages({});
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      let targetProj = selectedProject;
      if (!targetProj) {
        const fallbackName = file.name.replace(/\.[^/.]+$/, '');
        targetProj = await handleCreateProject(fallbackName);
      }
      if (targetProj) {
        await uploadChapterFile(targetProj.project_id, file);
        const updated = await fetchProject(targetProj.project_id);
        setSelectedProject(updated);
        const newPassages = await fetchPassages(targetProj.project_id);
        setPassages(newPassages);
      }
    } finally {
      setIsUploading(false);
      if (libraryFileInputRef.current) libraryFileInputRef.current.value = '';
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const copyPassageRef = (pId: string) => {
    navigator.clipboard.writeText(`[${pId}]`);
    setCopiedPassageId(pId);
    setTimeout(() => setCopiedPassageId(null), 1500);
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
        const newPassages = await fetchPassages(currentProj.project_id);
        setPassages(newPassages);
        setAttachedFile(null);
      }

      // 3. Intelligently route to the target capability engine
      if (decision.capability === 'slides') {
        setSelectedProject(currentProj);
        setPromptText(topicToUse);
        setActiveView('studio');
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
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredPassages = Object.entries(passages).filter(([id, text]) => {
    const q = passageSearch.toLowerCase();
    return id.toLowerCase().includes(q) || text.toLowerCase().includes(q);
  });

  const filteredProjects = projects.filter((p) => {
    const q = projectSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.source_filename && p.source_filename.toLowerCase().includes(q));
  });

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
                      setSelectedCapability(tool.capability);
                      setActiveView('home');
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

  // Render Library View: Dedicated 2-Column Pedagogical Workspace for Chapter Projects & Passage Explorer
  const renderLibraryView = () => (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 flex-1 flex flex-col">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#FF5C00]" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Chapter <span className="text-[#FF5C00]">Library</span> & Grounding Hub
            </h2>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
            Manage textbook chapters, extract deterministic passages, and review generated classroom deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => libraryFileInputRef.current?.click()}
            className="text-xs px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isUploading ? 'Extracting File...' : 'Upload Chapter Document'}</span>
          </button>
          <input
            type="file"
            ref={libraryFileInputRef}
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Column 1: Chapter Projects Management (Left 4 cols) */}
        <div className={`lg:col-span-4 rounded-2xl border p-5 space-y-5 ${
          isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
              Chapter Projects ({projects.length})
            </span>
          </div>

          {/* New Chapter Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Create new chapter title..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject(newProjectName);
                  setNewProjectName('');
                }
              }}
              className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
              }`}
            />
            <button
              onClick={() => {
                handleCreateProject(newProjectName);
                setNewProjectName('');
              }}
              className="px-3 py-2 bg-[#FF5C00] text-white rounded-xl hover:bg-[#e05200] transition-colors"
              title="Create Chapter"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Projects Search Filter */}
          {projects.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className={`w-full text-xs pl-8 pr-2.5 py-1.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                  isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                }`}
              />
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredProjects.map((p) => {
              const isSelected = selectedProject?.project_id === p.project_id;
              return (
                <div
                  key={p.project_id}
                  onClick={() => setSelectedProject(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#FF5C00]/10 border-[#FF5C00] shadow-sm'
                      : isDarkMode
                      ? 'bg-[#151413]/50 border-[#32302C] hover:border-slate-500'
                      : 'bg-[#FAF7F2]/60 border-[#E8E2D8] hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-xs font-bold truncate max-w-[200px] ${
                      isSelected ? 'text-[#FF5C00]' : ''
                    }`}>
                      {p.name}
                    </h4>
                    {p.source_filename && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Grounded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[150px] font-mono">{p.source_filename || 'No document uploaded'}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Selected Chapter Summary, Passages Explorer & Deliverables (Right 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedProject ? (
            <>
              {/* Selected Chapter Header Card */}
              <div className={`p-5 rounded-2xl border ${
                isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold tracking-tight">{selectedProject.name}</h3>
                      {selectedProject.source_filename && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Indexed & Grounded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                      <span>Source: {selectedProject.source_filename || 'Pending Document Upload'}</span>
                      <span>·</span>
                      <span>{Object.keys(passages).length} Indexed Passages</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPromptText(`Generate complete classroom deliverables for ${selectedProject.name}`);
                        setActiveView('home');
                      }}
                      className="text-xs px-3.5 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-medium flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
                    >
                      <span>Use in Prompt</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Searchable Passages Explorer */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold tracking-tight flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#FF5C00]" />
                      <span>Deterministic Grounded Passages</span>
                    </h4>
                    <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                      Passage citations cite exact sentences with zero vector-database overhead.
                    </p>
                  </div>

                  {/* Passage Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter passages by text or ID..."
                      value={passageSearch}
                      onChange={(e) => setPassageSearch(e.target.value)}
                      className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                        isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                      }`}
                    />
                  </div>
                </div>

                {Object.keys(passages).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {filteredPassages.map(([pId, text]) => (
                      <div
                        key={pId}
                        onClick={() => copyPassageRef(pId)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isDarkMode
                            ? 'bg-[#151413]/60 border-[#32302C] hover:border-[#FF5C00]'
                            : 'bg-[#FAF7F2]/60 border-[#E8E2D8] hover:border-[#FF5C00]'
                        }`}
                        title="Click to copy citation tag [Pxx-Sxx]"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[11px] text-[#FF5C00] font-bold">{pId}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Copy className="w-3 h-3" />
                            {copiedPassageId === pId ? 'Copied Citation!' : 'Copy Tag'}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-3 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    No passages extracted yet. Upload a PDF or DOCX file to extract grounded passages.
                  </div>
                )}
              </div>

              {/* Deliverables Section for Selected Chapter */}
              {artifacts.length > 0 && (
                <div className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-[#1E1D1B]/70 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8] shadow-sm'
                }`}>
                  <h4 className="text-sm font-bold tracking-tight">
                    Chapter Deliverables ({artifacts.length})
                  </h4>
                  <div className="space-y-4">
                    {artifacts.map((art) => (
                      <ArtifactCard key={art.id} artifact={art} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`p-12 text-center rounded-2xl border border-dashed ${
              isDarkMode ? 'border-[#32302C] text-slate-400' : 'border-[#E8E2D8] text-slate-500'
            }`}>
              <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-40" />
              <p className="font-semibold text-sm">No chapter selected</p>
              <p className="text-xs mt-1">Select an existing chapter on the left or create a new one to view details and passages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
              { id: 'studio' as NavView, label: 'Slide Studio', icon: Presentation, desc: 'Presenton 16:9 Stage' },
              { id: 'tools' as NavView, label: 'Tools', icon: Wrench, desc: 'Pedagogical Engines' },
              { id: 'library' as NavView, label: 'Library', icon: BookOpen, desc: 'Chapters & Passages' },
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
        {activeView === 'tools' && renderToolsView()}
        {activeView === 'library' && renderLibraryView()}
        {activeView === 'settings' && renderSettingsView()}
      </div>
    </div>
  );
};
