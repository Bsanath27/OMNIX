import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Sparkles,
  LayoutGrid,
  ImageIcon,
  Repeat,
  Plus,
  Check,
  ArrowLeft,
  Loader2,
  Layers,
} from 'lucide-react';
import { fetchPresentonCatalog, fetchTemplateDetails, PresentonCatalogTemplate } from '../api';

export interface TemplateItem {
  id: string;
  name: string;
  category: 'visuals' | 'comparison' | 'sequence' | 'hierarchy' | 'data' | 'bento' | 'editorial';
  archetype: string;
  description: string;
  tag: string;
  previewSvg: React.ReactNode;
}

export const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', count: '105+' },
  { id: 'visuals', name: 'Images & Visuals', count: '14' },
  { id: 'comparison', name: 'Comparisons & Trade-offs', count: '12' },
  { id: 'sequence', name: 'Sequences & Roadmaps', count: '18' },
  { id: 'hierarchy', name: 'Hierarchies & Pyramids', count: '10' },
  { id: 'data', name: 'Data, Charts & Stats', count: '20' },
  { id: 'bento', name: 'Bento & Cards', count: '16' },
  { id: 'editorial', name: 'Editorial & Quotes', count: '15' },
] as const;

export const TEMPLATE_LIBRARY: TemplateItem[] = [
  // ── 1. VISUALS & IMAGES ──
  {
    id: 'hero_visual_split',
    name: 'Split Visual Hero (60/40)',
    category: 'visuals',
    archetype: 'hero_visual_split',
    description: '60% structured conceptual pillars + 40% high-res scientific photo card with live query.',
    tag: 'Signature',
    previewSvg: (
      <div className="w-full h-full p-2 flex gap-1.5 items-stretch bg-black/20 rounded">
        <div className="w-7/12 flex flex-col justify-between">
          <div className="h-1.5 w-1/3 bg-[#FF5C00] rounded" />
          <div className="h-2 w-3/4 bg-white/40 rounded mt-1" />
          <div className="space-y-1 mt-2">
            <div className="h-4 bg-white/10 rounded border border-white/5" />
            <div className="h-4 bg-white/10 rounded border border-white/5" />
          </div>
        </div>
        <div className="w-5/12 bg-gradient-to-br from-emerald-600/40 to-blue-600/40 rounded border border-white/20 flex items-center justify-center">
          <ImageIcon className="w-3.5 h-3.5 text-white/70" />
        </div>
      </div>
    ),
  },
  {
    id: 'image_hero_full',
    name: 'Full-Bleed Image Hero',
    category: 'visuals',
    archetype: 'image_hero_full',
    description: 'Massive full-bleed background visual with floating glassmorphism text card.',
    tag: 'Editorial',
    previewSvg: (
      <div className="w-full h-full relative p-2 bg-gradient-to-br from-indigo-900/60 to-slate-900 rounded overflow-hidden flex items-end">
        <div className="w-full bg-black/70 backdrop-blur-md p-1.5 rounded border border-white/20 space-y-1">
          <div className="h-1.5 w-1/4 bg-[#FF5C00] rounded" />
          <div className="h-2 w-2/3 bg-white/60 rounded" />
          <div className="h-1.5 w-full bg-white/20 rounded" />
        </div>
      </div>
    ),
  },

  // ── 2. COMPARISONS & TRADE-OFFS ──
  {
    id: 'before_after',
    name: 'Before & After Contrast',
    category: 'comparison',
    archetype: 'before_after',
    description: 'Dual high-contrast panels: Problem / Traditional state vs Transformed / Automated state.',
    tag: 'Popular',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-2 gap-1.5 bg-black/20 rounded">
        <div className="p-1.5 rounded bg-rose-950/30 border border-rose-500/30 flex flex-col justify-between">
          <div className="h-1.5 w-1/2 bg-rose-500 rounded" />
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-rose-200/20 rounded" />
            <div className="h-1.5 w-3/4 bg-rose-200/20 rounded" />
          </div>
        </div>
        <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
          <div className="h-1.5 w-1/2 bg-emerald-500 rounded" />
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-emerald-200/20 rounded" />
            <div className="h-1.5 w-3/4 bg-emerald-200/20 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'pros_cons',
    name: 'Pros & Cons Evaluation',
    category: 'comparison',
    archetype: 'pros_cons',
    description: 'Structured decision matrix: Pros with green checkmarks vs Cons with alert badges.',
    tag: 'Decision',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-2 gap-1.5 bg-black/20 rounded">
        <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/30 space-y-1">
          <div className="h-1.5 w-2/3 bg-emerald-400 rounded" />
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><div className="h-1 w-full bg-white/20 rounded" /></div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><div className="h-1 w-4/5 bg-white/20 rounded" /></div>
        </div>
        <div className="p-1.5 rounded bg-amber-950/20 border border-amber-500/30 space-y-1">
          <div className="h-1.5 w-2/3 bg-amber-400 rounded" />
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><div className="h-1 w-full bg-white/20 rounded" /></div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><div className="h-1 w-4/5 bg-white/20 rounded" /></div>
        </div>
      </div>
    ),
  },
  {
    id: 'split_comparison',
    name: '2-Column Comparison',
    category: 'comparison',
    archetype: 'split_comparison',
    description: 'Balanced side-by-side comparative cards with category tags and bullet points.',
    tag: 'Classic',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-2 gap-1.5 bg-black/20 rounded">
        <div className="p-1.5 rounded bg-white/5 border border-white/10 space-y-1.5">
          <div className="h-1.5 w-1/2 bg-[#FF5C00] rounded" />
          <div className="h-2 w-3/4 bg-white/40 rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
        </div>
        <div className="p-1.5 rounded bg-white/5 border border-white/10 space-y-1.5">
          <div className="h-1.5 w-1/2 bg-[#FF5C00] rounded" />
          <div className="h-2 w-3/4 bg-white/40 rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
        </div>
      </div>
    ),
  },

  // ── 3. SEQUENCES & ROADMAPS ──
  {
    id: 'sequence_steps',
    name: 'Sequence Chevrons / Steps',
    category: 'sequence',
    archetype: 'sequence_steps',
    description: 'Sequential procedural step flow connected by directional circular indicators.',
    tag: 'Process',
    previewSvg: (
      <div className="w-full h-full p-2 flex items-center justify-between gap-1 bg-black/20 rounded">
        <div className="flex-1 p-1 bg-white/5 rounded border border-white/10 text-center">
          <div className="w-2.5 h-2.5 mx-auto bg-[#FF5C00] rounded-full mb-1" />
          <div className="h-1 w-3/4 mx-auto bg-white/40 rounded" />
        </div>
        <div className="w-2 h-0.5 bg-white/20" />
        <div className="flex-1 p-1 bg-white/5 rounded border border-white/10 text-center">
          <div className="w-2.5 h-2.5 mx-auto bg-[#FF5C00] rounded-full mb-1" />
          <div className="h-1 w-3/4 mx-auto bg-white/40 rounded" />
        </div>
        <div className="w-2 h-0.5 bg-white/20" />
        <div className="flex-1 p-1 bg-white/5 rounded border border-white/10 text-center">
          <div className="w-2.5 h-2.5 mx-auto bg-[#FF5C00] rounded-full mb-1" />
          <div className="h-1 w-3/4 mx-auto bg-white/40 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'timeline',
    name: 'Timeline Track',
    category: 'sequence',
    archetype: 'timeline',
    description: 'Horizontal milestone track with connected progress points and dates/phases.',
    tag: 'Roadmap',
    previewSvg: (
      <div className="w-full h-full p-2 flex flex-col justify-center bg-black/20 rounded relative">
        <div className="h-0.5 w-full bg-white/20 absolute left-0 top-1/2 -translate-y-1/2" />
        <div className="flex justify-between relative z-10 px-2">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00] ring-2 ring-black" />
            <div className="h-1 w-6 bg-white/30 rounded mt-1" />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-black" />
            <div className="h-1 w-6 bg-white/30 rounded mt-1" />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-black" />
            <div className="h-1 w-6 bg-white/30 rounded mt-1" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'staircase_progression',
    name: 'Staircase Elevation',
    category: 'sequence',
    archetype: 'staircase_progression',
    description: 'Ascending elevation steps moving upward from left to right (Foundation -> Master).',
    tag: 'Progression',
    previewSvg: (
      <div className="w-full h-full p-2 flex items-end gap-1.5 bg-black/20 rounded">
        <div className="flex-1 h-1/3 bg-white/10 rounded-t border-t border-white/20 flex flex-col justify-end p-1">
          <div className="h-1 w-full bg-white/30 rounded" />
        </div>
        <div className="flex-1 h-2/3 bg-white/15 rounded-t border-t border-[#FF5C00]/40 flex flex-col justify-end p-1">
          <div className="h-1 w-full bg-white/40 rounded" />
        </div>
        <div className="flex-1 h-full bg-[#FF5C00]/20 rounded-t border-t border-[#FF5C00] flex flex-col justify-end p-1">
          <div className="h-1 w-full bg-[#FF5C00] rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'snake_roadmap',
    name: 'S-Curve Snake Roadmap',
    category: 'sequence',
    archetype: 'snake_roadmap',
    description: 'Serpentine milestone flow with alternating upper and lower milestone nodes.',
    tag: 'Journey',
    previewSvg: (
      <div className="w-full h-full p-2 bg-black/20 rounded flex items-center justify-between">
        <div className="space-y-3 w-full">
          <div className="flex justify-around">
            <div className="w-4 h-3 bg-white/15 rounded border border-white/10" />
            <div className="w-4 h-3 bg-white/15 rounded border border-white/10" />
          </div>
          <div className="h-0.5 w-full bg-dashed border-t border-dashed border-[#FF5C00]/50" />
          <div className="flex justify-around">
            <div className="w-4 h-3 bg-white/15 rounded border border-white/10 translate-x-3" />
            <div className="w-4 h-3 bg-white/15 rounded border border-white/10 translate-x-3" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'process_cycle',
    name: 'Process Cycle',
    category: 'sequence',
    archetype: 'process_cycle',
    description: 'Closed-loop continuous cyclical workflow with central feedback indicator.',
    tag: 'Continuous',
    previewSvg: (
      <div className="w-full h-full p-2 flex items-center justify-center bg-black/20 rounded relative">
        <div className="w-12 h-12 rounded-full border border-dashed border-[#FF5C00]/50 flex items-center justify-center">
          <Repeat className="w-3.5 h-3.5 text-[#FF5C00]" />
        </div>
        <div className="absolute top-1 left-2 w-3 h-3 bg-white/10 rounded-full" />
        <div className="absolute top-1 right-2 w-3 h-3 bg-white/10 rounded-full" />
        <div className="absolute bottom-1 right-2 w-3 h-3 bg-white/10 rounded-full" />
        <div className="absolute bottom-1 left-2 w-3 h-3 bg-white/10 rounded-full" />
      </div>
    ),
  },

  // ── 4. HIERARCHIES & PYRAMIDS ──
  {
    id: 'pyramid_hierarchy',
    name: 'Hierarchy Pyramid / Funnel',
    category: 'hierarchy',
    archetype: 'pyramid_hierarchy',
    description: 'Multi-tier ascending pyramid: Peak synthesis at top, foundational concepts at base.',
    tag: 'Hierarchy',
    previewSvg: (
      <div className="w-full h-full p-2 flex flex-col items-center justify-between gap-1 bg-black/20 rounded">
        <div className="w-1/3 h-3 bg-[#FF5C00]/30 rounded border border-[#FF5C00] flex items-center justify-center">
          <div className="h-1 w-1/2 bg-[#FF5C00] rounded" />
        </div>
        <div className="w-2/3 h-3 bg-white/15 rounded border border-white/20 flex items-center justify-center">
          <div className="h-1 w-1/2 bg-white/50 rounded" />
        </div>
        <div className="w-full h-3 bg-white/10 rounded border border-white/10 flex items-center justify-center">
          <div className="h-1 w-1/2 bg-white/30 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'circular_hub',
    name: 'Circular Hub & Spoke',
    category: 'hierarchy',
    archetype: 'circular_hub',
    description: 'Central core concept disk surrounded by 4 radial orbiting satellite pillars.',
    tag: 'Network',
    previewSvg: (
      <div className="w-full h-full p-1.5 flex items-center justify-center bg-black/20 rounded relative">
        <div className="w-6 h-6 rounded-full bg-[#FF5C00]/20 border border-[#FF5C00] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#FF5C00]" />
        </div>
        <div className="absolute top-1 left-2 w-4 h-2.5 bg-white/10 rounded border border-white/10" />
        <div className="absolute top-1 right-2 w-4 h-2.5 bg-white/10 rounded border border-white/10" />
        <div className="absolute bottom-1 left-2 w-4 h-2.5 bg-white/10 rounded border border-white/10" />
        <div className="absolute bottom-1 right-2 w-4 h-2.5 bg-white/10 rounded border border-white/10" />
      </div>
    ),
  },

  // ── 5. DATA, CHARTS & STATS ──
  {
    id: 'chart_data',
    name: 'Data Chart Hero',
    category: 'data',
    archetype: 'chart_data',
    description: 'Empirical data analysis: Contextual findings on left + quantitative percentage bars on right.',
    tag: 'Charts',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-2 gap-1.5 bg-black/20 rounded">
        <div className="p-1 rounded bg-white/5 border border-white/10 space-y-1">
          <div className="h-1.5 w-1/2 bg-[#FF5C00] rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
          <div className="h-1 w-3/4 bg-white/20 rounded" />
        </div>
        <div className="p-1 rounded bg-white/5 border border-white/10 space-y-1">
          <div className="h-1 w-11/12 bg-blue-500 rounded" />
          <div className="h-1 w-4/12 bg-blue-400 rounded" />
          <div className="h-1 w-9/12 bg-blue-500 rounded" />
          <div className="h-1 w-3/12 bg-blue-400 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'stats_grid',
    name: 'KPI Metrics Grid',
    category: 'data',
    archetype: 'stats_grid',
    description: '3 to 4 oversized metric blocks with retention figures, progress bars, and trend badges.',
    tag: 'Quantitative',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-3 gap-1 bg-black/20 rounded items-center">
        <div className="p-1 bg-white/5 rounded border border-white/10 text-center space-y-0.5">
          <div className="text-[10px] font-black text-[#FF5C00]">94%</div>
          <div className="h-0.5 w-full bg-[#FF5C00] rounded" />
        </div>
        <div className="p-1 bg-white/5 rounded border border-white/10 text-center space-y-0.5">
          <div className="text-[10px] font-black text-white">3.2x</div>
          <div className="h-0.5 w-full bg-white/40 rounded" />
        </div>
        <div className="p-1 bg-white/5 rounded border border-white/10 text-center space-y-0.5">
          <div className="text-[10px] font-black text-emerald-400">100%</div>
          <div className="h-0.5 w-full bg-emerald-400 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'stat_callout',
    name: 'Stat Callout / Metrics Hero',
    category: 'data',
    archetype: 'stat_callout',
    description: 'Massive dual KPI figures with comparative baseline badges and contextual analysis.',
    tag: 'Impact',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-2 gap-1.5 bg-black/20 rounded">
        <div className="p-1.5 bg-white/5 rounded border border-white/10 flex flex-col justify-between">
          <div className="text-xs font-black text-[#FF5C00]">94.8%</div>
          <div className="h-1 w-3/4 bg-white/30 rounded" />
        </div>
        <div className="p-1.5 bg-white/5 rounded border border-white/10 flex flex-col justify-between">
          <div className="text-xs font-black text-white">3.2x</div>
          <div className="h-1 w-3/4 bg-white/30 rounded" />
        </div>
      </div>
    ),
  },

  // ── 6. BENTO & CARDS ──
  {
    id: 'card_grid_3',
    name: '3-Card Bento Grid',
    category: 'bento',
    archetype: 'card_grid_3',
    description: 'Balanced 3-card bento grid with individual concept badges, titles, and body cards.',
    tag: 'Flexible',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-3 gap-1 bg-black/20 rounded">
        <div className="p-1 rounded bg-white/5 border border-white/10 space-y-1">
          <div className="h-1 w-1/2 bg-[#FF5C00] rounded" />
          <div className="h-1.5 w-3/4 bg-white/40 rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
        </div>
        <div className="p-1 rounded bg-white/5 border border-white/10 space-y-1">
          <div className="h-1 w-1/2 bg-[#FF5C00] rounded" />
          <div className="h-1.5 w-3/4 bg-white/40 rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
        </div>
        <div className="p-1 rounded bg-white/5 border border-white/10 space-y-1">
          <div className="h-1 w-1/2 bg-[#FF5C00] rounded" />
          <div className="h-1.5 w-3/4 bg-white/40 rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'bento_4',
    name: '4-Card Quad Bento',
    category: 'bento',
    archetype: 'bento_4',
    description: '2x2 symmetrical quad cards with badges and icons for dense concept coverage.',
    tag: 'Grid',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-2 grid-rows-2 gap-1 bg-black/20 rounded">
        <div className="p-1 rounded bg-white/5 border border-white/10"><div className="h-1 w-1/2 bg-[#FF5C00] rounded" /></div>
        <div className="p-1 rounded bg-white/5 border border-white/10"><div className="h-1 w-1/2 bg-white/40 rounded" /></div>
        <div className="p-1 rounded bg-white/5 border border-white/10"><div className="h-1 w-1/2 bg-white/40 rounded" /></div>
        <div className="p-1 rounded bg-white/5 border border-white/10"><div className="h-1 w-1/2 bg-white/40 rounded" /></div>
      </div>
    ),
  },
  {
    id: 'bullet_list',
    name: 'Structured Concept List',
    category: 'bento',
    archetype: 'bullet_list',
    description: 'Clean stacked concept cards with numbered badges and itemized definitions.',
    tag: 'List',
    previewSvg: (
      <div className="w-full h-full p-2 space-y-1 bg-black/20 rounded flex flex-col justify-center">
        <div className="h-2.5 w-full bg-white/5 rounded border border-white/10 px-1 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
          <div className="h-1 w-2/3 bg-white/30 rounded" />
        </div>
        <div className="h-2.5 w-full bg-white/5 rounded border border-white/10 px-1 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
          <div className="h-1 w-3/4 bg-white/30 rounded" />
        </div>
        <div className="h-2.5 w-full bg-white/5 rounded border border-white/10 px-1 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
          <div className="h-1 w-1/2 bg-white/30 rounded" />
        </div>
      </div>
    ),
  },

  // ── 7. EDITORIAL & PHILOSOPHY ──
  {
    id: 'hero_title',
    name: 'Title / Master Deck Hero',
    category: 'editorial',
    archetype: 'hero_title',
    description: 'Presentation introduction with dominant thesis statement and supporting competency pillars.',
    tag: 'Cover',
    previewSvg: (
      <div className="w-full h-full p-2 grid grid-cols-12 gap-1 bg-black/20 rounded items-stretch">
        <div className="col-span-7 bg-white/5 rounded border border-white/10 p-1 flex flex-col justify-between">
          <div className="h-1.5 w-1/3 bg-[#FF5C00] rounded" />
          <div className="h-2 w-3/4 bg-white/60 rounded" />
          <div className="h-1 w-full bg-white/20 rounded" />
        </div>
        <div className="col-span-5 flex flex-col gap-1">
          <div className="flex-1 bg-white/5 rounded border border-white/10 p-1"><div className="h-1 w-2/3 bg-white/30 rounded" /></div>
          <div className="flex-1 bg-white/5 rounded border border-white/10 p-1"><div className="h-1 w-2/3 bg-white/30 rounded" /></div>
        </div>
      </div>
    ),
  },
  {
    id: 'editorial_quote',
    name: 'Editorial Pullquote',
    category: 'editorial',
    archetype: 'editorial_quote',
    description: 'Massive italicized quotation typography with author citation and core pedagogical takeaway.',
    tag: 'Quote',
    previewSvg: (
      <div className="w-full h-full p-2 bg-black/20 rounded flex flex-col justify-between">
        <div className="text-sm font-serif italic text-[#FF5C00] leading-none">“</div>
        <div className="h-2 w-4/5 mx-auto bg-white/60 rounded" />
        <div className="h-1.5 w-2/3 mx-auto bg-white/30 rounded" />
        <div className="flex justify-between items-center pt-1 border-t border-white/10">
          <div className="h-1 w-1/4 bg-[#FF5C00] rounded" />
          <div className="h-1 w-1/3 bg-white/20 rounded" />
        </div>
      </div>
    ),
  },
];

interface SlideTemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeArchetype?: string;
  onSelectTemplate: (archetype: string, templatePackId?: string, layoutObject?: any) => void;
  onInsertNewSlideWithTemplate?: (archetype: string) => void;
  isDarkMode?: boolean;
}

export const SlideTemplateLibraryModal: React.FC<SlideTemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  activeArchetype,
  onSelectTemplate,
  onInsertNewSlideWithTemplate,
  isDarkMode = true,
}) => {
  const [mainTab, setMainTab] = useState<'packs' | 'archetypes'>('packs');
  const [catalogPacks, setCatalogPacks] = useState<PresentonCatalogTemplate[]>([]);
  const [selectedPack, setSelectedPack] = useState<PresentonCatalogTemplate | null>(null);
  const [selectedPackData, setSelectedPackData] = useState<any | null>(null);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchPresentonCatalog()
        .then((res) => setCatalogPacks(res.templates || []))
        .catch((err) => console.warn('Could not fetch catalog:', err));
    }
  }, [isOpen]);

  const handleSelectPack = async (pack: PresentonCatalogTemplate) => {
    setSelectedPack(pack);
    setIsLoadingPack(true);
    try {
      const data = await fetchTemplateDetails(pack.id);
      setSelectedPackData(data);
    } catch (e) {
      console.warn('Failed to load pack details:', e);
    } finally {
      setIsLoadingPack(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return TEMPLATE_LIBRARY.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#181715] border-[#2B2926] text-[#F5F2EB]'
            : 'bg-white border-[#E8E2D8] text-[#18181B]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`h-16 px-6 border-b flex items-center justify-between shrink-0 gap-4 ${
            isDarkMode ? 'border-[#2B2926] bg-[#141312]' : 'border-[#E8E2D8] bg-[#FAF7F2]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/30">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Presenton Template Library</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF5C00] text-white">
                  383+ Layouts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Choose an official design pack or smart layout archetype for the active slide.
              </p>
            </div>
          </div>

          {/* Engine Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 dark:bg-white/5 border border-white/10 text-xs">
            <button
              onClick={() => { setMainTab('packs'); setSelectedPack(null); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                mainTab === 'packs'
                  ? 'bg-[#FF5C00] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>16 Design Packs (383 Layouts)</span>
            </button>
            <button
              onClick={() => setMainTab('archetypes')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                mainTab === 'archetypes'
                  ? 'bg-[#FF5C00] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Smart Archetypes (105+)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-40 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search layouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-[#23211F] border-[#32302C] text-white placeholder-slate-500 focus:border-[#FF5C00]'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#FF5C00]'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode
                  ? 'border-[#2B2926] hover:bg-white/10 text-slate-400 hover:text-white'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-black'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Either Official Design Packs OR Smart Archetypes */}
        {mainTab === 'packs' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {selectedPack ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSelectedPack(null); setSelectedPackData(null); }}
                      className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to All Packs</span>
                    </button>
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <span>{selectedPack.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-mono">
                          {selectedPack.layout_count} Layouts
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedPack.description}</p>
                    </div>
                  </div>
                </div>

                {isLoadingPack ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-[#FF5C00]" />
                    <span className="text-xs">Loading {selectedPack.name} layout geometries...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(selectedPackData?.layouts || []).map((layout: any, idx: number) => (
                      <div
                        key={layout.id || idx}
                        className="rounded-2xl border border-white/10 p-4 bg-white/[0.03] hover:border-[#FF5C00]/50 hover:bg-white/[0.05] transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-mono text-[#FF5C00] text-[10px] uppercase font-bold">
                              Layout 0{idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {layout.components?.length || 0} components
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-white leading-snug truncate">
                            {layout.name || layout.id.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {layout.description || 'Pre-engineered Presenton coordinate layout.'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              onSelectTemplate(layout.id, selectedPack?.id, layout);
                              onClose();
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-[#FF5C00] hover:bg-[#e05200] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Apply Layout</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Official Presenton Design Systems (16 packs, 383 pre-engineered layouts)</span>
                  <span className="text-[11px] font-mono">Click any pack to explore and apply its layouts</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {catalogPacks.map((pack) => (
                    <div
                      key={pack.id}
                      onClick={() => handleSelectPack(pack)}
                      className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#FF5C00]/60 hover:bg-white/[0.06] p-4 flex flex-col justify-between transition-all shadow-lg hover:shadow-2xl"
                    >
                      <div className="space-y-2.5">
                        {/* Thumbnail / Header Preview */}
                        <div className="w-full h-28 rounded-xl overflow-hidden bg-black/40 border border-white/10 relative flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                          <img
                            src={pack.thumbnail}
                            alt={pack.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback colored card
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-[#FF5C00]">
                            {pack.layout_count} Layouts
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-white group-hover:text-[#FF5C00] transition-colors">
                            {pack.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                            {pack.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between">
                        {/* Color Swatches */}
                        <div className="flex items-center -space-x-1">
                          {pack.theme?.colors?.primary && (
                            <div
                              className="w-4 h-4 rounded-full border border-black/40"
                              style={{ backgroundColor: pack.theme.colors.primary }}
                              title="Primary"
                            />
                          )}
                          {pack.theme?.colors?.card && (
                            <div
                              className="w-4 h-4 rounded-full border border-black/40"
                              style={{ backgroundColor: pack.theme.colors.card }}
                              title="Card"
                            />
                          )}
                          {pack.theme?.colors?.background && (
                            <div
                              className="w-4 h-4 rounded-full border border-black/40"
                              style={{ backgroundColor: pack.theme.colors.background }}
                              title="Background"
                            />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-[#FF5C00] group-hover:underline flex items-center gap-1">
                          <span>Explore</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
        /* Modal Body: Smart Archetypes Sidebar Categories + Grid */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Categories */}
          <div
            className={`w-52 shrink-0 border-r p-3 space-y-1 overflow-y-auto hidden sm:block ${
              isDarkMode ? 'border-[#2B2926] bg-[#151413]' : 'border-[#E8E2D8] bg-[#F7F4EE]'
            }`}
          >
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
              Categories
            </div>
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#FF5C00] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-200 hover:text-black'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-black/20 text-white'
                        : isDarkMode
                        ? 'bg-white/10 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Grid: Template Cards */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Showing {filteredTemplates.length} layout archetypes</span>
              <span className="text-[11px] font-mono">1-click to transform current slide</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const isCurrent = activeArchetype === template.archetype;
                return (
                  <div
                    key={template.id}
                    className={`group relative rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'border-[#FF5C00] ring-2 ring-[#FF5C00]/30 shadow-lg'
                        : isDarkMode
                        ? 'bg-[#1C1B19] border-[#2E2C28] hover:border-[#FF5C00]/50 hover:shadow-xl'
                        : 'bg-white border-slate-200 hover:border-[#FF5C00]/50 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Miniature Visual Preview Canvas */}
                      <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 border border-black/10 dark:border-white/10 relative">
                        {template.previewSvg}
                        {isCurrent && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#FF5C00] text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                            <Check className="w-3 h-3" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Tag */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-xs truncate">{template.name}</h3>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/30 shrink-0">
                          {template.tag}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {template.description}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <button
                        onClick={() => {
                          onSelectTemplate(template.archetype);
                          onClose();
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-[#FF5C00] text-white'
                            : 'bg-[#FF5C00]/15 hover:bg-[#FF5C00] text-[#FF5C00] hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isCurrent ? 'Current Layout' : 'Apply Layout'}</span>
                      </button>

                      {onInsertNewSlideWithTemplate && (
                        <button
                          onClick={() => {
                            onInsertNewSlideWithTemplate(template.archetype);
                            onClose();
                          }}
                          className={`p-1.5 rounded-xl border transition-colors ${
                            isDarkMode
                              ? 'border-[#2E2C28] hover:bg-white/10 text-slate-400 hover:text-white'
                              : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-black'
                          }`}
                          title="Insert as New Slide"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
