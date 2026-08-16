import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = "Tidak ada data",
  message = "Belum ada data yang tersimpan.",
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Inbox size={26} />
      </div>
      <h4>{title}</h4>
      <p>{message}</p>
    </div>
  );
}