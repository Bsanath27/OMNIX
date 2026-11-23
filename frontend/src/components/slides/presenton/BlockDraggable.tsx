import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy } from 'lucide-react';

interface BlockDraggableProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onDelete?: () => void;
  onDuplicate?: () => void;
  showActions?: boolean;
}

export const BlockDraggable: React.FC<BlockDraggableProps> = ({
  id,
  children,
  className = '',
  style: propStyle,
  onDelete,
  onDuplicate,
  showActions = true,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
    ...propStyle,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/block relative transition-shadow duration-150 ${
        isDragging ? 'ring-2 ring-emerald-500 shadow-2xl' : ''
      } ${className}`}
    >
      {/* Top Floating Action & Drag Handle Bar */}
      {showActions && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity duration-150 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-md px-1 py-0.5 shadow-md">
          {/* Drag Handle with GripVertical */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 hover:text-emerald-400 text-slate-400 hover:bg-slate-800 rounded cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reorder"
            aria-label="Drag block"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate Block */}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 hover:text-cyan-400 text-slate-400 hover:bg-slate-800 rounded transition-colors"
              title="Duplicate block"
              aria-label="Duplicate block"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Block */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:text-rose-400 text-slate-400 hover:bg-slate-800 rounded transition-colors"
              title="Delete block"
              aria-label="Delete block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
