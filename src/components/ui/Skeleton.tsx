interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/** Placeholder shimmer halus untuk area yang sedang memuat data */
export function Skeleton({ width = "100%", height = 14, borderRadius = 8, className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius, ...style }}
      aria-hidden="true"
    />
  );
}

/** Skeleton kartu statistik (ikon + nilai + label) */
export function StatCardSkeleton() {
  return (
    <div className="stat-card stat-skeleton">
      <div className="stat-icon">
        <Skeleton width={42} height={42} borderRadius={12} />
      </div>
      <div className="stat-body">
        <Skeleton width={90} height={20} />
        <Skeleton width={120} height={11} style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}