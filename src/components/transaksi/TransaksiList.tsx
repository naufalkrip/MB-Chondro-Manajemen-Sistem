import { useMemo, useState } from "react";
import { Plus, Eye, Trash2, Pencil, Download, FolderPlus, ArrowRight } from "lucide-react";
import type { TransaksiGroupWithStats } from "../../types";
import { formatRupiah, formatTanggal } from "../../utils/format";
import { DataTable } from "../ui/DataTable";
import type { Column } from "../ui/DataTable";
import { SearchBar } from "../ui/SearchBar";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface TransaksiListProps {
  loading: boolean;
  groups: TransaksiGroupWithStats[];
  onRefresh: () => Promise<void>;
  onSave: (
    data: Omit<TransaksiGroupWithStats, "id" | "createdAt" | "updatedAt" | "totalTransaksi" | "totalPemasukan" | "totalPengeluaran" | "saldo">,
    id?: string
  ) => Promise<{ success: boolean; id?: string }>;
  onDelete: (id: string) => Promise<boolean>;
  onNavigateToDetail: (id: string) => void;
  onDownloadPdf?: (group: TransaksiGroupWithStats) => Promise<void>;
}

interface FormGroup {
  judul: string;
  tanggal: string;
  keterangan: string;
}

const FORM_EMPTY: FormGroup = {
  judul: "",
  tanggal: new Date().toISOString().slice(0, 10),
  keterangan: "",
};

type ModalMode = "add" | "edit" | null;

export function TransaksiList({
  loading,
  groups,
  onRefresh,
  onSave,
  onDelete,
  onNavigateToDetail,
  onDownloadPdf,
}: TransaksiListProps) {
  const [search, setSearch] = useState("");
  const [filterDari, setFilterDari] = useState("");
  const [filterSampai, setFilterSampai] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormGroup>(FORM_EMPTY);
  const [editing, setEditing] = useState<TransaksiGroupWithStats | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<TransaksiGroupWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return groups
      .filter((g) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          if (!`${g.judul} ${g.keterangan}`.toLowerCase().includes(q)) return false;
        }
        if (filterDari && g.tanggal && g.tanggal < filterDari) return false;
        if (filterSampai && g.tanggal && g.tanggal > filterSampai) return false;
        return true;
      })
      .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  }, [groups, search, filterDari, filterSampai]);

  const validate = (f: FormGroup): Record<string, string> => {
    const err: Record<string, string> = {};
    if (!f.judul.trim()) err.judul = "Nama / Judul transaksi wajib diisi.";
    if (!f.tanggal) err.tanggal = "Tanggal wajib diisi.";
    return err;
  };

  const openAdd = () => {
    setEditing(null);
    setForm(FORM_EMPTY);
    setErrors({});
    setModalMode("add");
  };

  const openEdit = (g: TransaksiGroupWithStats) => {
    setEditing(g);
    setForm({
      judul: g.judul,
      tanggal: g.tanggal.slice(0, 10),
      keterangan: g.keterangan,
    });
    setErrors({});
    setModalMode("edit");
  };

  const handleSubmit = async (openDetailAfterCreate = false) => {
    const err = validate(form);
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSaving(true);
    const payload: Omit<TransaksiGroupWithStats, "id" | "createdAt" | "updatedAt" | "totalTransaksi" | "totalPemasukan" | "totalPengeluaran" | "saldo"> = {
      judul: form.judul.trim(),
      tanggal: form.tanggal,
      keterangan: form.keterangan.trim(),
    };

    const res = await onSave(payload, editing?.id);
    setSaving(false);
    if (res.success) {
      setModalMode(null);
      await onRefresh();
      if (openDetailAfterCreate && res.id) {
        onNavigateToDetail(res.id);
      }
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const ok = await onDelete(toDelete.id);
    setDeleting(false);
    if (ok) {
      setToDelete(null);
      await onRefresh();
    }
  };

  const handleDownload = async (g: TransaksiGroupWithStats) => {
    if (!onDownloadPdf) return;
    setDownloadingId(g.id);
    try {
      await onDownloadPdf(g);
    } finally {
      setDownloadingId(null);
    }
  };

  const setField = (key: keyof FormGroup, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const columns: Column<TransaksiGroupWithStats>[] = [
    { key: "no", header: "No", render: (_r, idx) => <>{idx + 1}</> },
    {
      key: "judul",
      header: "Nama Transaksi / Kegiatan",
      render: (r) => (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateToDetail(r.id)}
          title="Klik untuk membuka rincian uang masuk & keluar"
        >
          <strong style={{ color: "var(--navy-900)", display: "flex", alignItems: "center", gap: 6 }}>
            {r.judul}
            <ArrowRight size={13} style={{ color: "var(--muted)", opacity: 0.7 }} />
          </strong>
          {r.keterangan ? (
            <p className="text-muted-sm" style={{ marginTop: 2 }}>{r.keterangan}</p>
          ) : (
            <span className="text-muted-sm" style={{ fontSize: 12 }}>Klik untuk kelola rincian</span>
          )}
        </div>
      ),
    },
    { key: "tanggal", header: "Tanggal", render: (r) => formatTanggal(r.tanggal) },
    {
      key: "totalTransaksi",
      header: "Rincian",
      render: (r) => (
        <span className="badge" style={{ background: "var(--slate-100)", color: "var(--slate-700)", fontWeight: 600 }}>
          {r.totalTransaksi} item
        </span>
      ),
    },
    {
      key: "totalPemasukan",
      header: "Total Uang Masuk",
      render: (r) => (
        <span style={{ fontWeight: 600, color: "var(--green-700)" }}>
          {formatRupiah(r.totalPemasukan)}
        </span>
      ),
    },
    {
      key: "totalPengeluaran",
      header: "Total Uang Keluar",
      render: (r) => (
        <span style={{ fontWeight: 600, color: "var(--red-700)" }}>
          {formatRupiah(r.totalPengeluaran)}
        </span>
      ),
    },
    {
      key: "saldo",
      header: "Saldo Sisa",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.saldo >= 0 ? "var(--green-700)" : "var(--red-700)" }}>
          {formatRupiah(r.saldo)}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (r) => (
        <div className="action-group">
          <button
            className="action-btn"
            data-tooltip="Buka & Kelola Rincian"
            aria-label="Buka & Kelola Rincian"
            onClick={(e) => { e.stopPropagation(); onNavigateToDetail(r.id); }}
            style={{ color: "var(--burgundy-700)", background: "rgba(127, 29, 29, 0.08)" }}
          >
            <Eye size={16} />
          </button>
          {onDownloadPdf && (
            <button
              className="action-btn"
              data-tooltip="Unduh PDF Laporan"
              aria-label="Unduh PDF Laporan"
              disabled={downloadingId === r.id}
              onClick={(e) => { e.stopPropagation(); handleDownload(r); }}
            >
              <Download size={16} />
            </button>
          )}
          <button
            className="action-btn"
            data-tooltip="Edit Transaksi"
            aria-label="Edit Transaksi"
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          >
            <Pencil size={16} />
          </button>
          <button
            className="action-btn danger"
            data-tooltip="Hapus"
            aria-label="Hapus"
            onClick={(e) => { e.stopPropagation(); setToDelete(r); }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-grid">
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Transaksi Temporer</h2>
            <p>Manajemen transaksi per kegiatan/proyek (uang masuk & keluar terpisah untuk tiap kebutuhan)</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Buat Transaksi Baru</button>
          </div>
        </div>

        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama transaksi atau keterangan..." />
          <DatePicker label="Dari" value={filterDari} onChange={setFilterDari} />
          <DatePicker label="Sampai" value={filterSampai} onChange={setFilterSampai} />
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          rowKey={(r) => r.id}
          emptyTitle="Belum ada transaksi temporer"
          emptyMessage="Belum ada transaksi temporer yang dibuat. Klik tombol 'Buat Transaksi Baru' (misal: 'Pembelian Barang A', 'Event Konser', dll) untuk mulai menginput uang masuk dan keluar."
        />
        {filtered.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-soft)", fontSize: "12px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Menampilkan total {filtered.length} transaksi (scroll vertikal untuk melihat transaksi lainnya)</span>
          </div>
        )}
      </div>

      {/* Modal Buat / Edit Transaksi */}
      <Modal
        open={modalMode !== null}
        title={editing ? "Edit Transaksi Temporer" : "Buat Transaksi Temporer Baru"}
        onClose={() => setModalMode(null)}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalMode(null)} disabled={saving}>
              Batal
            </button>
            {!editing && (
              <button
                className="btn btn-outline"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                title="Simpan lalu langsung buka halaman input uang masuk/keluar"
              >
                <FolderPlus size={16} /> Simpan & Langsung Input Rincian
              </button>
            )}
            <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={saving}>
              {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Nama / Judul Transaksi *</label>
            <input
              value={form.judul}
              onChange={(e) => setField("judul", e.target.value)}
              placeholder="Contoh: Pembelian Barang A / Event Konser / Peremajaan Alat"
            />
            {errors.judul && <span className="field-error">{errors.judul}</span>}
          </div>
          <div className="form-group">
            <label>Tanggal *</label>
            <input type="date" value={form.tanggal} onChange={(e) => setField("tanggal", e.target.value)} />
            {errors.tanggal && <span className="field-error">{errors.tanggal}</span>}
          </div>
          <div className="form-group">
            <label>Keterangan / Deskripsi</label>
            <input
              value={form.keterangan}
              onChange={(e) => setField("keterangan", e.target.value)}
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus Transaksi Temporer"
        message={`Yakin ingin menghapus transaksi "${toDelete?.judul}"? Seluruh daftar rincian uang masuk dan uang keluar di dalamnya juga akan terhapus.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}