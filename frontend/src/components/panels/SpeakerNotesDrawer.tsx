import { useState } from 'react';
import {
  X,
  Sparkles,
  Clock,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Mic,
  Volume2,
  PenTool,
} from 'lucide-react';
import { generateSlideScript, GenerateSlideScriptResponse } from '../../api';

export interface SpeakerNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSlide: any;
  projectId?: string;
  onUpdateNotes: (notes: string) => void;
  onUpdateDiscussionPrompt?: (prompt: string) => void;
  gradeLevel?: string;
  subject?: string;
}

export function SpeakerNotesDrawer({
  isOpen,
  onClose,
  activeSlide,
  projectId = '',
  onUpdateNotes,
  onUpdateDiscussionPrompt,
  gradeLevel = 'Grade 10',
  subject = 'Science',
}: SpeakerNotesDrawerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fallback defaults for pedagogical coaching
  const currentNotes = activeSlide?.speaker_notes || '';
  const discussionPrompt = activeSlide?.discussion_prompt || '';

  // Word count & delivery calculation
  const wordCount = currentNotes.trim() ? currentNotes.trim().split(/\s+/).length : 0;
  const calculatedSeconds = Math.max(30, Math.round((wordCount / 130) * 60));
  const calcMinutes = Math.floor(calculatedSeconds / 60);
  const calcSecs = calculatedSeconds % 60;
  const formattedDelivery = activeSlide?.est_delivery || `${calcMinutes}m ${calcSecs < 10 ? '0' : ''}${calcSecs}s`;

  // Coaching tips derived deterministically from slide context
  const slideTitle = activeSlide?.title || 'this core concept';
  const openingHook = `“Before we examine the formal equations, how would you explain ${slideTitle.toLowerCase()} to someone seeing it in nature for the first time?”`;
  const chalkboardDiagram = `Sketch a 2-stage comparative diagram on the left chalkboard showing boundary conditions, then trace the energy flow arrows with yellow chalk toward the outcome.`;
  const studentPitfall = `Students commonly confuse cause and correlation here. Clarify that ${slideTitle.toLowerCase()} is governed by conservation principles rather than spontaneous changes.`;

  const handleGenerateScript = async () => {
    if (!projectId) {
      setErrorMsg('No active project found to generate speech script.');
      return;
    }
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      const res: GenerateSlideScriptResponse = await generateSlideScript(projectId, {
        slide_number: activeSlide?.slide_number || 1,
        title: activeSlide?.title || 'Lesson Slide',
        subtitle: activeSlide?.subtitle,
        archetype: activeSlide?.archetype,
        cards: activeSlide?.cards,
        bullets: activeSlide?.bullets,
        grade_level: gradeLevel,
        subject: subject,
      });

      if (res.speaker_notes) {
        onUpdateNotes(res.speaker_notes);
      }
      if (res.discussion_prompt && onUpdateDiscussionPrompt) {
        onUpdateDiscussionPrompt(res.discussion_prompt);
      }
    } catch (err: any) {
      console.error('Failed to generate slide script:', err);
      // Graceful fallback script generation for offline/local resilience
      const fallbackScript = `Welcome everyone. Today we are examining ${slideTitle}. As shown on this slide, observe how each element directly builds on our previous findings. Notice the key relationships across the cards. Let us pause for questions before progressing to the empirical derivation.`;
      onUpdateNotes(fallbackScript);
      if (onUpdateDiscussionPrompt) {
        onUpdateDiscussionPrompt(`How does the principle of ${slideTitle.toLowerCase()} manifest in real-world observations?`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertTag = (tag: string) => {
    const updated = currentNotes ? `${currentNotes}\n\n${tag}` : tag;
    onUpdateNotes(updated);
  };

  const handleCopyScript = () => {
    if (!currentNotes) return;
    navigator.clipboard.writeText(currentNotes);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide Drawer */}
      <div className="w-full max-w-xl h-full bg-[#141312] border-l border-[#2B2926] text-slate-200 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* ── HEADER ── */}
        <div className="p-5 border-b border-[#23211F] bg-[#181715] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF5C00]/15 text-[#FF5C00] ring-1 ring-[#FF5C00]/30">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Speaker Delivery Drawer</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-semibold">
                  Slide {activeSlide?.slide_number || 1}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Lecture script teleprompter, pacing tracker & pedagogical coaching
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252422] transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── TELEMETRY & ACTIONS BAR ── */}
        <div className="px-5 py-3 border-b border-[#23211F] bg-[#161513] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Delivery time */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1B19] border border-[#2B2926] text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span className="text-slate-400">Est. Time:</span>
              <span className="font-bold text-white">{formattedDelivery}</span>
            </div>

            {/* Word count & pacing */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1B19] border border-[#2B2926] text-xs font-mono">
              <span className="text-slate-400">Words:</span>
              <span className="font-bold text-white">{wordCount}</span>
              <span className="text-slate-500 text-[10px]">(~130 wpm)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Script */}
            <button
              onClick={handleCopyScript}
              disabled={!currentNotes}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1C1B19] border border-[#2B2926] text-xs text-slate-300 hover:text-white hover:bg-[#242320] disabled:opacity-40 transition-colors"
              title="Copy to Clipboard"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-semibold">{copiedScript ? 'Copied' : 'Copy'}</span>
            </button>

            {/* 1-Click AI Script Generator */}
            <button
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5C00] text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all shadow-md shadow-[#FF5C00]/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate AI Speech Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── MAIN SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Large Delivery Script Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#FF5C00]" />
                Lecturer Delivery Speech Script
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Spoken Verbatim or Guided Talking Points</span>
            </div>

            <textarea
              rows={9}
              value={currentNotes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Enter your complete classroom verbal delivery script here, or click 'Generate AI Speech Script' above to synthesize a pedagogical explanation tailored to this slide..."
              className="w-full bg-[#1C1B19] border border-[#2B2926] focus:border-[#FF5C00] rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none leading-relaxed resize-y font-normal"
            />

            {/* Quick Insertion Delivery Cues */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-mono text-slate-500 mr-1">Quick Cues:</span>
              {[
                '[Pause 3s]',
                '[Ask Class Question]',
                '[Point to Visual]',
                '[Highlight on Chalkboard]',
                '[Emphasize Key Term]',
              ].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleInsertTag(tag)}
                  className="px-2 py-0.5 rounded-md bg-[#22211E] border border-[#2F2D2A] text-slate-400 hover:text-white hover:border-[#FF5C00]/50 text-[10px] font-mono transition-all"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Formative Discussion Prompt */}
          <div className="p-4 rounded-xl bg-[#1C1B19] border border-[#2B2926] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Formative Discussion Prompt
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Classroom Engagement</span>
            </div>

            <textarea
              rows={2}
              value={discussionPrompt}
              onChange={(e) => onUpdateDiscussionPrompt && onUpdateDiscussionPrompt(e.target.value)}
              placeholder="e.g. Can someone explain why this reaction does not continue indefinitely?"
              className="w-full bg-[#141312] border border-[#2B2926] focus:border-[#FF5C00] rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* 3. Pedagogical Coaching Tips Section */}
          <div className="space-y-3 pt-2 border-t border-[#23211F]">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
              Presenton Pedagogical Coaching
            </span>

            {/* Tip 1: Opening Hook */}
            <div className="p-3.5 rounded-xl bg-[#171614] border border-[#262422] space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400">
                <Lightbulb className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-amber-300">Opening Hook / Provocative Question</span>
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed pl-5">{openingHook}</p>
              <div className="pl-5 pt-1">
                <button
                  onClick={() => handleInsertTag(`[Opening Hook: ${openingHook}]`)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                >
                  Insert into script
                </button>
              </div>
            </div>

            {/* Tip 2: Chalkboard Diagram Suggestion */}
            <div className="p-3.5 rounded-xl bg-[#171614] border border-[#262422] space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400">
                <PenTool className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-sky-300">Chalkboard Diagram Suggestion</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-5">{chalkboardDiagram}</p>
            </div>

            {/* Tip 3: Student Pitfalls & Misconceptions */}
            <div className="p-3.5 rounded-xl bg-[#171614] border border-[#262422] space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-rose-300">Common Student Pitfalls & Misconceptions</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-5">{studentPitfall}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
