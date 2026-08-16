import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import type { Transaksi } from "../../types";
import { JENIS_TRANSAKSI } from "../../config";
import { filterTransaksi, formatRentangTanggal, formatRupiah, formatTanggal, hitungSaldo } from "../../utils/format";
import { laporanKeuangan } from "../../services/pdf";
import { usePagination } from "../../hooks/useApi";
import { DataTable } from "../ui/DataTable";
import type { Column } from "../ui/DataTable";
import { SearchBar } from "../ui/SearchBar";
import { Filter } from "../ui/Filter";
import { DatePicker } from "../ui/DatePicker";
import { StatusBadge } from "../ui/StatusBadge";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CurrencyInput } from "../ui/CurrencyInput";
import { StatCard } from "../ui/StatCard";
import { Pagination } from "../ui/Pagination";
import { StatCardSkeleton } from "../ui/Skeleton";
import { DownloadPdfButton } from "../ui/DownloadPdfButton";

interface KeuanganProps {
  title: string;
  subtitle: string;
  loading: boolean;
  transaksi: Transaksi[];
  onRefresh: () => Promise<void>;
  onSave: (data: Omit<Transaksi, "id">, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

interface FormTransaksi {
  tanggal: string;
  jenis: string;
  kategori: string;
  keterangan: string;
  nominal: number | string;
  penanggungJawab: string;
}

const FORM_EMPTY: FormTransaksi = {
  tanggal: new Date().toISOString().slice(0, 10),
  jenis: "Pemasukan",
  kategori: "",
  keterangan: "",
  nominal: "",
  penanggungJawab: "",
};

type ModalMode = "add" | "edit" | null;

export function Keuangan({ title, subtitle, loading, transaksi, onRefresh, onSave, onDelete }: KeuanganProps) {
  const [search, setSearch] = useState("");
  const [filterDari, setFilterDari] = useState("");
  const [filterSampai, setFilterSampai] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterKategori, setFilterKategori] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormTransaksi>(FORM_EMPTY);
  const [editing, setEditing] = useState<Transaksi | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Transaksi | null>(null);
  const [deleting, setDeleting] = useState(false);

  const saldo = useMemo(() => hitungSaldo(transaksi), [transaksi]);

  const kategoriOptions = useMemo(() => {
    const set = new Set(transaksi.map((t) => t.kategori).filter(Boolean));
    return Array.from(set).sort().map((k) => ({ value: k, label: k }));
  }, [transaksi]);

  const filtered = useMemo(() => {
    return filterTransaksi(transaksi, {
      dari: filterDari || undefined,
      sampai: filterSampai || undefined,
      jenis: filterJenis || undefined,
      kategori: filterKategori || undefined,
      search: search || undefined,
    }).sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  }, [transaksi, filterDari, filterSampai, filterJenis, filterKategori, search]);

  const pagination = usePagination(filtered.length, 10);
  const paged = filtered.slice(pagination.start, pagination.end);

  const validate = (f: FormTransaksi): Record<string, string> => {
    const err: Record<string, string> = {};
    if (!f.tanggal) err.tanggal = "Tanggal wajib diisi.";
    if (!f.jenis) err.jenis = "Jenis transaksi wajib dipilih.";
    const nominal = Number(f.nominal);
    if (f.nominal === "" || Number.isNaN(nominal)) err.nominal = "Nominal harus berupa angka.";
    else if (nominal < 0) err.nominal = "Nominal tidak boleh negatif.";
    return err;
  };

  const openAdd = () => {
    setEditing(null);
    setForm(FORM_EMPTY);
    setErrors({});
    setModalMode("add");
  };

  const openEdit = (t: Transaksi) => {
    setEditing(t);
    setForm({
      tanggal: t.tanggal.slice(0, 10),
      jenis: t.jenis,
      kategori: t.kategori,
      keterangan: t.keterangan,
      nominal: t.nominal,
      penanggungJawab: t.penanggungJawab,
    });
    setErrors({});
    setModalMode("edit");
  };

  const handleSubmit = async () => {
    const err = validate(form);
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSaving(true);
    const payload: Omit<Transaksi, "id"> = {
      tanggal: form.tanggal,
      jenis: form.jenis as Transaksi["jenis"],
      kategori: form.kategori.trim(),
      keterangan: form.keterangan.trim(),
      nominal: Number(form.nominal),
      penanggungJawab: form.penanggungJawab.trim(),
    };

    const ok = await onSave(payload, editing?.id);
    setSaving(false);
    if (ok) {
      setModalMode(null);
      await onRefresh();
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

  const handleDownloadPdf = async () => {
    const periode = formatRentangTanggal(filterDari, filterSampai);
    await laporanKeuangan(filtered, periode, title);
  };

  const setField = (key: keyof FormTransaksi, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const columns: Column<Transaksi>[] = [
    { key: "no", header: "No", render: (_r, idx) => <>{pagination.start + idx + 1}</> },
    { key: "id", header: "ID Transaksi" },
    { key: "tanggal", header: "Tanggal", render: (r) => formatTanggal(r.tanggal) },
    { key: "jenis", header: "Jenis", render: (r) => <StatusBadge value={r.jenis} /> },
    { key: "kategori", header: "Kategori" },
    { key: "keterangan", header: "Keterangan", render: (r) => r.keterangan || "-" },
    {
      key: "nominal",
      header: "Nominal",
      render: (r) => (
        <span style={{ fontWeight: 600, color: r.jenis === "Pemasukan" ? "var(--green-600)" : "var(--red-700)" }}>
          {r.jenis === "Pengeluaran" ? "-" : ""}{formatRupiah(r.nominal)}
        </span>
      ),
    },
    { key: "penanggungJawab", header: "Penanggung Jawab", render: (r) => r.penanggungJawab || "-" },
    {
      key: "aksi",
      header: "Aksi",
      render: (r) => (
        <div className="action-group">
          <button className="action-btn" data-tooltip="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil size={16} /></button>
          <button className="action-btn danger" data-tooltip="Hapus" aria-label="Hapus" onClick={(e) => { e.stopPropagation(); setToDelete(r); }}><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-grid">
      <div className="stat-grid">
        {loading && transaksi.length === 0 ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Pemasukan" value={formatRupiah(saldo.pemasukan)} icon={<ArrowUpCircle size={20} />} accent="green" sub={title} />
            <StatCard label="Total Pengeluaran" value={formatRupiah(saldo.pengeluaran)} icon={<ArrowDownCircle size={20} />} accent="red" sub={title} />
            <StatCard label="Saldo" value={formatRupiah(saldo.saldo)} icon={<Wallet size={20} />} accent={saldo.saldo < 0 ? "red" : "amber"} sub={title} />
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>{subtitle}</h2>
            <p>{loading ? "Memuat data..." : `${filtered.length} transaksi`}</p>
          </div>
          <div className="header-actions">
            <DownloadPdfButton onGenerate={handleDownloadPdf} />
            <button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Tambah Transaksi</button>
          </div>
        </div>

        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari transaksi..." />
          <DatePicker label="Dari" value={filterDari} onChange={setFilterDari} />
          <DatePicker label="Sampai" value={filterSampai} onChange={setFilterSampai} />
          <Filter
            label="Jenis"
            value={filterJenis}
            onChange={setFilterJenis}
            options={JENIS_TRANSAKSI.map((j) => ({ value: j, label: j }))}
          />
          <Filter label="Kategori" value={filterKategori} onChange={setFilterKategori} options={kategoriOptions} />
        </div>

        <DataTable columns={columns} data={paged} loading={loading} rowKey={(r) => r.id} emptyMessage="Tidak ada transaksi." />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={filtered.length}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
        />
      </div>

      <Modal
        open={modalMode !== null}
        title={editing ? "Edit Transaksi" : "Tambah Transaksi"}
        onClose={() => setModalMode(null)}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalMode(null)} disabled={saving}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Tanggal *</label>
            <input type="date" value={form.tanggal} onChange={(e) => setField("tanggal", e.target.value)} />
            {errors.tanggal && <span className="field-error">{errors.tanggal}</span>}
          </div>
          <div className="form-group">
            <label>Jenis Transaksi *</label>
            <select value={form.jenis} onChange={(e) => setField("jenis", e.target.value)}>
              {JENIS_TRANSAKSI.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
            {errors.jenis && <span className="field-error">{errors.jenis}</span>}
          </div>
          <div className="form-group">
            <label>Nominal *</label>
            <CurrencyInput value={form.nominal} onChange={(v) => setField("nominal", v)} placeholder="0" />
            {errors.nominal && <span className="field-error">{errors.nominal}</span>}
          </div>
          <div className="form-group">
            <label>Kategori</label>
            <input value={form.kategori} onChange={(e) => setField("kategori", e.target.value)} placeholder="Contoh: Iuran, Donasi, Konsumsi" />
          </div>
          <div className="form-group">
            <label>Penanggung Jawab</label>
            <input value={form.penanggungJawab} onChange={(e) => setField("penanggungJawab", e.target.value)} placeholder="Nama penanggung jawab" />
          </div>
          <div className="form-group">
            <label>Keterangan</label>
            <input value={form.keterangan} onChange={(e) => setField("keterangan", e.target.value)} placeholder="Keterangan (opsional)" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus Transaksi"
        message={`Yakin ingin menghapus transaksi ${toDelete?.id} (${formatRupiah(toDelete?.nominal ?? 0)})?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}