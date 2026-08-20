import { Fragment, useCallback, useMemo, useState } from "react";
import {
  CalendarOff,
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  Percent,
  Save,
  Thermometer,
  Trash2,
  XCircle,
} from "lucide-react";
import { deleteAbsensiBatch, getAbsensi, getAnggota, saveAbsensiBatch, updateAbsensiBatch } from "../services/api";
import { CACHE_KEYS } from "../services/cache";
import { laporanAbsensiRekap } from "../services/pdf";
import type { Absensi, Anggota, SesiAbsensi } from "../types";
import { STATUS_KEHADIRAN, WAKTU_ABSENSI } from "../config";
import type { StatusKehadiran, WaktuAbsensi } from "../config";
import {
  buatRingkasanSesi,
  buatSesiAbsensi,
  filterAbsensiPeriode,
  formatBulanTahun,
  formatRentangTanggal,
  formatTanggal,
  formatTanggalPanjang,
  hitungStatKehadiran,
} from "../utils/format";
import { useApi, usePagination } from "../hooks/useApi";
import { useToast } from "../contexts/ToastContext";
import { useSetHeaderAction } from "../contexts/HeaderActionContext";
import { DataTable } from "../components/ui/DataTable";
import type { Column } from "../components/ui/DataTable";
import { SearchBar } from "../components/ui/SearchBar";
import { Filter } from "../components/ui/Filter";
import { DatePicker } from "../components/ui/DatePicker";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { StatCard } from "../components/ui/StatCard";
import { Pagination } from "../components/ui/Pagination";
import { StatCardSkeleton } from "../components/ui/Skeleton";
import { DownloadPdfButton } from "../components/ui/DownloadPdfButton";
import { EmptyState } from "../components/ui/EmptyState";

const KEGIATAN_SUGGEST = [
  "Rapat Rutin",
  "Latihan",
  "Pertemuan Mingguan",
  "Acara Desa Lambur",
  "Sekretariat MB Chondro",
];

type PeriodeType = "" | "bulanIni" | "bulanLalu" | "custom";

function StatusSelect({
  value,
  onChange,
  sm = false,
}: {
  value: StatusKehadiran;
  onChange: (s: StatusKehadiran) => void;
  sm?: boolean;
}) {
  return (
    <select
      className={`status-select status-${value.toLowerCase()}${sm ? " status-select-sm" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value as StatusKehadiran)}
      aria-label="Status kehadiran"
    >
      {STATUS_KEHADIRAN.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function Absensi() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { data: anggotaData, loading: loadingAnggota } = useApi<Anggota[]>(getAnggota, "Gagal mengambil data.", CACHE_KEYS.ANGGOTA);
  const { data: absensiData, loading: loadingAbsensi, refresh } = useApi<Absensi[]>(getAbsensi, "Gagal mengambil data.", CACHE_KEYS.ABSENSI);

  const anggota = useMemo(() => anggotaData ?? [], [anggotaData]);
  const absensi = useMemo(() => absensiData ?? [], [absensiData]);
  const loading = loadingAnggota || loadingAbsensi;
  const today = new Date().toISOString().slice(0, 10);

  // Form input absensi
  const [formTanggal, setFormTanggal] = useState(today);
  const [formKegiatan, setFormKegiatan] = useState("");
  const [formWaktu, setFormWaktu] = useState<WaktuAbsensi | "">("");
  const [formStatus, setFormStatus] = useState<Record<string, StatusKehadiran>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Search & filter daftar anggota
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDivisi, setMemberDivisi] = useState("");

  // Filter riwayat
  const [riwayatSearch, setRiwayatSearch] = useState("");
  const [periode, setPeriode] = useState<PeriodeType>("");
  const [customDari, setCustomDari] = useState("");
  const [customSampai, setCustomSampai] = useState("");

  // Modal detail / edit / delete
  const [detailSesi, setDetailSesi] = useState<SesiAbsensi | null>(null);
  const [editSesi, setEditSesi] = useState<SesiAbsensi | null>(null);
  const [editForm, setEditForm] = useState({ tanggal: "", kegiatan: "", waktu: "" as WaktuAbsensi | "" });
  const [editStatus, setEditStatus] = useState<Record<string, StatusKehadiran>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SesiAbsensi | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal pilih rentang PDF
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfMode, setPdfMode] = useState<"" | "bulan" | "custom">("");
  const [pdfBulan, setPdfBulan] = useState("");
  const [pdfDari, setPdfDari] = useState("");
  const [pdfSampai, setPdfSampai] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const stat = useMemo(() => hitungStatKehadiran(absensi), [absensi]);

  const divisiOptions = useMemo(() => {
    const set = new Set(anggota.map((a) => a.divisi).filter(Boolean));
    return Array.from(set).sort().map((d) => ({ value: d, label: d }));
  }, [anggota]);

  // Anggota diurutkan berkelompok sesuai divisi, lalu abjad per nama
  const anggotaTerurut = useMemo(() => {
    return [...anggota].sort((a, b) => {
      const da = a.divisi || "Lainnya";
      const db = b.divisi || "Lainnya";
      if (da !== db) return da.localeCompare(db);
      return a.nama.localeCompare(b.nama);
    });
  }, [anggota]);

  const anggotaFiltered = useMemo(() => {
    return anggotaTerurut.filter((a) => {
      if (memberSearch.trim()) {
        const q = memberSearch.toLowerCase();
        if (!`${a.id} ${a.nama} ${a.divisi}`.toLowerCase().includes(q)) return false;
      }
      if (memberDivisi && a.divisi !== memberDivisi) return false;
      return true;
    });
  }, [anggotaTerurut, memberSearch, memberDivisi]);

  const periodeRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    if (periode === "bulanIni") {
      return { dari: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, sampai: undefined as string | undefined };
    }
    if (periode === "bulanLalu") {
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        dari: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-01`,
        sampai: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
      };
    }
    if (periode === "custom") {
      return { dari: customDari || undefined, sampai: customSampai || undefined };
    }
    return { dari: undefined, sampai: undefined };
  }, [periode, customDari, customSampai]);

  const absensiPeriode = useMemo(
    () => filterAbsensiPeriode(absensi, periodeRange.dari, periodeRange.sampai),
    [absensi, periodeRange]
  );

  const sesiAll = useMemo(() => buatSesiAbsensi(absensiPeriode), [absensiPeriode]);

  const sesiFiltered = useMemo(() => {
    if (!riwayatSearch.trim()) return sesiAll;
    const q = riwayatSearch.toLowerCase();
    return sesiAll.filter(
      (s) =>
        s.kegiatan.toLowerCase().includes(q) ||
        s.waktu.toLowerCase().includes(q) ||
        s.tanggal.includes(q) ||
        formatTanggal(s.tanggal).includes(q)
    );
  }, [sesiAll, riwayatSearch]);

  const sesiPagination = usePagination(sesiFiltered.length, 8);
  const pagedSesi = sesiFiltered.slice(sesiPagination.start, sesiPagination.end);

  const pdfRange = useMemo(() => {
    if (pdfMode === "bulan" && pdfBulan) {
      const [tahun, bulan] = pdfBulan.split("-");
      const lastDay = new Date(Number(tahun), Number(bulan), 0).getDate();
      return {
        dari: `${pdfBulan}-01`,
        sampai: `${pdfBulan}-${String(lastDay).padStart(2, "0")}`,
        label: formatBulanTahun(`${pdfBulan}-01`),
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
  }, [pdfMode, pdfBulan, pdfDari, pdfSampai]);

  const handleDownloadPdf = useCallback(() => {
    setPdfOpen(true);
  }, []);

  const handleGeneratePdf = async () => {
    if (pdfMode === "bulan" && !pdfBulan) {
      toastError("Silakan pilih bulan terlebih dahulu.");
      return;
    }
    if (pdfMode === "custom" && (!pdfDari || !pdfSampai)) {
      toastError("Silakan lengkapi rentang tanggal (dari & sampai).");
      return;
    }
    setPdfGenerating(true);
    try {
      const data = filterAbsensiPeriode(absensi, pdfRange.dari, pdfRange.sampai);
      await laporanAbsensiRekap(anggota, data, pdfRange.label);
      setPdfOpen(false);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal membuat PDF.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const headerAction = useMemo(
    () => <DownloadPdfButton onGenerate={handleDownloadPdf} />,
    [handleDownloadPdf]
  );
  useSetHeaderAction(headerAction);

  const validateForm = () => {
    const err: Record<string, string> = {};
    if (!formTanggal) err.tanggal = "Tanggal wajib diisi.";
    if (!formKegiatan.trim()) err.kegiatan = "Tempat atau kegiatan wajib diisi.";
    if (!formWaktu) err.waktu = "Silakan pilih waktu absensi.";
    if (anggota.length === 0) err.anggota = "Belum ada anggota yang terdaftar.";
    return err;
  };

  const cekDuplikat = (tanggal: string, kegiatan: string, waktu: string, excludeIds?: Set<string>) => {
    const existing = new Set(
      absensi
        .filter((a) => !excludeIds || !excludeIds.has(a.id))
        .map((a) => `${a.tanggal}|${a.kegiatan.trim().toLowerCase()}|${a.waktu}|${a.idAnggota}`)
    );
    return anggota.filter((a) =>
      existing.has(`${tanggal}|${kegiatan.trim().toLowerCase()}|${waktu}|${a.id}`)
    );
  };

  const handleSave = async () => {
    const err = validateForm();
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;

    setSaving(true);
    const sessionKey = `${formTanggal}|${formKegiatan.trim().toLowerCase()}|${formWaktu as string}`;
    const existingByMember = new Map<string, Absensi>();
    for (const a of absensi) {
      if (`${a.tanggal}|${a.kegiatan.trim().toLowerCase()}|${a.waktu}` === sessionKey) {
        existingByMember.set(a.idAnggota, a);
      }
    }

    const toAdd: Omit<Absensi, "id" | "nama">[] = [];
    const toUpdate: Omit<Absensi, "nama">[] = [];
    for (const a of anggota) {
      const payload = {
        idAnggota: a.id,
        tanggal: formTanggal,
        kegiatan: formKegiatan.trim(),
        waktu: formWaktu as WaktuAbsensi,
        status: formStatus[a.id] ?? "Hadir",
        keterangan: "",
      };
      const existing = existingByMember.get(a.id);
      if (existing) toUpdate.push({ ...payload, id: existing.id });
      else toAdd.push(payload);
    }

    let failed = "";
    if (toAdd.length > 0) {
      const res = await saveAbsensiBatch(toAdd);
      if (!res.success) failed = res.message;
    }
    if (!failed && toUpdate.length > 0) {
      const res = await updateAbsensiBatch(toUpdate);
      if (!res.success) failed = res.message;
    }
    setSaving(false);

    if (failed) {
      toastError(failed);
    } else {
      toastSuccess(
        toAdd.length === 0 && toUpdate.length > 0
          ? "Absensi berhasil diperbarui."
          : "Absensi berhasil disimpan."
      );
      setFormStatus({});
      await refresh();
    }
  };

  const openEdit = (sesi: SesiAbsensi) => {
    setEditSesi(sesi);
    setEditForm({ tanggal: sesi.tanggal, kegiatan: sesi.kegiatan, waktu: sesi.waktu });
    const statusMap: Record<string, StatusKehadiran> = {};
    for (const r of sesi.daftar) statusMap[r.idAnggota] = r.status;
    setEditStatus(statusMap);
  };

  const handleSaveEdit = async () => {
    if (!editSesi) return;
    if (!editForm.tanggal) {
      toastError("Tanggal wajib diisi.");
      return;
    }
    if (!editForm.kegiatan.trim()) {
      toastError("Tempat atau kegiatan wajib diisi.");
      return;
    }
    if (!editForm.waktu) {
      toastError("Silakan pilih waktu absensi.");
      return;
    }

    const excludeIds = new Set(editSesi.daftar.map((r) => r.id));
    const dup = cekDuplikat(editForm.tanggal, editForm.kegiatan, editForm.waktu, excludeIds);
    if (dup.length > 0) {
      toastError("Absensi untuk tanggal, kegiatan, waktu, dan anggota tersebut sudah tersedia.");
      return;
    }

    setEditSaving(true);
    const oldByMember = new Map(editSesi.daftar.map((r) => [r.idAnggota, r] as const));
    const toUpdate: Omit<Absensi, "nama">[] = [];
    const toAdd: Omit<Absensi, "id" | "nama">[] = [];
    for (const a of anggota) {
      const payload = {
        idAnggota: a.id,
        tanggal: editForm.tanggal,
        kegiatan: editForm.kegiatan.trim(),
        waktu: editForm.waktu as WaktuAbsensi,
        status: editStatus[a.id] ?? "Hadir",
        keterangan: "",
      };
      const old = oldByMember.get(a.id);
      if (old) toUpdate.push({ ...payload, id: old.id });
      else toAdd.push(payload);
    }
    let failed = "";
    if (toUpdate.length > 0) {
      const res = await updateAbsensiBatch(toUpdate);
      if (!res.success) failed = res.message;
    }
    if (!failed && toAdd.length > 0) {
      const res = await saveAbsensiBatch(toAdd);
      if (!res.success) failed = res.message;
    }
    setEditSaving(false);

    if (failed) {
      toastError(failed);
    } else {
      toastSuccess("Riwayat absensi berhasil diperbarui.");
      setEditSesi(null);
      await refresh();
    }
  };

  const handleDeleteSesi = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteAbsensiBatch(toDelete.daftar.map((r) => r.id));
    setDeleting(false);
    if (!res.success) {
      toastError(res.message);
    } else {
      toastSuccess("Riwayat absensi berhasil dihapus.");
      setToDelete(null);
      await refresh();
    }
  };

  const riwayatColumns: Column<SesiAbsensi>[] = [
    { key: "no", header: "No", render: (_r, idx) => <>{sesiPagination.start + idx + 1}</> },
    { key: "tanggal", header: "Tanggal", render: (r) => formatTanggal(r.tanggal) },
    { key: "kegiatan", header: "Tempat/Kegiatan" },
    { key: "waktu", header: "Waktu" },
    {
      key: "jumlahAnggota",
      header: "Jumlah Anggota",
      render: (r) => (
        <span className="text-muted-sm">
          {r.jumlahAnggota} anggota
        </span>
      ),
    },
    {
      key: "ringkasan",
      header: "Ringkasan",
      render: (r) => <span className="text-muted-sm">{buatRingkasanSesi(r.daftar)}</span>,
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (r) => (
        <div className="action-group">
          <button className="action-btn" data-tooltip="Detail" aria-label="Detail" onClick={(e) => { e.stopPropagation(); setDetailSesi(r); }}><Eye size={16} /></button>
          <button className="action-btn" data-tooltip="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil size={16} /></button>
          <button className="action-btn danger" data-tooltip="Hapus" aria-label="Hapus" onClick={(e) => { e.stopPropagation(); setToDelete(r); }}><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-grid">
      <div className="stat-grid">
        {loading && !absensiData ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Hadir" value={String(stat.hadir)} icon={<CheckCircle2 size={20} />} accent="green" />
            <StatCard label="Total Izin" value={String(stat.izin)} icon={<FileText size={20} />} accent="blue" />
            <StatCard label="Total Sakit" value={String(stat.sakit)} icon={<Thermometer size={20} />} accent="amber" />
            <StatCard label="Total Cuti" value={String(stat.cuti)} icon={<CalendarOff size={20} />} accent="purple" />
            <StatCard label="Total Alpa" value={String(stat.alpa)} icon={<XCircle size={20} />} accent="red" />
            <StatCard label="Persentase Kehadiran" value={`${stat.persentase}%`} icon={<Percent size={20} />} accent="red" sub={`${stat.total} catatan`} />
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Input Absensi</h2>
            <p>Tentukan tanggal, kegiatan, dan waktu absensi</p>
          </div>
        </div>

        <div className="absensi-field-grid">
          <div className="form-group">
            <label>Tanggal</label>
            <input type="date" value={formTanggal} onChange={(e) => setFormTanggal(e.target.value)} />
            {formErrors.tanggal && <span className="field-error">{formErrors.tanggal}</span>}
          </div>
          <div className="form-group">
            <label>Tempat / Kegiatan</label>
            <input
              value={formKegiatan}
              onChange={(e) => setFormKegiatan(e.target.value)}
              placeholder="Masukkan tempat atau nama kegiatan"
              list="kegiatan-suggest"
            />
            <datalist id="kegiatan-suggest">
              {KEGIATAN_SUGGEST.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            {formErrors.kegiatan && <span className="field-error">{formErrors.kegiatan}</span>}
          </div>
          <div className="form-group">
            <label>Waktu</label>
            <select
              className="waktu-select"
              value={formWaktu}
              onChange={(e) => setFormWaktu(e.target.value as WaktuAbsensi | "")}
            >
              <option value="" disabled>
                Pilih waktu absensi
              </option>
              {WAKTU_ABSENSI.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            {formErrors.waktu && <span className="field-error">{formErrors.waktu}</span>}
          </div>
        </div>

        <hr className="form-section-divider" />

        <div className="form-section-title">Daftar Anggota</div>
        <p className="form-section-sub">Tentukan status kehadiran setiap anggota</p>

        <div className="toolbar">
          <SearchBar value={memberSearch} onChange={setMemberSearch} placeholder="Cari anggota..." />
          <Filter label="Divisi" value={memberDivisi} onChange={setMemberDivisi} options={divisiOptions} />
        </div>

        {anggotaFiltered.length === 0 && !loading ? (
          <EmptyState
            title={anggota.length === 0 ? "Belum ada anggota yang terdaftar" : "Tidak ada anggota yang cocok"}
            message={
              anggota.length === 0
                ? "Tambahkan anggota terlebih dahulu melalui menu Anggota."
                : "Ubah pencarian atau filter divisi untuk melihat anggota."
            }
          />
        ) : (
          <div className="member-table">
            <div className="member-table-head">
              <span className="member-cell no">No</span>
              <span className="member-cell name">Nama</span>
              <span className="member-cell divisi">Divisi</span>
              <span className="member-cell status">Status Kehadiran</span>
            </div>
            {anggotaFiltered.map((a, i) => {
              const prev = i > 0 ? anggotaFiltered[i - 1] : null;
              const grupBerubah = !prev || (prev.divisi || "Lainnya") !== (a.divisi || "Lainnya");
              return (
                <Fragment key={a.id}>
                  {grupBerubah && (
                    <div className="member-divisi-header">{a.divisi || "Lainnya"}</div>
                  )}
                  <div className="member-row">
                    <span className="member-cell no">{i + 1}</span>
                    <span className="member-cell name">{a.nama}</span>
                    <span className="member-cell divisi">{a.divisi || "-"}</span>
                    <span className="member-cell status">
                      <StatusSelect
                        value={formStatus[a.id] ?? "Hadir"}
                        onChange={(s) => setFormStatus((prev) => ({ ...prev, [a.id]: s }))}
                      />
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        {formErrors.anggota && (
          <p className="field-error" style={{ marginTop: 12 }}>{formErrors.anggota}</p>
        )}

        <div className="absensi-save">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            <Save size={17} />
            {saving ? "Menyimpan..." : "Simpan Absensi"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Riwayat Absensi</h2>
            <p>Daftar absensi yang telah dibuat</p>
          </div>
          <div className="header-actions">
            <DownloadPdfButton onGenerate={handleDownloadPdf} />
          </div>
        </div>

        <div className="toolbar">
          <SearchBar value={riwayatSearch} onChange={setRiwayatSearch} placeholder="Cari riwayat..." />
          <Filter
            label="Periode"
            value={periode}
            onChange={(v) => setPeriode(v as PeriodeType)}
            options={[
              { value: "bulanIni", label: "Bulan ini" },
              { value: "bulanLalu", label: "Bulan lalu" },
              { value: "custom", label: "Custom" },
            ]}
            allLabel="Semua"
          />
          {periode === "custom" && (
            <>
              <DatePicker label="Dari" value={customDari} onChange={setCustomDari} />
              <DatePicker label="Sampai" value={customSampai} onChange={setCustomSampai} />
            </>
          )}
        </div>

        <DataTable
          columns={riwayatColumns}
          data={pagedSesi}
          loading={loading}
          rowKey={(r) => r.key}
          emptyMessage="Belum ada riwayat absensi. Silakan buat absensi pertama menggunakan form di atas."
        />
        <Pagination
          page={sesiPagination.page}
          totalPages={sesiPagination.totalPages}
          totalItems={sesiFiltered.length}
          pageSize={sesiPagination.pageSize}
          onPageChange={sesiPagination.setPage}
        />
      </div>

      <Modal
        open={detailSesi !== null}
        title="Detail Absensi"
        onClose={() => setDetailSesi(null)}
        size="md"
        footer={
          <button className="btn btn-primary" onClick={() => setDetailSesi(null)}>
            Tutup
          </button>
        }
      >
        {detailSesi && (
          <>
            <div className="detail-list">
              <div className="detail-row"><span className="detail-label">Tanggal</span><span>{formatTanggalPanjang(detailSesi.tanggal)}</span></div>
              <div className="detail-row"><span className="detail-label">Tempat/Kegiatan</span><span>{detailSesi.kegiatan}</span></div>
              <div className="detail-row"><span className="detail-label">Waktu</span><span>{detailSesi.waktu}</span></div>
            </div>
            <div className="detail-section table-wrapper">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama</th>
                      <th>Divisi</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSesi.daftar.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.nama}</td>
                        <td>{anggota.find((x) => x.id === r.idAnggota)?.divisi || "-"}</td>
                        <td><StatusBadge value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={editSesi !== null}
        title="Edit Absensi"
        onClose={() => setEditSesi(null)}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditSesi(null)} disabled={editSaving}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </>
        }
      >
        {editSesi && (
          <>
            <div className="absensi-field-grid">
              <div className="form-group">
                <label>Tanggal</label>
                <input type="date" value={editForm.tanggal} onChange={(e) => setEditForm((p) => ({ ...p, tanggal: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Tempat / Kegiatan</label>
                <input
                  value={editForm.kegiatan}
                  onChange={(e) => setEditForm((p) => ({ ...p, kegiatan: e.target.value }))}
                  placeholder="Masukkan tempat atau nama kegiatan"
                  list="kegiatan-suggest-edit"
                />
                <datalist id="kegiatan-suggest-edit">
                  {KEGIATAN_SUGGEST.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Waktu</label>
                <select
                  className="waktu-select"
                  value={editForm.waktu}
                  onChange={(e) => setEditForm((p) => ({ ...p, waktu: e.target.value as WaktuAbsensi | "" }))}
                >
                  <option value="" disabled>
                    Pilih waktu absensi
                  </option>
                  {WAKTU_ABSENSI.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="form-section-divider" />

            <div className="form-section-title">Status Kehadiran Anggota</div>
            <p className="form-section-sub">Ubah status kehadiran setiap anggota</p>

            <div className="member-edit-list">
              {anggotaTerurut.map((a, i) => {
                const prev = i > 0 ? anggotaTerurut[i - 1] : null;
                const grupBerubah = !prev || (prev.divisi || "Lainnya") !== (a.divisi || "Lainnya");
                return (
                  <Fragment key={a.id}>
                    {grupBerubah && (
                      <div className="member-edit-divisi">{a.divisi || "Lainnya"}</div>
                    )}
                    <div className="member-edit-row">
                      <div className="member-edit-info">
                        <strong>{a.nama}</strong>
                        <span>{a.id} · {a.divisi || "-"}</span>
                      </div>
                      <StatusSelect
                        sm
                        value={editStatus[a.id] ?? "Hadir"}
                        onChange={(s) => setEditStatus((prev) => ({ ...prev, [a.id]: s }))}
                      />
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={pdfOpen}
        title="Unduh PDF Riwayat Absensi"
        onClose={() => setPdfOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPdfOpen(false)} disabled={pdfGenerating}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleGeneratePdf} disabled={pdfGenerating}>
              <Save size={17} />
              {pdfGenerating ? "Membuat PDF..." : "Unduh PDF"}
            </button>
          </>
        }
      >
        <div className="form-section-title">Pilih Periode Laporan</div>
        <p className="form-section-sub">Tentukan rentang tanggal yang akan dimasukkan ke dalam laporan PDF</p>

        <div className="segment-group" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`segment-btn${pdfMode === "" ? " active" : ""}`}
            onClick={() => setPdfMode("")}
          >
            Semua Periode
          </button>
          <button
            type="button"
            className={`segment-btn${pdfMode === "bulan" ? " active" : ""}`}
            onClick={() => setPdfMode("bulan")}
          >
            Per Bulan
          </button>
          <button
            type="button"
            className={`segment-btn${pdfMode === "custom" ? " active" : ""}`}
            onClick={() => setPdfMode("custom")}
          >
            Custom Rentang
          </button>
        </div>

        {pdfMode === "bulan" && (
          <div className="form-group">
            <label>Bulan & Tahun</label>
            <input
              type="month"
              value={pdfBulan}
              onChange={(e) => setPdfBulan(e.target.value)}
              aria-label="Pilih bulan"
            />
          </div>
        )}

        {pdfMode === "custom" && (
          <div className="absensi-field-grid">
            <div className="form-group">
              <label>Tanggal Dari</label>
              <input
                type="date"
                value={pdfDari}
                max={pdfSampai || undefined}
                onChange={(e) => setPdfDari(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Tanggal Sampai</label>
              <input
                type="date"
                value={pdfSampai}
                min={pdfDari || undefined}
                onChange={(e) => setPdfSampai(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="report-period" style={{ marginTop: 8 }}>
          <span className="text-muted-sm">Periode laporan:</span>
          <strong>{pdfRange.label}</strong>
        </div>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus Riwayat Absensi?"
        message={`Data absensi ${toDelete?.kegiatan} (${toDelete ? formatTanggal(toDelete.tanggal) : "-"} · ${toDelete?.waktu}) akan dihapus dan tidak dapat dikembalikan.`}
        loading={deleting}
        onConfirm={handleDeleteSesi}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}