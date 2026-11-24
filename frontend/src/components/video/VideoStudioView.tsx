import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Film,
  Download,
  ArrowLeft,
  Sliders,
  Clock,
  Layers,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
  Video as VideoIcon,
} from 'lucide-react';
import {
  SceneItem,
  PlanScriptResponse,
  VideoJobStatus,
  planVideoScript,
  regenerateVideoScene,
  startBatchVideoGeneration,
  getVideoJobStatus,
} from '../../api';

interface VideoStudioViewProps {
  initialTopic?: string;
  isDarkMode?: boolean;
  onBack: () => void;
}

type Step = 'prompt' | 'script' | 'storyboard' | 'output';

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({
  initialTopic = '',
  isDarkMode = false,
  onBack,
}) => {
  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<Step>('prompt');

  // Step 1: Prompt & Options
  const [topic, setTopic] = useState(initialTopic || '');
  const [level, setLevel] = useState<'ELI5' | 'normal' | 'advanced'>('normal');
  const [style, setStyle] = useState<'diffusion' | 'manim'>('diffusion');
  const [duration, setDuration] = useState<number>(60);
  const [isPlanning, setIsPlanning] = useState(false);

  // Step 2 & 3: Script & Storyboard Data
  const [scriptData, setScriptData] = useState<PlanScriptResponse | null>(null);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [editingNarrationId, setEditingNarrationId] = useState<number | null>(null);
  const [tempNarration, setTempNarration] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  // Step 4: Batch Job & Output
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VideoJobStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-plan if initial topic provided
  useEffect(() => {
    if (initialTopic && !scriptData && !isPlanning) {
      handlePlanScript(initialTopic);
    }
  }, [initialTopic]);

  // Polling for batch generation job
  useEffect(() => {
    if (!jobId || !isGenerating) return;

    const interval = setInterval(async () => {
      try {
        const status = await getVideoJobStatus(jobId);
        setJobStatus(status);
        if (status.status === 'completed') {
          setIsGenerating(false);
          setCurrentStep('output');
          clearInterval(interval);
        } else if (status.status === 'failed') {
          setIsGenerating(false);
          setErrorMessage(status.error || 'Video generation failed.');
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Job polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, isGenerating]);

  // Step 1 -> 2: Plan Script
  const handlePlanScript = async (customTopic?: string) => {
    const topicToUse = customTopic || topic;
    if (!topicToUse.trim()) return;
    setIsPlanning(true);
    setErrorMessage(null);
    try {
      const plan = await planVideoScript(topicToUse, level, style, duration);
      setScriptData(plan);
      // Initialize scenes with pending status
      setScenes(plan.scenes.map((s) => ({ ...s, status: 'approved' })));
      setCurrentStep('script');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate script outline');
    } finally {
      setIsPlanning(false);
    }
  };

  // Step 2: Edit Narration
  const saveNarration = (id: number) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, narration: tempNarration } : s))
    );
    setEditingNarrationId(null);
  };

  // Step 3: Confirm / Deny / Regenerate card
  const toggleCardApproval = (id: number) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'approved' ? 'denied' : 'approved' }
          : s
      )
    );
  };

  const handleRegenerateScene = async (scene: SceneItem) => {
    setRegeneratingId(scene.id);
    try {
      const updated = await regenerateVideoScene(scene);
      setScenes((prev) => prev.map((s) => (s.id === scene.id ? updated : s)));
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Step 3 -> 4: Trigger Batch Generation
  const handleStartGeneration = async () => {
    const approved = scenes.filter((s) => s.status === 'approved');
    if (approved.length === 0) {
      alert('Please approve at least one storyboard scene.');
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    setCurrentStep('output');
    try {
      const res = await startBatchVideoGeneration(scriptData?.title || topic, scenes);
      setJobId(res.job_id);
      setJobStatus({
        job_id: res.job_id,
        title: scriptData?.title || topic,
        status: 'processing',
        progress: 5.0,
        current_step: 'Preparing scene prompts & audio tracks...',
      });
    } catch (err: any) {
      setIsGenerating(false);
      setErrorMessage(err.message || 'Failed to start batch generation');
    }
  };

  const approvedCount = scenes.filter((s) => s.status === 'approved').length;
  const totalDurationEst = scenes
    .filter((s) => s.status === 'approved')
    .reduce((acc, s) => acc + s.duration_seconds, 0);

  // Background and theme classes
  const bgMain = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBg = isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bgMain} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Header & Breadcrumb */}
      <header className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'} backdrop-blur sticky top-0 z-40 px-6 py-4`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg border transition ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <VideoIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold flex items-center gap-2">
                  OMNIX Video Studio
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Leap Engine
                  </span>
                </h1>
                <p className={`text-xs ${mutedText}`}>Human-in-the-loop Storyboard & Cloud Diffusion Pipeline</p>
              </div>
            </div>
          </div>

          {/* Step Progress Pill Bar */}
          <div className={`hidden md:flex items-center space-x-1 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} text-xs font-medium`}>
            {[
              { id: 'prompt', label: '1. Prompt', icon: Sparkles },
              { id: 'script', label: '2. Script', icon: Edit3 },
              { id: 'storyboard', label: '3. Storyboard', icon: Layers },
              { id: 'output', label: '4. Video', icon: Film },
            ].map((stepItem) => {
              const isActive = currentStep === stepItem.id;
              const Icon = stepItem.icon;
              return (
                <button
                  key={stepItem.id}
                  disabled={stepItem.id === 'script' && !scriptData}
                  onClick={() => setCurrentStep(stepItem.id as Step)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : `${mutedText} hover:text-slate-200 disabled:opacity-40`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {stepItem.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="max-w-6xl w-full mx-auto p-6 flex-1 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: PROMPT & PEDAGOGICAL CONFIGURATION (Leap Style)      */}
        {/* ============================================================ */}
        {currentStep === 'prompt' && (
          <div className="max-w-3xl mx-auto space-y-8 py-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">What educational concept would you like to animate?</h2>
              <p className={`text-sm ${mutedText}`}>
                Enter any scientific theory, mathematical theorem, or historical concept. Leap will formulate a progressive storyboard with synchronized narration.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${cardBg} space-y-6 shadow-xl`}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-blue-500">Video Topic or Question</label>
                <textarea
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Why doesn't the Moon crash into Earth? Explain Newton's cannonball and orbital velocity..."
                  className={`w-full p-4 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none ${inputBg}`}
                />
              </div>

              {/* Suggestions Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={mutedText}>Popular ideas:</span>
                {[
                  "Why the Moon Doesn't Fall to Earth",
                  "Newton's Cannonball Thought Experiment",
                  "Photosynthesis & Solar Energy Conversion",
                  "How Black Holes Warp Spacetime",
                ].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setTopic(sug)}
                    className={`px-2.5 py-1 rounded-lg border transition ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 hover:border-blue-500/50' : 'border-slate-200 bg-slate-100 hover:border-blue-400'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/40">
                {/* Level Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" /> Explanation Level
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950 text-xs">
                    {(['ELI5', 'normal', 'advanced'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={`py-1.5 rounded-md font-medium capitalize transition ${
                          level === lvl ? 'bg-blue-600 text-white' : `${mutedText} hover:text-white`
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-indigo-400" /> Visual Style
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950 text-xs">
                    <button
                      onClick={() => setStyle('diffusion')}
                      className={`py-1.5 rounded-md font-medium transition ${
                        style === 'diffusion' ? 'bg-indigo-600 text-white' : `${mutedText} hover:text-white`
                      }`}
                    >
                      Diffusion DiT
                    </button>
                    <button
                      onClick={() => setStyle('manim')}
                      className={`py-1.5 rounded-md font-medium transition ${
                        style === 'manim' ? 'bg-indigo-600 text-white' : `${mutedText} hover:text-white`
                      }`}
                    >
                      Manim STEM
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Target Duration
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950 text-xs">
                    {[30, 60, 90].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setDuration(dur)}
                        className={`py-1.5 rounded-md font-medium transition ${
                          duration === dur ? 'bg-emerald-600 text-white' : `${mutedText} hover:text-white`
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handlePlanScript()}
                disabled={isPlanning || !topic.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPlanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Planning Pedagogical Scenes with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Script & Storyboard
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: SCRIPT REVIEW & EDIT                                  */}
        {/* ============================================================ */}
        {currentStep === 'script' && scriptData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Step 2: Script Review</span>
                <h2 className="text-2xl font-bold">{scriptData.title}</h2>
                <p className={`text-sm ${mutedText}`}>{scriptData.summary}</p>
              </div>
              <button
                onClick={() => setCurrentStep('storyboard')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                Confirm Script & Build Storyboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className={`p-4 rounded-xl border ${cardBg} flex flex-col md:flex-row gap-4 items-start justify-between transition`}
                >
                  <div className="flex items-start gap-3 w-full md:w-1/3">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm">{scene.title}</h4>
                      <p className={`text-xs ${mutedText} line-clamp-2 mt-0.5`}>{scene.visual_concept}</p>
                    </div>
                  </div>

                  {/* Editable Narration Line */}
                  <div className="w-full md:w-2/3">
                    {editingNarrationId === scene.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={tempNarration}
                          onChange={(e) => setTempNarration(e.target.value)}
                          className={`w-full p-2.5 rounded-lg border text-xs focus:ring-1 focus:ring-blue-500 ${inputBg}`}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveNarration(scene.id)}
                            className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Save Line
                          </button>
                          <button
                            onClick={() => setEditingNarrationId(null)}
                            className={`px-3 py-1 rounded text-xs ${mutedText}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingNarrationId(scene.id);
                          setTempNarration(scene.narration);
                        }}
                        className={`p-3 rounded-lg border border-dashed cursor-pointer hover:border-blue-500/50 transition group flex items-start justify-between ${
                          isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <p className="text-xs italic leading-relaxed">"{scene.narration}"</p>
                        <Edit3 className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-400 transition ml-2 flex-shrink-0`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: STORYBOARD GRID (CONFIRM / DENY / REGENERATE)        */}
        {/* ============================================================ */}
        {currentStep === 'storyboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Step 3: Storyboard Approval</span>
                <h2 className="text-2xl font-bold">Review & Approve Storyboard Shots</h2>
                <p className={`text-sm ${mutedText}`}>
                  Confirm or deny shots, or click regenerate on any card to refine its visual prompt before generating videos.
                </p>
              </div>

              {/* Bottom Action Summary Bar */}
              <div className="flex items-center gap-4">
                <div className="text-right text-xs">
                  <span className="font-semibold text-emerald-400">{approvedCount} Approved</span>
                  <span className={mutedText}> / {scenes.length} total</span>
                  <p className={mutedText}>~{totalDurationEst.toFixed(1)}s runtime</p>
                </div>
                <button
                  onClick={handleStartGeneration}
                  disabled={approvedCount === 0 || isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Videos All Together
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Storyboard Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenes.map((scene, idx) => {
                const isApproved = scene.status === 'approved';
                const isRegenerating = regeneratingId === scene.id;

                return (
                  <div
                    key={scene.id}
                    className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                      isApproved
                        ? isDarkMode
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-white border-slate-200 shadow-sm'
                        : isDarkMode
                        ? 'bg-slate-950/40 border-slate-900 opacity-60'
                        : 'bg-slate-100/50 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Visual Shot Concept Thumbnail */}
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800/60 select-none group/thumb">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/30 to-purple-950/20" />
                      
                      {/* Film viewfinder safe margins pattern */}
                      <div className="absolute inset-2 border border-white/10 rounded pointer-events-none flex items-center justify-center">
                        <div className="w-3 h-3 border-t border-l border-blue-400/50 absolute top-1 left-1" />
                        <div className="w-3 h-3 border-t border-r border-blue-400/50 absolute top-1 right-1" />
                        <div className="w-3 h-3 border-b border-l border-blue-400/50 absolute bottom-1 left-1" />
                        <div className="w-3 h-3 border-b border-r border-blue-400/50 absolute bottom-1 right-1" />
                        <span className="text-[9px] font-mono text-white/30">+</span>
                      </div>

                      {/* Header tags in viewfinder */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between text-[9px] font-mono z-10">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Shot #{idx + 1} · 704x512
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                          {scene.animation_type}
                        </span>
                      </div>

                      {/* Visual Concept pill */}
                      <div className="relative z-10 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 max-w-[85%] text-center shadow-lg">
                        <span className="text-[11px] font-medium text-white line-clamp-2 leading-tight">
                          {scene.visual_concept}
                        </span>
                      </div>

                      {/* Duration Tag */}
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-slate-300 font-mono text-[9px] border border-white/10 z-10">
                        {scene.duration_seconds}s
                      </div>
                    </div>

                    {/* Card Header & Status */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          Shot {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isApproved ? 'Approved' : 'Excluded'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">{scene.duration_seconds}s</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm">{scene.title}</h4>
                      <p className="text-xs italic text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        "{scene.narration}"
                      </p>

                      <div className="space-y-1 text-xs">
                        <span className="text-[11px] text-blue-400 font-semibold block uppercase tracking-wider">
                          Diffusion Camera Prompt
                        </span>
                        <p className={`text-[11px] leading-relaxed line-clamp-3 ${mutedText}`}>
                          {scene.diffusion_prompt}
                        </p>
                      </div>
                    </div>

                    {/* Card Action Footer: Confirm / Deny / Regenerate */}
                    <div className={`p-3 border-t flex items-center justify-between text-xs ${
                      isDarkMode ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
                    }`}>
                      <button
                        onClick={() => toggleCardApproval(scene.id)}
                        className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                          isApproved
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Include
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleRegenerateScene(scene)}
                        disabled={isRegenerating}
                        className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                          isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-200 text-slate-700'
                        } disabled:opacity-50`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-400' : ''}`} />
                        Regenerate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: VIDEO GENERATION & OUTPUT (Leap VideoOutput Style)   */}
        {/* ============================================================ */}
        {currentStep === 'output' && (
          <div className="max-w-4xl mx-auto space-y-8 py-4">
            {isGenerating ? (
              <div className={`p-10 rounded-2xl border ${cardBg} text-center space-y-6 shadow-xl`}>
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Rendering Educational Animation</h3>
                  <p className={`text-sm ${mutedText}`}>{jobStatus?.current_step || 'Processing video clips on cloud GPU...'}</p>
                </div>

                {/* Progress bar */}
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${jobStatus?.progress || 10}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400">{jobStatus?.progress || 10}% completed</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Complete</span>
                    <h2 className="text-2xl font-bold">{scriptData?.title || topic}</h2>
                    <p className={`text-sm ${mutedText}`}>Non-repeating explainer video with synchronized narration.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentStep('storyboard')}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        isDarkMode ? 'border-slate-800 hover:bg-slate-900' : 'border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Back to Storyboard
                    </button>
                    {jobStatus?.video_url && (
                      <a
                        href={jobStatus.video_url}
                        download
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Download MP4
                      </a>
                    )}
                  </div>
                </div>

                {/* Master Video Player */}
                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video flex items-center justify-center">
                  {jobStatus?.video_url ? (
                    <video
                      src={jobStatus.video_url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-500 font-mono text-xs">
                      Video file processing completed. Awaiting playback stream...
                    </div>
                  )}
                </div>

                {/* Video Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className={`p-4 rounded-xl border ${cardBg}`}>
                    <span className={mutedText}>Duration</span>
                    <p className="text-base font-bold text-white mt-1">
                      {jobStatus?.duration ? `${jobStatus.duration.toFixed(1)}s` : `${duration}s`}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl border ${cardBg}`}>
                    <span className={mutedText}>Total Shots</span>
                    <p className="text-base font-bold text-blue-400 mt-1">
                      {jobStatus?.shots_count ?? approvedCount} Unique Cuts
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl border ${cardBg}`}>
                    <span className={mutedText}>Resolution</span>
                    <p className="text-base font-bold text-emerald-400 mt-1">704x512 @ 25fps</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${cardBg}`}>
                    <span className={mutedText}>Looping</span>
                    <p className="text-base font-bold text-purple-400 mt-1">0% (Zero Loops)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
