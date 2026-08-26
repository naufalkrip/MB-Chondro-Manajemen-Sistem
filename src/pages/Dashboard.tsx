import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ClipboardCheck,
  Wallet,
  WalletCards,
  UserCheck,
  UserX,
  UserLock,
  X,
  ExternalLink,
  Activity,
} from "lucide-react";
import {
  getAbsensi,
  getAnggota,
  getDashboard,
  getKeuanganChondro,
  getKeuanganMedia,
} from "../services/api";
import { CACHE_KEYS, cacheGet, cacheSet } from "../services/cache";
import type { Absensi, Anggota, DashboardData, Transaksi } from "../types";
import {
  buatSesiAbsensi,
  formatTanggalPendek,
  formatRupiah,
} from "../utils/format";
import { Skeleton } from "../components/ui/Skeleton";
import { DonutChart } from "../components/ui/Chart";
import { useToast } from "../contexts/ToastContext";

interface AktivitasItem {
  id: string;
  tanggal: string;
  warna: string;
  judul: string;
  deskripsi: string;
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="summary-card animate-fade-slide-up">
      <div className="summary-card-head">
        <span className="summary-card-label">{label}</span>
        <span className={`summary-card-icon ${iconClass}`}>{icon}</span>
      </div>
      <span className="summary-card-value">{value}</span>
      <span className="summary-card-sub">{sub}</span>
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="summary-card summary-card-skeleton animate-fade-slide-up">
      <div className="summary-card-head">
        <Skeleton width={120} height={14} />
        <Skeleton width={44} height={44} borderRadius={12} />
      </div>
      <Skeleton width={100} height={32} />
      <Skeleton width={140} height={13} />
    </div>
  );
}

export function Dashboard() {
  const { error: toastError } = useToast();
  const [data, setData] = useState<DashboardData | null>(() => cacheGet<DashboardData>(CACHE_KEYS.DASHBOARD));
  const [absensi, setAbsensi] = useState<Absensi[]>(() => cacheGet<Absensi[]>(CACHE_KEYS.ABSENSI) ?? []);
  const [anggota, setAnggota] = useState<Anggota[]>(() => cacheGet<Anggota[]>(CACHE_KEYS.ANGGOTA) ?? []);
  const [transaksi, setTransaksi] = useState<Transaksi[]>(() => cacheGet<Transaksi[]>(CACHE_KEYS.KEUANGAN_CHONDRO) ?? []);
  const [transaksiMedia, setTransaksiMedia] = useState<Transaksi[]>(() => cacheGet<Transaksi[]>(CACHE_KEYS.KEUANGAN_MEDIA) ?? []);
  const [loading, setLoading] = useState(!data);
  const [financeModal, setFinanceModal] = useState<{ type: "chondro" | "media" } | null>(null);

  const closeFinanceModal = () => setFinanceModal(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(!data);
      try {
        const [dashboard, absensiData, anggotaData, keuangan, keuanganMedia] = await Promise.all([
          getDashboard(),
          getAbsensi(),
          getAnggota(),
          getKeuanganChondro(),
          getKeuanganMedia(),
        ]);
        if (cancelled) return;
        setData(dashboard);
        setAbsensi(absensiData);
        setAnggota(anggotaData);
        setTransaksi(keuangan);
        setTransaksiMedia(keuanganMedia);
        cacheSet(CACHE_KEYS.DASHBOARD, dashboard);
        cacheSet(CACHE_KEYS.ABSENSI, absensiData);
        cacheSet(CACHE_KEYS.ANGGOTA, anggotaData);
        cacheSet(CACHE_KEYS.KEUANGAN_CHONDRO, keuangan);
        cacheSet(CACHE_KEYS.KEUANGAN_MEDIA, keuanganMedia);
      } catch (e) {
        if (!cancelled && !data) toastError(e instanceof Error ? e.message : "Gagal mengambil data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastError]);

  const statusCards = data
    ? [
        { label: "Aktif", value: data.anggota.aktif, color: "#16a34a", icon: <UserCheck size={18} /> },
        { label: "Cuti", value: data.anggota.cuti, color: "#f59e0b", icon: <UserLock size={18} /> },
        { label: "Tidak Aktif", value: data.anggota.tidakAktif, color: "#dc2626", icon: <UserX size={18} /> },
      ]
    : [];

  const statusDonutData = data
    ? [
        { label: "Aktif", value: data.anggota.aktif, color: "#16a34a" },
        { label: "Cuti", value: data.anggota.cuti, color: "#f59e0b" },
        { label: "Tidak Aktif", value: data.anggota.tidakAktif, color: "#dc2626" },
      ]
    : [];

  const aktivitas = useMemo<AktivitasItem[]>(() => {
    const items: AktivitasItem[] = [];

    const sesiList = buatSesiAbsensi(absensi);
    for (const s of sesiList.slice(-3)) {
      items.push({
        id: `ab-${s.key}`,
        tanggal: s.tanggal,
        warna: "#0284c7",
        judul: `Absensi ${s.kegiatan}`,
        deskripsi: `${s.jumlahAnggota} anggota · ${s.waktu}`,
      });
    }

    const anggotaBaru = [...anggota]
      .filter((a) => a.tanggalBergabung)
      .sort((a, b) => b.tanggalBergabung.localeCompare(a.tanggalBergabung))
      .slice(0, 3);
    for (const a of anggotaBaru) {
      items.push({
        id: `ag-${a.id}`,
        tanggal: a.tanggalBergabung,
        warna: "#16a34a",
        judul: "Anggota baru ditambahkan",
        deskripsi: `${a.nama} · ${a.divisi}`,
      });
    }

    const transaksiBaru = [...transaksi, ...transaksiMedia]
      .filter((t) => t.tanggal)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .slice(0, 5);
    for (const t of transaksiBaru) {
      const masuk = t.jenis === "Pemasukan";
      items.push({
        id: `tr-${t.id}`,
        tanggal: t.tanggal,
        warna: masuk ? "#16a34a" : "#dc2626",
        judul: masuk ? "Transaksi pemasukan" : "Transaksi pengeluaran",
        deskripsi: `${t.kategori} · ${formatRupiah(t.nominal)}`,
      });
    }

    return items.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5);
  }, [absensi, anggota, transaksi, transaksiMedia]);

  const keuanganChondroSaldo = data?.keuanganChondro.saldo ?? 0;
  const keuanganMediaSaldo = data?.keuanganMedia.saldo ?? 0;
  const keuanganChondroPemasukan = data?.keuanganChondro.pemasukan ?? 0;
  const keuanganChondroPengeluaran = data?.keuanganChondro.pengeluaran ?? 0;
  const keuanganMediaPemasukan = data?.keuanganMedia.pemasukan ?? 0;
  const keuanganMediaPengeluaran = data?.keuanganMedia.pengeluaran ?? 0;

  return (
    <div className="page-grid">
      {/* Summary Cards */}
      <div className="dash-summary-grid">
        {loading || !data ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              label="Total Anggota"
              value={data.anggota.total.toLocaleString("id-ID")}
              sub="Seluruh anggota"
              icon={<Users size={20} />}
              iconClass="summary-card-icon-primary"
            />
            <SummaryCard
              label="Kehadiran"
              value={`${data.absensi.persentase}%`}
              sub="Periode berjalan"
              icon={<ClipboardCheck size={20} />}
              iconClass="summary-card-icon-green"
            />
            <SummaryCard
              label="Saldo MB Chondro"
              value={formatRupiah(keuanganChondroSaldo)}
              sub="Kas utama organisasi"
              icon={<Wallet size={20} />}
              iconClass="summary-card-icon-primary"
            />
            <SummaryCard
              label="Saldo Media"
              value={formatRupiah(keuanganMediaSaldo)}
              sub="Kas media organisasi"
              icon={<WalletCards size={20} />}
              iconClass="summary-card-icon-blue"
            />
          </>
        )}
      </div>

      {/* Status Anggota + Rekap Keuangan */}
      <div className="dash-main-grid">
        {/* Status Anggota */}
        <div className="card card-accent card-accent-green animate-fade-slide-up stagger-2">
          <div className="card-header">
            <div>
              <h2>Status Anggota</h2>
              <p>Distribusi status keanggotaan</p>
            </div>
          </div>
          {loading || !data ? (
            <div className="status-section-skeleton">
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ width: 180, height: 180 }}>
                  <Skeleton width={180} height={180} borderRadius={9999} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Skeleton height={18} width="60%" />
                  <Skeleton height={12} width="80%" style={{ marginTop: 16 }} />
                  <Skeleton height={12} width="80%" style={{ marginTop: 10 }} />
                  <Skeleton height={12} width="80%" style={{ marginTop: 10 }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="status-section-content">
              <div className="status-donut-wrapper">
                <DonutChart 
                  data={statusDonutData} 
                  size={180}
                  showLegend={true}
                  legendPosition="right"
                />
              </div>
              <div className="status-detail-list">
                {statusCards.map((s) => (
                  <div key={s.label} className="status-detail-item" style={{ "--accent-color": s.color } as React.CSSProperties}>
                    <div className="status-detail-icon" style={{ background: `${s.color}15`, color: s.color }}>
                      {s.icon}
                    </div>
                    <div className="status-detail-content">
                      <div className="status-detail-label">{s.label}</div>
                      <div className="status-detail-value">{s.value.toLocaleString("id-ID")} anggota</div>
                    </div>
                    <div className="status-detail-pct" style={{ background: s.color }}>
                      {data.anggota.total > 0 ? Math.round((s.value / data.anggota.total) * 100) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rekap Keuangan */}
        <div className="card card-accent card-accent-blue animate-fade-slide-up stagger-3">
          <div className="card-header">
            <div>
              <h2>Rekap Keuangan</h2>
              <p>Ringkasan keuangan organisasi</p>
            </div>
          </div>
          {loading || !data ? (
            <div className="rekap-keuangan-skeleton">
              <Skeleton height={20} width="40%" />
              <Skeleton height={20} />
              <Skeleton height={20} />
              <Skeleton height={1} />
              <Skeleton height={24} />
              <Skeleton height={20} />
              <Skeleton height={20} />
              <Skeleton height={1} />
              <Skeleton height={28} />
            </div>
          ) : (
            <div className="rekap-keuangan-grid">
              <div
                className="rekap-keuangan-card chondro"
                onClick={() => setFinanceModal({ type: "chondro" })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setFinanceModal({ type: "chondro" })}
              >
                <div className="rekap-keuangan-title chondro">
                  <h3>KEUANGAN MB CHONDRO</h3>
                </div>
                <div className="rekap-keuangan-row">
                  <span className="label">Pemasukan</span>
                  <span className="value">{formatRupiah(keuanganChondroPemasukan)}</span>
                </div>
                <div className="rekap-keuangan-row">
                  <span className="label">Pengeluaran</span>
                  <span className="value">{formatRupiah(keuanganChondroPengeluaran)}</span>
                </div>
                <div className="rekap-keuangan-divider" />
                <div className="rekap-keuangan-row rekap-keuangan-total chondro">
                  <span className="label">Saldo</span>
                  <span className="value">{formatRupiah(keuanganChondroSaldo)}</span>
                </div>
                <div className="rekap-keuangan-hint">
                  <ExternalLink size={12} />
                  Lihat detail
                </div>
              </div>

              <div
                className="rekap-keuangan-card media"
                onClick={() => setFinanceModal({ type: "media" })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setFinanceModal({ type: "media" })}
              >
                <div className="rekap-keuangan-title media">
                  <h3>KEUANGAN MEDIA</h3>
                </div>
                <div className="rekap-keuangan-row">
                  <span className="label">Pemasukan</span>
                  <span className="value">{formatRupiah(keuanganMediaPemasukan)}</span>
                </div>
                <div className="rekap-keuangan-row">
                  <span className="label">Pengeluaran</span>
                  <span className="value">{formatRupiah(keuanganMediaPengeluaran)}</span>
                </div>
                <div className="rekap-keuangan-divider" />
                <div className="rekap-keuangan-row rekap-keuangan-total media">
                  <span className="label">Saldo</span>
                  <span className="value">{formatRupiah(keuanganMediaSaldo)}</span>
                </div>
                <div className="rekap-keuangan-hint">
                  <ExternalLink size={12} />
                  Lihat detail
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Aktivitas Terbaru */}
      <div className="card card-accent animate-fade-slide-up stagger-4">
        <div className="card-header">
          <div>
            <h2>Aktivitas Terbaru</h2>
            <p>Kegiatan terkini organisasi</p>
          </div>
        </div>
        {loading ? (
          <div className="aktivitas-list">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : aktivitas.length === 0 ? (
          <div className="aktivitas-empty">
            <Activity size={32} style={{ color: "#98a1b0", marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: "#98a1b0", margin: 0 }}>Belum ada aktivitas terbaru</p>
            <p style={{ fontSize: 11, color: "#98a1b0", marginTop: 4 }}>Aktivitas terbaru organisasi akan muncul di sini</p>
          </div>
        ) : (
          <div className="aktivitas-list">
            {aktivitas.map((a) => (
              <div key={a.id} className="aktivitas-item">
                <span className="aktivitas-dot" style={{ background: a.warna }} />
                <div className="aktivitas-body">
                  <div className="aktivitas-title">{a.judul}</div>
                  <div className="aktivitas-desc">{a.deskripsi}</div>
                </div>
                <span className="aktivitas-date">{formatTanggalPendek(a.tanggal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Finance Detail Modal */}
      {financeModal && (
        <div className="modal-overlay" onClick={closeFinanceModal} role="dialog" aria-modal="true" aria-labelledby="finance-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="finance-modal-title">
                {financeModal.type === "chondro" ? "Detail Keuangan MB Chondro" : "Detail Keuangan Media"}
              </h3>
              <button className="modal-close" onClick={closeFinanceModal} aria-label="Tutup">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-detail-grid">
                <div className="modal-detail-item">
                  <div className="modal-detail-label">Pemasukan</div>
                  <div className={`modal-detail-value ${financeModal.type === "chondro" ? "positive" : "positive"}`}>
                    {formatRupiah(financeModal.type === "chondro" ? keuanganChondroPemasukan : keuanganMediaPemasukan)}
                  </div>
                </div>
                <div className="modal-detail-item">
                  <div className="modal-detail-label">Pengeluaran</div>
                  <div className={`modal-detail-value ${financeModal.type === "chondro" ? "negative" : "negative"}`}>
                    {formatRupiah(financeModal.type === "chondro" ? keuanganChondroPengeluaran : keuanganMediaPengeluaran)}
                  </div>
                </div>
                <div className="modal-detail-item full">
                  <div className="modal-detail-label">Saldo Saat Ini</div>
                  <div className={`modal-detail-value ${financeModal.type === "chondro" ? "primary" : "blue"}`}>
                    {formatRupiah(financeModal.type === "chondro" ? keuanganChondroSaldo : keuanganMediaSaldo)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeFinanceModal}>Tutup</button>
              <Link to={financeModal.type === "chondro" ? "/keuangan" : "/keuangan-media"} className="btn btn-primary">
                Kelola Transaksi
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}