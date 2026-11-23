import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Loader2,
  ArrowLeft,
  RotateCcw,
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
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'running' | 'offline'>('checking');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPromptRef = useRef<string>('');

  const topicTitle = initialPrompt || project?.name || 'Presentation';

  // Create presentation with prompt and redirect to Theme selection stage
  const createAndLaunchDeck = async (promptToUse: string) => {
    setIsLoading(true);
    setServiceStatus('checking');
    try {
      const res = await fetch('/api/tools/slides/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: promptToUse,
          n_slides: 7,
          language: 'en-US',
          generation_mode: 'standard',
          project_id: project?.project_id || undefined,
        }),
      });

      const withCacheBust = (url: string) => {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}_omnix=${Date.now()}`;
      };

      const data = await res.json();
      if (data.success && data.presentation_id) {
        setIframeUrl(withCacheBust(data.url));
        setServiceStatus('running');
      } else {
        setIframeUrl(withCacheBust('http://localhost:5001/templates'));
        setServiceStatus('running');
      }
    } catch {
      setIframeUrl(`http://localhost:5001/templates?_omnix=${Date.now()}`);
      setServiceStatus('offline');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OMNIX_NAVIGATE_BACK') {
        onBack();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onBack]);

  useEffect(() => {
    // If opening an existing project with an active presentation and no new prompt was typed:
    const existingSlideArt = project?.artifacts
      ? Object.values(project.artifacts).find(
          (a) => a.tool_name === 'slides' && a.source_data?.presentation_id
        )
      : null;

    if (existingSlideArt?.source_data?.presentation_id && !initialPrompt.trim()) {
      const presId = existingSlideArt.source_data.presentation_id;
      setIframeUrl(`http://localhost:5001/presentation?id=${presId}&_omnix=${Date.now()}`);
      setServiceStatus('running');
      setIsLoading(false);
      return;
    }

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

  return (
    <div className="relative h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-12 px-4 border-b border-slate-800 bg-[#111318] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FF5C00]" />
            <span>Back to OMNIX</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5C00]" />
            <h2 className="text-xs font-bold text-white truncate max-w-md">
              {topicTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Presenton Engine (Port 5001)
          </span>
          <button
            onClick={handleReload}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Reload Studio Frame"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Full-App Embed Frame (100% Height & Width) */}
      <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-10 gap-3">
            <Loader2 className="w-8 h-8 text-[#FF5C00] animate-spin" />
            <p className="text-xs text-slate-300 font-semibold">Loading Presenton with prompt: &ldquo;{topicTitle}&rdquo;</p>
            <p className="text-[11px] text-slate-400">Opening Theme Selection...</p>
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
              className="px-4 py-2 bg-[#FF5C00] hover:bg-[#e05200] text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              Start & Reconnect Presenton
            </button>
          </div>
        )}

        {/* Authentic Presenton Application */}
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          title="OMNIX Slide Studio"
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
};
