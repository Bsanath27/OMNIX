import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  RotateCw,
  Sparkles,
  Layers,
  Palette,
  FileText,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import { ProjectManifest } from '../api';

interface PresentonNativeEmbedProps {
  project?: ProjectManifest | null;
  initialPrompt?: string;
  isDarkMode?: boolean;
  onBack: () => void;
}

export const PresentonNativeEmbed: React.FC<PresentonNativeEmbedProps> = ({
  project,
  initialPrompt = '',
  isDarkMode: _isDarkMode = true,
  onBack,
}) => {
  const [iframeUrl, setIframeUrl] = useState<string>('about:blank');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'running' | 'offline'>('checking');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [showPromptInput, setShowPromptInput] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPromptRef = useRef<string>('');

  const topicTitle = initialPrompt || project?.name || 'Presentation';

  // Create presentation with prompt and redirect to Theme selection stage
  const createAndLaunchDeck = async (promptToUse: string) => {
    setIsLoading(true);
    setServiceStatus('checking');
    try {
      const res = await fetch('/api/tools/presenton/create-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: promptToUse,
          n_slides: 5,
          language: 'en-US',
          generation_mode: 'standard',
        }),
      });

      const data = await res.json();
      if (data.success && data.presentation_id) {
        setPresentationId(data.presentation_id);
        setIframeUrl(data.url);
        setServiceStatus('running');
      } else {
        // Fallback to templates page if creation failed
        setIframeUrl('http://localhost:5001/templates');
        setServiceStatus('running');
      }
    } catch {
      setIframeUrl('http://localhost:5001/templates');
      setServiceStatus('offline');
    }
  };

  useEffect(() => {
    const promptToCarry = initialPrompt.trim() || project?.name || 'Classroom Presentation';
    if (lastPromptRef.current === promptToCarry) return;
    lastPromptRef.current = promptToCarry;
    createAndLaunchDeck(promptToCarry);
  }, [initialPrompt, project]);

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleNavigate = (path: string) => {
    setIsLoading(true);
    setIframeUrl(`http://localhost:5001${path}`);
  };

  const handleStartNewPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setShowPromptInput(false);
    createAndLaunchDeck(customPrompt.trim());
    setCustomPrompt('');
  };

  return (
    <div className="relative h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Seamless OMNIX Chrome Bar */}
      <header className="h-14 px-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Left: Back button & Brand Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Return to OMNIX Home"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to OMNIX</span>
          </button>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">Presenton Studio</span>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono px-1.5 py-0.2 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Official Native (Port 5001)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={topicTitle}>
                  {topicTitle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(topicTitle);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-emerald-400 px-1 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 transition-colors shrink-0"
                  title="Copy topic/prompt to clipboard"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromptInput(!showPromptInput)}
                  className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shrink-0"
                  title="Create new presentation with new prompt"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>New Deck</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Stage Navigation Quick Shortcuts */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800/80 rounded-lg p-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => handleNavigate(presentationId ? `/outline?id=${presentationId}` : '/templates')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              iframeUrl.includes('/outline') || iframeUrl.includes('/templates')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">1. Themes & Templates</span>
            <span className="sm:hidden">1. Themes</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(presentationId ? `/outline?id=${presentationId}` : '/outline')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              iframeUrl.includes('/outline')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">2. Outline & Selection</span>
            <span className="sm:hidden">2. Outline</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(presentationId ? `/presentation?id=${presentationId}` : '/presentation')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              iframeUrl.includes('/presentation')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">3. Slide Studio</span>
            <span className="sm:hidden">3. Studio</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Reload Presenton Canvas"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => window.open(iframeUrl, '_blank')}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors shadow-sm"
            title="Open in Native Browser Tab"
          >
            <span>Open Popout</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* New Deck Prompt Popover */}
      {showPromptInput && (
        <div className="absolute top-14 left-24 z-40 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl w-84 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <form onSubmit={handleStartNewPrompt} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-200">
                Launch Deck with Prompt
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Theme Mode</span>
            </div>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Kinematics and Laws of Motion..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowPromptInput(false)}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customPrompt.trim()}
                className="px-3 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md shadow-sm transition-colors"
              >
                Start at Themes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Full-App Embed Frame */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-10 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-slate-300 font-semibold">Connecting to Presenton with prompt: &ldquo;{topicTitle}&rdquo;</p>
            <p className="text-[11px] text-slate-400">Loading Theme & Template Selection stage...</p>
          </div>
        )}

        {/* Offline Fallback Warning */}
        {serviceStatus === 'offline' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center z-20 gap-4 p-6 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white mb-1">Presenton Service Not Detected</h3>
              <p className="text-xs text-slate-400 max-w-md">
                The local Presenton instance on port 5001 is offline or restarting. Click below to reconnect.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setServiceStatus('checking');
                setIsLoading(true);
                try {
                  const res = await fetch('/api/tools/presenton/status');
                  const data = await res.json();
                  if (data.status === 'running') {
                    setServiceStatus('running');
                    handleReload();
                  } else {
                    setServiceStatus('offline');
                  }
                } catch {
                  setServiceStatus('offline');
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              Start & Reconnect Presenton
            </button>
          </div>
        )}

        {/* Authentic Presenton Application */}
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          title="Presenton Presentation Generator"
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
};
