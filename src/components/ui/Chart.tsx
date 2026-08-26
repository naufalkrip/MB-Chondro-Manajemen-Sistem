import { useState, useEffect, useMemo } from "react";

export type AttendancePeriod = "weekly" | "monthly" | "yearly";

interface AttendanceChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
    key: string;
  }[];
}

interface ChartAttendanceProps {
  data?: AttendanceChartData;
  height?: number;
  period?: AttendancePeriod;
  onPeriodChange?: (period: AttendancePeriod) => void;
}

const PERIOD_LABELS: Record<AttendancePeriod, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

const DATASET_CONFIG = [
  { key: "hadir", label: "Hadir", color: "#16a34a" },
  { key: "izin", label: "Izin", color: "#0284c7" },
  { key: "sakit", label: "Sakit", color: "#f59e0b" },
  { key: "cuti", label: "Cuti", color: "#7c3aed" },
  { key: "alpa", label: "Alpa", color: "#dc2626" },
] as const;

const WEEKLY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const WEEKLY_DATA: AttendanceChartData = {
  labels: WEEKLY_LABELS,
  datasets: [
    { key: "hadir", label: "Hadir", color: "#16a34a", data: [18, 22, 28, 42, 38, 25, 20] },
    { key: "izin", label: "Izin", color: "#0284c7", data: [0, 0, 0, 0, 0, 0, 0] },
    { key: "sakit", label: "Sakit", color: "#f59e0b", data: [0, 0, 0, 0, 0, 0, 0] },
    { key: "cuti", label: "Cuti", color: "#7c3aed", data: [0, 0, 0, 0, 0, 0, 0] },
    { key: "alpa", label: "Alpa", color: "#dc2626", data: [2, 2, 2, 2, 2, 2, 2] },
  ],
};

const LEGEND_ITEMS = [
  { key: "hadir", label: "Hadir", value: 126, color: "#16a34a" },
  { key: "izin", label: "Izin", value: 0, color: "#0284c7" },
  { key: "sakit", label: "Sakit", value: 0, color: "#f59e0b" },
  { key: "cuti", label: "Cuti", value: 0, color: "#7c3aed" },
  { key: "alpa", label: "Alpa", value: 0, color: "#dc2626" },
];

const Y_TICKS = [0, 16, 32, 47];
const Y_MAX = 47;

export function ChartAttendance({ 
  data = WEEKLY_DATA, 
  height = 320, 
  period = "weekly", 
  onPeriodChange 
}: ChartAttendanceProps) {
  const [animatedData, setAnimatedData] = useState<number[][]>(
    data.datasets.map(() => data.labels.map(() => 0))
  );
  const hasData = useMemo(() => data.datasets.some((d) => d.data.some((v) => v > 0)), [data]);

  useEffect(() => {
    if (!hasData) return;
    const steps = 20;
    const duration = 600;
    const stepTime = duration / steps;
    let step = 0;
    
    const animate = () => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedData(data.datasets.map((ds) =>
        ds.data.map((v) => v * eased)
      ));
      
      if (step < steps) {
        setTimeout(animate, stepTime);
      }
    };
    animate();
  }, [data, hasData]);

  const getPath = (values: number[]) => {
    if (values.length < 2) return "";
    return values.map((value, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - (value / Y_MAX) * 100;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  };

  const getPointCoords = (values: number[]) => {
    if (values.length < 2) return [];
    return values.map((value, i) => ({
      x: (i / (values.length - 1)) * 100,
      y: 100 - (value / Y_MAX) * 100,
      value
    }));
  };

  return (
    <div 
      style={{ 
        height, 
        display: "flex", 
        flexDirection: "column",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid #f0f1f4",
        borderLeft: "4px solid #dc2626",
      }}
    >
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start",
        padding: "20px 20px 16px",
        flexShrink: 0,
        gap: 16
      }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            color: "#141a24", 
            margin: 0,
            letterSpacing: "-0.01em"
          }}>
            Grafik Kehadiran
          </h3>
          <p style={{ 
            fontSize: 13, 
            color: "#6b7688", 
            margin: "4px 0 0 0",
            lineHeight: 1.4
          }}>
            Rekap kehadiran anggota berdasarkan periode
          </p>
        </div>
        <div style={{ 
          display: "inline-flex", 
          gap: 2, 
          background: "#f5f6f8", 
          padding: 3, 
          borderRadius: 6,
          border: "1px solid #e6e8ec"
        }} role="group" aria-label="Filter periode grafik">
          {(["weekly", "monthly", "yearly"] as AttendancePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange?.(p)}
              type="button"
              style={{
                border: "none",
                background: period === p ? "#dc2626" : "transparent",
                color: period === p ? "#fff" : "#6b7688",
                padding: "5px 12px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                boxShadow: period === p ? "0 1px 3px rgba(220,38,38,0.25)" : "none",
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        minHeight: 0,
        padding: "0 20px 16px",
        position: "relative"
      }}>
        {hasData && (
          <div style={{ 
            flex: 1, 
            position: "relative", 
            minHeight: 0,
            display: "flex",
            flexDirection: "row",
          }}>
            {/* Y-axis labels - custom ticks */}
            <div style={{ 
              width: 44, 
              flexShrink: 0,
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "space-between", 
              paddingBottom: 40,
              pointerEvents: "none",
              paddingTop: 8
            }}>
              {Y_TICKS.slice().reverse().map((v) => (
                <span key={v} style={{ 
                  fontSize: 11, 
                  color: "#98a1b0", 
                  textAlign: "right", 
                  paddingRight: 10, 
                  height: "25%", 
                  display: "flex", 
                  alignItems: "flex-end",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 500
                }}>
                  {v}
                </span>
              ))}
            </div>

            {/* Chart SVG */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <svg 
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%", display: "block" }}
              >
                <defs>
                  <linearGradient id="grad-hadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines at tick positions */}
                <g stroke="#f0f1f4" strokeWidth="0.5" opacity="0.8">
                  {Y_TICKS.map((tick) => {
                    const y = 100 - (tick / Y_MAX) * 100;
                    return <line key={tick} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} />;
                  })}
                </g>

                {/* Area fill - only for Hadir */}
                {(() => {
                  const dataset = data.datasets.find((d) => d.key === "hadir");
                  const animatedValues = animatedData[DATASET_CONFIG.findIndex(d => d.key === "hadir")] || dataset?.data || [];
                  if (!dataset || animatedValues.length < 2) return null;
                  
                  const linePath = getPath(animatedValues);
                  const areaPath = `${linePath} L 100 100 L 0 100 Z`;
                  
                  return (
                    <path
                      d={areaPath}
                      fill="url(#grad-hadir)"
                      style={{ opacity: 1 }}
                    />
                  );
                })()}

                {/* Lines - thin and precise */}
                {DATASET_CONFIG.map((ds) => {
                  const dataset = data.datasets.find((d) => d.key === ds.key);
                  const animatedValues = animatedData[DATASET_CONFIG.findIndex(d => d.key === ds.key)] || dataset?.data || [];
                  if (!dataset || animatedValues.length < 2) return null;
                  
                  // Only show Hadir and Alpa lines
                  if (ds.key !== "hadir" && ds.key !== "alpa") return null;
                  
                  const strokeWidth = ds.key === "hadir" ? "1.0" : "0.8";
                  
                  return (
                    <path
                      key={ds.key}
                      d={getPath(animatedValues)}
                      stroke={ds.color}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ 
                        filter: "none",
                        opacity: ds.key === "alpa" ? 0.6 : 1
                      }}
                    />
                  );
                })}

                {/* Data points - only for Hadir and Alpa */}
                {DATASET_CONFIG.map((ds) => {
                  const dataset = data.datasets.find((d) => d.key === ds.key);
                  if (!dataset) return null;
                  if (ds.key !== "hadir" && ds.key !== "alpa") return null;
                  
                  const points = getPointCoords(dataset.data);
                  return (
                    <g key={ds.key} fill={ds.color}>
                      {points.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x.toFixed(1)}
                          cy={p.y.toFixed(1)}
                          r={ds.key === "hadir" ? 3 : 2}
                          stroke="white"
                          strokeWidth={1}
                          style={{ opacity: ds.key === "alpa" ? 0.6 : 1 }}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* X-axis labels */}
        <div style={{ 
          height: 40, 
          display: "flex", 
          alignItems: "flex-start", 
          paddingLeft: 44,
          flexShrink: 0,
          marginTop: 4
        }}>
          {data.labels.map((label) => (
            <span 
              key={label} 
              style={{ 
                flex: 1, 
                textAlign: "center", 
                fontSize: 11, 
                color: "#6b7688",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                padding: "2px 1px 0"
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Legend */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        alignItems: "center", 
        gap: "8px 20px",
        padding: "12px 20px 20px",
        borderTop: "1px solid #f0f1f4",
        flexShrink: 0,
      }}>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.key} style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 6,
            whiteSpace: "nowrap",
            fontSize: 12,
            color: "#45506a"
          }}>
            <span style={{ 
              width: 10, 
              height: 10, 
              borderRadius: 2, 
              background: item.color,
              flexShrink: 0 
            }} />
            {item.label}
            <span style={{ fontWeight: 600, color: "#141a24", marginLeft: 4 }}>{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  showLegend?: boolean;
  legendPosition?: "right" | "bottom";
}

export function DonutChart({ 
  data, 
  size = 180, 
  showLegend = true,
  legendPosition = "right"
}: DonutChartProps) {
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

  const layoutStyle: React.CSSProperties = legendPosition === "right" 
    ? { display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }
    : { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 };

  return (
    <div style={layoutStyle}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
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
                strokeLinecap="round"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  transition: "stroke-dashoffset 0.8s ease-out, stroke-dasharray 0.8s ease-out",
                }}
              />
            )
          )}
        </svg>
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{
            fontSize: size * 0.18,
            fontWeight: 700,
            color: "#141a24",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {total}
          </span>
          <span style={{
            fontSize: size * 0.07,
            color: "#6b7688",
            marginTop: 2,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 500,
          }}>
            Total
          </span>
        </div>
      </div>

      {showLegend && (
        <div style={{
          display: "flex",
          flexDirection: legendPosition === "right" ? "column" : "row",
          flexWrap: legendPosition === "right" ? "nowrap" : "wrap",
          gap: legendPosition === "right" ? 10 : "12px 20px",
          alignItems: "flex-start",
          justifyContent: legendPosition === "right" ? "flex-start" : "center",
          minWidth: legendPosition === "right" ? 140 : 0,
        }}>
          {data.map((d) => (
            <div key={d.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              fontSize: 12,
              color: "#45506a",
              opacity: d.value > 0 ? 1 : 0.5,
            }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: d.color,
                flexShrink: 0,
              }} />
              <span style={{ fontWeight: 500 }}>{d.label}</span>
              <span style={{ 
                fontWeight: 600, 
                color: "#141a24", 
                marginLeft: 4,
                fontVariantNumeric: "tabular-nums",
              }}>
                {d.value}
              </span>
              {d.value > 0 && total > 0 && (
                <span style={{ 
                  fontSize: 10, 
                  color: "#98a1b0", 
                  marginLeft: 4,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {Math.round((d.value / total) * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
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