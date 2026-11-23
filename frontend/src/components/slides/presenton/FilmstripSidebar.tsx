import React, { useId } from 'react';
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
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Layers,
} from 'lucide-react';
import { SlideContent } from './types';

interface FilmstripSidebarProps {
  slides: SlideContent[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (nextSlides: SlideContent[]) => void;
}

interface FilmstripItemProps {
  slide: SlideContent;
  index: number;
  isActive: boolean;
  totalSlides: number;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const FilmstripItem: React.FC<FilmstripItemProps> = ({
  slide,
  index,
  isActive,
  totalSlides,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id || `slide-${index}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const cardCount = slide.cards?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/thumb relative rounded-xl transition-all duration-150 p-2 cursor-pointer border ${
        isActive
          ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
          : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
      }`}
      onClick={onSelect}
    >
      {/* Slide number & actions header */}
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover/thumb:opacity-100 p-0.5 text-slate-500 hover:text-emerald-400 cursor-grab active:cursor-grabbing rounded transition-opacity"
            title="Drag to reorder slide"
            aria-label="Drag slide"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span
            className={`font-mono font-bold text-[11px] ${
              isActive ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Hover quick action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
          {index > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
              title="Move up"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          )}

          {index < totalSlides - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
              title="Move down"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-0.5 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-700"
            title="Duplicate slide"
          >
            <Copy className="w-3 h-3" />
          </button>

          {totalSlides > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-0.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-700"
              title="Delete slide"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mini Thumbnail Visual Representation */}
      <div className="aspect-[16/9] w-full rounded-md bg-slate-950 p-2.5 flex flex-col justify-between border border-slate-800/80 overflow-hidden shadow-inner">
        <div>
          {slide.badge && (
            <div className="text-[8px] font-bold tracking-widest text-emerald-400 uppercase truncate">
              {slide.badge}
            </div>
          )}
          <div className="text-[11px] font-semibold text-slate-200 line-clamp-1 leading-snug">
            {slide.title || `Slide ${index + 1}`}
          </div>
        </div>

        {/* Mini card skeleton bars */}
        <div className="flex items-center gap-1 mt-1">
          {cardCount > 0 ? (
            Array.from({ length: Math.min(cardCount, 4) }).map((_, cI) => (
              <div
                key={cI}
                className="h-2 flex-1 rounded-sm bg-slate-800/80 border border-slate-700/50"
              />
            ))
          ) : (
            <div className="h-2 w-full rounded-sm bg-slate-900 border border-slate-800" />
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
          <span>{cardCount} {cardCount === 1 ? 'card' : 'cards'}</span>
          {slide.archetype && <span className="truncate max-w-[80px]">{slide.archetype}</span>}
        </div>
      </div>
    </div>
  );
};

export const FilmstripSidebar: React.FC<FilmstripSidebarProps> = ({
  slides,
  currentSlideIndex,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
}) => {
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s, i) => (s.id || `slide-${i}`) === active.id);
    const newIndex = slides.findIndex((s, i) => (s.id || `slide-${i}`) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const next = arrayMove(slides, oldIndex, newIndex).map((s, idx) => ({
        ...s,
        slide_number: idx + 1,
      }));
      onReorderSlides(next);
      onSelectSlide(newIndex);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = arrayMove(slides, index, index - 1).map((s, idx) => ({
      ...s,
      slide_number: idx + 1,
    }));
    onReorderSlides(next);
    onSelectSlide(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= slides.length - 1) return;
    const next = arrayMove(slides, index, index + 1).map((s, idx) => ({
      ...s,
      slide_number: idx + 1,
    }));
    onReorderSlides(next);
    onSelectSlide(index + 1);
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/90 flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Filmstrip
          </span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {slides.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onAddSlide}
          className="p-1 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
          title="Add New Slide"
          aria-label="Add slide"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Slide Thumbnails Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slides.map((s, i) => s.id || `slide-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            {slides.map((slide, index) => (
              <FilmstripItem
                key={slide.id || `slide-${index}`}
                slide={slide}
                index={index}
                isActive={index === currentSlideIndex}
                totalSlides={slides.length}
                onSelect={() => onSelectSlide(index)}
                onDuplicate={() => onDuplicateSlide(index)}
                onDelete={() => onDeleteSlide(index)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Bottom Add Slide Button */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onAddSlide}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-800/40 hover:bg-emerald-950/20 text-slate-300 hover:text-emerald-300 text-xs font-semibold transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>New Slide</span>
        </button>
      </div>
    </aside>
  );
};
