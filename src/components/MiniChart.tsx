// src/components/MiniChart.tsx
// Pure SVG chart library — zero dependencies

// ==========================================
// BAR CHART
// ==========================================
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  horizontal?: boolean;
}

export function MiniBarChart({ data, height = 120, showLabels = true, showValues = true }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 8;
  const barW = Math.min(36, Math.floor((300 - (data.length - 1) * gap) / data.length));
  const totalW = data.length * barW + (data.length - 1) * gap;

  return (
    <svg width="100%" viewBox={`0 0 ${totalW + 20} ${height + (showLabels ? 30 : 10)}`} className="overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / max) * (height - 20));
        const x = 10 + i * (barW + gap);
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color || '#3b82f6'} opacity={0.85}>
              <animate attributeName="height" from="0" to={barH} dur="0.6s" fill="freeze" />
              <animate attributeName="y" from={height} to={y} dur="0.6s" fill="freeze" />
            </rect>
            {showValues && d.value > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="text-[10px] font-bold" fill="#475569">{d.value}</text>
            )}
            {showLabels && (
              <text x={x + barW / 2} y={height + 16} textAnchor="middle" className="text-[9px] font-medium" fill="#94a3b8">{d.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ==========================================
// HORIZONTAL BAR CHART
// ==========================================
interface HBarProps {
  data: { label: string; value: number; color?: string; max?: number }[];
  height?: number;
}

export function HorizontalBarChart({ data }: HBarProps) {
  const globalMax = Math.max(...data.map((d) => d.max || d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.min(100, (d.value / globalMax) * 100);
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600">{d.label}</span>
              <span className="font-bold text-slate-700">{d.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: d.color || '#3b82f6' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// PIE / DONUT CHART
// ==========================================
interface PieSlice { label: string; value: number; color: string; }

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

export function PieChart({ data, size = 140, donut = true, centerLabel, centerValue, showLegend = true }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-slate-400 text-center py-4">No data</p>;

  const r = (size - 8) / 2;
  const innerR = donut ? r * 0.55 : 0;
  const cx = size / 2;
  const cy = size / 2;

  let cumulative = 0;
  const slices = data.filter((d) => d.value > 0).map((d) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360;
    const pct = Math.round((d.value / total) * 100);
    return { ...d, startAngle, endAngle, pct };
  });

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (startAngle: number, endAngle: number, outerR: number, innerRadius: number) => {
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const outerStart = polarToCartesian(startAngle, outerR);
    const outerEnd = polarToCartesian(endAngle, outerR);
    const innerStart = polarToCartesian(endAngle, innerRadius);
    const innerEnd = polarToCartesian(startAngle, innerRadius);

    if (endAngle - startAngle >= 359.99) {
      return `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR} Z` +
        (innerRadius > 0 ? ` M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx - 0.01} ${cy - innerRadius} Z` : '');
    }

    let path = `M ${outerStart.x} ${outerStart.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`;
    if (innerRadius > 0) {
      path += ` L ${innerStart.x} ${innerStart.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y} Z`;
    } else {
      path += ` L ${cx} ${cy} Z`;
    }
    return path;
  };

  return (
    <div className={`flex ${showLegend ? 'items-center gap-5' : 'justify-center'}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={arcPath(s.startAngle, s.endAngle, r, innerR)} fill={s.color} opacity={0.85} className="transition-all duration-500">
            <animate attributeName="opacity" from="0" to="0.85" dur="0.5s" fill="freeze" />
          </path>
        ))}
        {donut && centerValue && (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central" className="text-lg font-black" fill="#1e293b">{centerValue}</text>
            {centerLabel && <text x={cx} y={cy + 14} textAnchor="middle" className="text-[9px] font-medium" fill="#94a3b8">{centerLabel}</text>}
          </>
        )}
      </svg>
      {showLegend && (
        <div className="space-y-1.5 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-slate-600 truncate">{s.label}</span>
              <span className="text-xs font-bold text-slate-800 ml-auto">{s.value}</span>
              <span className="text-[10px] text-slate-400">({s.pct}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MINI DONUT (for single metric)
// ==========================================
interface DonutProps {
  value: number; total: number; size?: number; color?: string; label?: string;
}

export function MiniDonut({ value, total, size = 80, color = '#3b82f6', label }: DonutProps) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central"
          className="text-sm font-black" fill="#1e293b">{Math.round(pct * 100)}%</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="text-[8px]" fill="#94a3b8">{value}/{total}</text>
      </svg>
      {label && <span className="text-[10px] font-medium text-slate-500">{label}</span>}
    </div>
  );
}

// ==========================================
// PROGRESS BAR
// ==========================================
interface ProgressBarProps {
  value: number; max: number; color?: string; label?: string; showPct?: boolean;
}

export function ProgressBar({ value, max, color = '#3b82f6', label, showPct = true }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      {(label || showPct) && (
        <div className="flex justify-between text-xs">
          {label && <span className="font-medium text-slate-600">{label}</span>}
          {showPct && <span className="font-bold text-slate-700">{pct}%</span>}
        </div>
      )}
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ==========================================
// STAT NUMBER with trend
// ==========================================
interface StatNumberProps {
  value: string | number; label: string; sub?: string; trend?: 'up' | 'down' | 'neutral';
}

export function StatNumber({ value, label, sub }: StatNumberProps) {
  return (
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}