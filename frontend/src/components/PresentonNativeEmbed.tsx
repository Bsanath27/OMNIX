import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
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
        setIframeUrl(data.url);
        setServiceStatus('running');
      } else {
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

  return (
    <div className="relative h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Minimal Floating OMNIX Return Button */}
      <button
        type="button"
        onClick={onBack}
        className="absolute top-2.5 left-2.5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/70 shadow-lg backdrop-blur-md transition-all group"
        title="Return to OMNIX Home"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#FF5C00] group-hover:-translate-x-0.5 transition-transform" />
        <span className="font-semibold text-[11px] tracking-tight">OMNIX</span>
      </button>

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
          title="Presenton Presentation Generator"
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
};
