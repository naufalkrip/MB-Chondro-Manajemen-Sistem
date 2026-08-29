import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Bookmark,
  FileText,
  ZoomIn,
  Check,
  LayoutGrid,
  List,
  Camera,
  Phone,
  Calendar,
  Sparkles,
  MessageCircle,
  RotateCw,
} from "lucide-react";
import type {
  RekrutmenSubmissionWithAnswers,
  RekrutmenForm,
  RekrutmenSubmissionStatus,
  RekrutmenAnswer,
  RekrutmenField,
} from "../../types";
import {
  formatTanggal,
  formatTanggalPanjang,
  formatRentangTanggal,
  formatNomorHp,
  buatLinkWhatsAppCalon,
} from "../../utils/format";
import { DataTable } from "../ui/DataTable";
import type { Column } from "../ui/DataTable";
import { SearchBar } from "../ui/SearchBar";
import { Filter as FilterComp } from "../ui/Filter";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { laporanRekrutmen, laporanRekrutmenDetail } from "../../services/pdf";
import {
  getRekrutmenImageBase64Item,
  updateRekrutmenAnswerPhotoItem,
  compressImageToSafeHd,
  extractCandidatePhotoInfo,
  getCachedResolvedPhoto,
  setCachedResolvedPhoto,
} from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

interface SubmissionListProps {
  form: RekrutmenForm;
  submissions: RekrutmenSubmissionWithAnswers[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onViewDetail?: (submission: RekrutmenSubmissionWithAnswers) => void;
  onUpdateStatus: (id: string, status: RekrutmenSubmissionStatus, note: string) => Promise<boolean>;
  onDeleteSubmission: (id: string) => Promise<boolean>;
}

const STATUS_CONFIG: Record<
  RekrutmenSubmissionStatus,
  { label: string; bg: string; color: string; border: string; icon: typeof Clock }
> = {
  menunggu: {
    label: "Menunggu",
    bg: "rgba(217, 119, 6, 0.1)",
    color: "#d97706",
    border: "rgba(217, 119, 6, 0.28)",
    icon: Clock,
  },
  lolos: {
    label: "Lolos",
    bg: "rgba(16, 185, 129, 0.12)",
    color: "#059669",
    border: "rgba(16, 185, 129, 0.3)",
    icon: CheckCircle,
  },
  cadangan: {
    label: "Cadangan",
    bg: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    border: "rgba(37, 99, 235, 0.28)",
    icon: Bookmark,
  },
  tidak_lolos: {
    label: "Tidak Lolos",
    bg: "rgba(220, 38, 38, 0.1)",
    color: "#dc2626",
    border: "rgba(220, 38, 38, 0.28)",
    icon: XCircle,
  },
};

const PILIHAN_BULAN = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const currentYear = new Date().getFullYear();
const PILIHAN_TAHUN = Array.from({ length: 8 }, (_, i) => currentYear - 4 + i);

type PdfMode = "" | "bulan" | "custom";

/**
 * Komponen Pas Foto Calon Anggota Cerdas
 * dengan dukungan Multi-Tier Fallback (Base64 -> Google Drive CDN -> Backend Base64 Resolver -> Inisial Elegan).
 */
function CandidatePhotoBadge({
  answers,
  candidateName,
  size = "md",
  onClick,
}: {
  answers: Array<{
    id?: string;
    fieldId?: string;
    value?: string;
    fileUrl?: string | null;
    fileBase64?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    field?: { label?: string; fieldType?: string };
  }>;
  candidateName: string;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: (url: string, title: string, fileName?: string) => void;
}) {
  const photoInfo = useMemo(() => extractCandidatePhotoInfo(answers), [answers]);
  const [currentSrc, setCurrentSrc] = useState<string | null>(photoInfo.url);
  const [loadingFallback, setLoadingFallback] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Cek apakah ada foto ter-cache
    if (photoInfo.driveFileId) {
      const cached = getCachedResolvedPhoto(photoInfo.driveFileId);
      if (cached) {
        setCurrentSrc(cached);
        return;
      }
    }
    setCurrentSrc(photoInfo.url);
    setLoadError(false);
  }, [photoInfo]);

  const handleImageError = async () => {
    // Jika link Google Drive standar gagal dimuat, coba gunakan endpoint resolver
    if (photoInfo.driveFileId && !loadingFallback && !loadError) {
      setLoadingFallback(true);
      const res = await getRekrutmenImageBase64Item({
        fileId: photoInfo.driveFileId,
        fileName: photoInfo.fileName || undefined,
      });
      setLoadingFallback(false);
      if (res.success && res.base64) {
        setCachedResolvedPhoto(photoInfo.driveFileId, res.base64);
        setCurrentSrc(res.base64);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } else {
      setLoadError(true);
    }
  };

  const dimensions = {
    sm: { w: 36, h: 46, radius: 6, fontSize: 13, iconSize: 14 },
    md: { w: 46, h: 58, radius: 8, fontSize: 15, iconSize: 16 },
    lg: { w: 72, h: 92, radius: 10, fontSize: 22, iconSize: 22 },
    xl: { w: 120, h: 150, radius: 12, fontSize: 32, iconSize: 32 },
  }[size];

  const initial = (candidateName || "C").trim().charAt(0).toUpperCase();

  const isPhotoAvailable = Boolean(currentSrc && !loadError);

  return (
    <div
      style={{
        position: "relative",
        width: dimensions.w,
        height: dimensions.h,
        borderRadius: dimensions.radius,
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
        border: isPhotoAvailable ? "1.5px solid #cbd5e1" : "1.5px dashed #cbd5e1",
        background: isPhotoAvailable ? "#0f172a" : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        cursor: isPhotoAvailable && onClick ? "pointer" : "default",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onClick={(e) => {
        if (isPhotoAvailable && onClick && currentSrc) {
          e.stopPropagation();
          onClick(currentSrc, `Pas Foto: ${candidateName}`, photoInfo.fileName || undefined);
        }
      }}
      title={isPhotoAvailable ? `Klik untuk memperbesar Pas Foto ${candidateName}` : `Belum ada pas foto untuk ${candidateName}`}
    >
      {isPhotoAvailable && currentSrc ? (
        <>
          <img
            src={currentSrc}
            alt={`Foto ${candidateName}`}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (size !== "sm") e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              if (size !== "sm") e.currentTarget.style.transform = "scale(1)";
            }}
          />
          {/* Zoom Overlay Badge */}
          {size !== "sm" && (
            <div
              style={{
                position: "absolute",
                bottom: 3,
                right: 3,
                background: "rgba(0, 0, 0, 0.65)",
                color: "#ffffff",
                borderRadius: 4,
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}
            >
              <ZoomIn size={11} />
            </div>
          )}
        </>
      ) : loadingFallback ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            color: "#64748b",
          }}
        >
          <RotateCw size={dimensions.iconSize} className="spinning" />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary-700, #b91c1c)",
            fontWeight: 800,
            fontSize: dimensions.fontSize,
            position: "relative",
            background: "linear-gradient(135deg, rgba(185, 28, 28, 0.06) 0%, rgba(185, 28, 28, 0.12) 100%)",
          }}
        >
          <span>{initial}</span>
          <span
            style={{
              position: "absolute",
              bottom: 2,
              fontSize: "8.5px",
              color: "#94a3b8",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.2px",
            }}
          >
            {size !== "sm" ? "No Foto" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export function SubmissionList({
  form,
  submissions,
  loading,
  onRefresh,
  onUpdateStatus,
  onDeleteSubmission,
}: SubmissionListProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<RekrutmenSubmissionStatus | "">("");
  const [filterPeriode, setFilterPeriode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [detailOpen, setDetailOpen] = useState<RekrutmenSubmissionWithAnswers | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<RekrutmenSubmissionWithAnswers | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick / Detail Status Change State
  const [statusModalSub, setStatusModalSub] = useState<RekrutmenSubmissionWithAnswers | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RekrutmenSubmissionStatus>("menunggu");
  const [adminNote, setAdminNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Lightbox Image
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; fileName?: string } | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState(false);
  const [lightboxFetching, setLightboxFetching] = useState(false);

  const openPhotoLightbox = (url: string, title: string, fileName?: string) => {
    setLightboxImage({ url, title, fileName });
    setLightboxImgError(false);
    setLightboxFetching(false);
  };

  // PDF Export Modal State
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfMode, setPdfMode] = useState<PdfMode>("");
  const [pdfStatus, setPdfStatus] = useState<RekrutmenSubmissionStatus | "">("");
  const [pdfSelectedBulan, setPdfSelectedBulan] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [pdfSelectedTahun, setPdfSelectedTahun] = useState(String(new Date().getFullYear()));
  const [pdfDari, setPdfDari] = useState("");
  const [pdfSampai, setPdfSampai] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const safeSubmissions = useMemo(
    () => (Array.isArray(submissions) ? submissions : []),
    [submissions]
  );

  const filtered = useMemo(() => {
    return safeSubmissions
      .filter((s) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const answersText = (s.answers || [])
            .map((a) => `${a?.field?.label || ""}: ${a?.value || ""}`)
            .join(" ")
            .toLowerCase();
          if (!answersText.includes(q)) return false;
        }

        // Status filter
        if (filterStatus && s.status !== filterStatus) return false;

        // Periode filter
        if (filterPeriode && s.submittedAt) {
          const subDate = s.submittedAt.slice(0, 10);
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);

          if (filterPeriode === "hariIni" && subDate !== todayStr) return false;
          if (filterPeriode === "mingguIni") {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (subDate < weekAgo.toISOString().slice(0, 10)) return false;
          }
          if (filterPeriode === "bulanIni") {
            const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            if (!subDate.startsWith(thisMonth)) return false;
          }
        }

        return true;
      })
      .sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || "") || (a.id || "").localeCompare(b.id || ""));
  }, [safeSubmissions, search, filterStatus, filterPeriode]);

  const pdfRange = useMemo(() => {
    if (pdfMode === "bulan" && pdfSelectedBulan && pdfSelectedTahun) {
      const lastDay = new Date(Number(pdfSelectedTahun), Number(pdfSelectedBulan), 0).getDate();
      const namaBulan = PILIHAN_BULAN.find((b) => b.value === pdfSelectedBulan)?.label || "Bulan";
      return {
        dari: `${pdfSelectedTahun}-${pdfSelectedBulan}-01`,
        sampai: `${pdfSelectedTahun}-${pdfSelectedBulan}-${String(lastDay).padStart(2, "0")}`,
        label: `${namaBulan} ${pdfSelectedTahun}`,
      };
    }
    if (pdfMode === "custom") {
      return {
        dari: pdfDari || undefined,
        sampai: pdfSampai || undefined,
        label: formatRentangTanggal(pdfDari, pdfSampai),
      };
    }
    return { dari: undefined, sampai: undefined, label: "Semua Periode" };
  }, [pdfMode, pdfSelectedBulan, pdfSelectedTahun, pdfDari, pdfSampai]);

  const openStatusChange = (s: RekrutmenSubmissionWithAnswers) => {
    setStatusModalSub(s);
    setSelectedStatus(s.status);
    setAdminNote(s.adminNote || "");
  };

  const handleStatusSave = async () => {
    if (!statusModalSub) return;
    setSavingStatus(true);
    const ok = await onUpdateStatus(statusModalSub.id, selectedStatus, adminNote);
    setSavingStatus(false);
    if (ok) {
      toastSuccess("Status calon anggota berhasil diperbarui.");
      setStatusModalSub(null);
      if (detailOpen && detailOpen.id === statusModalSub.id) {
        setDetailOpen({ ...detailOpen, status: selectedStatus, adminNote });
      }
      await onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!deleteOpen) return;
    setDeleting(true);
    const ok = await onDeleteSubmission(deleteOpen.id);
    setDeleting(false);
    if (ok) {
      toastSuccess("Data calon anggota berhasil dihapus.");
      setDeleteOpen(null);
      if (detailOpen && detailOpen.id === deleteOpen.id) {
        setDetailOpen(null);
      }
      await onRefresh();
    }
  };

  const handleGeneratePdf = async () => {
    if (pdfMode === "custom" && (!pdfDari || !pdfSampai)) {
      toastError("Silakan lengkapi tanggal mulai dan tanggal akhir.");
      return;
    }
    if (pdfMode === "custom" && pdfDari > pdfSampai) {
      toastError("Tanggal mulai tidak boleh melebihi tanggal akhir.");
      return;
    }

    setPdfGenerating(true);
    try {
      let dataToExport = [...safeSubmissions];

      if (pdfRange.dari && pdfRange.sampai) {
        dataToExport = dataToExport.filter((s) => {
          const d = s.submittedAt.slice(0, 10);
          return d >= (pdfRange.dari || "") && d <= (pdfRange.sampai || "");
        });
      }

      if (pdfStatus) {
        dataToExport = dataToExport.filter((s) => s.status === pdfStatus);
      }

      dataToExport.sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));

      if (dataToExport.length === 0) {
        toastError("Tidak ada data pendaftar pada filter periode yang dipilih.");
        setPdfGenerating(false);
        return;
      }

      const statusSuffix = pdfStatus ? ` · Status ${STATUS_CONFIG[pdfStatus]?.label}` : "";
      await laporanRekrutmen(form, dataToExport, `${pdfRange.label}${statusSuffix}`);
      setPdfOpen(false);
    } catch {
      toastError("Gagal mencetak dokumen PDF.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadDetailPdf = async (s: RekrutmenSubmissionWithAnswers) => {
    try {
      await laporanRekrutmenDetail(form, s);
    } catch {
      toastError("Gagal mencetak dokumen pendaftar.");
    }
  };

  const handleOpenFile = (ans: RekrutmenAnswer & { field?: RekrutmenField }) => {
    const fileUrl = ans.fileUrl || (ans.value?.startsWith("data:") || ans.value?.startsWith("http") ? ans.value : null);
    if (!fileUrl) return;

    const isImage =
      ans.field?.fieldType === "image" ||
      ans.fileType?.startsWith("image/") ||
      (ans.field?.label || "").toLowerCase().includes("foto") ||
      Boolean(ans.fileName && /\.(jpe?g|png|webp|gif)$/i.test(ans.fileName)) ||
      fileUrl.startsWith("data:image/") ||
      /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl) ||
      fileUrl.includes("drive.google.com") ||
      fileUrl.includes("lh3.googleusercontent");

    if (isImage) {
      openPhotoLightbox(
        fileUrl,
        ans.field?.label || ans.fileName || "Foto Calon Anggota",
        ans.fileName || ans.value
      );
    } else {
      try {
        if (fileUrl.startsWith("data:")) {
          const parts = fileUrl.split(";base64,");
          const contentType = parts[0].split(":")[1] || "application/octet-stream";
          const byteCharacters = atob(parts[1] || "");
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
        } else {
          window.open(fileUrl, "_blank");
        }
      } catch {
        window.open(fileUrl, "_blank");
      }
    }
  };

  const handleDownloadImage = (url: string, title?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "foto-calon").replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminUploadPhoto = async (answerId: string, file: File) => {
    try {
      toastSuccess("Mengompres dan memperbarui foto calon...");
      const safeHdBase64 = await compressImageToSafeHd(file);
      const res = await updateRekrutmenAnswerPhotoItem({
        answerId,
        fileBase64: safeHdBase64,
        fileName: file.name,
      });
      if (res.success) {
        toastSuccess("Foto calon anggota berhasil diperbarui!");
        await onRefresh();
        if (detailOpen) {
          setDetailOpen((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              answers: prev.answers.map((a) =>
                a.id === answerId ? { ...a, fileUrl: safeHdBase64, fileName: file.name, value: file.name } : a
              ),
            };
          });
        }
        if (lightboxImage) {
          setLightboxImage({ url: safeHdBase64, title: "Foto Calon Anggota", fileName: file.name });
          setLightboxImgError(false);
        }
      } else {
        toastError(res.message || "Gagal memperbarui foto.");
      }
    } catch {
      toastError("Gagal memproses file foto.");
    }
  };

  // Helper untuk mengambil nama & kontak calon
  const getCandidateInfo = (s: RekrutmenSubmissionWithAnswers) => {
    const namaField = s.answers.find((a) => (a.field?.label || "").toLowerCase().includes("nama"));
    const nama = namaField?.value?.trim() || "Calon Anggota";

    const hpField = s.answers.find(
      (a) =>
        (a.field?.label || "").toLowerCase().includes("hp") ||
        (a.field?.label || "").toLowerCase().includes("telepon") ||
        (a.field?.label || "").toLowerCase().includes("whatsapp") ||
        (a.field?.label || "").toLowerCase().includes("wa") ||
        (a.field?.label || "").toLowerCase().includes("kontak")
    );
    const rawHp = hpField?.value?.trim() || "";
    const hp = formatNomorHp(rawHp);
    const waUrl = buatLinkWhatsAppCalon(rawHp, nama, form.title);

    return { nama, rawHp, hp, waUrl };
  };

  // Definisi Kolom Tabel yang Rapi dengan Penekanan Pas Foto
  const columns: Column<RekrutmenSubmissionWithAnswers>[] = [
    {
      key: "no",
      header: "No",
      render: (_r, idx) => <span style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: "13px" }}>{idx + 1}</span>,
    },
    {
      key: "foto",
      header: "Pas Foto",
      render: (s) => {
        const { nama } = getCandidateInfo(s);
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CandidatePhotoBadge
              answers={s.answers}
              candidateName={nama}
              size="md"
              onClick={(url, title, fileName) => openPhotoLightbox(url, title, fileName)}
            />
          </div>
        );
      },
    },
    {
      key: "nama",
      header: "Nama Calon Anggota",
      render: (s) => {
        const { nama } = getCandidateInfo(s);
        return (
          <div>
            <strong style={{ fontSize: "14px", color: "var(--navy-900)", display: "block", fontWeight: 700 }}>
              {nama}
            </strong>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              ID: {s.id}
            </span>
          </div>
        );
      },
    },
    {
      key: "hp",
      header: "Kontak WhatsApp",
      render: (s) => {
        const { hp, waUrl } = getCandidateInfo(s);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "13px",
                  color: "#047857",
                  fontWeight: 700,
                  textDecoration: "none",
                  padding: "4px 9px",
                  background: "rgba(16, 185, 129, 0.12)",
                  borderRadius: 6,
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  transition: "all 0.15s ease",
                }}
                title="Klik untuk membuka WhatsApp & kirim pesan skrining otomatis"
              >
                <MessageCircle size={13} /> {hp}
              </a>
            ) : (
              <span style={{ fontSize: "13px", color: "#64748b" }}>{hp}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "submittedAt",
      header: "Tanggal Daftar",
      render: (s) => (
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {formatTanggal(s.submittedAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Seleksi",
      render: (s) => {
        const conf = STATUS_CONFIG[s.status] || STATUS_CONFIG.menunggu;
        const Icon = conf.icon;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: conf.bg,
              color: conf.color,
              border: `1px solid ${conf.border}`,
            }}
          >
            <Icon size={13} />
            {conf.label}
          </span>
        );
      },
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (s) => (
        <div
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOpen(s);
            }}
            title="Lihat Detail Profil Calon"
            style={{ padding: "6px", color: "var(--navy-900)" }}
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              openStatusChange(s);
            }}
            title="Ubah Status Seleksi"
            style={{ padding: "6px", color: "var(--primary-700, #b91c1c)" }}
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadDetailPdf(s);
            }}
            title="Unduh PDF Calon"
            style={{ padding: "6px", color: "#0284c7" }}
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(s);
            }}
            title="Hapus Data"
            style={{ padding: "6px", color: "#dc2626" }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Standout Red Header Card (Kotak Merah MB Chondro) */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #c8101e 0%, #a41111 50%, #8a1414 100%)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "16px 20px",
          color: "#ffffff",
          boxShadow: "0 6px 20px rgba(185, 28, 28, 0.22)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                opacity: 0.88,
              }}
            >
              SELEKSI CALON ANGGOTA MB CHONDRO
            </span>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "2px 0 0", color: "#ffffff" }}>
              Daftar Calon Anggota & Berkas Pendaftaran
            </h3>
            <p style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.9)", margin: "3px 0 0" }}>
              {loading
                ? "Memuat data pendaftar..."
                : `Menampilkan ${filtered.length} dari ${safeSubmissions.length} calon anggota yang telah mengirim formulir lengkap`}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPdfOpen(true)}
              style={{
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.35)",
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(6px)",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <Download size={14} /> Cetak Rekapitulasi PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Card (Full Width) */}
      <div
        className="card"
        style={{
          background: "#ffffff",
          borderRadius: "var(--radius-md, 12px)",
          border: "1px solid var(--border, #e2e8f0)",
          padding: "18px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Toolbar Filters & View Switcher */}
        <div
          className="toolbar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: "1 1 auto" }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari nama calon, jawaban, atau kontak..."
            />
            <FilterComp
              label="Status"
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as RekrutmenSubmissionStatus | "")}
              options={[
                { value: "", label: "Semua Status" },
                { value: "menunggu", label: "Menunggu (🟡)" },
                { value: "lolos", label: "Lolos (🟢)" },
                { value: "cadangan", label: "Cadangan (🔵)" },
                { value: "tidak_lolos", label: "Tidak Lolos (🔴)" },
              ]}
            />
            <FilterComp
              label="Periode"
              value={filterPeriode}
              onChange={setFilterPeriode}
              options={[
                { value: "", label: "Semua Periode" },
                { value: "hariIni", label: "Hari Ini" },
                { value: "mingguIni", label: "7 Hari Terakhir" },
                { value: "bulanIni", label: "Bulan Ini" },
              ]}
            />
          </div>

          {/* View Mode Toggle: Table vs Cards */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Tampilan Tabel Rapi"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === "table" ? "#ffffff" : "transparent",
                color: viewMode === "table" ? "var(--primary-700, #b91c1c)" : "#64748b",
                boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <List size={14} /> Tabel
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Tampilan Kartu Calon (Foto Menonjol)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === "cards" ? "#ffffff" : "transparent",
                color: viewMode === "cards" ? "var(--primary-700, #b91c1c)" : "#64748b",
                boxShadow: viewMode === "cards" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <LayoutGrid size={14} /> Kartu Profil
            </button>
          </div>
        </div>

        {/* 1. TABLE VIEW */}
        {viewMode === "table" ? (
          <div className="table-scroll" style={{ maxHeight: "560px", overflowY: "auto" }}>
            <DataTable
              columns={columns}
              data={filtered}
              loading={loading}
              rowKey={(r) => r.id}
              onRowClick={(r) => setDetailOpen(r)}
              emptyTitle="Belum Ada Calon Anggota"
              emptyMessage="Belum ada pendaftar yang mengirimkan formulir. Pastikan formulir sudah aktif dan link pendaftaran sudah dibagikan."
            />
          </div>
        ) : (
          /* 2. CARD GRID VIEW (Penonjolan Pas Foto & Kartu Calon) */
          <div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                <Sparkles size={32} style={{ color: "var(--primary-700, #b91c1c)", margin: "0 auto 12px" }} />
                <h4 style={{ margin: "0 0 6px", color: "var(--navy-900)" }}>Tidak Ada Data Calon Anggota</h4>
                <p style={{ margin: 0, fontSize: "13px" }}>Coba sesuaikan kata kunci pencarian atau filter yang Anda pilih.</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                  gap: 16,
                  maxHeight: "620px",
                  overflowY: "auto",
                  padding: "4px 2px",
                }}
              >
                {filtered.map((s) => {
                  const { nama, hp, waUrl } = getCandidateInfo(s);
                  const conf = STATUS_CONFIG[s.status] || STATUS_CONFIG.menunggu;
                  const Icon = conf.icon;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setDetailOpen(s)}
                      style={{
                        background: "#ffffff",
                        borderRadius: "var(--radius-md, 12px)",
                        border: "1px solid var(--border, #e2e8f0)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
                        e.currentTarget.style.borderColor = "var(--border, #e2e8f0)";
                      }}
                    >
                      {/* Card Header Profile Banner */}
                      <div
                        style={{
                          padding: "16px",
                          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex",
                          gap: 14,
                          alignItems: "center",
                        }}
                      >
                        {/* Big Card Avatar Photo */}
                        <CandidatePhotoBadge
                          answers={s.answers}
                          candidateName={nama}
                          size="lg"
                          onClick={(url, title, fileName) => openPhotoLightbox(url, title, fileName)}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: conf.bg,
                                color: conf.color,
                                border: `1px solid ${conf.border}`,
                              }}
                            >
                              <Icon size={11} /> {conf.label}
                            </span>
                          </div>
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "var(--navy-900)",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={nama}
                          >
                            {nama}
                          </strong>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <Calendar size={11} /> {formatTanggal(s.submittedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Card Body Information */}
                      <div style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Kontak HP/WA:</span>
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: "#047857",
                                fontWeight: 700,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 7px",
                                borderRadius: 5,
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                              }}
                              title="Klik untuk membuka WhatsApp & kirim pesan skrining"
                            >
                              <MessageCircle size={13} /> {hp}
                            </a>
                          ) : (
                            <span style={{ fontWeight: 600, color: "#475569" }}>{hp}</span>
                          )}
                        </div>

                        {s.adminNote && (
                          <div
                            style={{
                              padding: "6px 10px",
                              background: "#eff6ff",
                              borderRadius: 6,
                              fontSize: "11.5px",
                              color: "#1e40af",
                              lineHeight: 1.4,
                            }}
                          >
                            <strong>Catatan:</strong> {s.adminNote}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          padding: "10px 16px",
                          background: "#fafafa",
                          borderTop: "1px solid #f1f5f9",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setDetailOpen(s)}
                          style={{ fontSize: "12px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Eye size={13} /> Detail
                        </button>

                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openStatusChange(s)}
                            title="Ubah Status Seleksi"
                            style={{ color: "var(--primary-700, #b91c1c)", padding: "5px 8px" }}
                          >
                            <Check size={14} /> Status
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDownloadDetailPdf(s)}
                            title="Unduh PDF"
                            style={{ color: "#0284c7", padding: "5px 8px" }}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteOpen(s)}
                            title="Hapus"
                            style={{ color: "#dc2626", padding: "5px 8px" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL MODAL CALON ANGGOTA (DENGAN HEADER PAS FOTO BESAR & JELAS) */}
      <Modal
        open={detailOpen !== null}
        title="Profil Lengkap Calon Anggota"
        onClose={() => setDetailOpen(null)}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDetailOpen(null)}>
              Tutup
            </button>
            <button
              className="btn btn-outline"
              onClick={() => detailOpen && handleDownloadDetailPdf(detailOpen)}
            >
              <Download size={16} /> Unduh Lembar PDF Calon
            </button>
            <button
              className="btn btn-primary"
              onClick={() => detailOpen && openStatusChange(detailOpen)}
            >
              <Check size={16} /> Ubah Status Seleksi
            </button>
          </>
        }
      >
        {detailOpen && (() => {
          const { nama, hp, waUrl } = getCandidateInfo(detailOpen);
          const conf = STATUS_CONFIG[detailOpen.status] || STATUS_CONFIG.menunggu;
          const Icon = conf.icon;
          const photoInfo = extractCandidatePhotoInfo(detailOpen.answers);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "72vh", overflowY: "auto", paddingRight: 4 }}>
              {/* Standout Profile Header Card */}
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  border: "1.5px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {/* Big 120x150 Portrait Photo */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <CandidatePhotoBadge
                    answers={detailOpen.answers}
                    candidateName={nama}
                    size="xl"
                    onClick={(url, title, fileName) => openPhotoLightbox(url, title, fileName)}
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {photoInfo.url && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => openPhotoLightbox(photoInfo.url!, `Pas Foto: ${nama}`, photoInfo.fileName || undefined)}
                        style={{ fontSize: "11px", padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <ZoomIn size={12} /> Perbesar
                      </button>
                    )}
                    {photoInfo.answerId && (
                      <label
                        className="btn btn-ghost btn-sm"
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          color: "var(--primary-700, #b91c1c)",
                          margin: 0,
                        }}
                        title="Upload / Ganti Foto Calon Anggota"
                      >
                        <Camera size={12} /> Ganti
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f && photoInfo.answerId) {
                              handleAdminUploadPhoto(photoInfo.answerId, f);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Candidate Main Info */}
                <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`,
                      }}
                    >
                      <Icon size={13} /> {conf.label}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      ID Registrasi: <strong>{detailOpen.id}</strong>
                    </span>
                  </div>

                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--navy-900)" }}>
                    {nama}
                  </h3>

                  <div style={{ fontSize: "13px", color: "#475569", display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                      <span>Terdaftar: <strong>{formatTanggalPanjang(detailOpen.submittedAt)}</strong></span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Phone size={14} style={{ color: "var(--text-muted)" }} />
                      <span>WhatsApp / HP:</span>
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#047857",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 9px",
                            borderRadius: 6,
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                          title="Klik untuk chat WhatsApp dan kirim undangan skrining"
                        >
                          <MessageCircle size={14} /> {hp} (Hubungi & Kirim Jadwal Skrining)
                        </a>
                      ) : (
                        <strong>{hp}</strong>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Note Banner */}
              {detailOpen.adminNote && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#eff6ff",
                    borderRadius: 8,
                    border: "1px solid #bfdbfe",
                    fontSize: "13px",
                    color: "#1e40af",
                  }}
                >
                  <strong>Catatan Seleksi / Alasan:</strong>
                  <p style={{ margin: "4px 0 0", color: "#1d4ed8" }}>{detailOpen.adminNote}</p>
                </div>
              )}

              {/* Dynamic Answers Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--navy-900)", margin: "4px 0 0" }}>
                  Rincian Jawaban & Berkas Lengkap
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {detailOpen.answers.map((ans, idx) => (
                    <div
                      key={ans.id || idx}
                      style={{
                        padding: "12px 16px",
                        background: "#ffffff",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                        {idx + 1}. {ans.field?.label || "Pertanyaan"}
                      </label>

                      {(() => {
                        const isFileOrPhotoField =
                          ans.field?.fieldType === "image" ||
                          ans.field?.fieldType === "file" ||
                          ans.fileType?.startsWith("image/") ||
                          (ans.field?.label || "").toLowerCase().includes("foto") ||
                          (ans.field?.label || "").toLowerCase().includes("berkas") ||
                          (ans.field?.label || "").toLowerCase().includes("dokumen") ||
                          Boolean(ans.fileName && /\.(jpe?g|png|webp|gif|pdf|docx?)$/i.test(ans.fileName)) ||
                          Boolean(ans.fileUrl);

                        if (isFileOrPhotoField) {
                          const fileUrl = ans.fileUrl || (ans.value?.startsWith("data:") || ans.value?.startsWith("http") ? ans.value : null);
                          const isImg =
                            ans.field?.fieldType === "image" ||
                            ans.fileType?.startsWith("image/") ||
                            (ans.field?.label || "").toLowerCase().includes("foto") ||
                            Boolean(ans.fileName && /\.(jpe?g|png|webp|gif)$/i.test(ans.fileName)) ||
                            Boolean(fileUrl && (fileUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl) || fileUrl.includes("drive.google.com")));

                          const displayName = ans.fileName || (ans.value && !ans.value.startsWith("data:") && !ans.value.startsWith("http") ? ans.value : (isImg ? "Pas Foto Calon Anggota" : "Berkas Terunggah"));

                          return (
                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                              {isImg ? (
                                <div
                                  style={{ position: "relative", cursor: "pointer" }}
                                  onClick={() =>
                                    openPhotoLightbox(
                                      fileUrl || "",
                                      ans.field?.label || displayName || "Pas Foto",
                                      displayName
                                    )
                                  }
                                >
                                  <CandidatePhotoBadge
                                    answers={[ans]}
                                    candidateName={nama}
                                    size="md"
                                    onClick={(u, t, fn) => openPhotoLightbox(u, t, fn)}
                                  />
                                </div>
                              ) : (
                                <FileText size={36} style={{ color: "#2563eb", flexShrink: 0 }} />
                              )}

                              <div style={{ flex: 1, minWidth: 160 }}>
                                <strong style={{ fontSize: "13px", color: "var(--navy-900)", display: "block" }}>
                                  {displayName}
                                </strong>
                                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleOpenFile(ans)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "12px", padding: "4px 10px" }}
                                  >
                                    <Eye size={13} /> Buka / Lihat {isImg ? "Foto" : "Berkas"}
                                  </button>
                                  {isImg && (
                                    <>
                                      <label
                                        className="btn btn-ghost btn-sm"
                                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#0284c7", padding: "4px 8px", cursor: "pointer", margin: 0 }}
                                        title="Ganti / Perbarui foto calon anggota"
                                      >
                                        <Camera size={13} /> Ganti Foto
                                        <input
                                          type="file"
                                          accept="image/*"
                                          style={{ display: "none" }}
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleAdminUploadPhoto(ans.id, f);
                                          }}
                                        />
                                      </label>
                                      {fileUrl && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm"
                                          onClick={() => handleDownloadImage(fileUrl, ans.field?.label || ans.fileName || undefined)}
                                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "12px", color: "var(--primary-700, #b91c1c)", padding: "4px 8px" }}
                                        >
                                          <Download size={13} /> Unduh
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (ans.field?.fieldType === "checkbox") {
                          return (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                              {ans.value.split(",").filter(Boolean).map((v, i) => (
                                <span
                                  key={i}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "3px 10px",
                                    background: "#f1f5f9",
                                    color: "var(--navy-900)",
                                    borderRadius: 6,
                                    fontSize: "12.5px",
                                    fontWeight: 500,
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <Check size={12} style={{ color: "#16a34a" }} /> {v.trim()}
                                </span>
                              ))}
                            </div>
                          );
                        }

                        const isPhoneAnswer =
                          (ans.field?.label || "").toLowerCase().includes("hp") ||
                          (ans.field?.label || "").toLowerCase().includes("telepon") ||
                          (ans.field?.label || "").toLowerCase().includes("whatsapp") ||
                          (ans.field?.label || "").toLowerCase().includes("wa") ||
                          (ans.field?.label || "").toLowerCase().includes("kontak");

                        if (isPhoneAnswer && ans.value) {
                          const formattedVal = formatNomorHp(ans.value);
                          const directWa = buatLinkWhatsAppCalon(ans.value, nama, form.title);
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "14px", color: "var(--navy-900)" }}>
                                {formattedVal}
                              </strong>
                              {directWa && (
                                <a
                                  href={directWa}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#047857",
                                    textDecoration: "none",
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    background: "rgba(16, 185, 129, 0.1)",
                                    border: "1px solid rgba(16, 185, 129, 0.25)",
                                  }}
                                >
                                  <MessageCircle size={12} /> Chat via WhatsApp
                                </a>
                              )}
                            </div>
                          );
                        }

                        return (
                          <strong style={{ fontSize: "13.5px", color: "var(--navy-900)", display: "block", marginTop: 2 }}>
                            {ans.value || <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>-</span>}
                          </strong>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL UBAH STATUS SELEKSI */}
      <Modal
        open={statusModalSub !== null}
        title="Ubah Status Calon Anggota"
        onClose={() => setStatusModalSub(null)}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setStatusModalSub(null)} disabled={savingStatus}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleStatusSave} disabled={savingStatus}>
              {savingStatus ? "Menyimpan..." : "Simpan Status Seleksi"}
            </button>
          </>
        }
      >
        {statusModalSub && (() => {
          const { nama } = getCandidateInfo(statusModalSub);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Calon Anggota Terpilih:</span>
                <strong style={{ fontSize: "15px", color: "var(--navy-900)", display: "block" }}>
                  {nama}
                </strong>
              </div>

              <div className="form-group" style={{ gap: 6 }}>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Tentukan Status Hasil Seleksi *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["menunggu", "lolos", "cadangan", "tidak_lolos"] as RekrutmenSubmissionStatus[]).map((st) => {
                    const conf = STATUS_CONFIG[st];
                    const Icon = conf.icon;
                    const active = selectedStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: active ? `2px solid ${conf.color}` : "1px solid #e2e8f0",
                          background: active ? conf.bg : "#ffffff",
                          color: conf.color,
                          fontWeight: active ? 700 : 500,
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={16} />
                        {conf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ gap: 4 }}>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Catatan Reviewer / Alasan Keputusan (Opsional)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Misal: Memenuhi seluruh kriteria instrumen brass / Menjadi cadangan gelombang 1"
                  rows={3}
                  style={{ padding: "8px 12px", fontSize: "13px", resize: "vertical" }}
                />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL DOWNLOAD PDF REKAPITULASI */}
      <Modal
        open={pdfOpen}
        title="Unduh Laporan Rekapitulasi PDF Calon Anggota"
        onClose={() => setPdfOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPdfOpen(false)} disabled={pdfGenerating}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleGeneratePdf} disabled={pdfGenerating}>
              <Download size={16} />
              {pdfGenerating ? "Membuat PDF..." : "Unduh Laporan PDF"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--navy-900)" }}>
              Pilih Kriteria & Rentang Laporan
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "3px 0 0" }}>
              Cetak dokumen rekapitulasi calon anggota MB Chondro lengkap dengan tabel status dan pas foto.
            </p>
          </div>

          {/* Segmented Period Tabs */}
          <div
            className="segment-group"
            style={{
              display: "flex",
              gap: 6,
              background: "var(--bg, #f8fafc)",
              padding: 4,
              borderRadius: "var(--radius-sm, 8px)",
              border: "1px solid var(--border, #e2e8f0)",
            }}
          >
            <button
              type="button"
              className={`segment-btn ${pdfMode === "" ? "active" : ""}`}
              onClick={() => setPdfMode("")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-xs, 6px)",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                background: pdfMode === "" ? "#ffffff" : "transparent",
                color: pdfMode === "" ? "var(--primary-700, #b91c1c)" : "var(--text-muted)",
                boxShadow: pdfMode === "" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Semua Periode
            </button>
            <button
              type="button"
              className={`segment-btn ${pdfMode === "bulan" ? "active" : ""}`}
              onClick={() => setPdfMode("bulan")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-xs, 6px)",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                background: pdfMode === "bulan" ? "#ffffff" : "transparent",
                color: pdfMode === "bulan" ? "var(--primary-700, #b91c1c)" : "var(--text-muted)",
                boxShadow: pdfMode === "bulan" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Bulan
            </button>
            <button
              type="button"
              className={`segment-btn ${pdfMode === "custom" ? "active" : ""}`}
              onClick={() => setPdfMode("custom")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-xs, 6px)",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                background: pdfMode === "custom" ? "#ffffff" : "transparent",
                color: pdfMode === "custom" ? "var(--primary-700, #b91c1c)" : "var(--text-muted)",
                boxShadow: pdfMode === "custom" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Custom
            </button>
          </div>

          {/* Month & Year Selection */}
          {pdfMode === "bulan" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-group" style={{ gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600 }}>Pilih Bulan</label>
                <select
                  value={pdfSelectedBulan}
                  onChange={(e) => setPdfSelectedBulan(e.target.value)}
                  style={{ height: 38, padding: "6px 10px", fontSize: "13px" }}
                >
                  {PILIHAN_BULAN.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600 }}>Pilih Tahun</label>
                <select
                  value={pdfSelectedTahun}
                  onChange={(e) => setPdfSelectedTahun(e.target.value)}
                  style={{ height: 38, padding: "6px 10px", fontSize: "13px" }}
                >
                  {PILIHAN_TAHUN.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom Date Range */}
          {pdfMode === "custom" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-group" style={{ gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600 }}>Tanggal Dari</label>
                <input
                  type="date"
                  value={pdfDari}
                  max={pdfSampai || undefined}
                  onChange={(e) => setPdfDari(e.target.value)}
                  style={{ height: 38, padding: "6px 10px", fontSize: "13px" }}
                />
              </div>
              <div className="form-group" style={{ gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600 }}>Tanggal Sampai</label>
                <input
                  type="date"
                  value={pdfSampai}
                  min={pdfDari || undefined}
                  onChange={(e) => setPdfSampai(e.target.value)}
                  style={{ height: 38, padding: "6px 10px", fontSize: "13px" }}
                />
              </div>
            </div>
          )}

          {/* Filter Status on PDF */}
          <div className="form-group" style={{ gap: 4 }}>
            <label style={{ fontSize: "12px", fontWeight: 600 }}>Filter Status Seleksi</label>
            <select
              value={pdfStatus}
              onChange={(e) => setPdfStatus(e.target.value as RekrutmenSubmissionStatus | "")}
              style={{ height: 38, padding: "6px 10px", fontSize: "13px" }}
            >
              <option value="">Semua Calon Anggota (Seluruh Status)</option>
              <option value="menunggu">Hanya Menunggu (🟡)</option>
              <option value="lolos">Hanya Lolos (🟢)</option>
              <option value="cadangan">Hanya Cadangan (🔵)</option>
              <option value="tidak_lolos">Hanya Tidak Lolos (🔴)</option>
            </select>
          </div>

          {/* Period Preview Card */}
          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg, #f8fafc)",
              borderRadius: "var(--radius-sm, 8px)",
              border: "1px solid var(--border, #e2e8f0)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12.5px",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Periode dicetak:</span>
            <strong style={{ color: "var(--navy-900)" }}>
              {pdfRange.label}
              {pdfStatus ? ` · ${STATUS_CONFIG[pdfStatus]?.label}` : ""}
            </strong>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={deleteOpen !== null}
        title="Hapus Data Calon Anggota?"
        message={`Data calon anggota ${
          deleteOpen ? getCandidateInfo(deleteOpen).nama : ""
        } akan dihapus secara permanen dari sistem.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(null)}
      />

      {/* IMAGE LIGHTBOX MODAL (PORTAL TO BODY) */}
      {lightboxImage &&
        createPortal(
          <div
            onClick={() => setLightboxImage(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.88)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 640,
                width: "100%",
                background: "#ffffff",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                animation: "modalFadeIn 0.2s ease",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#ffffff",
                }}
              >
                <strong style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy-900)" }}>
                  📸 {lightboxImage.title}
                </strong>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDownloadImage(lightboxImage.url, lightboxImage.title)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "12px", padding: "5px 12px", fontWeight: 600 }}
                  >
                    <Download size={14} /> Unduh Foto
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLightboxImage(null)}
                    style={{ padding: "4px 8px", fontSize: "16px", lineHeight: 1 }}
                    title="Tutup Pratinjau"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ padding: 24, textAlign: "center", background: "rgba(15, 23, 42, 0.95)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
                {lightboxFetching ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#f8fafc" }}>
                    <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>Memulihkan dan memuat foto...</span>
                  </div>
                ) : lightboxImgError ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#f8fafc", padding: "10px" }}>
                    <Camera size={44} style={{ color: "#94a3b8" }} />
                    <strong style={{ fontSize: "14.5px", color: "#f8fafc" }}>Foto Dalam Proses Resolusi</strong>
                    <p style={{ fontSize: "12.5px", color: "#94a3b8", maxWidth: 380, margin: 0, lineHeight: 1.5 }}>
                      Foto ini tersimpan di Google Drive. Klik tombol muat ulang di bawah untuk memproses foto ke resolusi HD instan.
                    </p>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.4)" }}
                        onClick={async () => {
                          setLightboxFetching(true);
                          setLightboxImgError(false);
                          const match = lightboxImage.url.match(/[\/|=]([a-zA-Z0-9_-]{25,})/);
                          const res = await getRekrutmenImageBase64Item({
                            fileId: match ? match[1] : undefined,
                            fileName: lightboxImage.fileName || lightboxImage.title,
                          });
                          setLightboxFetching(false);
                          if (res.success && res.base64) {
                            setLightboxImage((prev) => prev ? { ...prev, url: res.base64! } : null);
                          } else {
                            setLightboxImgError(true);
                          }
                        }}
                      >
                        🔄 Muat Ulang Foto HD
                      </button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={lightboxImage.url}
                    alt={lightboxImage.title}
                    referrerPolicy="no-referrer"
                    onError={async (e) => {
                      const current = e.currentTarget.src;
                      const match = current.match(/[\/|=]([a-zA-Z0-9_-]{25,})/);
                      const fileId = match ? match[1] : undefined;

                      setLightboxFetching(true);
                      const res = await getRekrutmenImageBase64Item({
                        fileId,
                        fileName: lightboxImage.fileName || lightboxImage.title,
                      });
                      setLightboxFetching(false);

                      if (res.success && res.base64) {
                        setLightboxImage((prev) => prev ? { ...prev, url: res.base64! } : null);
                        setLightboxImgError(false);
                      } else {
                        setLightboxImgError(true);
                      }
                    }}
                    style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}