import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  accent?: "red" | "green" | "amber" | "blue" | "slate" | "purple";
  sub?: ReactNode;
}

export function StatCard({ label, value, icon, accent = "red", sub }: StatCardProps) {
  return (
    <div className={`stat-card stat-${accent}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}