import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../router';
import { useProjects } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { STRINGS } from '../strings';
import {
  Sparkles,
  Plus,
  Send,
  ChevronDown,
  Paperclip,
  Check,
  FileCheck,
  ArrowRight,
  Presentation,
  Video,
  FileQuestion,
  Network,
  X,
} from 'lucide-react';

type ToolCapability = 'all' | 'slides' | 'video' | 'quizzes' | 'diagrams';

interface TemplateCard {
  id: string;
  tool: ToolCapability;
  title: string;
  prompt: string;
  benefit: string;
}

const TEMPLATES: TemplateCard[] = [
  {
    id: 't-slides',
    tool: 'slides',
    title: 'Classroom Lecture Presentation',
    benefit: '6 slides with speaker notes, every point linked to the textbook page',
    prompt: 'Create a 6-slide classroom presentation with clear learning objectives, core concepts, and teacher speaker notes for each slide.',
  },
  {
    id: 't-video',
    tool: 'video',
    title: 'STEM Animation & Voiceover',
    benefit: 'Animated maths and science illustrations with voiceover',
    prompt: 'Draft an animated explainer video script illustrating the core scientific mechanisms step-by-step with narration.',
  },
  {
    id: 't-quiz',
    tool: 'quizzes',
    title: 'Interactive Quiz & Study Cards',
    benefit: 'Works offline in class, no internet needed for students',
    prompt: 'Generate an interactive assessment with multiple choice questions and review flashcards for classroom practice.',
  },
  {
    id: 't-diagram',
    tool: 'diagrams',
    title: 'Concept Mind Map',
    benefit: 'Visual flowchart showing relationships between key terms',
    prompt: 'Build a structured concept flowchart organizing the main topics and subordinate definitions.',
  },
];

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();
  const { isDark } = useTheme();
  const { projects, selectedProject, setSelectedProject, createNewChapter } = useProjects();

  const [prompt, setPrompt] = useState('');
  const [selectedTool, setSelectedTool] = useState<ToolCapability>('all');
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentPopoverRef = useRef<HTMLDivElement | null>(null);
  const toolDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        attachmentPopoverRef.current &&
        !attachmentPopoverRef.current.contains(e.target as Node)
      ) {
        setIsAttachmentOpen(false);
      }
      if (
        toolDropdownRef.current &&
        !toolDropdownRef.current.contains(e.target as Node)
      ) {
        setShowToolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
      setIsAttachmentOpen(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && !attachedFile) {
      promptInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      let targetProject = selectedProject;

      // If user uploaded a new file or has no project, create a new chapter
      if (attachedFile || !targetProject) {
        const title = attachedFile
          ? attachedFile.name.replace(/\.[^/.]+$/, '')
          : prompt.trim().slice(0, 40) || 'New Chapter';
        targetProject = await createNewChapter(title, attachedFile || undefined);
      }

      if (targetProject) {
        navigate(`/c/${targetProject.project_id}`);
      }
    } catch (err) {
      console.error('Failed to submit prompt', err);
      alert('Could not start project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateClick = (template: TemplateCard) => {
    setSelectedTool(template.tool);
    setPrompt(template.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    promptInputRef.current?.focus();
  };

  const getPlaceholder = () => {
    if (selectedTool === 'slides') return 'Ask OMNIX to create a 6-slide presentation from your chapter...';
    if (selectedTool === 'video') return 'Ask OMNIX to draft an animated STEM explainer video script...';
    if (selectedTool === 'quizzes') return 'Ask OMNIX to generate an interactive quiz & flashcards...';
    if (selectedTool === 'diagrams') return 'Ask OMNIX to build a concept mind map or flowchart...';
    return 'Ask OMNIX to create a slide deck, video, or quiz from your chapter...';
  };

  return (
    <div className="relative min-h-screen bg-canvas-light dark:bg-canvas-dark text-content-light dark:text-content-dark transition-colors">
      {/* Contained Hero Mesh Gradient (Restricted to hero header area, fading before fold) */}
      <div className={isDark ? 'hero-mesh-dark' : 'hero-mesh-light'} />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center">
        {/* Hero Headline & Subtitle */}
        <div className="text-center space-y-4 mb-8 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-subtle text-caption font-semibold uppercase tracking-wider text-brand">
            <Sparkles className="w-3.5 h-3.5" />
            {STRINGS.app.programme}
          </div>
          <h1 className="text-hero-sm sm:text-hero font-extrabold tracking-tight text-content-light dark:text-content-dark">
            {STRINGS.home.heroTitle}
          </h1>
          <p className="text-body sm:text-h3 text-content-light-muted dark:text-content-dark-muted max-w-2xl mx-auto font-normal leading-relaxed">
            {STRINGS.home.heroSubtitle}
          </p>
        </div>

        {/* Attached file indicator badge */}
        {attachedFile && (
          <div className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-full border border-brand/30 text-xs font-medium animate-in fade-in">
            <FileCheck className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-xs">{attachedFile.name}</span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="ml-1 hover:text-content-light dark:hover:text-content-dark"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Reverted Prompt Bar: Sleek Lovable Floating Pill Capsule */}
        <div className="w-full max-w-2xl mx-auto mb-5 relative">
          <div className="relative rounded-full p-2 flex items-center justify-between border bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark shadow-lg shadow-black/5 dark:shadow-black/20 focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand transition-all">
            {/* Left '+' Attachment Button with Relocated Chapter & File Popover */}
            <div className="relative shrink-0" ref={attachmentPopoverRef}>
              <button
                type="button"
                onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  isAttachmentOpen
                    ? 'bg-brand text-white'
                    : 'text-content-light-subtle dark:text-content-dark-subtle hover:text-brand hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle'
                }`}
                title="Attach Document or Select Chapter"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Attachment Popover (drops down cleanly below the + button) */}
              {isAttachmentOpen && (
                <div className="absolute top-full mt-2.5 left-0 w-72 sm:w-80 rounded-2xl shadow-2xl z-50 p-4 border bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-left space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Attach or Select Chapter</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAttachmentOpen(false)}
                      className="p-1 text-content-light-subtle hover:text-content-light dark:hover:text-content-dark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Quick File Upload */}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border-light dark:border-border-dark hover:border-brand bg-surface-light-subtle dark:bg-surface-dark-subtle flex items-center justify-center gap-2 text-xs font-semibold text-content-light dark:text-content-dark transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand" />
                      <span>Upload Document (PDF/DOCX)</span>
                    </button>
                  </div>

                  {/* 2. Active Chapter Switcher from real backend data */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-content-light-subtle dark:text-content-dark-subtle mb-1.5">
                      Active Chapter ({projects.length})
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {projects.length === 0 ? (
                        <div className="p-2 text-center text-xs text-content-light-subtle dark:text-content-dark-subtle">
                          No chapters found
                        </div>
                      ) : (
                        projects.map((p) => {
                          const isSelected = selectedProject?.project_id === p.project_id;
                          return (
                            <button
                              key={p.project_id}
                              type="button"
                              onClick={() => {
                                setSelectedProject(p);
                                setIsAttachmentOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-brand/10 text-brand font-semibold'
                                  : 'text-content-light dark:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle'
                              }`}
                            >
                              <span className="truncate max-w-[180px]">{p.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Deep Link to Chapters Page */}
                  <div className="pt-2 border-t border-border-light dark:border-border-dark">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachmentOpen(false);
                        navigate('/chapters');
                      }}
                      className="text-brand hover:underline flex items-center gap-1 font-semibold text-xs"
                    >
                      <span>View all chapter projects</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Conversational Text Input */}
            <input
              type="text"
              ref={promptInputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder={getPlaceholder()}
              className="w-full bg-transparent text-xs sm:text-sm px-3 focus:outline-none placeholder:text-content-light-subtle dark:placeholder:text-content-dark-subtle text-content-light dark:text-content-dark"
            />

            {/* Right Action Dropdown & Send Arrow */}
            <div className="flex items-center gap-2 pr-1 shrink-0 relative" ref={toolDropdownRef}>
              <div
                onClick={() => setShowToolDropdown(!showToolDropdown)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark-subtle text-content-light dark:text-content-dark hover:border-brand/40 cursor-pointer select-none transition-colors"
              >
                <span className="capitalize">{selectedTool === 'all' ? 'Build' : selectedTool}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </div>

              {/* Tool Dropdown Menu */}
              {showToolDropdown && (
                <div className="absolute right-0 top-full mt-2.5 py-1.5 w-44 rounded-2xl border bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark shadow-xl z-50 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: 'all' as ToolCapability, label: '✨ Complete package' },
                    { id: 'slides' as ToolCapability, label: 'Slide deck' },
                    { id: 'video' as ToolCapability, label: 'Explainer video' },
                    { id: 'quizzes' as ToolCapability, label: 'Quiz & flashcards' },
                    { id: 'diagrams' as ToolCapability, label: 'Concept diagram' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedTool(item.id);
                        setShowToolDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 transition-colors flex items-center justify-between ${
                        selectedTool === item.id
                          ? 'text-brand font-bold bg-brand/10'
                          : 'text-content-light dark:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle'
                      }`}
                    >
                      <span>{item.label}</span>
                      {selectedTool === item.id && <Check className="w-3.5 h-3.5 text-brand" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Circular Send Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit()}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand hover:bg-brand-hover active:bg-brand-active text-white flex items-center justify-center shadow-sm shadow-brand/20 transition-transform active:scale-95 disabled:opacity-50"
                title="Generate"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tool Chips Below Box */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          {[
            { id: 'all' as ToolCapability, label: STRINGS.home.tools.all.label, icon: Sparkles },
            { id: 'slides' as ToolCapability, label: STRINGS.home.tools.slides.label, icon: Presentation },
            { id: 'video' as ToolCapability, label: STRINGS.home.tools.video.label, icon: Video },
            { id: 'quizzes' as ToolCapability, label: STRINGS.home.tools.quizzes.label, icon: FileQuestion },
            { id: 'diagrams' as ToolCapability, label: STRINGS.home.tools.diagrams.label, icon: Network },
          ].map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-brand/10 text-brand border-brand/40 shadow-sm'
                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-content-light-muted dark:text-content-dark-muted hover:border-brand/40 hover:text-content-light dark:hover:text-content-dark'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-brand' : 'opacity-70'}`} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Template Gallery on Scroll */}
        <div className="w-full max-w-4xl space-y-6 pt-6">
          <div className="space-y-1">
            <h2 className="text-h3 font-bold text-content-light dark:text-content-dark">
              {STRINGS.home.templatesHeading}
            </h2>
            <p className="text-body-sm text-content-light-muted dark:text-content-dark-muted">
              {STRINGS.home.templatesSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => handleTemplateClick(tmpl)}
                className="group p-5 rounded-2xl border bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-brand/60 hover:shadow-sm cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                    {tmpl.tool}
                  </span>
                  <ChevronDown className="w-4 h-4 text-content-light-subtle dark:text-content-dark-subtle -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="font-bold text-body text-content-light dark:text-content-dark group-hover:text-brand transition-colors mb-1">
                  {tmpl.title}
                </h3>
                <p className="text-caption text-content-light-muted dark:text-content-dark-muted mb-3 leading-relaxed">
                  {tmpl.benefit}
                </p>
                <div className="text-caption font-semibold text-brand flex items-center gap-1 group-hover:underline">
                  <span>Load prompt</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subtle Footer (Readable, off the gradient) */}
        <footer className="mt-20 pt-8 pb-4 text-center text-caption text-content-light-subtle dark:text-content-dark-subtle border-t border-border-light dark:border-border-dark w-full max-w-4xl">
          {STRINGS.app.name} · Designed for educators in the Training of Trainers programme.
        </footer>
      </div>
    </div>
  );
};
