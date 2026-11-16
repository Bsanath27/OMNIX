import React, { useEffect, useState, useRef } from 'react';
import {
  fetchProjects,
  fetchProject,
  createProject,
  uploadChapterFile,
  fetchPassages,
  runTool,
  ProjectManifest,
  Artifact,
} from '../api';
import { ArtifactCard } from './ArtifactCard';
import {
  Menu,
  X,
  Plus,
  Send,
  Search,
  CheckCircle2,
  Sun,
  Moon,
  Copy,
  BookOpen,
  ChevronDown,
} from 'lucide-react';

type CapabilityType = 'all' | 'slides' | 'video' | 'quizzes' | 'diagrams';

export const ChapterDashboard: React.FC = () => {
  // Theme state: defaults to light (Warm Creme #FAF7F2), can toggle to dark (Warm Charcoal #151413)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Drawer & Project states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Passages & search
  const [passages, setPassages] = useState<Record<string, string>>({});
  const [passageSearch, setPassageSearch] = useState('');
  const [copiedPassageId, setCopiedPassageId] = useState<string | null>(null);

  // Conversational prompt & capability states
  const [selectedCapability, setSelectedCapability] = useState<CapabilityType>('all');
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showCapabilityDropdown, setShowCapabilityDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load projects on startup
  useEffect(() => {
    loadProjects();
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

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
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
    }
  };

  const copyPassageRef = (pId: string) => {
    navigator.clipboard.writeText(`[${pId}]`);
    setCopiedPassageId(pId);
    setTimeout(() => setCopiedPassageId(null), 1500);
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

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 flex flex-col font-sans overflow-x-hidden ${
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

      {/* 3. Foreground Application Canvas */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        {/* Minimalist Top Navigation */}
        <header className="h-16 px-6 sm:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className={`p-2 rounded-xl border transition-all ${
                isDarkMode
                  ? 'bg-[#1E1D1B] border-[#32302C] text-[#9CA3AF] hover:text-white'
                  : 'bg-white border-[#E8E2D8] text-[#716D64] hover:text-black shadow-sm'
              }`}
              title="Toggle Chapter Drawer"
            >
              {isDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#FF5C00] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                Ω
              </div>
              <span className="font-bold text-base tracking-tight">OMNIX</span>
              <span
                className={`hidden sm:inline-block ml-1 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  isDarkMode
                    ? 'bg-[#1E1D1B] text-[#9CA3AF] border border-[#32302C]'
                    : 'bg-[#FAF7F2] text-[#716D64] border border-[#E8E2D8]'
                }`}
              >
                IIT Madras · COL
              </span>
            </div>
          </div>

          {/* Active Chapter Indicator */}
          {selectedProject && (
            <div className="hidden md:flex items-center gap-2 text-xs font-medium">
              <BookOpen className="w-4 h-4 text-[#FF5C00]" />
              <span className="truncate max-w-xs">{selectedProject.name}</span>
              {selectedProject.source_filename && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Grounded
                </span>
              )}
            </div>
          )}

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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
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
            {/* Left '+' Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                isDarkMode
                  ? 'text-[#9CA3AF] hover:text-[#FF5C00] hover:bg-[#252422]'
                  : 'text-slate-400 hover:text-[#FF5C00] hover:bg-orange-50'
              }`}
              title="Attach Textbook File (PDF/DOCX)"
            >
              <Plus className="w-5 h-5 font-light" />
            </button>

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
                        selectedCapability === c ? 'text-[#FF5C00] font-bold' : isDarkMode ? 'text-[#9CA3AF] hover:text-white' : 'text-slate-600 hover:text-black'
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

          {/* Generated Artifacts Stream */}
          {artifacts.length > 0 && (
            <div className="pt-8 text-left space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                  Generated Deliverables ({artifacts.length})
                </h3>
              </div>
              <div className="space-y-4">
                {artifacts.map((art) => (
                  <ArtifactCard key={art.id} artifact={art} />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-5 text-center text-[11px] opacity-60">
          OMNIX · Developed for IIT Madras / Commonwealth of Learning (COL) Training of Trainers Programme
        </footer>
      </div>

      {/* Slide-out Chapters & Passages Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          ></div>
          <div
            className={`relative w-80 max-w-[85vw] h-full shadow-2xl z-50 p-5 flex flex-col space-y-5 overflow-y-auto border-r transition-all ${
              isDarkMode ? 'bg-[#1E1D1B] border-[#32302C]' : 'bg-white border-[#E8E2D8]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: isDarkMode ? '#32302C' : '#E8E2D8' }}
            >
              <h2 className="font-bold text-sm">Chapter Explorer</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chapter Projects List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                  Projects ({projects.length})
                </span>
              </div>

              <div className="flex gap-1.5 mb-2.5">
                <input
                  type="text"
                  placeholder="New chapter..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject(newProjectName);
                      setNewProjectName('');
                    }
                  }}
                  className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                    isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                  }`}
                />
                <button
                  onClick={() => {
                    handleCreateProject(newProjectName);
                    setNewProjectName('');
                  }}
                  className="p-1.5 bg-[#FF5C00] text-white rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.project_id}
                    onClick={() => {
                      setSelectedProject(p);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between ${
                      selectedProject?.project_id === p.project_id
                        ? 'bg-[#FF5C00]/10 text-[#FF5C00] font-semibold border border-[#FF5C00]/30'
                        : isDarkMode
                        ? 'text-[#9CA3AF] hover:bg-[#151413]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.source_filename && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Passages Explorer */}
            {selectedProject && Object.keys(passages).length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#716D64]'}`}>
                  Indexed Passages ({Object.keys(passages).length})
                </span>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter passages..."
                    value={passageSearch}
                    onChange={(e) => setPassageSearch(e.target.value)}
                    className={`w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#FF5C00] ${
                      isDarkMode ? 'bg-[#151413] border-[#32302C]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                    }`}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredPassages.slice(0, 30).map(([pId, text]) => (
                    <div
                      key={pId}
                      onClick={() => copyPassageRef(pId)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isDarkMode
                          ? 'bg-[#151413] border-[#32302C] hover:border-[#FF5C00]'
                          : 'bg-white border-[#E8E2D8] hover:border-[#FF5C00]'
                      }`}
                      title="Click to copy citation tag"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-[#FF5C00] font-semibold">{pId}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Copy className="w-2.5 h-2.5" />
                          {copiedPassageId === pId ? 'Copied!' : 'Cite'}
                        </span>
                      </div>
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDarkMode ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
