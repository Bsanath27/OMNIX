import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  Trash2,
  BookOpen,
  Image as ImageIcon,
  Camera,
  Layers,
  Shapes,
  FlaskConical,
} from 'lucide-react';
import { generateAIImage, resolveImage } from '../../api';

export type AIStyle = 'scientific' | '3d_concept' | 'vector_art' | 'photorealistic';

interface AIImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  slideTitle: string;
  currentQuery?: string;
  currentImageUrl?: string | null;
  onApplyImage: (imageUrl: string, query?: string) => void;
  onRemoveImage: () => void;
  isDarkMode?: boolean;
}

const STYLE_OPTIONS: {
  id: AIStyle;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}[] = [
  {
    id: 'scientific',
    label: 'Scientific Diagram',
    desc: 'Annotated textbook cross-section, clean white background, high pedagogical clarity.',
    icon: FlaskConical,
    badge: 'Textbook',
  },
  {
    id: '3d_concept',
    label: '3D Isometric',
    desc: 'High-definition 3D volumetric model, subtle lighting, isolated conceptual focus.',
    icon: Shapes,
    badge: 'Volumetric',
  },
  {
    id: 'vector_art',
    label: 'Vector Flat Art',
    desc: 'Clean minimal vector graphic, SVG styling, crisp iconography and geometry.',
    icon: Layers,
    badge: 'Illustration',
  },
  {
    id: 'photorealistic',
    label: 'Photorealistic',
    desc: 'Studio macroscopic photography, authentic real-world optical depth and focus.',
    icon: Camera,
    badge: 'Macro Photo',
  },
];

export const AIImageStudioModal: React.FC<AIImageStudioModalProps> = ({
  isOpen,
  onClose,
  slideTitle,
  currentQuery,
  currentImageUrl,
  onApplyImage,
  onRemoveImage,
  isDarkMode = true,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<AIStyle>('scientific');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'ai' | 'wiki' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever modal opens or active slide changes
  useEffect(() => {
    if (isOpen) {
      const initialPrompt = currentQuery || `${slideTitle} scientific diagram`;
      setPrompt(initialPrompt);
      setPreviewUrl(currentImageUrl || null);
      setPreviewSource(currentImageUrl ? 'Current Slide Image' : null);
      setErrorMsg(null);
    }
  }, [isOpen, slideTitle, currentQuery, currentImageUrl]);

  if (!isOpen) return null;

  const handleGenerateAI = async () => {
    const q = prompt.trim() || slideTitle;
    setIsLoading(true);
    setLoadingMode('ai');
    setErrorMsg(null);
    try {
      const res = await generateAIImage(q, selectedStyle, slideTitle);
      if (res && res.url) {
        setPreviewUrl(res.url);
        setPreviewSource(`AI Diffusion (${res.style || selectedStyle})`);
        onApplyImage(res.url, q);
      } else {
        setErrorMsg('AI diffusion returned no image URL. Try refining prompt.');
      }
    } catch (err: any) {
      console.error('Failed to generate AI visual:', err);
      setErrorMsg(err.message || 'Failed to synthesize AI visual.');
    } finally {
      setIsLoading(false);
      setLoadingMode(null);
    }
  };

  const handleSearchWikimedia = async () => {
    const q = prompt.trim() || slideTitle;
    setIsLoading(true);
    setLoadingMode('wiki');
    setErrorMsg(null);
    try {
      const res = await resolveImage(q, slideTitle);
      if (res && res.url) {
        setPreviewUrl(res.url);
        setPreviewSource(`Public Domain (${res.source || 'Wikimedia'})`);
        onApplyImage(res.url, q);
      } else {
        setErrorMsg('No public domain diagram found for this query.');
      }
    } catch (err: any) {
      console.error('Failed to resolve Wikimedia diagram:', err);
      setErrorMsg(err.message || 'Wikimedia search failed.');
    } finally {
      setIsLoading(false);
      setLoadingMode(null);
    }
  };

  const handleRemove = () => {
    onRemoveImage();
    setPreviewUrl(null);
    setPreviewSource(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode
            ? 'bg-[#121316] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5C00] to-amber-500 flex items-center justify-center shadow-lg shadow-[#FF5C00]/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">AI Image Studio & Visual Synthesis</h3>
              <p className="text-xs text-slate-400">
                Generate high-pedagogy AI visuals or retrieve textbook schematics for{' '}
                <span className="text-white font-medium">"{slideTitle}"</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
                Visual Prompt & Subject
              </label>
              <span className="text-[11px] text-slate-500 font-mono">Tailored for educational accuracy</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Chloroplast thylakoid light absorption mechanism"
                className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
                  isDarkMode
                    ? 'bg-black/40 border-white/15 text-white focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5C00]'
                }`}
              />
            </div>

            {/* Quick Prompt Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                `${slideTitle} scientific diagram`,
                `${slideTitle} cross-section`,
                `${slideTitle} 3D molecular model`,
                `${slideTitle} microscopic structure`,
              ].map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(pill)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#FF5C00]/20 hover:text-[#FF5C00] border border-white/10 text-slate-300 transition-colors"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Select Visual Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STYLE_OPTIONS.map((style) => {
                const Icon = style.icon;
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-[#FF5C00] bg-[#FF5C00]/10 ring-1 ring-[#FF5C00]'
                        : isDarkMode
                        ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#FF5C00] text-white' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {style.badge}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{style.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {style.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Current Visual Preview</span>
              {previewSource && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-400 border border-emerald-500/20">
                  {previewSource}
                </span>
              )}
            </div>

            <div
              className={`relative rounded-xl border h-48 overflow-hidden flex items-center justify-center ${
                isDarkMode ? 'bg-black/50 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2 text-center p-4">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5C00]" />
                  <span className="text-xs font-medium text-slate-200">
                    {loadingMode === 'ai'
                      ? 'Generating visual with AI Diffusion Engine (~4s)...'
                      : 'Searching Wikimedia Commons public domain archive...'}
                  </span>
                  <span className="text-[10px] text-slate-400">Rendering high-resolution educational asset</span>
                </div>
              ) : previewUrl ? (
                <div className="relative w-full h-full group">
                  <img
                    src={previewUrl}
                    alt={prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-xs text-white font-mono truncate">{previewUrl}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-1">
                  <ImageIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">No image assigned to this slide yet</p>
                  <p className="text-[11px] text-slate-500">
                    Click 'Generate with AI' or 'Search Wikimedia' below to attach a relevant diagram
                  </p>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  className="underline hover:text-white font-semibold ml-2"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3 bg-black/20 shrink-0">
          <div className="flex items-center gap-2">
            {currentImageUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Remove image from this slide"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Visual</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSearchWikimedia}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Search textbook diagrams on Wikimedia Commons"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Wikimedia Search</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-[#FF5C00]/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading && loadingMode === 'ai' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
