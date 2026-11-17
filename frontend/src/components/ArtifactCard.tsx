import React, { useState, useEffect } from 'react';
import { Artifact, updateProjectSlides } from '../api';
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
  Loader2
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

  useEffect(() => {
    setCurrentArtifact(initialArtifact);
    if (initialArtifact.source_data?.slides) {
      setEditableSlides(JSON.parse(JSON.stringify(initialArtifact.source_data.slides)));
    }
  }, [initialArtifact]);

  const isSlide = currentArtifact.tool_name === 'slides';
  const isQuiz = currentArtifact.tool_name === 'quizzes';

  const slidesData = isSlide && currentArtifact.source_data?.slides ? currentArtifact.source_data.slides : [];
  const quizItems = isQuiz && currentArtifact.source_data?.items ? currentArtifact.source_data.items : [];

  const pptxFile = currentArtifact.files.find((f) => f.endsWith('.pptx'));
  const htmlPlayerFile = currentArtifact.files.find((f) => f.endsWith('.html'));

  const activeSlide = editableSlides[currentSlideIndex] || slidesData[currentSlideIndex];

  // Slide edit handlers
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
        badge: 'New Section',
        title: 'New Key Point',
        body: 'Provide concise instructional details for this concept.'
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden mb-6 transition-all">
      {/* Card Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 text-[#FF5C00]">
            {isSlide ? <Presentation className="w-5 h-5" /> : isQuiz ? <HelpCircle className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">
                {isSlide ? 'PowerPoint Slide Deck' : isQuiz ? 'Interactive Quiz & Flashcards' : currentArtifact.tool_name.toUpperCase()}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1 font-mono">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Grounded
              </span>
              {saveSuccess && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500 text-white animate-fade-in flex items-center gap-1">
                  ✓ Recompiled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">ID: {currentArtifact.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isSlide && (
            <button
              onClick={() => {
                if (!isEditing && editableSlides.length === 0 && slidesData.length > 0) {
                  setEditableSlides(JSON.parse(JSON.stringify(slidesData)));
                }
                setIsEditing(!isEditing);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors border ${
                isEditing
                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FF5C00]" />
              {isEditing ? 'Close Editor' : 'Edit Slides'}
            </button>
          )}

          {pptxFile && (
            <a
              href={`/api/projects/${currentArtifact.project_id}/download/${encodeURIComponent(pptxFile)}`}
              download
              className="bg-[#FF5C00] hover:bg-[#e05200] text-white text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download .pptx
            </a>
          )}

          {htmlPlayerFile && (
            <button
              onClick={() => {
                const w = window.open('', '_blank');
                if (w && currentArtifact.source_data) {
                  w.document.write(
                    `<html><head><title>Preview</title></head><body><p>Loading Quiz...</p><script>window.location.href='/api/projects/${currentArtifact.project_id}/download/${encodeURIComponent(htmlPlayerFile)}';</script></body></html>`
                  );
                }
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Launch Player
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-slate-100 flex gap-4 text-xs font-medium text-slate-500">
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'preview' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700'
          }`}
        >
          Visual Preview & Layout
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'grounding' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700'
          }`}
        >
          Grounding Citations ({currentArtifact.grounding_refs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'raw' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700'
          }`}
        >
          Source JSON
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'preview' && (
          <div>
            {isSlide && slidesData.length > 0 && (
              <div>
                {/* 16:9 Presentation Canvas Container */}
                <div className="relative bg-[#18181B] text-white rounded-2xl p-6 min-h-[380px] flex flex-col justify-between shadow-xl border border-slate-800 transition-all overflow-hidden">
                  {/* Atmospheric Glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

                  <div className="relative z-10">
                    {/* Slide Top Metadata */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-orange-400 font-bold font-mono bg-orange-950/60 border border-orange-500/30 px-2 py-0.5 rounded">
                          Slide {currentSlideIndex + 1} of {slidesData.length}
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
                        {!isEditing && (
                          <button
                            onClick={() => {
                              if (editableSlides.length === 0) {
                                setEditableSlides(JSON.parse(JSON.stringify(slidesData)));
                              }
                              setIsEditing(true);
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition-all"
                            title="Edit this slide"
                          >
                            <Edit3 className="w-3 h-3 text-orange-400" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Slide Title & Subtitle */}
                    <h4 className="text-2xl font-extrabold text-white tracking-tight mb-1">
                      {activeSlide?.title}
                    </h4>
                    {activeSlide?.subtitle && (
                      <p className="text-xs text-slate-400 mb-5 font-medium">{activeSlide.subtitle}</p>
                    )}

                    {/* Visual Card Container Grid (Archetype Display) */}
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
                      /* Fallback for legacy bullet slides */
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

                  {/* Speaker Notes Drawer */}
                  {activeSlide?.speaker_notes && (
                    <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/50 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-200 font-semibold">Teacher Lecture Notes: </strong>
                        <span>{activeSlide.speaker_notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Slide Editor Mode */}
                {isEditing && (
                  <div className="mt-4 p-5 rounded-2xl border-2 border-orange-500/30 bg-orange-50/20 dark:bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-orange-200/40">
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
                      {/* Title & Subtitle */}
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
                          Teacher Lecture / Presenter Notes
                        </label>
                        <textarea
                          rows={2}
                          value={activeSlide?.speaker_notes || ''}
                          onChange={(e) => handleSlideFieldChange('speaker_notes', e.target.value)}
                          placeholder="Prompts and discussion questions for educator..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Slide Navigation Pagination */}
                <div className="flex justify-between items-center mt-3 px-1">
                  <button
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Slide
                  </button>
                  <div className="flex items-center gap-1.5">
                    {slidesData.map((_: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          idx === currentSlideIndex
                            ? 'bg-[#FF5C00] scale-125'
                            : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                    <span className="text-xs text-slate-500 font-medium ml-2">
                      {currentSlideIndex + 1} / {slidesData.length}
                    </span>
                  </div>
                  <button
                    disabled={currentSlideIndex === slidesData.length - 1}
                    onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                  >
                    Next Slide <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {isQuiz && quizItems.length > 0 && (
              <div className="space-y-3">
                {quizItems.map((item: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {item.type.replace('_', ' ')}
                      </span>
                      {item.grounding && (
                        <span className="text-[10px] font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          [{item.grounding.passage_id}]
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mb-2">{item.prompt}</p>
                    {item.type === 'flashcard' ? (
                      <div className="text-xs text-slate-600 bg-white p-2 rounded border border-dashed border-orange-200">
                        <strong>Definition: </strong> {item.correct_answer}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {item.options?.map((opt: string, oIdx: number) => (
                          <div
                            key={oIdx}
                            className={`text-xs px-2.5 py-1.5 rounded border ${
                              opt === item.correct_answer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {opt === item.correct_answer ? '✓ ' : '• '} {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-2">
            {currentArtifact.grounding_refs?.length ? (
              currentArtifact.grounding_refs.map((ref: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sky-600">[{ref.passage_id}]</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        ref.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ref.verified ? 'Verified Grounding' : 'Partial Match'}
                    </span>
                  </div>
                  <p className="text-slate-600 italic">"{ref.quote}"</p>
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
    </div>
  );
};
