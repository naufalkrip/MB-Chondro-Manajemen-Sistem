import { useMemo, useState } from "react";
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
} from "lucide-react";
import type {
  RekrutmenSubmissionWithAnswers,
  RekrutmenForm,
  RekrutmenSubmissionStatus,
  RekrutmenAnswer,
  RekrutmenField,
} from "../../types";
import { formatTanggal, formatTanggalPanjang, formatRentangTanggal } from "../../utils/format";
import { DataTable } from "../ui/DataTable";
import type { Column } from "../ui/DataTable";
import { SearchBar } from "../ui/SearchBar";
import { Filter as FilterComp } from "../ui/Filter";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { laporanRekrutmen, laporanRekrutmenDetail } from "../../services/pdf";
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
    border: "rgba(217, 119, 6, 0.25)",
    icon: Clock,
  },
  lolos: {
    label: "Lolos",
    bg: "rgba(16, 185, 129, 0.1)",
    color: "#059669",
    border: "rgba(16, 185, 129, 0.25)",
    icon: CheckCircle,
  },
  cadangan: {
    label: "Cadangan",
    bg: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    border: "rgba(37, 99, 235, 0.25)",
    icon: Bookmark,
  },
  tidak_lolos: {
    label: "Tidak Lolos",
    bg: "rgba(220, 38, 38, 0.1)",
    color: "#dc2626",
    border: "rgba(220, 38, 38, 0.25)",
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

  const [detailOpen, setDetailOpen] = useState<RekrutmenSubmissionWithAnswers | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<RekrutmenSubmissionWithAnswers | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick / Detail Status Change State
  const [statusModalSub, setStatusModalSub] = useState<RekrutmenSubmissionWithAnswers | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RekrutmenSubmissionStatus>("menunggu");
  const [adminNote, setAdminNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Lightbox Image
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

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
      .sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
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
      fileUrl.startsWith("data:image/") ||
      /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl);

    if (isImage) {
      setLightboxImage({
        url: fileUrl,
        title: ans.field?.label || ans.fileName || "Foto Calon Anggota",
      });
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

  const columns: Column<RekrutmenSubmissionWithAnswers>[] = [
    {
      key: "no",
      header: "No",
      render: (_r, idx) => <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{idx + 1}</span>,
    },
    {
      key: "nama",
      header: "Nama Calon Anggota",
      render: (s) => {
        const namaField = s.answers.find((a) => a.field?.label?.toLowerCase().includes("nama"));
        const fotoField = s.answers.find(
          (a) =>
            a.field?.fieldType === "image" ||
            a.fileType?.startsWith("image/") ||
            (a.fileUrl && (a.fileUrl.startsWith("http") || a.fileUrl.startsWith("data:image/"))) ||
            (a.value && (a.value.startsWith("http") || a.value.startsWith("data:image/")))
        );
        const fotoUrl = fotoField?.fileUrl || (fotoField?.value && (fotoField.value.startsWith("http") || fotoField.value.startsWith("data:image/")) ? fotoField.value : null);

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt="Foto"
                referrerPolicy={fotoUrl.startsWith("http") ? "no-referrer" : undefined}
                onError={(e) => {
                  const currentSrc = e.currentTarget.src;
                  const driveMatch = currentSrc.match(/\/d\/([a-zA-Z0-9_-]+)/);
                  if (driveMatch && !currentSrc.includes("thumbnail?id=")) {
                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage({ url: fotoUrl, title: namaField?.value || "Foto Calon Anggota" });
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#f1f5f9",
                }}
                title="Klik untuk melihat foto"
              />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(185, 28, 28, 0.08)",
                  color: "var(--primary-700, #b91c1c)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(namaField?.value || "C")[0].toUpperCase()}
              </div>
            )}
            <div>
              <strong style={{ fontSize: "13.5px", color: "var(--navy-900)", display: "block" }}>
                {namaField ? namaField.value : "Calon Anggota"}
              </strong>
            </div>
          </div>
        );
      },
    },
    {
      key: "hp",
      header: "No. WhatsApp / HP",
      render: (s) => {
        const hpField = s.answers.find(
          (a) =>
            a.field.label.toLowerCase().includes("hp") ||
            a.field.label.toLowerCase().includes("telepon") ||
            a.field.label.toLowerCase().includes("whatsapp") ||
            a.field.label.toLowerCase().includes("wa")
        );
        return (
          <span style={{ fontSize: "13px", color: "#475569" }}>
            {hpField?.value || "-"}
          </span>
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
              fontWeight: 600,
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
            title="Lihat Detail Pendaftaran"
            style={{ padding: "6px" }}
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
          padding: "14px 20px",
          color: "#ffffff",
          boxShadow: "0 6px 20px rgba(185, 28, 28, 0.22)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
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
            SELEKSI CALON ANGGOTA
          </span>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "2px 0 0", color: "#ffffff" }}>
            Daftar Calon Anggota MB Chondro
          </h3>
          <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.9)", margin: "2px 0 0" }}>
            {loading
              ? "Memuat data pendaftar..."
              : `Menampilkan ${filtered.length} dari ${safeSubmissions.length} calon anggota yang telah mengirim formulir`}
          </p>
        </div>
      </div>

      {/* Main Table Card (Full Width) */}
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
        {/* Toolbar Filters */}
        <div
          className="toolbar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Cari nama calon anggota..."
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
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPdfOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--primary-700, #b91c1c)",
              }}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        {/* Continuous Scrollable Data Table */}
        <div className="table-scroll" style={{ maxHeight: "520px", overflowY: "auto" }}>
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetailOpen(r)}
            emptyTitle="Belum Ada Calon Anggota"
            emptyMessage="Belum ada pendaftar yang mengirimkan formulir. Pastikan formulir sudah aktif dan link dibagikan."
          />
        </div>
      </div>

      {/* DETAIL MODAL CALON ANGGOTA */}
      <Modal
        open={detailOpen !== null}
        title="Detail Calon Anggota MB Chondro"
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
              <Download size={16} /> Unduh PDF Calon
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
        {detailOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "70vh", overflowY: "auto" }}>
            {/* Header info banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg, #f8fafc)",
                padding: "14px 18px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>
                  Tanggal Pendaftaran: {formatTanggalPanjang(detailOpen.submittedAt)}
                </span>
                <strong style={{ fontSize: "14px", color: "var(--navy-900)" }}>
                  Formulir: {form.title}
                </strong>
              </div>
              <div>
                {(() => {
                  const conf = STATUS_CONFIG[detailOpen.status] || STATUS_CONFIG.menunggu;
                  const Icon = conf.icon;
                  return (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        background: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`,
                      }}
                    >
                      <Icon size={14} />
                      {conf.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Admin Note if present */}
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
                <strong>Catatan Admin / Reviewer:</strong>
                <p style={{ margin: "4px 0 0", color: "#1d4ed8" }}>{detailOpen.adminNote}</p>
              </div>
            )}

            {/* Dynamic Answers Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy-900)", margin: 0 }}>
                Rincian Jawaban & Berkas Calon Anggota
              </h4>
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
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                    {idx + 1}. {ans.field?.label || "Pertanyaan"}
                  </label>

                  {/* Image / File Display */}
                  {(ans.field?.fieldType === "image" || ans.field?.fieldType === "file" || (ans.value && (ans.value.startsWith("data:image/") || ans.value.startsWith("http")))) ? (
                    (() => {
                      const fileUrl = ans.fileUrl || (ans.value && (ans.value.startsWith("data:") || ans.value.startsWith("http")) ? ans.value : null);
                      const isImg =
                        ans.field?.fieldType === "image" ||
                        ans.fileType?.startsWith("image/") ||
                        Boolean(fileUrl && (fileUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl) || fileUrl.includes("lh3.googleusercontent") || fileUrl.includes("drive.google.com")));

                      return fileUrl ? (
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
                          {isImg ? (
                            <div
                              style={{ position: "relative", cursor: "pointer" }}
                              onClick={() =>
                                setLightboxImage({
                                  url: fileUrl,
                                  title: ans.field?.label || ans.fileName || "Foto Calon Anggota",
                                })
                              }
                            >
                              <img
                                src={fileUrl}
                                alt="Berkas"
                                referrerPolicy={fileUrl.startsWith("http") ? "no-referrer" : undefined}
                                onError={(e) => {
                                  const currentSrc = e.currentTarget.src;
                                  const driveMatch = currentSrc.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                  if (driveMatch && !currentSrc.includes("thumbnail?id=")) {
                                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
                                  }
                                }}
                                style={{
                                  width: 100,
                                  height: 75,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid #cbd5e1",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                  background: "#f1f5f9",
                                }}
                                title="Klik untuk memperbesar foto"
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  right: 4,
                                  bottom: 4,
                                  background: "rgba(0,0,0,0.65)",
                                  color: "#fff",
                                  borderRadius: 4,
                                  padding: "2px 4px",
                                  display: "flex",
                                }}
                              >
                                <ZoomIn size={12} />
                              </div>
                            </div>
                          ) : (
                            <FileText size={36} style={{ color: "#2563eb" }} />
                          )}
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--navy-900)", display: "block" }}>
                              {ans.fileName || (isImg ? "Foto Calon Anggota" : ans.value || "Berkas Terunggah")}
                            </strong>
                            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenFile(ans)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "12px", padding: "5px 12px" }}
                              >
                                <Eye size={13} /> Buka / Lihat {isImg ? "Foto" : "Berkas"}
                              </button>
                              {isImg && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleDownloadImage(fileUrl, ans.field?.label || ans.fileName || undefined)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "12px", color: "var(--primary-700, #b91c1c)", padding: "5px 10px" }}
                                  >
                                    <Download size={13} /> Unduh
                                  </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <strong style={{ fontSize: "13.5px", color: "var(--navy-900)", display: "block", marginTop: 2 }}>
                          {ans.value || <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>-</span>}
                        </strong>
                      );
                    })()
                  ) : ans.field?.fieldType === "checkbox" ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {ans.value.split(",").filter(Boolean).map((v, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            padding: "2px 8px",
                            borderRadius: 4,
                            color: "var(--navy-900)",
                          }}
                        >
                          ✓ {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <strong style={{ fontSize: "13.5px", color: "var(--navy-900)", display: "block", marginTop: 2 }}>
                      {ans.value || <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>-</span>}
                    </strong>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
              {savingStatus ? "Menyimpan..." : "Simpan Status"}
            </button>
          </>
        }
      >
        {statusModalSub && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>Calon Anggota:</span>
              <strong style={{ fontSize: "14px", color: "var(--navy-900)", display: "block" }}>
                {statusModalSub.answers.find((a) => a.field.label.toLowerCase().includes("nama"))?.value || "Calon Anggota"}
              </strong>
            </div>

            <div className="form-group" style={{ gap: 6 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Tentukan Status Seleksi *</label>
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
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Catatan Seleksi / Alasan (Opsional)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Misal: Memenuhi seluruh kriteria divisi musik / Cadangan gelombang 1"
                rows={3}
                style={{ padding: "8px 12px", fontSize: "13px", resize: "vertical" }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DOWNLOAD PDF REKAPITULASI */}
      <Modal
        open={pdfOpen}
        title="Unduh Laporan PDF Calon Anggota"
        onClose={() => setPdfOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPdfOpen(false)} disabled={pdfGenerating}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleGeneratePdf} disabled={pdfGenerating}>
              <Download size={16} />
              {pdfGenerating ? "Membuat PDF..." : "Unduh PDF Laporan"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--navy-900)" }}>
              Pilih Periode & Kriteria Laporan
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "3px 0 0" }}>
              Tentukan rentang tanggal dan status calon anggota yang akan dicetak ke dalam dokumen PDF
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
            <span style={{ color: "var(--text-muted)" }}>Periode yang dicetak:</span>
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
          deleteOpen?.answers.find((a) => a.field.label.toLowerCase().includes("nama"))?.value || ""
        } akan dihapus secara permanen.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(null)}
      />

      {/* IMAGE LIGHTBOX MODAL (PORTAL TO BODY SO IT APPEARS ON TOP OF DETAIL MODAL) */}
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
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(4px)",
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
                <strong style={{ fontSize: "14px", fontWeight: 600, color: "var(--navy-900)" }}>
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
                    title="Tutup Foto"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ padding: 16, textAlign: "center", background: "rgba(15, 23, 42, 0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={lightboxImage.url}
                  alt="Foto Calon"
                  referrerPolicy={lightboxImage.url.startsWith("http") ? "no-referrer" : undefined}
                  onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    const driveMatch = currentSrc.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (driveMatch && !currentSrc.includes("thumbnail?id=")) {
                      e.currentTarget.src = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
                    }
                  }}
                  style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}