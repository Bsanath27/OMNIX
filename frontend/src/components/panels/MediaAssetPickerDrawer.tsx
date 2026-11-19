import { useState, useMemo } from 'react';
import {
  X,
  Search,
  Image as ImageIcon,
  Sparkles,
  Check,
  CheckCircle2,
  Atom,
  Dna,
  Microscope,
  Orbit,
  Flame,
  Binary,
  Gauge,
  Compass,
  Satellite,
  Radiation,
  Cpu,
  Zap,
  Activity,
  Brain,
  Stethoscope,
  Telescope,
  Layers,
  Radio,
  CircuitBoard,
  Thermometer,
  Eye,
  HeartPulse,
  BatteryCharging,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Repeat,
  ArrowUpRight,
  MoveRight,
  CornerDownRight,
  Shuffle,
  Undo2,
  ChevronsRight,
  GitBranch,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Award,
  Trophy,
  Target,
  Shield,
  Lightbulb,
  Box,
  Folder,
  Database,
  Globe,
  Calendar,
  Clock,
  FileText,
  CheckSquare,
  GraduationCap,
  Laptop,
  Flag,
  Key,
  AlertTriangle,
  HelpCircle,
  Star,
  Heart,
  Info,
  Hash,
  Sigma,
  Percent,
  ShieldAlert,
  MessageSquare,
  Pin,
  LucideIcon,
} from 'lucide-react';

export interface MediaAssetPickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, query?: string) => void;
  onSelectIcon?: (iconName: string) => void;
  currentImageQuery?: string;
  currentImageUrl?: string;
  selectedIconName?: string;
}

export type MediaTab = 'photos' | 'icons';

export interface EducationalPhoto {
  id: string;
  title: string;
  category: 'Biology' | 'Physics' | 'Chemistry' | 'Space' | 'Engineering' | 'Math';
  tags: string[];
  url: string;
  author: string;
}

const CURATED_PHOTOS: EducationalPhoto[] = [
  {
    id: 'photo-1',
    title: 'Chlorophyll Cell Microscopy',
    category: 'Biology',
    tags: ['photosynthesis', 'cell', 'plant', 'biology', 'chloroplast', 'leaf'],
    url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
    author: 'Chokniti Khongchum',
  },
  {
    id: 'photo-2',
    title: 'DNA Double Helix & Genetics',
    category: 'Biology',
    tags: ['dna', 'genetics', 'cell', 'biology', 'chromosome', 'molecular'],
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    author: 'Sangharsh Lohakare',
  },
  {
    id: 'photo-3',
    title: 'Quantum Laser Optics & Waves',
    category: 'Physics',
    tags: ['physics', 'light', 'laser', 'optics', 'quantum', 'wavelength', 'mechanics'],
    url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
    author: 'Roman Mager',
  },
  {
    id: 'photo-4',
    title: 'Laboratory Chemical Titration',
    category: 'Chemistry',
    tags: ['chemistry', 'flask', 'reaction', 'titration', 'acid', 'solution', 'lab'],
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80',
    author: 'Hans Reniers',
  },
  {
    id: 'photo-5',
    title: 'Deep Space Galaxy & Nebula',
    category: 'Space',
    tags: ['space', 'galaxy', 'astronomy', 'stars', 'nebula', 'physics', 'cosmos'],
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    author: 'NASA',
  },
  {
    id: 'photo-6',
    title: 'Precision Mechanical Transmission',
    category: 'Engineering',
    tags: ['mechanics', 'gears', 'engineering', 'force', 'torque', 'physics', 'motion'],
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    author: 'Science in HD',
  },
  {
    id: 'photo-7',
    title: 'Fluid Dynamics & Vortex Surface',
    category: 'Physics',
    tags: ['fluid', 'water', 'turbulence', 'mechanics', 'hydrodynamics', 'density'],
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    author: 'Joel Filipe',
  },
  {
    id: 'photo-8',
    title: 'Biological Neuron Synaptic Network',
    category: 'Biology',
    tags: ['brain', 'neuron', 'synapse', 'neuroscience', 'biology', 'nervous system'],
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80',
    author: 'Robina Weermeijer',
  },
  {
    id: 'photo-9',
    title: 'Semiconductor Microprocessor Circuit',
    category: 'Engineering',
    tags: ['semiconductor', 'cpu', 'circuit', 'engineering', 'electronics', 'silicon'],
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    author: 'Alexandre Debiève',
  },
  {
    id: 'photo-10',
    title: 'Geometric Crystal Lattice Structure',
    category: 'Math',
    tags: ['geometry', 'crystal', 'lattice', 'math', 'symmetry', 'structure', 'solid'],
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    author: 'Milad Fakurian',
  },
  {
    id: 'photo-11',
    title: 'Solar Eclipse & Corona Radiation',
    category: 'Space',
    tags: ['sun', 'eclipse', 'radiation', 'corona', 'space', 'solar', 'astronomy'],
    url: 'https://images.unsplash.com/photo-1532798369041-b33eb577ef1a?auto=format&fit=crop&w=1200&q=80',
    author: 'Bryan Goff',
  },
  {
    id: 'photo-12',
    title: 'Microbial Culture Petri Dish Assay',
    category: 'Biology',
    tags: ['bacteria', 'culture', 'petri', 'microbiology', 'biology', 'cell'],
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
    author: 'CDC',
  },
];

export interface IconRegistryItem {
  name: string;
  component: LucideIcon;
  category: 'Science' | 'Arrows' | 'Objects' | 'Symbols';
  tags: string[];
}

export const ICON_REGISTRY: IconRegistryItem[] = [
  // SCIENCE
  { name: 'Atom', component: Atom, category: 'Science', tags: ['physics', 'molecule', 'nuclear', 'electron'] },
  { name: 'Dna', component: Dna, category: 'Science', tags: ['biology', 'genetics', 'helix', 'life'] },
  { name: 'Microscope', component: Microscope, category: 'Science', tags: ['lab', 'biology', 'optics', 'zoom'] },
  { name: 'Orbit', component: Orbit, category: 'Science', tags: ['space', 'physics', 'planet', 'gravity'] },
  { name: 'Flame', component: Flame, category: 'Science', tags: ['heat', 'fire', 'energy', 'thermodynamics'] },
  { name: 'Binary', component: Binary, category: 'Science', tags: ['code', 'data', 'math', 'digital'] },
  { name: 'Gauge', component: Gauge, category: 'Science', tags: ['speed', 'pressure', 'meter', 'metric'] },
  { name: 'Compass', component: Compass, category: 'Science', tags: ['direction', 'magnetic', 'geometry'] },
  { name: 'Satellite', component: Satellite, category: 'Science', tags: ['space', 'communication', 'orbit'] },
  { name: 'Radiation', component: Radiation, category: 'Science', tags: ['nuclear', 'physics', 'energy', 'hazard'] },
  { name: 'Cpu', component: Cpu, category: 'Science', tags: ['computer', 'processor', 'hardware', 'chip'] },
  { name: 'Zap', component: Zap, category: 'Science', tags: ['electricity', 'energy', 'lightning', 'power'] },
  { name: 'Activity', component: Activity, category: 'Science', tags: ['pulse', 'ekg', 'heart', 'biology'] },
  { name: 'Brain', component: Brain, category: 'Science', tags: ['neuroscience', 'biology', 'mind', 'ai'] },
  { name: 'Stethoscope', component: Stethoscope, category: 'Science', tags: ['medicine', 'doctor', 'biology'] },
  { name: 'Telescope', component: Telescope, category: 'Science', tags: ['astronomy', 'stars', 'optics'] },
  { name: 'Layers', component: Layers, category: 'Science', tags: ['strata', 'geology', 'architecture', 'levels'] },
  { name: 'Radio', component: Radio, category: 'Science', tags: ['frequency', 'electromagnetic', 'wave'] },
  { name: 'CircuitBoard', component: CircuitBoard, category: 'Science', tags: ['electronics', 'hardware', 'engineering'] },
  { name: 'Thermometer', component: Thermometer, category: 'Science', tags: ['temperature', 'celsius', 'heat'] },
  { name: 'Eye', component: Eye, category: 'Science', tags: ['optics', 'vision', 'biology', 'perception'] },
  { name: 'HeartPulse', component: HeartPulse, category: 'Science', tags: ['cardiology', 'pulse', 'biology'] },
  { name: 'BatteryCharging', component: BatteryCharging, category: 'Science', tags: ['energy', 'battery', 'charge'] },

  // ARROWS
  { name: 'ArrowRight', component: ArrowRight, category: 'Arrows', tags: ['next', 'direction', 'forward', 'flow'] },
  { name: 'TrendingUp', component: TrendingUp, category: 'Arrows', tags: ['growth', 'increase', 'graph', 'chart'] },
  { name: 'RefreshCw', component: RefreshCw, category: 'Arrows', tags: ['cycle', 'reload', 'repeat', 'loop'] },
  { name: 'Repeat', component: Repeat, category: 'Arrows', tags: ['repetition', 'cycle', 'periodic'] },
  { name: 'ArrowUpRight', component: ArrowUpRight, category: 'Arrows', tags: ['increase', 'external', 'trajectory'] },
  { name: 'MoveRight', component: MoveRight, category: 'Arrows', tags: ['motion', 'vector', 'velocity'] },
  { name: 'CornerDownRight', component: CornerDownRight, category: 'Arrows', tags: ['branch', 'subpoint', 'flow'] },
  { name: 'Shuffle', component: Shuffle, category: 'Arrows', tags: ['random', 'entropy', 'stochastic'] },
  { name: 'Undo2', component: Undo2, category: 'Arrows', tags: ['reverse', 'revert', 'opposite'] },
  { name: 'ChevronsRight', component: ChevronsRight, category: 'Arrows', tags: ['fast forward', 'accelerate', 'steps'] },
  { name: 'GitBranch', component: GitBranch, category: 'Arrows', tags: ['split', 'divergence', 'branching'] },
  { name: 'ArrowDown', component: ArrowDown, category: 'Arrows', tags: ['descent', 'gravity', 'decrease'] },
  { name: 'ArrowUp', component: ArrowUp, category: 'Arrows', tags: ['elevation', 'ascent', 'buoyancy'] },

  // OBJECTS
  { name: 'BookOpen', component: BookOpen, category: 'Objects', tags: ['textbook', 'reading', 'curriculum', 'learn'] },
  { name: 'Award', component: Award, category: 'Objects', tags: ['mastery', 'medal', 'achievement'] },
  { name: 'Trophy', component: Trophy, category: 'Objects', tags: ['winner', 'goal', 'milestone'] },
  { name: 'Target', component: Target, category: 'Objects', tags: ['objective', 'aim', 'focus', 'accuracy'] },
  { name: 'Shield', component: Shield, category: 'Objects', tags: ['protection', 'conservation', 'defense'] },
  { name: 'Lightbulb', component: Lightbulb, category: 'Objects', tags: ['insight', 'idea', 'discovery', 'innovation'] },
  { name: 'Box', component: Box, category: 'Objects', tags: ['container', 'volume', 'matter', 'system'] },
  { name: 'Folder', component: Folder, category: 'Objects', tags: ['directory', 'files', 'collection'] },
  { name: 'Database', component: Database, category: 'Objects', tags: ['storage', 'repository', 'dataset'] },
  { name: 'Globe', component: Globe, category: 'Objects', tags: ['earth', 'planetary', 'worldwide', 'geography'] },
  { name: 'Calendar', component: Calendar, category: 'Objects', tags: ['schedule', 'time', 'epoch', 'date'] },
  { name: 'Clock', component: Clock, category: 'Objects', tags: ['duration', 'seconds', 'timeline', 'chronology'] },
  { name: 'FileText', component: FileText, category: 'Objects', tags: ['document', 'notes', 'paper', 'manuscript'] },
  { name: 'CheckSquare', component: CheckSquare, category: 'Objects', tags: ['task', 'checklist', 'verification'] },
  { name: 'GraduationCap', component: GraduationCap, category: 'Objects', tags: ['education', 'degree', 'academic'] },
  { name: 'Laptop', component: Laptop, category: 'Objects', tags: ['workstation', 'computer', 'screen'] },
  { name: 'Flag', component: Flag, category: 'Objects', tags: ['checkpoint', 'marker', 'benchmark'] },
  { name: 'Key', component: Key, category: 'Objects', tags: ['formula', 'solution', 'unlock', 'core'] },

  // SYMBOLS
  { name: 'Sparkles', component: Sparkles, category: 'Symbols', tags: ['ai', 'magic', 'gemini', 'highlight'] },
  { name: 'CheckCircle2', component: CheckCircle2, category: 'Symbols', tags: ['success', 'verified', 'correct', 'valid'] },
  { name: 'AlertTriangle', component: AlertTriangle, category: 'Symbols', tags: ['warning', 'caution', 'exception'] },
  { name: 'HelpCircle', component: HelpCircle, category: 'Symbols', tags: ['question', 'inquiry', 'curiosity'] },
  { name: 'Star', component: Star, category: 'Symbols', tags: ['favorite', 'key point', 'critical'] },
  { name: 'Heart', component: Heart, category: 'Symbols', tags: ['essential', 'vital', 'human'] },
  { name: 'Info', component: Info, category: 'Symbols', tags: ['notice', 'definition', 'grounding'] },
  { name: 'Hash', component: Hash, category: 'Symbols', tags: ['number', 'index', 'rank'] },
  { name: 'Sigma', component: Sigma, category: 'Symbols', tags: ['sum', 'math', 'integration', 'greek'] },
  { name: 'Percent', component: Percent, category: 'Symbols', tags: ['ratio', 'proportion', 'fraction'] },
  { name: 'ShieldAlert', component: ShieldAlert, category: 'Symbols', tags: ['risk', 'boundary', 'constraint'] },
  { name: 'MessageSquare', component: MessageSquare, category: 'Symbols', tags: ['discussion', 'dialogue', 'prompt'] },
  { name: 'Pin', component: Pin, category: 'Symbols', tags: ['postulate', 'anchor', 'axiom'] },
];

export function MediaAssetPickerDrawer({
  isOpen,
  onClose,
  onSelectImage,
  onSelectIcon,
  currentImageQuery = '',
  currentImageUrl = '',
  selectedIconName = '',
}: MediaAssetPickerDrawerProps) {
  const [activeTab, setActiveTab] = useState<MediaTab>('photos');
  const [photoSearchQuery, setPhotoSearchQuery] = useState(currentImageQuery || '');
  const [photoCategory, setPhotoCategory] = useState<string>('All');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customQueryInput, setCustomQueryInput] = useState('');

  // Icon Tab states
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [iconCategory, setIconCategory] = useState<string>('All');
  const [activeSelectedIcon, setActiveSelectedIcon] = useState<string>(selectedIconName);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    const q = photoSearchQuery.toLowerCase().trim();
    return CURATED_PHOTOS.filter((photo) => {
      const matchCat = photoCategory === 'All' || photo.category === photoCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        photo.title.toLowerCase().includes(q) ||
        photo.tags.some((t) => t.toLowerCase().includes(q)) ||
        photo.category.toLowerCase().includes(q)
      );
    });
  }, [photoSearchQuery, photoCategory]);

  // Filtered icons
  const filteredIcons = useMemo(() => {
    const q = iconSearchQuery.toLowerCase().trim();
    return ICON_REGISTRY.filter((icon) => {
      const matchCat = iconCategory === 'All' || icon.category === iconCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        icon.name.toLowerCase().includes(q) ||
        icon.tags.some((t) => t.toLowerCase().includes(q)) ||
        icon.category.toLowerCase().includes(q)
      );
    });
  }, [iconSearchQuery, iconCategory]);

  if (!isOpen) return null;

  const handleApplyCustomImage = () => {
    if (customUrlInput.trim()) {
      onSelectImage(customUrlInput.trim(), customQueryInput || 'Custom Visual');
      onClose();
    }
  };

  const handleGeneratePollinations = () => {
    const q = customQueryInput.trim() || photoSearchQuery.trim() || 'scientific mechanism diagram';
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(q)}%20${Date.now()}?width=800&height=600&nologo=true`;
    onSelectImage(generatedUrl, q);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-xl h-full bg-[#141312] border-l border-[#2B2926] text-slate-200 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* ── HEADER ── */}
        <div className="p-5 border-b border-[#23211F] bg-[#181715] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF5C00]/15 text-[#FF5C00] ring-1 ring-[#FF5C00]/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Media & Icon Asset Picker</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Curated high-res educational visuals & Lucide vector iconography
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252422] transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── TAB SWITCHER ── */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#23211F] bg-[#161513] shrink-0">
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'photos'
                ? 'bg-[#FF5C00] text-white shadow-md shadow-[#FF5C00]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#201F1C]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Unsplash Photography</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/30 text-white/80">
              {CURATED_PHOTOS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('icons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'icons'
                ? 'bg-[#FF5C00] text-white shadow-md shadow-[#FF5C00]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#201F1C]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Iconography</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/30 text-white/80">
              {ICON_REGISTRY.length}
            </span>
          </button>
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ========================================================
              TAB 1: UNSPLASH PHOTOGRAPHY
          ======================================================== */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={photoSearchQuery}
                  onChange={(e) => setPhotoSearchQuery(e.target.value)}
                  placeholder="Search educational photos (e.g., cell, photosynthesis, mechanics)..."
                  className="w-full bg-[#1C1B19] border border-[#2B2926] focus:border-[#FF5C00] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                {photoSearchQuery && (
                  <button
                    onClick={() => setPhotoSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Topic Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Biology', 'Physics', 'Chemistry', 'Space', 'Engineering', 'Math'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPhotoCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                      photoCategory === cat
                        ? 'bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/50'
                        : 'bg-[#1C1B19] text-slate-400 border border-[#2B2926] hover:text-slate-200 hover:bg-[#252421]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Photo Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                    Curated Results ({filteredPhotos.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Click photo to apply to active slide</span>
                </div>

                {filteredPhotos.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[#1C1B19] border border-[#2B2926] text-slate-400">
                    <p className="text-xs mb-2">No matching photos found for "{photoSearchQuery}".</p>
                    <button
                      onClick={() => {
                        setPhotoSearchQuery('');
                        setPhotoCategory('All');
                      }}
                      className="text-xs text-[#FF5C00] font-semibold hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredPhotos.map((photo) => {
                      const isCurrent = currentImageUrl === photo.url;
                      return (
                        <div
                          key={photo.id}
                          onClick={() => {
                            onSelectImage(photo.url, photo.title);
                            onClose();
                          }}
                          className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-[4/3] bg-black/40 ${
                            isCurrent
                              ? 'border-[#FF5C00] ring-2 ring-[#FF5C00]/50 shadow-lg'
                              : 'border-[#2B2926] hover:border-[#FF5C00]/70 hover:scale-[1.02]'
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={photo.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/70 text-slate-200 backdrop-blur-sm">
                              {photo.category}
                            </span>
                          </div>

                          {isCurrent && (
                            <div className="absolute top-2 right-2 p-1 rounded-full bg-[#FF5C00] text-white shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}

                          {/* Bottom Info */}
                          <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-xs font-bold text-white truncate drop-shadow">
                              {photo.title}
                            </p>
                            <p className="text-[10px] text-slate-300 truncate">Photo by {photo.author}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Image URL / AI Prompt Option */}
              <div className="pt-4 border-t border-[#23211F] space-y-3">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
                  Custom Visual Link or AI Generation
                </span>

                <div className="space-y-2 p-3.5 rounded-xl bg-[#1C1B19] border border-[#2B2926]">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="Paste direct HTTPS image URL..."
                    className="w-full bg-[#141312] border border-[#2B2926] focus:border-[#FF5C00] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customQueryInput}
                      onChange={(e) => setCustomQueryInput(e.target.value)}
                      placeholder="Prompt keyword (e.g. quantum entanglement diagram)..."
                      className="flex-1 bg-[#141312] border border-[#2B2926] focus:border-[#FF5C00] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                    <button
                      onClick={handleGeneratePollinations}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 text-[#FF5C00] border border-orange-500/40 text-xs font-semibold hover:bg-[#FF5C00] hover:text-white transition-all whitespace-nowrap"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>AI Render</span>
                    </button>
                    {customUrlInput && (
                      <button
                        onClick={handleApplyCustomImage}
                        className="px-3 py-1.5 rounded-lg bg-[#FF5C00] text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: ICONOGRAPHY (LUCIDE)
          ======================================================== */}
          {activeTab === 'icons' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={iconSearchQuery}
                  onChange={(e) => setIconSearchQuery(e.target.value)}
                  placeholder="Search vector icons (e.g., atom, dna, arrow, book)..."
                  className="w-full bg-[#1C1B19] border border-[#2B2926] focus:border-[#FF5C00] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                {iconSearchQuery && (
                  <button
                    onClick={() => setIconSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Badges (Science, Arrows, Objects, Symbols) */}
              <div className="flex items-center gap-1.5">
                {['All', 'Science', 'Arrows', 'Objects', 'Symbols'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setIconCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      iconCategory === cat
                        ? 'bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/50'
                        : 'bg-[#1C1B19] text-slate-400 border border-[#2B2926] hover:text-slate-200 hover:bg-[#252421]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Active Selection Banner */}
              {activeSelectedIcon && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5C00]" />
                    <span>
                      Selected Icon: <strong className="text-white font-mono">{activeSelectedIcon}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveSelectedIcon('')}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Icon Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                    Lucide Icon Catalog ({filteredIcons.length})
                  </span>
                  <span className="text-[10px] text-slate-500">1-click attach to card</span>
                </div>

                {filteredIcons.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[#1C1B19] border border-[#2B2926] text-slate-400">
                    <p className="text-xs mb-2">No matching icons found for "{iconSearchQuery}".</p>
                    <button
                      onClick={() => {
                        setIconSearchQuery('');
                        setIconCategory('All');
                      }}
                      className="text-xs text-[#FF5C00] font-semibold hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                    {filteredIcons.map((item) => {
                      const IconComp = item.component;
                      const isSelected = activeSelectedIcon === item.name;
                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            setActiveSelectedIcon(item.name);
                            if (onSelectIcon) {
                              onSelectIcon(item.name);
                            }
                            onClose();
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group ${
                            isSelected
                              ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-[#FF5C00] shadow-sm'
                              : 'bg-[#1C1B19] border-[#2B2926] text-slate-300 hover:text-white hover:border-[#FF5C00]/50 hover:bg-[#252422]'
                          }`}
                          title={`${item.name} (${item.category})`}
                        >
                          <IconComp className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                            isSelected ? 'text-[#FF5C00]' : 'text-slate-300 group-hover:text-white'
                          }`} />
                          <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
