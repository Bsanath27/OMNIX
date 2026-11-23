import React, { useRef, useEffect } from 'react';

interface InlineEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
  rows?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onChange,
  placeholder = 'Type something...',
  className = '',
  multiline = false,
  style,
  rows = 2,
  disabled = false,
  ariaLabel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height to fit content
  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 24)}px`;
    }
  }, [value, multiline]);

  const baseClasses =
    'w-full bg-transparent border border-transparent hover:border-emerald-500/40 focus:border-emerald-500/80 focus:bg-slate-900/30 rounded px-1.5 py-0.5 outline-none transition-colors duration-150 cursor-text select-text';

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent) => {
    // Prevent dnd-kit from intercepting clicks and selections inside text fields
    e.stopPropagation();
  };

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={value || ''}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onPointerDown={handlePointerDown}
        onMouseDown={handlePointerDown}
        className={`${baseClasses} resize-none overflow-hidden ${className}`}
        style={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          color: 'inherit',
          fontWeight: 'inherit',
          ...style,
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={handlePointerDown}
      onMouseDown={handlePointerDown}
      className={`${baseClasses} ${className}`}
      style={{
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        color: 'inherit',
        fontWeight: 'inherit',
        ...style,
      }}
    />
  );
};
