import React, { useEffect, useState, useRef } from 'react';
import {
  fetchProjects,
  fetchProject,
  createProject,
  uploadChapterFile,
  fetchPassages,
  fetchTools,
  runTool,
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
  Send,
  Search,
  CheckCircle2,
  Sun,
  Moon,
  Copy,
  ChevronDown,
  Presentation,
  Video,
  FileQuestion,
  Network,
  FileText,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Palette,
  Paperclip,
  Check,
  ArrowRight,
} from 'lucide-react';
import { SlideStudioView } from './SlideStudioView';

type NavView = 'home' | 'tools' | 'library' | 'settings' | 'studio';
type CapabilityType = 'all' | 'slides' | 'video' | 'quizzes' | 'diagrams';

export const ChapterDashboard: React.FC = () => {
  // Theme state: defaults to dark (#151413) like user reference, can toggle to light
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('dark') === '1' || p.get('dark') === 'true') return true;
      if (p.get('light') === '1') return false;
      const saved = localStorage.getItem('omnix_theme');
      if (saved) return saved === 'dark';
      return true;
    }
    return true;
  });

  // Global Navigation & View state
  const [activeView, setActiveView] = useState<NavView>('home');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedSlideArtifact, setSelectedSlideArtifact] = useState<Artifact | null>(null);

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
  const [showCapabilityDropdown, setShowCapabilityDropdown] = useState(false);

  // Capsule '+' attachment popover state
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [capsulePassageSearch, setCapsulePassageSearch] = useState('');
  const [insertedCitation, setInsertedCitation] = useState<string | null>(null);

  // Tools dynamic metadata
  const [registeredTools, setRegisteredTools] = useState<ToolMetadata[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentPopoverRef = useRef<HTMLDivElement | null>(null);

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
          setArtifacts(Object.values(p.artifacts));
        }
      });
    } else {
      setPassages({});
      setArtifacts([]);
    }
  }, [selectedProject?.project_id]);

  // Click outside or Escape to close attachment popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachmentPopoverRef.current &&
        !attachmentPopoverRef.current.contains(e.target as Node)
      ) {
        setIsAttachmentOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAttachmentOpen(false);
      }
    };
    if (isAttachmentOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAttachmentOpen]);

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

      let matchedProj = data.find((p) => p.project_id === projParam);
      if (!matchedProj && data.length > 0) {
        // prefer a project that already has slides if view is studio
        matchedProj = (viewParam === 'studio' && data.find((p) => Object.values(p.artifacts || {}).some(a => a.tool_name === 'slides'))) || data[0];
      }

      if (matchedProj) {
        setSelectedProject(matchedProj);
        if (matchedProj.artifacts) {
          const slideArt = Object.values(matchedProj.artifacts).find(a => a.tool_name === 'slides');
          if (slideArt) setSelectedSlideArtifact(slideArt);
        }
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
        setIsAttachmentOpen(false);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyPassageRef = (pId: string) => {
    navigator.clipboard.writeText(`[${pId}]`);
    setCopiedPassageId(pId);
    setTimeout(() => setCopiedPassageId(null), 1500);
  };

  const insertPassageCitationIntoPrompt = (pId: string) => {
    const citationTag = `[${pId}]`;
    setPromptText((prev) => (prev ? `${prev.trim()} ${citationTag}` : citationTag));
    setInsertedCitation(pId);
    setTimeout(() => setInsertedCitation(null), 1500);
  };

  const handleSendPrompt = async () => {
    let currentProj = selectedProject;
    if (!currentProj) {
      currentProj = await handleCreateProject(promptText.slice(0, 30) || 'New Chapter Project');
    }
    if (!currentProj) {
      alert('Please select or create a chapter project first.');
      return;
    }

    setIsGenerating(true);
    try {
      const targetTool = selectedCapability === 'quizzes' ? 'quizzes' : 'slides';

      let brief: any = {
        topic: promptText.trim() || currentProj.name,
        subject: 'General Science',
        grade_level: 'Grade 10',
      };

      if (targetTool === 'slides') {
        brief = {
          ...brief,
          num_slides: 6,
          theme: 'academic_clean',
          include_speaker_notes: true,
          include_passage_citations: true,
        };
      } else if (targetTool === 'quizzes') {
        brief = {
          ...brief,
          num_questions: 4,
          quiz_types: ['multiple_choice', 'flashcard', 'true_false'],
          difficulty: 'intermediate',
        };
      }

      const newArtifact = await runTool(targetTool, currentProj.project_id, brief);
      setArtifacts((prev) => [newArtifact, ...prev]);
      setPromptText('');

      // When generating slides, navigate directly to the dedicated full-page Presenton studio
      if (targetTool === 'slides') {
        setSelectedSlideArtifact(newArtifact);
        setActiveView('studio');
      }
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

  const capsuleFilteredPassages = Object.entries(passages).filter(([id, text]) => {
    const q = capsulePassageSearch.toLowerCase();
    return id.toLowerCase().includes(q) || text.toLowerCase().includes(q);
  });

  // Render Home View: Retains centered hero title, liquid mesh gradient aura, floating pill capsule, and capability pills
  const renderHomeView = () => (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] justify-between">
      {/* Top Header bar for Home View */}
      <header className="h-16 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Active Chapter indicator chip */}
          {selectedProject ? (
            <div
              onClick={() => setActiveView('library')}
              className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-[#1E1D1B] border-[#32302C] text-[#F5F2EB] hover:border-[#FF5C00]/50'
                  : 'bg-white border-[#E8E2D8] text-[#18181B] hover:border-[#FF5C00]/50 shadow-sm'
              }`}
              title="Click to view chapter in Library"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span className="truncate max-w-[180px] sm:max-w-xs">{selectedProject.name}</span>
              {selectedProject.source_filename && (
                <span className="hidden sm:flex px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 items-center gap-1 font-mono">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Grounded
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={() => setActiveView('library')}
              className="text-xs text-slate-400 hover:text-[#FF5C00] flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" /> Select a chapter in Library
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode
                ? 'bg-[#1E1D1B] border-[#32302C] text-amber-400 hover:bg-[#32302C]'
                : 'bg-white border-[#E8E2D8] text-slate-700 hover:bg-[#FAF7F2] shadow-sm'
            }`}
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`text-xs px-4 py-2 rounded-full font-semibold transition-transform active:scale-95 shadow-sm ${
              isDarkMode
                ? 'bg-[#F5F2EB] text-[#151413] hover:bg-white'
                : 'bg-[#18181B] text-white hover:bg-black'
            }`}
          >
            {isUploading ? 'Extracting...' : '+ Upload Chapter'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </header>

      {/* Centered Lovable Hero & Floating Capsule */}
      <main className="max-w-3xl w-full mx-auto px-6 py-12 sm:py-20 text-center space-y-7 my-auto">
        {/* Hero Headings */}
        <div className="space-y-3">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight ${
            isDarkMode ? 'text-[#F5F2EB]' : 'text-[#18181B]'
          }`}>
            Build something <span className="text-[#FF5C00]">Immersive</span>
          </h1>
          <p
            className={`text-sm sm:text-base max-w-lg mx-auto leading-relaxed ${
              isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'
            }`}
          >
            Transform any textbook chapter into classroom slide presentations, STEM explainer animations, and interactive quizzes.
          </p>
        </div>

        {/* Lovable Floating Pill Capsule */}
        <div
          className={`relative rounded-full p-2 flex items-center justify-between border transition-all duration-300 max-w-xl mx-auto ${
            isDarkMode
              ? 'bg-[#1E1D1B] border-[#32302C] capsule-shadow-dark'
              : 'bg-white border-[#E8E2D8] capsule-shadow-light'
          }`}
        >
          {/* Left '+' Attachment Button with Relocated Chapter & Passage Access Popover */}
          <div className="relative shrink-0" ref={attachmentPopoverRef}>
            <button
              onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                isAttachmentOpen
                  ? 'bg-[#FF5C00] text-white'
                  : isDarkMode
                  ? 'text-[#9CA3AF] hover:text-[#FF5C00] hover:bg-[#252422]'
                  : 'text-slate-400 hover:text-[#FF5C00] hover:bg-orange-50'
              }`}
              title="Attach File, Switch Chapter, or Cite Passages"
            >
              <Plus className="w-5 h-5 font-light" />
            </button>

            {/* Attachment Popover */}
            {isAttachmentOpen && (
              <div
                className={`absolute bottom-12 left-0 w-80 sm:w-96 rounded-2xl shadow-2xl z-30 p-4 border text-left space-y-3 ${
                  isDarkMode ? 'bg-[#1E1D1B] border-[#32302C] text-[#F5F2EB]' : 'bg-white border-[#E8E2D8] text-[#18181B]'
                }`}
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF5C00]">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Grounding Attachments</span>
                  </div>
                  <button
                    onClick={() => setIsAttachmentOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1. Quick File Upload */}
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                      isDarkMode
                        ? 'border-[#32302C] hover:border-[#FF5C00] bg-[#151413]/60'
                        : 'border-[#E8E2D8] hover:border-[#FF5C00] bg-[#FAF7F2]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-[#FF5C00]" />
                    <span>{isUploading ? 'Extracting Passages...' : 'Upload Textbook Document (PDF/DOCX)'}</span>
                  </button>
                </div>

                {/* 2. Quick Chapter Switcher */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Active Chapter Project
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {projects.map((p) => {
                      const isSelected = selectedProject?.project_id === p.project_id;
                      return (
                        <button
                          key={p.project_id}
                          onClick={() => setSelectedProject(p)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-[#FF5C00]/15 text-[#FF5C00] font-semibold border border-[#FF5C00]/30'
                              : isDarkMode
                              ? 'text-[#9CA3AF] hover:bg-[#151413]'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate max-w-[200px]">{p.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5C00] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Quick Passage Citation Insertion */}
                {selectedProject && Object.keys(passages).length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Insert Passage Citation
                      </span>
                      {insertedCitation && (
                        <span className="text-[10px] text-emerald-500 font-mono animate-pulse">
                          +{insertedCitation} Inserted!
                        </span>
                      )}
                    </div>

                    <div className="relative mb-2">
                      <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search passages to cite..."
                        value={capsulePassageSearch}
                        onChange={(e) => setCapsulePassageSearch(e.target.value)}
                        className={`w-full text-[11px] pl-7 pr-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                          isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                        }`}
                      />
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {capsuleFilteredPassages.slice(0, 15).map(([pId, text]) => (
                        <div
                          key={pId}
                          onClick={() => insertPassageCitationIntoPrompt(pId)}
                          className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:border-[#FF5C00] ${
                            isDarkMode ? 'bg-[#151413]/60 border-[#32302C]' : 'bg-white border-[#E8E2D8]'
                          }`}
                          title="Click to insert [Passage-ID] into prompt"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-[#FF5C00] font-semibold">{pId}</span>
                            <span className="text-slate-400 text-[9px]">+ Insert</span>
                          </div>
                          <p className={`text-[10px] line-clamp-1 leading-snug mt-0.5 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                            {text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deep Link to Library */}
                <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
                  <button
                    onClick={() => {
                      setActiveView('library');
                      setIsAttachmentOpen(false);
                    }}
                    className="text-[#FF5C00] hover:underline flex items-center gap-1 font-medium text-[11px]"
                  >
                    <span>Open full Chapter Library</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Conversational Text Input */}
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendPrompt();
            }}
            placeholder={
              selectedCapability === 'slides'
                ? 'Ask OMNIX to create a 6-slide deck for Newton\'s 1st Law..'
                : selectedCapability === 'quizzes'
                ? 'Ask OMNIX to generate an interactive quiz & flashcards..'
                : selectedCapability === 'video'
                ? 'Ask OMNIX to draft a Manim STEM video storyboard..'
                : 'Ask OMNIX to create a slide deck, video, or quiz from your chapter..'
            }
            className={`w-full bg-transparent text-xs sm:text-sm px-2 focus:outline-none placeholder:text-slate-400 ${
              isDarkMode ? 'text-[#F5F2EB]' : 'text-[#18181B]'
            }`}
          />

          {/* Right Action Dropdown & Send Arrow */}
          <div className="flex items-center gap-2 pr-1 shrink-0 relative">
            <div
              onClick={() => setShowCapabilityDropdown(!showCapabilityDropdown)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer select-none ${
                isDarkMode
                  ? 'bg-[#151413] border-[#32302C] text-[#F5F2EB] hover:bg-[#252422]'
                  : 'bg-[#FAF7F2] border-[#E8E2D8] text-[#18181B] hover:bg-slate-100'
              }`}
            >
              <span className="capitalize">{selectedCapability === 'all' ? 'Build' : selectedCapability}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </div>

            {/* Dropdown Menu */}
            {showCapabilityDropdown && (
              <div
                className={`absolute right-10 top-11 py-1.5 w-36 rounded-2xl border shadow-xl z-30 text-left text-xs ${
                  isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
                }`}
              >
                {(['all', 'slides', 'video', 'quizzes', 'diagrams'] as CapabilityType[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCapability(c);
                      setShowCapabilityDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 capitalize transition-colors flex items-center justify-between ${
                      selectedCapability === c
                        ? 'text-[#FF5C00] font-bold'
                        : isDarkMode
                        ? 'text-[#9CA3AF] hover:text-white'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    <span>{c === 'all' ? '✨ All' : c}</span>
                    {selectedCapability === c && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}

            <button
              disabled={isGenerating}
              onClick={handleSendPrompt}
              className="w-8 h-8 rounded-full bg-[#FF5C00] hover:bg-[#e05200] text-white flex items-center justify-center shadow transition-transform active:scale-95 disabled:opacity-50"
              title="Generate"
            >
              {isGenerating ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Capability Quick Pills */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium pt-1 flex-wrap">
          <button
            onClick={() => setSelectedCapability('all')}
            className={`px-3 py-1 rounded-full transition-all border ${
              selectedCapability === 'all'
                ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-sm'
                : isDarkMode
                ? 'bg-[#1E1D1B]/60 border-[#32302C] text-[#9CA3AF] hover:text-white'
                : 'bg-white/70 border-[#E8E2D8] text-[#716D64] hover:text-black shadow-sm'
            }`}
          >
            ✨ All
          </button>
          <button
            onClick={() => setSelectedCapability('slides')}
            className={`px-3 py-1 rounded-full transition-all border ${
              selectedCapability === 'slides'
                ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-sm'
                : isDarkMode
                ? 'bg-[#1E1D1B]/60 border-[#32302C] text-[#9CA3AF] hover:text-white'
                : 'bg-white/70 border-[#E8E2D8] text-[#716D64] hover:text-black shadow-sm'
            }`}
          >
            📊 Slides
          </button>
          <button
            onClick={() => setSelectedCapability('video')}
            className={`px-3 py-1 rounded-full transition-all border ${
              selectedCapability === 'video'
                ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-sm'
                : isDarkMode
                ? 'bg-[#1E1D1B]/60 border-[#32302C] text-[#9CA3AF] hover:text-white'
                : 'bg-white/70 border-[#E8E2D8] text-[#716D64] hover:text-black shadow-sm'
            }`}
          >
            🎬 Video
          </button>
          <button
            onClick={() => setSelectedCapability('quizzes')}
            className={`px-3 py-1 rounded-full transition-all border ${
              selectedCapability === 'quizzes'
                ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-sm'
                : isDarkMode
                ? 'bg-[#1E1D1B]/60 border-[#32302C] text-[#9CA3AF] hover:text-white'
                : 'bg-white/70 border-[#E8E2D8] text-[#716D64] hover:text-black shadow-sm'
            }`}
          >
            🧩 Quizzes
          </button>
          <button
            onClick={() => setSelectedCapability('diagrams')}
            className={`px-3 py-1 rounded-full transition-all border ${
              selectedCapability === 'diagrams'
                ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-sm'
                : isDarkMode
                ? 'bg-[#1E1D1B]/60 border-[#32302C] text-[#9CA3AF] hover:text-white'
                : 'bg-white/70 border-[#E8E2D8] text-[#716D64] hover:text-black shadow-sm'
            }`}
          >
            📐 Diagrams
          </button>
        </div>

        {/* Teacher-ready templates */}
        <div className="pt-6 sm:pt-8 text-left space-y-4 w-full">
          <div>
            <h3 className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-[#F5F2EB]' : 'text-[#18181B]'}`}>
              Teacher-ready templates
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
              Click any template to load its prompt into the creator box above.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* SLIDES */}
            <div
              onClick={() => {
                setSelectedCapability('slides');
                setPromptText('Create a 6-slide classroom presentation with clear learning objectives, core concepts, and teacher speaker notes for each slide.');
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
                isDarkMode
                  ? 'border-[#2B2926] bg-[#181715]/90 hover:border-[#FF5C00]/50'
                  : 'border-[#E8E2D8] bg-white hover:border-[#FF5C00]/50 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[#FF5C00] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Slides</span>
                <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">›</span>
              </div>
              <h4 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#18181B]'}`}>
                Classroom Lecture Presentation
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                6 slides with speaker notes, every point linked to the textbook page
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5C00] mt-3 group-hover:underline">
                Load prompt →
              </span>
            </div>

            {/* VIDEO */}
            <div
              onClick={() => {
                setSelectedCapability('video');
                setPromptText('Draft an animated explainer video script illustrating the core scientific mechanisms step-by-step with narration.');
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
                isDarkMode
                  ? 'border-[#2B2926] bg-[#181715]/90 hover:border-[#FF5C00]/50'
                  : 'border-[#E8E2D8] bg-white hover:border-[#FF5C00]/50 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[#FF5C00] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Video</span>
                <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">›</span>
              </div>
              <h4 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#18181B]'}`}>
                STEM Animation & Voiceover
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                Animated maths and science illustrations with voiceover
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5C00] mt-3 group-hover:underline">
                Load prompt →
              </span>
            </div>

            {/* QUIZZES */}
            <div
              onClick={() => {
                setSelectedCapability('quizzes');
                setPromptText('Generate an interactive assessment with multiple choice questions and review flashcards for classroom practice.');
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
                isDarkMode
                  ? 'border-[#2B2926] bg-[#181715]/90 hover:border-[#FF5C00]/50'
                  : 'border-[#E8E2D8] bg-white hover:border-[#FF5C00]/50 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[#FF5C00] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Quizzes</span>
                <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">›</span>
              </div>
              <h4 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#18181B]'}`}>
                Interactive Quiz & Study Cards
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                Works offline in class, no internet needed for students
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5C00] mt-3 group-hover:underline">
                Load prompt →
              </span>
            </div>

            {/* DIAGRAMS */}
            <div
              onClick={() => {
                setSelectedCapability('diagrams');
                setPromptText('Build a structured concept flowchart organizing the main topics and subordinate definitions.');
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
                isDarkMode
                  ? 'border-[#2B2926] bg-[#181715]/90 hover:border-[#FF5C00]/50'
                  : 'border-[#E8E2D8] bg-white hover:border-[#FF5C00]/50 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[#FF5C00] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Diagrams</span>
                <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">›</span>
              </div>
              <h4 className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#18181B]'}`}>
                Concept Mind Map
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                Visual flowchart showing relationships between key terms
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5C00] mt-3 group-hover:underline">
                Load prompt →
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-[11px] opacity-60">
        OMNIX · Developed for IIT Madras / Commonwealth of Learning (COL) Training of Trainers Programme
      </footer>
    </div>
  );

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
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isUploading ? 'Extracting File...' : 'Upload Chapter Document'}</span>
          </button>
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

  // Dedicated Full-Page Presentation Studio Workspace (Identical to reference spec)
  if (activeView === 'studio') {
    return (
      <SlideStudioView
        project={selectedProject}
        artifact={selectedSlideArtifact || artifacts.find((a) => a.tool_name === 'slides') || null}
        passages={passages}
        isDarkMode={isDarkMode}
        onBack={() => setActiveView('home')}
        onArtifactUpdated={(updated) => {
          setSelectedSlideArtifact(updated);
          setArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }}
      />
    );
  }

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 flex flex-col md:flex-row font-sans overflow-x-hidden ${
        isDarkMode ? 'lovable-mesh-dark text-[#F5F2EB]' : 'lovable-mesh-light text-[#18181B]'
      }`}
    >
      {/* 1. Multi-Stop Blooming Liquid Mesh Aura (Exact Lovable Effect) */}
      <div className="mesh-aura"></div>

      {/* 2. Top Sky Gradient Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none z-0 ${
          isDarkMode ? 'sky-fade-dark' : 'sky-fade-light'
        }`}
      ></div>

      {/* 3. Global Navigation Sidebar: STRICTLY 4 ITEMS (Home, Tools, Library, Settings) */}
      <aside
        className={`hidden md:flex flex-col w-64 shrink-0 border-r backdrop-blur-xl z-20 min-h-screen sticky top-0 h-screen justify-between p-4 transition-colors duration-300 ${
          isDarkMode ? 'bg-[#1E1D1B]/80 border-[#32302C]' : 'bg-white/80 border-[#E8E2D8]'
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
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20">
                  v0.5
                </span>
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

        {/* Bottom: Active Chapter Status & Quick Controls */}
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}>
          {/* Active Chapter Status Pill */}
          {selectedProject ? (
            <div
              onClick={() => setActiveView('library')}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-[#151413]/70 border-[#32302C] hover:border-[#FF5C00]/50'
                  : 'bg-[#FAF7F2] border-[#E8E2D8] hover:border-[#FF5C00]/50 shadow-sm'
              }`}
              title="Active Chapter: Click to inspect in Library"
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-[#FF5C00] flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Active Chapter
                </span>
                {selectedProject.source_filename && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Grounded
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold truncate">{selectedProject.name}</p>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('library')}
              className={`w-full p-2.5 rounded-xl border border-dashed text-xs text-center transition-all ${
                isDarkMode
                  ? 'border-[#32302C] text-[#9CA3AF] hover:border-[#FF5C00]/50'
                  : 'border-[#E8E2D8] text-[#716D64] hover:border-[#FF5C00]/50'
              }`}
            >
              + Select Chapter in Library
            </button>
          )}

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
