import React, { useState, useEffect } from 'react';
import { Artifact, updateProjectSlides, suggestSlideEdits, SuggestEditsResponse } from '../api';
import {
  Presentation,
  HelpCircle,
  Download,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Layout,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Copy,
  Wand2,
  Lightbulb,
  Check,
} from 'lucide-react';

interface ArtifactCardProps {
  artifact: Artifact;
  onArtifactUpdated?: (updated: Artifact) => void;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact: initialArtifact, onArtifactUpdated }) => {
  const [currentArtifact, setCurrentArtifact] = useState<Artifact>(initialArtifact);
  const [activeTab, setActiveTab] = useState<'preview' | 'grounding' | 'raw'>('preview');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Slide editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editableSlides, setEditableSlides] = useState<any[]>([]);

  // Projector / Fullscreen mode
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  // AI Suggesting Edits state
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestEditsResponse | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    setCurrentArtifact(initialArtifact);
    if (initialArtifact.source_data?.slides) {
      setEditableSlides(JSON.parse(JSON.stringify(initialArtifact.source_data.slides)));
    }
  }, [initialArtifact]);

  // Keyboard navigation for projector mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isProjectorMode) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, (editableSlides.length || 1) - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsProjectorMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectorMode, editableSlides.length]);

  const isSlide = currentArtifact.tool_name === 'slides';
  const isQuiz = currentArtifact.tool_name === 'quizzes';

  const slidesData = isSlide && currentArtifact.source_data?.slides ? currentArtifact.source_data.slides : [];
  const quizItems = isQuiz && currentArtifact.source_data?.items ? currentArtifact.source_data.items : [];

  const pptxFile = currentArtifact.files.find((f) => f.endsWith('.pptx'));
  const htmlPlayerFile = currentArtifact.files.find((f) => f.endsWith('.html'));

  const activeSlide = editableSlides[currentSlideIndex] || slidesData[currentSlideIndex];

  // Slide field change handler
  const handleSlideFieldChange = (field: string, value: any) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      if (updated[currentSlideIndex]) {
        updated[currentSlideIndex] = { ...updated[currentSlideIndex], [field]: value };
      }
      return updated;
    });
  };

  const handleCardFieldChange = (cardIdx: number, field: string, value: any) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      const cards = [...(slide.cards || [])];
      if (cards[cardIdx]) {
        cards[cardIdx] = { ...cards[cardIdx], [field]: value };
      }
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  const handleAddCard = () => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      const cards = [...(slide.cards || [])];
      cards.push({
        badge: 'New Point',
        title: 'Key Concept',
        body: 'Provide instructional context for this concept.'
      });
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  const handleRemoveCard = (cardIdx: number) => {
    setEditableSlides((prev) => {
      const updated = [...prev];
      const slide = { ...updated[currentSlideIndex] };
      const cards = (slide.cards || []).filter((_: any, idx: number) => idx !== cardIdx);
      slide.cards = cards;
      updated[currentSlideIndex] = slide;
      return updated;
    });
  };

  // Filmstrip Slide actions (Add, Duplicate, Delete)
  const handleAddSlide = () => {
    const newSlide = {
      slide_number: editableSlides.length + 1,
      title: 'New Chapter Concept',
      subtitle: 'Classroom Lecture Section',
      archetype: 'card_grid_3',
      cards: [
        { badge: 'Concept 1', title: 'Main Observation', body: 'Core definition or principle derived from chapter.' },
        { badge: 'Concept 2', title: 'Key Evidence', body: 'Secondary supporting mechanism and student takeaway.' }
      ],
      speaker_notes: 'Ask students to reflect on this concept before proceeding to the quiz checkpoint.'
    };
    setEditableSlides((prev) => [...prev, newSlide]);
    setCurrentSlideIndex(editableSlides.length);
    setIsEditing(true);
  };

  const handleDuplicateSlide = (idx: number) => {
    const target = editableSlides[idx];
    if (!target) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(target)),
      title: `${target.title} (Copy)`,
      slide_number: editableSlides.length + 1,
    };
    const next = [...editableSlides];
    next.splice(idx + 1, 0, duplicated);
    setEditableSlides(next);
    setCurrentSlideIndex(idx + 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (editableSlides.length <= 1) {
      alert('A presentation must have at least one slide.');
      return;
    }
    const next = editableSlides.filter((_, i) => i !== idx);
    setEditableSlides(next);
    setCurrentSlideIndex((prev) => Math.min(prev, next.length - 1));
  };

  // Save updates & recompile .pptx
  const handleSaveSlides = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatedArt = await updateProjectSlides(currentArtifact.project_id, {
        artifact_id: currentArtifact.id,
        theme: currentArtifact.source_data?.theme || 'col_blue',
        slides: editableSlides
      });
      setCurrentArtifact(updatedArt);
      setEditableSlides(JSON.parse(JSON.stringify(updatedArt.source_data.slides)));
      setIsEditing(false);
      setSaveSuccess(true);
      if (onArtifactUpdated) {
        onArtifactUpdated(updatedArt);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save slides:', err);
      alert('Failed to save presentation updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Suggestion Handler
  const handleRequestSuggestion = async (instruction: string, promptText?: string) => {
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const current = editableSlides[currentSlideIndex] || slidesData[currentSlideIndex];
      const res = await suggestSlideEdits(currentArtifact.project_id, current, instruction, promptText);
      setActiveSuggestion(res);
      setCustomPrompt('');
    } catch (err: any) {
      console.error('Suggestion failed:', err);
      setSuggestError(err.message || 'Could not generate suggestion');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    setEditableSlides((prev) => {
      const updated = [...prev];
      updated[currentSlideIndex] = {
        ...updated[currentSlideIndex],
        ...activeSuggestion.suggested_slide
      };
      return updated;
    });
    setActiveSuggestion(null);
    setIsEditing(true);
  };

  return (
    <div className="bg-surface-light dark:bg-[#1C1B19] border border-border-light dark:border-[#2E2C28] rounded-2xl shadow-md overflow-hidden mb-6 transition-all">
      {/* Studio Header Toolbar */}
      <div className="p-4 bg-slate-50 dark:bg-[#181715] border-b border-border-light dark:border-[#2E2C28] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5C00]">
            {isSlide ? <Presentation className="w-5 h-5" /> : isQuiz ? <HelpCircle className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {isSlide ? 'PowerPoint Presentation Studio' : isQuiz ? 'Interactive Quiz & Flashcards' : currentArtifact.tool_name.toUpperCase()}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 font-mono">
                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Grounded
              </span>
              {saveSuccess && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500 text-white animate-fade-in flex items-center gap-1">
                  <Check className="w-3 h-3" /> Recompiled PPTX
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isSlide
                ? `${editableSlides.length || slidesData.length} Slides with Grounded Citations & Speaker Notes`
                : `${quizItems.length} Formative Assessment Questions`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Projector Fullscreen Mode */}
          {isSlide && (
            <button
              onClick={() => setIsProjectorMode(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#FF5C00] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#FF5C00] flex items-center gap-1.5 transition-all shadow-sm"
              title="Full-Screen Classroom Projector Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#FF5C00]" />
              <span>Projector Mode</span>
            </button>
          )}

          {/* Edit Slide Button */}
          {isSlide && !isEditing && (
            <button
              onClick={() => {
                if (editableSlides.length === 0) {
                  setEditableSlides(JSON.parse(JSON.stringify(slidesData)));
                }
                setIsEditing(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#FF5C00] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#FF5C00] flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-orange-500" />
              <span>Edit Slide</span>
            </button>
          )}

          {/* Download PowerPoint Button */}
          {pptxFile && (
            <a
              href={`/api/projects/${currentArtifact.project_id}/download/${pptxFile}`}
              download
              className="bg-[#FF5C00] hover:bg-[#e05200] text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .pptx</span>
            </a>
          )}

          {/* Launch Quiz Player */}
          {htmlPlayerFile && (
            <button
              onClick={() => {
                window.open(`/api/projects/${currentArtifact.project_id}/download/${htmlPlayerFile}`, '_blank');
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Player</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented View Tabs */}
      <div className="px-4 border-b border-border-light dark:border-[#2E2C28] flex gap-4 text-xs font-medium text-slate-500">
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'preview' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Visual Stage & Filmstrip
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'grounding' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Grounding Citations ({currentArtifact.grounding_refs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'raw' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Source JSON
        </button>
      </div>

      {/* Main Studio Body */}
      <div className="p-4">
        {activeTab === 'preview' && isSlide && (
          <div className="space-y-4">
            {/* Presenton Layout: Split Left Filmstrip + Right 16:9 Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Slide Filmstrip Thumbnails (4 Columns on Desktop) */}
              <div className="lg:col-span-3 space-y-2 max-h-[560px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-border-light dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Slides ({editableSlides.length || slidesData.length})
                  </span>
                  <button
                    onClick={handleAddSlide}
                    className="text-[11px] font-semibold text-[#FF5C00] hover:underline flex items-center gap-1"
                    title="Add new slide to deck"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {(editableSlides.length > 0 ? editableSlides : slidesData).map((s: any, idx: number) => {
                  const isSelected = idx === currentSlideIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-950/30 border-[#FF5C00] shadow-sm'
                          : 'bg-white dark:bg-[#181715] border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-[#FF5C00] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateSlide(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Duplicate Slide"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlide(idx);
                            }}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete Slide"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h5 className={`text-xs font-semibold line-clamp-1 ${
                        isSelected ? 'text-[#FF5C00]' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {s.title || `Slide ${idx + 1}`}
                      </h5>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {s.subtitle || `${(s.cards?.length || 0)} Cards`}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Right: 16:9 Slide Canvas Stage (9 Columns on Desktop) */}
              <div className="lg:col-span-9 space-y-3">
                {/* 16:9 Presentation Canvas */}
                <div className="relative bg-[#18181B] text-white rounded-2xl p-6 sm:p-8 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between shadow-xl border border-slate-800 transition-all overflow-hidden">
                  {/* Atmospheric Glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                  <div className="relative z-10">
                    {/* Slide Top Metadata */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-orange-400 font-bold font-mono bg-orange-950/60 border border-orange-500/30 px-2 py-0.5 rounded">
                          Slide {currentSlideIndex + 1} of {(editableSlides.length || slidesData.length)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                          <Layout className="w-3 h-3 text-sky-400" />
                          {(activeSlide?.archetype || 'card_grid_3').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeSlide?.grounding?.passage_id && (
                          <span className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            [{activeSlide.grounding.passage_id}]
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Slide Title & Subtitle */}
                    <h4 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
                      {activeSlide?.title}
                    </h4>
                    {activeSlide?.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-400 mb-5 font-medium">{activeSlide.subtitle}</p>
                    )}

                    {/* Visual Card Container Grid */}
                    {activeSlide?.cards && activeSlide.cards.length > 0 ? (
                      <div
                        className={`grid gap-3.5 my-4 ${
                          activeSlide.cards.length === 1
                            ? 'grid-cols-1'
                            : activeSlide.cards.length === 2 || activeSlide.archetype === 'split_comparison'
                            ? 'grid-cols-1 md:grid-cols-2'
                            : 'grid-cols-1 md:grid-cols-3'
                        }`}
                      >
                        {activeSlide.cards.map((card: any, cIdx: number) => (
                          <div
                            key={cIdx}
                            className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-600 transition-all backdrop-blur-sm"
                          >
                            <div>
                              {card.badge && (
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 border border-sky-800/50 px-2 py-0.5 rounded mb-2">
                                  {card.badge}
                                </span>
                              )}
                              {card.stat && (
                                <div className="text-3xl font-extrabold text-[#FF5C00] font-mono my-1 tracking-tight">
                                  {card.stat}
                                </div>
                              )}
                              <h5 className="text-sm font-bold text-slate-100 mb-1.5 leading-snug">
                                {card.title}
                              </h5>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {card.body}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Fallback for bullet slides */
                      <ul className="space-y-2 mt-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        {activeSlide?.bullets?.map((b: string, i: number) => (
                          <li key={i} className="text-xs text-slate-200 flex items-start gap-2">
                            <span className="text-[#FF5C00] mt-0.5 font-bold">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Speaker Notes Tray */}
                  {activeSlide?.speaker_notes && (
                    <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/50 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-200 font-semibold">Teacher Speaker Notes: </strong>
                        <span>{activeSlide.speaker_notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filmstrip Pagination Bar */}
                <div className="flex justify-between items-center px-1">
                  <button
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <div className="flex items-center gap-1.5">
                    {(editableSlides.length > 0 ? editableSlides : slidesData).map((_: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          idx === currentSlideIndex
                            ? 'bg-[#FF5C00] scale-125'
                            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                        }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                    <span className="text-xs text-slate-500 font-medium ml-2">
                      {currentSlideIndex + 1} / {(editableSlides.length || slidesData.length)}
                    </span>
                  </div>
                  <button
                    disabled={currentSlideIndex === (editableSlides.length || slidesData.length) - 1}
                    onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* AI Suggesting Edits Toolbar (Slide Co-Pilot) */}
                <div className="p-4 rounded-2xl border border-orange-200/60 dark:border-orange-950/60 bg-orange-50/30 dark:bg-orange-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF5C00]">
                      <Wand2 className="w-4 h-4" />
                      <span>AI Slide Co-Pilot: Suggest Edits</span>
                    </div>
                    {isSuggesting && (
                      <span className="text-xs text-[#FF5C00] flex items-center gap-1 animate-pulse font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" /> Refining Slide...
                      </span>
                    )}
                  </div>

                  {/* 4 Preset Suggestion Action Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSuggesting}
                      onClick={() => handleRequestSuggestion('make_concise')}
                      className="px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#FF5C00] hover:text-[#FF5C00] text-xs font-medium flex items-center gap-1 transition-all shadow-2xs disabled:opacity-50"
                    >
                      <span>⚡</span> Make Concise
                    </button>
                    <button
                      type="button"
                      disabled={isSuggesting}
                      onClick={() => handleRequestSuggestion('add_teacher_tip')}
                      className="px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#FF5C00] hover:text-[#FF5C00] text-xs font-medium flex items-center gap-1 transition-all shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" /> Add Teacher Tip
                    </button>
                    <button
                      type="button"
                      disabled={isSuggesting}
                      onClick={() => handleRequestSuggestion('add_discussion_question')}
                      className="px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#FF5C00] hover:text-[#FF5C00] text-xs font-medium flex items-center gap-1 transition-all shadow-2xs disabled:opacity-50"
                    >
                      <Lightbulb className="w-3 h-3 text-sky-500" /> Discussion Checkpoint
                    </button>
                    <button
                      type="button"
                      disabled={isSuggesting}
                      onClick={() => handleRequestSuggestion('simplify')}
                      className="px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#FF5C00] hover:text-[#FF5C00] text-xs font-medium flex items-center gap-1 transition-all shadow-2xs disabled:opacity-50"
                    >
                      <span>📝</span> Simplify Language
                    </button>
                  </div>

                  {/* Custom Revision Instruction Form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or specify custom edit (e.g. 'Add real-world inertia example')..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customPrompt.trim()) {
                          handleRequestSuggestion('custom', customPrompt.trim());
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-orange-200 dark:border-orange-800/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
                    />
                    <button
                      type="button"
                      disabled={!customPrompt.trim() || isSuggesting}
                      onClick={() => handleRequestSuggestion('custom', customPrompt.trim())}
                      className="px-3 py-1.5 bg-[#FF5C00] hover:bg-[#e05200] text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-40 transition-colors"
                    >
                      Refine
                    </button>
                  </div>

                  {/* Suggestion Result Banner with 1-Click Apply */}
                  {activeSuggestion && (
                    <div className="p-3.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#FF5C00] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> AI Revision Recommendation
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveSuggestion(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={handleApplySuggestion}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" /> Apply to Slide
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {activeSuggestion.explanation}
                      </p>
                    </div>
                  )}

                  {suggestError && (
                    <p className="text-xs text-red-500">{suggestError}</p>
                  )}
                </div>

                {/* Inline Slide Editor Mode */}
                {isEditing && (
                  <div className="p-5 rounded-2xl border-2 border-orange-500/30 bg-orange-50/20 dark:bg-slate-900/40 backdrop-blur-sm animate-fade-in space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-orange-200/40">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[#FF5C00]" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Editing Slide {currentSlideIndex + 1}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          onClick={handleSaveSlides}
                          disabled={isSaving}
                          className="bg-[#FF5C00] hover:bg-[#e05200] text-white text-xs px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recompiling .pptx...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" /> Save & Recompile Presentation
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Title & Archetype */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Slide Title
                          </label>
                          <input
                            type="text"
                            value={activeSlide?.title || ''}
                            onChange={(e) => handleSlideFieldChange('title', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Layout Archetype
                          </label>
                          <select
                            value={activeSlide?.archetype || 'card_grid_3'}
                            onChange={(e) => handleSlideFieldChange('archetype', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
                          >
                            <option value="card_grid_3">3-Card Grid</option>
                            <option value="split_comparison">Split Comparison (2 Columns)</option>
                            <option value="hero_stat">Hero Stat Callout</option>
                            <option value="key_takeaways">Summary / Key Takeaways</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Subtitle / Pedagogical Note
                        </label>
                        <input
                          type="text"
                          value={activeSlide?.subtitle || ''}
                          onChange={(e) => handleSlideFieldChange('subtitle', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
                        />
                      </div>

                      {/* Card Items Section */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                            Slide Visual Cards ({activeSlide?.cards?.length || 0})
                          </label>
                          {(activeSlide?.cards?.length || 0) < 3 && (
                            <button
                              type="button"
                              onClick={handleAddCard}
                              className="text-[11px] text-[#FF5C00] hover:text-[#e05200] font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Card
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {activeSlide?.cards?.map((card: any, cIdx: number) => (
                            <div
                              key={cIdx}
                              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-3.5 relative shadow-sm"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-[10px] text-slate-400 uppercase font-mono">
                                  Card #{cIdx + 1}
                                </span>
                                {(activeSlide.cards.length > 1) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCard(cIdx)}
                                    className="text-red-500 hover:text-red-700 p-0.5 rounded"
                                    title="Delete Card"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Badge Tag</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Concept, Step 1"
                                    value={card.badge || ''}
                                    onChange={(e) => handleCardFieldChange(cIdx, 'badge', e.target.value)}
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                  />
                                </div>
                                {activeSlide.archetype === 'hero_stat' && (
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Hero Stat / Number</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 98%, 3.5x"
                                      value={card.stat || ''}
                                      onChange={(e) => handleCardFieldChange(cIdx, 'stat', e.target.value)}
                                      className="w-full px-2 py-1 text-xs font-bold font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-orange-600"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Card Title</label>
                                  <input
                                    type="text"
                                    placeholder="Card title"
                                    value={card.title || ''}
                                    onChange={(e) => handleCardFieldChange(cIdx, 'title', e.target.value)}
                                    className="w-full px-2 py-1 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Card Body</label>
                                  <textarea
                                    rows={3}
                                    placeholder="Explain key mechanism..."
                                    value={card.body || ''}
                                    onChange={(e) => handleCardFieldChange(cIdx, 'body', e.target.value)}
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Speaker Notes */}
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Teacher Speaker Notes
                        </label>
                        <textarea
                          rows={2}
                          value={activeSlide?.speaker_notes || ''}
                          onChange={(e) => handleSlideFieldChange('speaker_notes', e.target.value)}
                          placeholder="Classroom teaching cues..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-2">
            {currentArtifact.grounding_refs?.length ? (
              currentArtifact.grounding_refs.map((ref: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-[#181715] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">[{ref.passage_id}]</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        ref.verified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ref.verified ? 'Verified Grounding' : 'Partial Match'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic">"{ref.quote}"</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 p-4 text-center">No passage citations attached.</p>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-4 rounded-xl overflow-x-auto max-h-[360px]">
            {JSON.stringify(currentArtifact.source_data, null, 2)}
          </pre>
        )}
      </div>

      {/* Full-Screen Classroom Projector Modal */}
      {isProjectorMode && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 sm:p-12 animate-in fade-in">
          {/* Top Projector Toolbar */}
          <div className="flex items-center justify-between text-white/80">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm bg-orange-500 text-white px-2.5 py-0.5 rounded-full font-bold">
                {currentSlideIndex + 1} / {(editableSlides.length || slidesData.length)}
              </span>
              <h2 className="text-sm font-semibold truncate max-w-md">{activeSlide?.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50 hidden sm:inline">Use Arrow Keys or Space to navigate • Esc to exit</span>
              <button
                onClick={() => setIsProjectorMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Exit Projector Mode"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 16:9 Cinema Projection Stage */}
          <div className="my-auto max-w-5xl w-full mx-auto aspect-video bg-[#18181B] border border-white/10 rounded-3xl p-8 sm:p-14 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-400">
                  SLIDE {currentSlideIndex + 1}
                </span>
                {activeSlide?.grounding?.passage_id && (
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                    Grounded: [{activeSlide.grounding.passage_id}]
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
                {activeSlide?.title}
              </h1>
              {activeSlide?.subtitle && (
                <p className="text-base sm:text-lg text-slate-400 mb-8">{activeSlide.subtitle}</p>
              )}

              {/* Cards Grid on Cinema Projection */}
              {activeSlide?.cards && (
                <div className={`grid gap-5 my-6 ${
                  activeSlide.cards.length === 1 ? 'grid-cols-1' : activeSlide.cards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {activeSlide.cards.map((c: any, i: number) => (
                    <div key={i} className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        {c.badge && (
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded mb-2 inline-block">
                            {c.badge}
                          </span>
                        )}
                        {c.stat && (
                          <div className="text-4xl font-black text-[#FF5C00] font-mono my-2">{c.stat}</div>
                        )}
                        <h4 className="text-lg font-bold text-white mb-2">{c.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher Notes on Projector Stage */}
            {activeSlide?.speaker_notes && (
              <div className="pt-4 border-t border-white/10 text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="truncate">Teacher Notes: {activeSlide.speaker_notes}</span>
              </div>
            )}
          </div>

          {/* Bottom Projector Controls */}
          <div className="flex items-center justify-between text-white/80 max-w-5xl w-full mx-auto">
            <button
              disabled={currentSlideIndex === 0}
              onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Previous Slide
            </button>
            <div className="flex items-center gap-2">
              {(editableSlides.length > 0 ? editableSlides : slidesData).map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'bg-[#FF5C00] scale-125' : 'bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <button
              disabled={currentSlideIndex === (editableSlides.length || slidesData.length) - 1}
              onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              Next Slide <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
