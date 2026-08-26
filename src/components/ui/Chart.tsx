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
  data: { label: string; value: number; color: string; subLabel?: string }[];
  size?: number;
  thickness?: number;
  centerTitle?: string;
  centerSubtitle?: string;
  showLegend?: boolean;
  legendPosition?: "right" | "bottom" | "none";
  activeLabel?: string | null;
  onHoverLabel?: (label: string | null) => void;
}

export function DonutChart({
  data,
  size = 210,
  thickness = 24,
  centerTitle,
  centerSubtitle = "Total",
  showLegend = true,
  legendPosition = "right",
  activeLabel,
  onHoverLabel,
}: DonutChartProps) {
  const [internalHover, setInternalHover] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((s, d) => s + (Number(d.value) || 0), 0), [data]);
  const activeIndex = useMemo(() => {
    if (activeLabel !== undefined && activeLabel !== null) {
      return data.findIndex((d) => d.label === activeLabel);
    }
    return internalHover;
  }, [activeLabel, data, internalHover]);

  const activeItem = activeIndex !== null && activeIndex >= 0 ? data[activeIndex] : null;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // Calculate SVG stroke segments with crisp gap
  const gap = total > 0 && data.filter((d) => d.value > 0).length > 1 ? 2.5 : 0;
  let accumulatedOffset = 0;

  const segments = useMemo(() => {
    return data.map((d, i) => {
      const val = Number(d.value) || 0;
      const fraction = total === 0 ? 0 : val / total;
      const arcLength = Math.max(0, fraction * c - (val > 0 ? gap : 0));
      const currentOffset = accumulatedOffset;
      accumulatedOffset += fraction * c;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;

      return {
        ...d,
        index: i,
        val,
        pct,
        dashArray: `${arcLength} ${c - arcLength}`,
        dashOffset: -currentOffset,
        empty: val <= 0,
      };
    });
  }, [data, total, c, gap]);

  const handleMouseEnter = (idx: number, label: string) => {
    setInternalHover(idx);
    onHoverLabel?.(label);
  };

  const handleMouseLeave = () => {
    setInternalHover(null);
    onHoverLabel?.(null);
  };

  const layoutStyle: React.CSSProperties =
    legendPosition === "right"
      ? { display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap", width: "100%" }
      : legendPosition === "bottom"
      ? { display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }
      : { display: "inline-flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={layoutStyle}>
      {/* SVG Donut Circle */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: "visible" }}
        >
          {/* Subtle background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />

          {/* Value arcs */}
          {segments.map((seg) => {
            if (seg.empty) return null;
            const isHovered = activeIndex === seg.index;
            return (
              <circle
                key={`${seg.label}-${seg.index}`}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? thickness + 4 : thickness}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="round"
                onMouseEnter={() => handleMouseEnter(seg.index, seg.label)}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  filter: isHovered
                    ? `drop-shadow(0 4px 12px ${seg.color}66)`
                    : "none",
                  opacity: activeIndex === null || isHovered ? 1 : 0.45,
                }}
              />
            );
          })}
        </svg>

        {/* Floating Center Badge Island */}
        <div
          style={{
            position: "absolute",
            width: Math.max(80, size - thickness * 2 - 14),
            height: Math.max(80, size - thickness * 2 - 14),
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            textAlign: "center",
            padding: "8px",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 2,
          }}
        >
          {activeItem ? (
            <>
              <span
                style={{
                  fontSize: Math.max(16, size * 0.16),
                  fontWeight: 800,
                  color: activeItem.color,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {activeItem.value.toLocaleString("id-ID")}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--navy-900, #0f172a)",
                  marginTop: 3,
                  maxWidth: size * 0.55,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeItem.label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: activeItem.color,
                  background: `${activeItem.color}18`,
                  padding: "1px 7px",
                  borderRadius: 999,
                  marginTop: 3,
                }}
              >
                {total > 0 ? Math.round((activeItem.value / total) * 100) : 0}%
              </span>
            </>
          ) : (
            <>
              <span
                style={{
                  fontSize: Math.max(18, size * 0.18),
                  fontWeight: 800,
                  color: "var(--navy-900, #0f172a)",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {centerTitle !== undefined ? centerTitle : total.toLocaleString("id-ID")}
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  color: "var(--text-muted, #64748b)",
                  marginTop: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  fontWeight: 700,
                }}
              >
                {centerSubtitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Modern Informative Progress Legend */}
      {showLegend && legendPosition !== "none" && (
        <div
          style={{
            display: "flex",
            flexDirection: legendPosition === "right" ? "column" : "row",
            flexWrap: legendPosition === "right" ? "nowrap" : "wrap",
            gap: legendPosition === "right" ? 8 : "8px 16px",
            alignItems: "stretch",
            justifyContent: legendPosition === "right" ? "center" : "center",
            minWidth: legendPosition === "right" ? 210 : "100%",
            flex: 1,
          }}
        >
          {data.map((d, idx) => {
            const isHovered = activeIndex === idx;
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div
                key={d.label}
                onMouseEnter={() => handleMouseEnter(idx, d.label)}
                onMouseLeave={handleMouseLeave}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: isHovered ? `${d.color}12` : "#ffffff",
                  border: isHovered ? `1px solid ${d.color}40` : "1px solid var(--border, #e2e8f0)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  boxShadow: isHovered ? `0 4px 12px ${d.color}20` : "0 1px 2px rgba(0,0,0,0.02)",
                  transform: isHovered ? "translateX(2px)" : "none",
                  opacity: activeIndex === null || isHovered ? 1 : 0.55,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: d.color,
                        flexShrink: 0,
                        boxShadow: isHovered ? `0 0 8px ${d.color}` : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: isHovered ? 700 : 600,
                        color: isHovered ? d.color : "var(--navy-900, #1e293b)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {d.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--navy-900, #0f172a)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {d.value.toLocaleString("id-ID")}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: isHovered ? "#ffffff" : d.color,
                        background: isHovered ? d.color : `${d.color}15`,
                        padding: "1px 6px",
                        borderRadius: 999,
                        minWidth: 32,
                        textAlign: "center",
                        fontVariantNumeric: "tabular-nums",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Informative Progress Bar */}
                <div
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background: "#f1f5f9",
                    overflow: "hidden",
                    display: "flex",
                    marginTop: 1,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      background: d.color,
                      height: "100%",
                      borderRadius: 999,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
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