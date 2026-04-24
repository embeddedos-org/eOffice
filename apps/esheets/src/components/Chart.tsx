import { useState } from 'react';

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartProps {
  type: ChartType;
  title: string;
  labels: string[];
  datasets: Array<{ label: string; data: number[]; color: string }>;
  width?: number;
  height?: number;
  onClose: () => void;
}

const CHART_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Chart({ type, title, labels, datasets, width = 600, height = 400, onClose }: ChartProps) {
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = datasets.flatMap((d) => d.data);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - Math.min(minVal, 0);

  const scaleY = (v: number) => chartH - ((v - Math.min(minVal, 0)) / range) * chartH;
  const stepX = chartW / Math.max(labels.length - 1, 1);

  if (type === 'pie') {
    return <PieChart title={title} labels={labels} data={datasets[0]?.data || []} colors={datasets.map((d) => d.color)} width={width} height={height} onClose={onClose} />;
  }

  // Grid lines
  const gridLines = 5;
  const gridStep = range / gridLines;

  return (
    <div style={{ background: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>📊 {title}</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <svg width={width} height={height} style={{ fontFamily: 'inherit' }}>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Grid */}
          {Array.from({ length: gridLines + 1 }, (_, i) => {
            const val = Math.min(minVal, 0) + gridStep * i;
            const y = scaleY(val);
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#6b7280">{Math.round(val)}</text>
              </g>
            );
          })}

          {/* Data */}
          {datasets.map((ds, di) => {
            if (type === 'bar') {
              const barW = (chartW / labels.length) * 0.6 / datasets.length;
              const barOffset = di * barW;
              return ds.data.map((v, i) => {
                const x = (i * chartW) / labels.length + (chartW / labels.length) * 0.2 + barOffset;
                const h = ((v - Math.min(minVal, 0)) / range) * chartH;
                return (
                  <rect key={`${di}-${i}`} x={x} y={chartH - h} width={barW} height={h}
                    fill={ds.color} rx={2} opacity={0.85}>
                    <title>{ds.label}: {v}</title>
                  </rect>
                );
              });
            }

            if (type === 'line' || type === 'area') {
              const points = ds.data.map((v, i) => `${i * stepX},${scaleY(v)}`);
              return (
                <g key={di}>
                  {type === 'area' && (
                    <polygon
                      points={`0,${chartH} ${points.join(' ')} ${(ds.data.length - 1) * stepX},${chartH}`}
                      fill={ds.color}
                      opacity={0.15}
                    />
                  )}
                  <polyline points={points.join(' ')} fill="none" stroke={ds.color} strokeWidth={2.5} />
                  {ds.data.map((v, i) => (
                    <circle key={i} cx={i * stepX} cy={scaleY(v)} r={4} fill={ds.color}>
                      <title>{ds.label}: {v}</title>
                    </circle>
                  ))}
                </g>
              );
            }
            return null;
          })}

          {/* X-axis labels */}
          {labels.map((label, i) => {
            const x = type === 'bar' ? (i * chartW) / labels.length + chartW / labels.length / 2 : i * stepX;
            return (
              <text key={i} x={x} y={chartH + 20} textAnchor="middle" fontSize={10} fill="#6b7280"
                transform={labels.length > 8 ? `rotate(-45,${x},${chartH + 20})` : undefined}>
                {label.length > 10 ? label.slice(0, 10) + '…' : label}
              </text>
            );
          })}

          {/* X-axis line */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#9ca3af" />
          <line x1={0} y1={0} x2={0} y2={chartH} stroke="#9ca3af" />
        </g>

        {/* Legend */}
        {datasets.length > 1 && (
          <g transform={`translate(${padding.left},${height - 15})`}>
            {datasets.map((ds, i) => (
              <g key={i} transform={`translate(${i * 120},0)`}>
                <rect width={10} height={10} rx={2} fill={ds.color} />
                <text x={14} y={9} fontSize={10} fill="#6b7280">{ds.label}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

function PieChart({ title, labels, data, colors, width, height, onClose }: {
  title: string; labels: string[]; data: number[]; colors: string[]; width: number; height: number; onClose: () => void;
}) {
  const cx = width / 2;
  const cy = height / 2 + 10;
  const r = Math.min(width, height) / 2 - 60;
  const total = data.reduce((sum, v) => sum + v, 0) || 1;

  let startAngle = -Math.PI / 2;
  const slices = data.map((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = startAngle + angle / 2;
    const labelX = cx + (r * 0.65) * Math.cos(midAngle);
    const labelY = cy + (r * 0.65) * Math.sin(midAngle);
    const pct = Math.round((v / total) * 100);
    const slice = { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`, color: colors[i] || CHART_COLORS[i % CHART_COLORS.length], label: labels[i], pct, labelX, labelY };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div style={{ background: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>🥧 {title}</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <svg width={width} height={height} style={{ fontFamily: 'inherit' }}>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} opacity={0.85}>
              <title>{s.label}: {data[i]} ({s.pct}%)</title>
            </path>
            {s.pct >= 5 && (
              <text x={s.labelX} y={s.labelY} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">
                {s.pct}%
              </text>
            )}
          </g>
        ))}
        {/* Legend */}
        <g transform={`translate(10,${height - 25})`}>
          {slices.map((s, i) => (
            <g key={i} transform={`translate(${i * (width / slices.length)},0)`}>
              <rect width={10} height={10} rx={2} fill={s.color} />
              <text x={14} y={9} fontSize={9} fill="#6b7280">{s.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

// Utility: Create chart from spreadsheet selection
export function chartFromSelection(
  title: string,
  headers: string[],
  rows: string[][],
  chartType: ChartType = 'bar',
): { type: ChartType; title: string; labels: string[]; datasets: Array<{ label: string; data: number[]; color: string }> } {
  const labels = rows.map((r) => r[0] || '');
  const datasets = headers.slice(1).map((h, i) => ({
    label: h,
    data: rows.map((r) => parseFloat(r[i + 1]) || 0),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return { type: chartType, title, labels, datasets };
}
