import { CheckCircle2, Info, X, XCircle } from "lucide-react";

interface ToastProps {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
}

const ICONS: Record<ToastProps["type"], typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function Toast({ type, message, onClose }: ToastProps) {
  const Icon = ICONS[type];
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">
        <Icon size={14} />
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Tutup">
        <X size={16} />
      </button>
    </div>
  );
}