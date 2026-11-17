import React, { useEffect, useState } from 'react';
import { useRouter } from '../router';
import { STRINGS } from '../strings';
import { fetchProject, fetchPassages, ProjectManifest } from '../api';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusDot } from '../components/ui/StatusDot';
import {
  FileText,
  Presentation,
  Video,
  HelpCircle,
  Network,
  Maximize2,
  Minimize2,
  Download,
  Send,
  BookOpen,
  Copy,
  ExternalLink,
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { chapterId, navigate } = useRouter();

  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [passages, setPassages] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('source');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [selectedPassageHighlight, setSelectedPassageHighlight] = useState<string | null>(null);

  // Mock chat messages for educator interaction
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; citations?: string[] }>>([
    {
      id: 'm1',
      role: 'assistant',
      text: 'Welcome to your chapter workspace. What learning materials would you like to build from this chapter today?',
      citations: [],
    },
  ]);

  useEffect(() => {
    if (chapterId) {
      fetchProject(chapterId)
        .then(setProject)
        .catch(() => null);

      fetchPassages(chapterId)
        .then(setPassages)
        .catch(() => null);
    }
  }, [chapterId]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput('');

    const newMsg = {
      id: `m-${Date.now()}`,
      role: 'user' as const,
      text: userText,
    };

    setMessages((prev) => [
      ...prev,
      newMsg,
      {
        id: `m-resp-${Date.now()}`,
        role: 'assistant' as const,
        text: `Understood. Analyzing textbook passages to craft this material grounded in your chapter.`,
        citations: Object.keys(passages).slice(0, 2),
      },
    ]);
  };

  const handleCitationClick = (passageId: string) => {
    setActiveTab('source');
    setSelectedPassageHighlight(passageId);
    setTimeout(() => {
      const el = document.getElementById(`passage-${passageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const tabs: TabItem[] = [
    {
      id: 'source',
      label: STRINGS.workspace.sourceTab,
      icon: <FileText className="w-4 h-4" />,
      badge: Object.keys(passages).length || undefined,
    },
    {
      id: 'slides',
      label: STRINGS.workspace.slidesTab,
      icon: <Presentation className="w-4 h-4" />,
    },
    {
      id: 'video',
      label: STRINGS.workspace.videoTab,
      icon: <Video className="w-4 h-4" />,
    },
    {
      id: 'quiz',
      label: STRINGS.workspace.quizTab,
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      id: 'diagram',
      label: STRINGS.workspace.diagramTab,
      icon: <Network className="w-4 h-4" />,
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-canvas-light dark:bg-canvas-dark text-content-light dark:text-content-dark overflow-hidden transition-colors">
      {/* Top Bar for Chapter Workspace */}
      <header className="h-16 px-6 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-body-sm font-medium text-content-light-muted dark:text-content-dark-muted hover:text-content-light dark:hover:text-content-dark transition-colors"
          >
            <span>←</span>
            <span>All chapters</span>
          </button>
          <span className="text-border-light dark:text-border-dark">|</span>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            <h1 className="text-body font-bold truncate max-w-sm sm:max-w-md">
              {project?.name || 'Chapter Workspace'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusDot status="ready" label="Grounding active" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFocusMode(!isFocusMode)}
            leftIcon={isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          >
            {isFocusMode ? STRINGS.workspace.exitFocus : STRINGS.workspace.focusButton}
          </Button>
        </div>
      </header>

      {/* Main Workspace Body: Left Chat (~40%), Right Artifact (~60%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Chat Pane (Hidden in Focus Projection Mode) */}
        {!isFocusMode && (
          <section className="w-full md:w-[40%] flex flex-col border-r border-border-light dark:border-border-dark bg-surface-light-subtle/30 dark:bg-surface-dark-subtle/30">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-body ${
                      msg.role === 'user'
                        ? 'bg-brand text-white font-medium shadow-sm'
                        : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-content-light dark:text-content-dark shadow-subtle'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border-light dark:border-border-dark flex flex-wrap gap-1.5 items-center">
                        <span className="text-caption text-content-light-subtle dark:text-content-dark-subtle font-medium">
                          Grounded in:
                        </span>
                        {msg.citations.map((c) => (
                          <button
                            key={c}
                            onClick={() => handleCitationClick(c)}
                            className="inline-flex items-center gap-1 text-caption font-mono font-semibold px-2 py-0.5 rounded-lg bg-brand-muted text-brand hover:bg-brand/20 transition-colors"
                            title={STRINGS.workspace.citationJump}
                          >
                            <span>[{c}]</span>
                            <span>↗</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Ask for changes, add slides, or make a quiz..."
                  className="flex-1 bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark rounded-xl px-4 py-2.5 text-body text-content-light dark:text-content-dark placeholder:text-content-light-subtle dark:placeholder:text-content-dark-subtle focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand min-h-[44px]"
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSendMessage}
                  rightIcon={<Send className="w-4 h-4" />}
                >
                  Send
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Right Artifact Panel (~60% normally, 100% in Focus Projection Mode) */}
        <section className={`flex-1 flex flex-col bg-surface-light dark:bg-surface-dark overflow-hidden transition-all duration-200`}>
          {/* Panel Header with Tabs and Actions */}
          <div className="px-6 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-4 shrink-0">
            <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
              >
                {STRINGS.workspace.download}
              </Button>
            </div>
          </div>

          {/* Panel Body Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* 1. Source Tab: Extracted Passages (Key Differentiator) */}
            {activeTab === 'source' && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="p-4 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-brand" />
                    <div>
                      <h3 className="text-body font-semibold">Chapter Grounding Passages</h3>
                      <p className="text-body-sm text-content-light-muted dark:text-content-dark-muted">
                        {STRINGS.workspace.sourceDescription}
                      </p>
                    </div>
                  </div>
                  <span className="text-caption font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {Object.keys(passages).length} Passages Extracted
                  </span>
                </div>

                {Object.keys(passages).length === 0 ? (
                  <EmptyState
                    icon={<FileText className="w-6 h-6" />}
                    title="No passages extracted yet"
                    description="Upload a chapter PDF or Word document to view extracted textbook passages with citation markers."
                  />
                ) : (
                  <div className="space-y-3">
                    {Object.entries(passages).map(([pid, text]) => {
                      const isHighlighted = selectedPassageHighlight === pid;
                      return (
                        <div
                          key={pid}
                          id={`passage-${pid}`}
                          className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                            isHighlighted
                              ? 'border-brand bg-brand-muted/20 ring-2 ring-brand/40 shadow-sm'
                              : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-border-light-strong dark:hover:border-border-dark-strong'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-body-sm font-bold text-brand">
                              [{pid}]
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`[${pid}]`);
                                alert(`Copied citation [${pid}]`);
                              }}
                              className="inline-flex items-center gap-1 text-caption font-medium text-content-light-muted dark:text-content-dark-muted hover:text-brand"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy citation</span>
                            </button>
                          </div>
                          <p className="text-body leading-relaxed text-content-light dark:text-content-dark font-serif">
                            {text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Slides Tab */}
            {activeTab === 'slides' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="aspect-[16/9] w-full rounded-2xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark shadow-card p-8 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-bold uppercase tracking-wider text-brand">
                        Slide 1 of 6 · Introduction
                      </span>
                      <span className="text-caption font-mono px-2 py-0.5 rounded bg-brand-muted text-brand font-semibold">
                        Grounded in [P01-S01]
                      </span>
                    </div>
                    <h2 className="text-display font-extrabold tracking-tight">
                      {project?.name || 'Fundamental Principles'}
                    </h2>
                    <ul className="space-y-3 pt-3">
                      <li className="flex items-start gap-3 text-body font-normal">
                        <span className="text-brand font-bold">•</span>
                        <span>Core chapter concepts organized into clear teaching sequences.</span>
                      </li>
                      <li className="flex items-start gap-3 text-body font-normal">
                        <span className="text-brand font-bold">•</span>
                        <span>Key definitions and equations linked directly to textbook pages.</span>
                      </li>
                      <li className="flex items-start gap-3 text-body font-normal">
                        <span className="text-brand font-bold">•</span>
                        <span>Prepared for high-legibility classroom projection.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Speaker Notes */}
                  <div className="p-3.5 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-body-sm text-content-light-muted dark:text-content-dark-muted">
                    <strong className="text-content-light dark:text-content-dark">Teacher Notes: </strong>
                    Introduce this core unit to students. Point out the primary learning outcome before working through derivations.
                  </div>
                </div>

                {/* Approve / Reprompt action bar */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border-light dark:border-border-dark bg-surface-light-subtle/40 dark:bg-surface-dark-subtle/40">
                  <div className="flex items-center gap-2">
                    <StatusDot status="review" label="Draft ready for teacher review" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Button variant="secondary" size="sm">
                      {STRINGS.workspace.repromptButton}
                    </Button>
                    <Button variant="primary" size="sm">
                      {STRINGS.workspace.approveButton}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Video Tab */}
            {activeTab === 'video' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="aspect-[16/9] w-full rounded-2xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark shadow-card flex items-center justify-center p-8 text-center">
                  <div className="space-y-3 max-w-md">
                    <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
                      <Video className="w-6 h-6" />
                    </div>
                    <h3 className="text-h3 font-bold">STEM Explainer Animation</h3>
                    <p className="text-body text-content-light-muted dark:text-content-dark-muted">
                      Animated mathematical coordinates and scientific processes with synchronized local voiceover narration.
                    </p>
                    <Button variant="primary" size="md">
                      Render Video Storyboard
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Quiz Tab */}
            {activeTab === 'quiz' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-semibold uppercase tracking-wider text-brand">
                        Question 1 · Multiple Choice
                      </span>
                      <span className="text-caption font-mono px-2 py-0.5 rounded bg-brand-muted text-brand">
                        [P01-S02]
                      </span>
                    </div>
                    <h3 className="text-h3 font-semibold">
                      Which of the following correctly describes the main principle introduced in this section?
                    </h3>
                    <div className="space-y-2 pt-1">
                      {['Option A: It is inversely proportional to temperature', 'Option B: It remains constant in an isolated system (Correct)', 'Option C: It vanishes at absolute zero'].map((opt, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-body-sm font-medium ${
                            idx === 1
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      {STRINGS.workspace.openPlayer}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Diagram Tab */}
            {activeTab === 'diagram' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-8 rounded-2xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark text-center">
                  <Network className="w-10 h-10 text-brand mx-auto mb-3" />
                  <h3 className="text-h3 font-bold mb-1">Concept Flowchart & Mind Map</h3>
                  <p className="text-body text-content-light-muted dark:text-content-dark-muted max-w-md mx-auto mb-5">
                    Clear visual relationship mapping of all terms and definitions extracted from the chapter.
                  </p>
                  <Button variant="secondary" size="md">
                    Generate Concept Chart
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
