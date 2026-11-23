import React, { useEffect, useId } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  Plus,
  Trash2,
  BookOpen,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { themes, ThemeProperties, ThemeName } from '../../../lib/presentonThemes';
import { loadGoogleFont } from '../../../lib/fontLoader';
import { InlineEditableText } from './InlineEditableText';
import { BlockDraggable } from './BlockDraggable';
import { SlideContent, SlideCard } from './types';

interface SlideBlockCanvasProps {
  slide: SlideContent;
  themeKey?: string;
  zoomScale?: number;
  onUpdateSlide: (updated: SlideContent) => void;
}

export const SlideBlockCanvas: React.FC<SlideBlockCanvasProps> = ({
  slide,
  themeKey = 'editorial',
  zoomScale = 1,
  onUpdateSlide,
}) => {
  const dndContextId = useId();

  // Resolve theme
  const activeTheme: ThemeProperties =
    themes[themeKey as ThemeName] || themes['editorial'] || themes['cornflower'];

  // Load theme web fonts dynamically
  useEffect(() => {
    if (activeTheme?.fonts?.heading) {
      loadGoogleFont(activeTheme.fonts.heading);
    }
    if (activeTheme?.fonts?.body) {
      loadGoogleFont(activeTheme.fonts.body);
    }
  }, [activeTheme]);

  // Pointer sensor with distance activation constraint
  // Ensures clicks/selection for inline editing won't trigger drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Background and color styles from theme
  const bgStyle = activeTheme?.background?.override || activeTheme?.colors?.background || '#090d16';
  const textColor = activeTheme?.colors?.text || '#f8fafc';
  const headingColor = activeTheme?.colors?.heading || activeTheme?.colors?.primary || '#38bdf8';
  const accentColor = activeTheme?.colors?.accent || '#10b981';
  const isDarkTheme = activeTheme?.mode !== 'light';

  const cardBgColor =
    activeTheme?.colors?.cardBackground ||
    (isDarkTheme ? 'rgba(23, 29, 44, 0.75)' : 'rgba(255, 255, 255, 0.9)');
  const cardBorderColor = isDarkTheme
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.08)';

  // Reorder cards via dnd-kit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !slide.cards) return;

    const oldIndex = slide.cards.findIndex((c) => c.id === active.id);
    const newIndex = slide.cards.findIndex((c) => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const nextCards = arrayMove(slide.cards, oldIndex, newIndex);
      onUpdateSlide({
        ...slide,
        cards: nextCards,
      });
    }
  };

  // Card update helper
  const updateCard = (cardId: string, partial: Partial<SlideCard>) => {
    if (!slide.cards) return;
    const nextCards = slide.cards.map((c) =>
      c.id === cardId ? { ...c, ...partial } : c
    );
    onUpdateSlide({ ...slide, cards: nextCards });
  };

  // Add new card
  const handleAddCard = () => {
    const currentCards = slide.cards || [];
    const newCard: SlideCard = {
      id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      badge: `Topic 0${currentCards.length + 1}`,
      title: 'New Key Concept',
      body: 'Add your substantive description, mechanism, or evidence points here.',
      bullets: [],
    };
    onUpdateSlide({
      ...slide,
      cards: [...currentCards, newCard],
    });
  };

  // Duplicate card
  const handleDuplicateCard = (cardId: string) => {
    if (!slide.cards) return;
    const targetIdx = slide.cards.findIndex((c) => c.id === cardId);
    if (targetIdx === -1) return;
    const target = slide.cards[targetIdx];
    const duplicated: SlideCard = {
      ...target,
      id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${target.title} (Copy)`,
    };
    const nextCards = [...slide.cards];
    nextCards.splice(targetIdx + 1, 0, duplicated);
    onUpdateSlide({ ...slide, cards: nextCards });
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    if (!slide.cards) return;
    const nextCards = slide.cards.filter((c) => c.id !== cardId);
    onUpdateSlide({ ...slide, cards: nextCards });
  };

  // Bullets on a card
  const updateCardBullet = (cardId: string, bulletIdx: number, val: string) => {
    if (!slide.cards) return;
    const card = slide.cards.find((c) => c.id === cardId);
    if (!card) return;
    const nextBullets = [...(card.bullets || [])];
    nextBullets[bulletIdx] = val;
    updateCard(cardId, { bullets: nextBullets });
  };

  const addCardBullet = (cardId: string) => {
    if (!slide.cards) return;
    const card = slide.cards.find((c) => c.id === cardId);
    if (!card) return;
    const nextBullets = [...(card.bullets || []), 'New discussion takeaway'];
    updateCard(cardId, { bullets: nextBullets });
  };

  const deleteCardBullet = (cardId: string, bulletIdx: number) => {
    if (!slide.cards) return;
    const card = slide.cards.find((c) => c.id === cardId);
    if (!card) return;
    const nextBullets = (card.bullets || []).filter((_, i) => i !== bulletIdx);
    updateCard(cardId, { bullets: nextBullets });
  };

  // Determine grid columns dynamically based on card count
  const cardCount = slide.cards?.length || 0;
  const gridColsClass =
    cardCount <= 1
      ? 'grid-cols-1 max-w-2xl mx-auto'
      : cardCount === 2
      ? 'grid-cols-2'
      : cardCount === 3
      ? 'grid-cols-3'
      : cardCount === 4
      ? 'grid-cols-4'
      : 'grid-cols-3';

  return (
    <div
      className="relative transition-transform duration-150 ease-out select-none shadow-2xl rounded-2xl overflow-hidden border border-slate-700/50"
      style={{
        width: '1280px',
        height: '720px',
        transform: `scale(${zoomScale})`,
        transformOrigin: 'center center',
        backgroundColor: bgStyle,
        color: textColor,
        fontFamily: activeTheme?.fonts?.body || 'system-ui, sans-serif',
      }}
    >
      {/* Visual background ambient gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at 85% 15%, ${accentColor}18 0%, transparent 60%), radial-gradient(circle at 10% 90%, ${headingColor}12 0%, transparent 50%)`,
        }}
      />

      {/* Main Slide Workspace: 1280x720 flex column layout */}
      <div className="relative z-10 w-full h-full p-12 flex flex-col justify-between overflow-hidden">
        {/* ================================================================= */}
        {/* 1. SLIDE HEADER BLOCK */}
        {/* ================================================================= */}
        <header className="space-y-3 shrink-0">
          {/* Kicker / Badge & Postulate row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm"
                style={{
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                <InlineEditableText
                  value={slide.badge || 'PRESENTATION MODULE'}
                  placeholder="KICKER / TOPIC"
                  onChange={(val) => onUpdateSlide({ ...slide, badge: val })}
                  className="font-bold tracking-wider text-xs uppercase"
                />
              </span>

              {slide.postulate && (
                <span className="text-xs uppercase tracking-widest text-slate-400 opacity-75 font-mono">
                  • {slide.postulate}
                </span>
              )}
            </div>

            {/* Standard / Curriculum anchor */}
            {slide.standard && (
              <span className="text-xs font-mono text-slate-400 bg-slate-800/40 border border-slate-700/40 rounded px-2 py-0.5">
                {slide.standard}
              </span>
            )}
          </div>

          {/* Slide Title */}
          <h1
            className="text-4xl font-extrabold tracking-tight leading-tight"
            style={{
              fontFamily: activeTheme?.fonts?.heading || 'inherit',
              color: headingColor,
            }}
          >
            <InlineEditableText
              value={slide.title}
              placeholder="Enter slide title..."
              onChange={(val) => onUpdateSlide({ ...slide, title: val })}
              className="text-4xl font-extrabold leading-tight"
            />
          </h1>

          {/* Slide Subtitle */}
          <div
            className="text-sm font-medium opacity-80 max-w-4xl"
            style={{ color: textColor }}
          >
            <InlineEditableText
              value={slide.subtitle || ''}
              placeholder="Add an instructional context, chapter focus, or subtitle..."
              onChange={(val) => onUpdateSlide({ ...slide, subtitle: val })}
              className="text-sm font-medium"
            />
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. SLIDE INTERACTIVE CARDS BLOCK (DnD Reorderable) */}
        {/* ================================================================= */}
        {cardCount > 0 && (
          <div className="flex-1 my-6 flex flex-col justify-center min-h-0">
            <DndContext
              id={dndContextId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={slide.cards!.map((c) => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className={`grid ${gridColsClass} gap-6 items-stretch w-full`}>
                  {slide.cards!.map((card, idx) => (
                    <BlockDraggable
                      key={card.id}
                      id={card.id}
                      onDuplicate={() => handleDuplicateCard(card.id)}
                      onDelete={() => handleDeleteCard(card.id)}
                      className="h-full flex flex-col"
                    >
                      <div
                        className="h-full rounded-2xl p-6 border shadow-xl flex flex-col justify-between transition-all duration-200 hover:shadow-2xl relative"
                        style={{
                          backgroundColor: cardBgColor,
                          borderColor: cardBorderColor,
                          backdropFilter: 'blur(16px)',
                        }}
                      >
                        {/* Card Header & Badge */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border"
                              style={{
                                borderColor: `${accentColor}30`,
                                backgroundColor: `${accentColor}10`,
                                color: accentColor,
                              }}
                            >
                              <InlineEditableText
                                value={card.badge || `Section 0${idx + 1}`}
                                placeholder="CATEGORY"
                                onChange={(val) => updateCard(card.id, { badge: val })}
                                className="text-[11px] font-semibold uppercase tracking-wider"
                              />
                            </span>

                            {/* Stat/Figure callout if present */}
                            {card.stat && (
                              <span
                                className="text-xl font-bold font-mono tracking-tight"
                                style={{ color: headingColor }}
                              >
                                <InlineEditableText
                                  value={card.stat}
                                  placeholder="99%"
                                  onChange={(val) => updateCard(card.id, { stat: val })}
                                  className="text-xl font-bold font-mono text-right"
                                />
                              </span>
                            )}
                          </div>

                          {/* Card Title */}
                          <h3
                            className="text-lg font-bold tracking-tight leading-snug"
                            style={{
                              fontFamily: activeTheme?.fonts?.heading || 'inherit',
                              color: headingColor,
                            }}
                          >
                            <InlineEditableText
                              value={card.title}
                              placeholder="Card heading..."
                              onChange={(val) => updateCard(card.id, { title: val })}
                              className="text-lg font-bold leading-snug"
                            />
                          </h3>

                          {/* Card Body Description */}
                          <div
                            className="text-sm leading-relaxed opacity-85"
                            style={{ color: textColor }}
                          >
                            <InlineEditableText
                              value={card.body}
                              placeholder="Write key explanation, factual proof, or analytical mechanism..."
                              multiline
                              rows={3}
                              onChange={(val) => updateCard(card.id, { body: val })}
                              className="text-sm leading-relaxed"
                            />
                          </div>

                          {/* Bullets List (if present) */}
                          {card.bullets && card.bullets.length > 0 && (
                            <ul className="space-y-1.5 mt-2 pt-2 border-t border-slate-700/30">
                              {card.bullets.map((bullet, bIdx) => (
                                <li
                                  key={bIdx}
                                  className="flex items-start gap-2 text-xs group/bullet"
                                >
                                  <span
                                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: accentColor }}
                                  />
                                  <div className="flex-1">
                                    <InlineEditableText
                                      value={bullet}
                                      placeholder="Bullet point..."
                                      onChange={(val) =>
                                        updateCardBullet(card.id, bIdx, val)
                                      }
                                      className="text-xs"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => deleteCardBullet(card.id, bIdx)}
                                    className="opacity-0 group-hover/bullet:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded"
                                    title="Remove bullet"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Card Footer: Reference Citation & Bullet Add button */}
                        <div className="mt-4 pt-3 border-t border-slate-700/20 flex items-center justify-between text-xs text-slate-400">
                          {card.citation ? (
                            <div className="flex items-center gap-1 opacity-70">
                              <BookOpen className="w-3 h-3 text-emerald-400" />
                              <span className="font-mono text-[10px]">
                                Ref: {card.citation}
                              </span>
                            </div>
                          ) : (
                            <div />
                          )}

                          <button
                            type="button"
                            onClick={() => addCardBullet(card.id)}
                            className="hover:text-emerald-400 text-slate-500 flex items-center gap-0.5 text-[10px] font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add bullet</span>
                          </button>
                        </div>
                      </div>
                    </BlockDraggable>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. FALLBACK / STANDALONE BULLETS OR EMPTY CARDS */}
        {/* ================================================================= */}
        {cardCount === 0 && (
          <div className="flex-1 my-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-2xl p-8 bg-slate-900/20 text-center">
            <Sparkles className="w-8 h-8 text-emerald-400 mb-3 opacity-60" />
            <h4 className="text-base font-semibold text-slate-200">
              Structured Interactive Block Slide
            </h4>
            <p className="text-sm text-slate-400 max-w-md mt-1 mb-4">
              This slide is ready for interactive elements. Add reorderable cards,
              curriculum takeaways, or metrics with native drag handles.
            </p>
            <button
              type="button"
              onClick={handleAddCard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Card</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. SLIDE BOTTOM BAR */}
        {/* ================================================================= */}
        <footer className="pt-4 border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-mono font-semibold text-slate-300">
              SLIDE {String(slide.slide_number || 1).padStart(2, '0')}
            </span>

            {/* Quick Add Card Action */}
            <button
              type="button"
              onClick={handleAddCard}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/40 transition-colors text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Interactive Block Mode Active
            </span>
            <span className="text-slate-500">• 1280 × 720 Fixed Aspect</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
