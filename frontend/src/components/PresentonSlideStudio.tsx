import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Artifact,
  updateProjectSlides,
} from '../api';
import { SlideContent, PresentonSlideStudioProps } from './slides/presenton/types';
import {
  normalizeSlideContent,
  buildInitialSlidesFromProject,
} from './slides/presenton/slideModelHelper';
import { SlideBlockCanvas } from './slides/presenton/SlideBlockCanvas';
import { FilmstripSidebar } from './slides/presenton/FilmstripSidebar';
import { TopToolbar } from './slides/presenton/TopToolbar';
import { MessageSquare, Clock, ChevronUp, ChevronDown } from 'lucide-react';

export const PresentonSlideStudio: React.FC<PresentonSlideStudioProps> = ({
  project,
  artifact: initialArtifact,
  passages = {},
  isDarkMode: _isDarkMode = true,
  onBack,
  onArtifactUpdated,
  currentMode = 'pro',
  onSwitchMode,
}) => {
  // Current artifact tracking
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(initialArtifact);

  // Initialize editable slides
  const [editableSlides, setEditableSlides] = useState<SlideContent[]>(() => {
    if (initialArtifact?.source_data?.slides && Array.isArray(initialArtifact.source_data.slides)) {
      return initialArtifact.source_data.slides.map(normalizeSlideContent);
    }
    return buildInitialSlidesFromProject(project, passages);
  });

  // Current active slide index
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Active theme key
  const [activeThemeKey, setActiveThemeKey] = useState<string>(() => {
    return initialArtifact?.source_data?.theme || 'editorial';
  });

  // Zoom level (%)
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const canvasWorkspaceRef = useRef<HTMLDivElement>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Speaker notes drawer toggle
  const [isSpeakerNotesOpen, setIsSpeakerNotesOpen] = useState(false);

  // Active slide
  const activeSlide =
    editableSlides[currentSlideIndex] ||
    editableSlides[0] ||
    buildInitialSlidesFromProject(project, passages)[0];

  // Auto-fit zoom level to canvas container
  const handleAutoFitZoom = useCallback(() => {
    if (!canvasWorkspaceRef.current) return;
    const { clientWidth, clientHeight } = canvasWorkspaceRef.current;
    // Canvas dimensions: 1280x720, leave comfortable padding (64px)
    const availableWidth = Math.max(clientWidth - 64, 320);
    const availableHeight = Math.max(clientHeight - (isSpeakerNotesOpen ? 180 : 80), 240);

    const scaleX = availableWidth / 1280;
    const scaleY = availableHeight / 720;
    const fitScale = Math.min(scaleX, scaleY, 1.25);
    const calculatedPercent = Math.max(Math.round(fitScale * 100), 25);
    setZoomLevel(calculatedPercent);
  }, [isSpeakerNotesOpen]);

  // Initial fit on mount
  useEffect(() => {
    handleAutoFitZoom();
  }, [handleAutoFitZoom]);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 30));

  // Update active slide content (inline edits, additions, deletions, dnd reordering)
  const handleUpdateActiveSlide = (updated: SlideContent) => {
    setEditableSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndex] = updated;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Add new slide
  const handleAddSlide = () => {
    const nextSlideNumber = editableSlides.length + 1;
    const newSlide: SlideContent = {
      id: `slide-${nextSlideNumber}-${Date.now().toString(36)}`,
      slide_number: nextSlideNumber,
      title: `Curriculum Module 0${nextSlideNumber}`,
      subtitle: `${project?.outline?.subject || 'CURRICULUM'} · INSTRUCTIONAL EXPLORATION`,
      badge: `TOPIC 0${nextSlideNumber}`,
      postulate: 'KEY MECHANISM',
      standard: `${project?.outline?.subject || 'Curriculum'} Standard`,
      archetype: 'card_grid_3',
      cards: [
        {
          id: `card-${nextSlideNumber}-1-${Date.now().toString(36)}`,
          badge: 'Concept Core',
          title: 'Primary Explanation',
          body: 'Enter detailed pedagogical concepts, scientific principles, or analytical proofs here.',
          bullets: ['Interactive takeaway 1', 'Interactive takeaway 2'],
        },
        {
          id: `card-${nextSlideNumber}-2-${Date.now().toString(36)}`,
          badge: 'Application',
          title: 'Practical Context',
          body: 'Connect this principle to classroom problem solving and real-world experiments.',
          bullets: [],
        },
      ],
      speaker_notes: `Introduce Module ${nextSlideNumber} and connect with earlier concepts.`,
      est_delivery: '3m 00s',
    };

    setEditableSlides((prev) => [...prev, newSlide]);
    setCurrentSlideIndex(editableSlides.length);
    setHasUnsavedChanges(true);
  };

  // Duplicate slide
  const handleDuplicateSlide = (index: number) => {
    const target = editableSlides[index];
    if (!target) return;

    const duplicated: SlideContent = {
      ...JSON.parse(JSON.stringify(target)),
      id: `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      slide_number: index + 2,
      title: `${target.title} (Copy)`,
      cards: (target.cards || []).map((c) => ({
        ...c,
        id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };

    const next = [...editableSlides];
    next.splice(index + 1, 0, duplicated);
    const renumbered = next.map((s, idx) => ({ ...s, slide_number: idx + 1 }));
    setEditableSlides(renumbered);
    setCurrentSlideIndex(index + 1);
    setHasUnsavedChanges(true);
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    if (editableSlides.length <= 1) return;
    const next = editableSlides.filter((_, i) => i !== index);
    const renumbered = next.map((s, idx) => ({ ...s, slide_number: idx + 1 }));
    setEditableSlides(renumbered);
    setCurrentSlideIndex((prev) => Math.min(prev, renumbered.length - 1));
    setHasUnsavedChanges(true);
  };

  // Reorder slides
  const handleReorderSlides = (nextSlides: SlideContent[]) => {
    setEditableSlides(nextSlides);
    setHasUnsavedChanges(true);
  };

  // Save slides back to backend project
  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updatedArt = await updateProjectSlides(project.project_id, {
        artifact_id: currentArtifact?.id,
        theme: activeThemeKey,
        slides: editableSlides,
      });

      setCurrentArtifact(updatedArt);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);

      if (onArtifactUpdated) {
        onArtifactUpdated(updatedArt);
      }

      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save slides:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            project_id: project?.project_id,
            name: project?.name,
            theme: activeThemeKey,
            slides: editableSlides,
            exported_at: new Date().toISOString(),
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${(project?.name || 'omnix-presentation').toLowerCase().replace(/[^a-z0-9]/g, '-')}-pro.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export PPTX / Print handler
  const handleExportPptx = () => {
    window.print();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. TOP TOOLBAR WITH STUDIO SWITCHER */}
      <TopToolbar
        title={project?.outline?.title || project?.name || 'Lesson Presentation'}
        themeKey={activeThemeKey}
        onThemeChange={(theme) => {
          setActiveThemeKey(theme);
          setHasUnsavedChanges(true);
        }}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleAutoFitZoom}
        currentSlideIndex={currentSlideIndex}
        totalSlides={editableSlides.length}
        onPrevSlide={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
        onNextSlide={() =>
          setCurrentSlideIndex((prev) => Math.min(prev + 1, editableSlides.length - 1))
        }
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onExportJson={handleExportJson}
        onExportPptx={handleExportPptx}
        onBack={onBack}
        currentMode={currentMode}
        onSwitchMode={onSwitchMode}
      />

      {/* 2. MAIN WORKSPACE: LEFT FILMSTRIP + CENTER ZOOMABLE CANVAS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Filmstrip Sidebar */}
        <FilmstripSidebar
          slides={editableSlides}
          currentSlideIndex={currentSlideIndex}
          onSelectSlide={setCurrentSlideIndex}
          onAddSlide={handleAddSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onReorderSlides={handleReorderSlides}
        />

        {/* Center: Canvas Workspace */}
        <main
          ref={canvasWorkspaceRef}
          className="flex-1 bg-slate-950/95 overflow-auto flex flex-col items-center justify-center p-8 relative custom-scrollbar"
        >
          {/* 16:9 Canvas Container with Scale */}
          <div className="flex items-center justify-center transition-all duration-200">
            <SlideBlockCanvas
              slide={activeSlide}
              themeKey={activeThemeKey}
              zoomScale={zoomLevel / 100}
              onUpdateSlide={handleUpdateActiveSlide}
            />
          </div>
        </main>
      </div>

      {/* 3. BOTTOM COLLAPSIBLE SPEAKER NOTES BAR */}
      <div className="border-t border-slate-800 bg-slate-900/95 shrink-0 z-20">
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsSpeakerNotesOpen((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Speaker Delivery Notes</span>
            {isSpeakerNotesOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" />
              Delivery: {activeSlide.est_delivery || '3m 00s'}
            </span>
          </div>
        </div>

        {/* Expanded Speaker Notes Editor */}
        {isSpeakerNotesOpen && (
          <div className="px-4 pb-3 pt-1 border-t border-slate-800/60 bg-slate-950/40">
            <textarea
              value={activeSlide.speaker_notes || ''}
              onChange={(e) => {
                handleUpdateActiveSlide({
                  ...activeSlide,
                  speaker_notes: e.target.value,
                });
              }}
              placeholder="Add comprehensive presenter notes, discussion prompts, or textbook grounding citations for this slide..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
