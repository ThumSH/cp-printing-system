// src/components/MiniChart.tsx
// Lightweight SVG chart components — no external library needed

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showLabels?: boolean;
}

export function MiniBarChart({ data, height = 120, showLabels = true }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(32, Math.floor((280 - (data.length - 1) * 6) / data.length));
  const totalWidth = data.length * barWidth + (data.length - 1) * 6;

  return (
    <svg width="100%" viewBox={`0 0 ${totalWidth + 20} ${height + (showLabels ? 28 : 8)}`} className="overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / max) * (height - 16));
        const x = 10 + i * (barWidth + 6);
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={d.color || '#3b82f6'} opacity={0.85}>
              <animate attributeName="height" from="0" to={barH} dur="0.5s" fill="freeze" />
              <animate attributeName="y" from={height} to={y} dur="0.5s" fill="freeze" />
            </rect>
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="text-[10px] font-bold" fill="#64748b">{d.value || ''}</text>
            {showLabels && (
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" className="text-[9px]" fill="#94a3b8">{d.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface DonutProps {
  value: number;
  total: number;
  size?: number;
  color?: string;
  label?: string;
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
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="text-[8px]" fill="#94a3b8">
          {value}/{total}
        </text>
      </svg>
      {label && <span className="text-[10px] font-medium text-slate-500">{label}</span>}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 120, height = 32, color = '#3b82f6' }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - 4 - ((v - min) / range) * (height - 8)}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={areaPoints} fill={color} opacity={0.08} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) * step} cy={height - 4 - ((data[data.length - 1] - min) / range) * (height - 8)} r={2.5} fill={color} />
    </svg>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  showPct?: boolean;
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