import { BarChart3 } from "lucide-react";

interface ChartBarProps {
  data: { label: string; pemasukan: number; pengeluaran: number }[];
  height?: number;
}

export function ChartBar({ data, height = 220 }: ChartBarProps) {
  const max = Math.max(1, ...data.flatMap((d) => [d.pemasukan, d.pengeluaran]));
  const hasData = data.some((d) => d.pemasukan > 0 || d.pengeluaran > 0);

  return (
    <div className="chart-bar" style={{ height }}>
      <div className="chart-bars">
        {!hasData && (
          <div className="chart-empty">
            <BarChart3 size={22} />
            <span>Belum ada transaksi pada tahun ini</span>
          </div>
        )}
        {data.map((d) => (
          <div key={d.label} className="chart-group">
            <div className="chart-col">
              <div
                className="chart-bar-fill bar-in"
                style={{ height: `${(d.pemasukan / max) * 100}%` }}
                title={`Pemasukan ${d.label}: ${d.pemasukan}`}
              />
            </div>
            <div className="chart-col">
              <div
                className="chart-bar-fill bar-out"
                style={{ height: `${(d.pengeluaran / max) * 100}%` }}
                title={`Pengeluaran ${d.label}: ${d.pengeluaran}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {data.map((d) => (
          <span key={d.label} className="chart-label">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 150 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const segments = data.map((d) => {
    const fraction = total === 0 ? 0 : d.value / total;
    const seg = {
      ...d,
      dash: fraction * c,
      offset,
      empty: fraction === 0,
    };
    offset += fraction * c;
    return seg;
  });

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map((seg, i) =>
          seg.empty ? null : (
            <circle
              key={`${seg.label}-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg.dash} ${c - seg.dash}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
            />
          )
        )}
      </svg>
      <div className="donut-center">
        <span className="donut-total">{total}</span>
        <span className="donut-caption">Total</span>
      </div>
    </div>
  );
}

export const CHART_COLORS = {
  merah: "#dc2626",
  abu: "#94a3b8",
  hijau: "#16a34a",
  kuning: "#f59e0b",
  biru: "#0284c7",
  ungu: "#7c3aed",
};

export function DonutLegend({ data }: { data: { label: string; value: number; color: string }[] }) {
  return (
    <div className="donut-legend">
      {data.map((d) => (
        <div key={d.label} className="legend-item">
          <span className="legend-dot" style={{ background: d.color }} />
          <span className="legend-label">{d.label}</span>
          <span className="legend-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}