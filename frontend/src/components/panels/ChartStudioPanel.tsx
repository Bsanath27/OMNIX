import { useState, useId } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Plus,
  Trash2,
  X,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export type ChartType = 'horizontal_bars' | 'donut' | 'performance_curve';

export interface ChartStudioPanelProps {
  chartData: ChartDataPoint[];
  chartType?: ChartType;
  onChangeChartData: (data: ChartDataPoint[]) => void;
  onChangeChartType?: (type: ChartType) => void;
  onClose?: () => void;
  title?: string;
  className?: string;
}

const PRESET_DATASETS: { name: string; type: ChartType; data: ChartDataPoint[] }[] = [
  {
    name: 'Photosynthesis Absorption',
    type: 'horizontal_bars',
    data: [
      { label: 'Wavelength 450nm (Blue)', value: 92 },
      { label: 'Wavelength 550nm (Green)', value: 18 },
      { label: 'Wavelength 680nm (Red)', value: 85 },
      { label: 'Dark Baseline', value: 24 },
    ],
  },
  {
    name: 'Gas Composition (Atmosphere)',
    type: 'donut',
    data: [
      { label: 'Nitrogen (N2)', value: 78 },
      { label: 'Oxygen (O2)', value: 21 },
      { label: 'Argon & Trace', value: 1 },
    ],
  },
  {
    name: 'Enzyme Reaction Velocity',
    type: 'performance_curve',
    data: [
      { label: '10°C (Sub-optimal)', value: 25 },
      { label: '25°C (Moderate)', value: 65 },
      { label: '37°C (Enzyme Peak)', value: 98 },
      { label: '50°C (Denaturing)', value: 42 },
      { label: '65°C (Inactivated)', value: 8 },
    ],
  },
  {
    name: 'Fluid Density Benchmarks',
    type: 'horizontal_bars',
    data: [
      { label: 'Air (STP)', value: 2 },
      { label: 'Gasoline', value: 68 },
      { label: 'Pure Water', value: 100 },
      { label: 'Mercury', value: 136 },
    ],
  },
];

const PALETTE = [
  '#FF5C00', // Neon Orange (Brand)
  '#38BDF8', // Sky Blue
  '#34D399', // Emerald
  '#F472B6', // Pink
  '#A78BFA', // Purple
  '#FBBF24', // Amber
  '#2DD4BF', // Teal
  '#FB7185', // Rose
];

export function ChartStudioPanel({
  chartData = [],
  chartType = 'horizontal_bars',
  onChangeChartData,
  onChangeChartType,
  onClose,
  title = 'Interactive Chart & Data Studio',
  className = '',
}: ChartStudioPanelProps) {
  const [selectedType, setSelectedType] = useState<ChartType>(chartType);
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const chartId = useId().replace(/:/g, '');

  // Keep internal state aligned if parent changes
  const points = chartData && chartData.length > 0
    ? chartData
    : [
        { label: 'Benchmark A', value: 80 },
        { label: 'Benchmark B', value: 45 },
        { label: 'Benchmark C', value: 65 },
      ];

  const handleTypeSelect = (type: ChartType) => {
    setSelectedType(type);
    if (onChangeChartType) {
      onChangeChartType(type);
    }
  };

  const handleUpdateLabel = (index: number, newLabel: string) => {
    const next = points.map((p, i) => (i === index ? { ...p, label: newLabel } : p));
    onChangeChartData(next);
  };

  const handleUpdateValue = (index: number, rawVal: string | number) => {
    const num = Math.max(0, Math.min(1000, Number(rawVal) || 0));
    const next = points.map((p, i) => (i === index ? { ...p, value: num } : p));
    onChangeChartData(next);
  };

  const handleAddDataPoint = () => {
    const next = [
      ...points,
      { label: `Data Point 0${points.length + 1}`, value: 50 },
    ];
    onChangeChartData(next);
  };

  const handleDeleteDataPoint = (index: number) => {
    if (points.length <= 1) return;
    const next = points.filter((_, i) => i !== index);
    onChangeChartData(next);
  };

  const handleMovePoint = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= points.length) return;
    const next = [...points];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChangeChartData(next);
  };

  const handleApplyPreset = (presetIdx: number) => {
    const preset = PRESET_DATASETS[presetIdx];
    setActivePresetIndex(presetIdx);
    handleTypeSelect(preset.type);
    onChangeChartData(preset.data);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Calculations for Visual Preview
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const totalValue = points.reduce((acc, p) => acc + p.value, 0) || 1;

  // Donut SVG Arcs calculation
  const donutArcs = (() => {
    let cumulativeAngle = 0;
    const radius = 64;
    const circumference = 2 * Math.PI * radius; // ~402.12

    return points.map((pt, idx) => {
      const percentage = pt.value / totalValue;
      const strokeLength = percentage * circumference;
      const strokeOffset = -cumulativeAngle;
      cumulativeAngle += strokeLength;

      return {
        ...pt,
        color: PALETTE[idx % PALETTE.length],
        percentage: Math.round(percentage * 100),
        strokeLength,
        strokeOffset,
      };
    });
  })();

  // Performance Curve SVG Path calculation
  const curvePoints = (() => {
    const width = 360;
    const height = 140;
    const padding = 28;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    if (points.length === 1) {
      return {
        pathStr: `M ${padding} ${height - padding} L ${width - padding} ${height - padding}`,
        fillStr: '',
        dots: [{ x: width / 2, y: height / 2, label: points[0].label, value: points[0].value }],
      };
    }

    const stepX = usableWidth / (points.length - 1);
    const coords = points.map((p, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (p.value / maxValue) * usableHeight;
      return { x, y, label: p.label, value: p.value };
    });

    // Build smooth cubic Bezier path
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    const fillD = `${d} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    return { pathStr: d, fillStr: fillD, dots: coords };
  })();

  return (
    <div
      className={`w-full bg-[#141312] border border-[#2B2926] text-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden ${className}`}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#23211F] bg-[#181715]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FF5C00]/15 text-[#FF5C00] ring-1 ring-[#FF5C00]/30">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-semibold">
                Live Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Edit scientific metrics, toggle formats & preview in real-time
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252422] transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
        {/* ── 1. CHART TYPE SELECTOR ── */}
        <div>
          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block mb-2">
            Visualization Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'horizontal_bars' as ChartType,
                label: 'Horizontal Bars',
                icon: BarChart3,
                desc: 'Comparative ranges',
              },
              {
                id: 'donut' as ChartType,
                label: 'Donut Ring',
                icon: PieChart,
                desc: 'Ratio & proportions',
              },
              {
                id: 'performance_curve' as ChartType,
                label: 'Performance Curve',
                icon: TrendingUp,
                desc: 'Continuum trajectory',
              },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-white shadow-sm ring-1 ring-[#FF5C00]/40'
                      : 'bg-[#1C1B19] border-[#2B2926] text-slate-400 hover:text-slate-200 hover:border-slate-600 hover:bg-[#242320]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF5C00]' : 'text-slate-400'}`} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5C00]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{type.label}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{type.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. LIVE INTERACTIVE VISUAL PREVIEW ── */}
        <div className="p-4 rounded-xl bg-[#171614] border border-[#2B2926] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#FF5C00]" />
              Real-time Preview
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Total: <strong className="text-white font-bold">{totalValue}</strong> ({points.length} pts)
            </span>
          </div>

          {/* PREVIEW: HORIZONTAL BARS */}
          {selectedType === 'horizontal_bars' && (
            <div className="space-y-2.5 py-1">
              {points.map((pt, idx) => {
                const color = PALETTE[idx % PALETTE.length];
                const pct = Math.round((pt.value / maxValue) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate pr-2">{pt.label}</span>
                      <span className="font-mono text-[11px] font-bold" style={{ color }}>
                        {pt.value} <span className="text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden relative border border-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(6, pct)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PREVIEW: DONUT RING */}
          {selectedType === 'donut' && (
            <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke="#23211F"
                    strokeWidth="16"
                  />
                  {donutArcs.map((arc, idx) => (
                    <circle
                      key={idx}
                      cx="80"
                      cy="80"
                      r="64"
                      fill="transparent"
                      stroke={arc.color}
                      strokeWidth="16"
                      strokeDasharray={`${arc.strokeLength} 402.12`}
                      strokeDashoffset={arc.strokeOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 hover:opacity-90 cursor-pointer"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-lg font-black text-white font-mono leading-none">{totalValue}</span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Sum</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="flex-1 w-full space-y-1.5">
                {donutArcs.map((arc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
                      <span className="text-slate-300 truncate">{arc.label}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-white shrink-0">
                      {arc.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREVIEW: PERFORMANCE CURVE */}
          {selectedType === 'performance_curve' && (
            <div className="py-1">
              <svg className="w-full h-36 overflow-visible" viewBox="0 0 360 140">
                <defs>
                  <linearGradient id={`${chartId}-curveGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FF5C00" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="28" y1="28" x2="332" y2="28" stroke="#2B2926" strokeDasharray="3 3" />
                <line x1="28" y1="70" x2="332" y2="70" stroke="#2B2926" strokeDasharray="3 3" />
                <line x1="28" y1="112" x2="332" y2="112" stroke="#2B2926" />

                {/* Area Gradient Fill */}
                {curvePoints.fillStr && (
                  <path d={curvePoints.fillStr} fill={`url(#${chartId}-curveGrad)`} />
                )}

                {/* Line Path */}
                <path
                  d={curvePoints.pathStr}
                  fill="none"
                  stroke="#FF5C00"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Coordinates Markers */}
                {curvePoints.dots.map((dot, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r="4.5"
                      fill="#FF5C00"
                      stroke="#141312"
                      strokeWidth="2"
                      className="transition-transform group-hover:scale-125"
                    />
                    <text
                      x={dot.x}
                      y={dot.y - 8}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {dot.value}
                    </text>
                    <text
                      x={dot.x}
                      y={130}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="sans-serif"
                    >
                      {dot.label.length > 8 ? dot.label.slice(0, 7) + '…' : dot.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* ── 3. DATA SERIES EDITOR (ADD / EDIT / DELETE) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
              Data Points ({points.length})
            </span>
            <button
              onClick={handleAddDataPoint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5C00]/20 border border-[#FF5C00]/50 text-[#FF5C00] text-xs font-semibold hover:bg-[#FF5C00] hover:text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Data Point</span>
            </button>
          </div>

          <div className="space-y-2">
            {points.map((pt, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#1C1B19] border border-[#2B2926] hover:border-slate-600 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    {/* Color chip */}
                    <div
                      className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />

                    {/* Label Input */}
                    <input
                      type="text"
                      value={pt.label}
                      onChange={(e) => handleUpdateLabel(idx, e.target.value)}
                      placeholder="Variable or condition name..."
                      className="flex-1 bg-[#141312] border border-[#2B2926] focus:border-[#FF5C00] rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />

                    {/* Numerical Value Input */}
                    <div className="flex items-center gap-1 w-24">
                      <input
                        type="number"
                        value={pt.value}
                        onChange={(e) => handleUpdateValue(idx, e.target.value)}
                        className="w-full bg-[#141312] border border-[#2B2926] focus:border-[#FF5C00] rounded-lg px-2 py-1 text-xs text-white font-mono text-right focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs font-mono">%</span>
                    </div>

                    {/* Move controls */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMovePoint(idx, 'up')}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20 p-0.5"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMovePoint(idx, 'down')}
                        disabled={idx === points.length - 1}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20 p-0.5"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteDataPoint(idx)}
                      disabled={points.length <= 1}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20 transition-colors"
                      title={points.length <= 1 ? 'Minimum 1 data point required' : 'Delete Data Point'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Value Range Quick Slider */}
                  <div className="flex items-center gap-3 px-1">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(100, pt.value * 1.5)}
                      value={pt.value}
                      onChange={(e) => handleUpdateValue(idx, e.target.value)}
                      className="flex-1 accent-[#FF5C00] h-1.5 bg-black/40 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-400 w-10 text-right">
                      {Math.round((pt.value / maxValue) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. CURRICULUM PRESET DATASETS ── */}
        <div className="pt-2 border-t border-[#23211F]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
              Educational Presets
            </span>
            {copiedNotification && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Preset Loaded
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_DATASETS.map((preset, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleApplyPreset(pIdx)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  activePresetIndex === pIdx
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00]/60 text-white'
                    : 'bg-[#1C1B19] border-[#2B2926] text-slate-300 hover:text-white hover:border-slate-500 hover:bg-[#23221F]'
                }`}
              >
                <div className="text-xs font-semibold truncate">{preset.name}</div>
                <div className="text-[10px] text-slate-500 font-mono capitalize">
                  {preset.type.replace('_', ' ')} • {preset.data.length} pts
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
