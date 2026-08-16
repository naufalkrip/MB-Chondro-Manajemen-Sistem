import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

interface DownloadPdfButtonProps {
  onGenerate: () => Promise<void> | void;
  label?: string;
  variant?: "outline" | "primary";
  className?: string;
}

export function DownloadPdfButton({
  onGenerate,
  label = "Download PDF",
  variant = "outline",
  className = "",
}: DownloadPdfButtonProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onGenerate();
      success("PDF berhasil dibuat.");
    } catch (e) {
      error(e instanceof Error ? e.message : "Gagal membuat PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-outline"} ${className}`}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="spin" />
          Membuat PDF...
        </>
      ) : (
        <>
          <Download size={16} />
          {label}
        </>
      )}
    </button>
  );
}