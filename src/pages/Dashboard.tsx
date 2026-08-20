import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpCircle,
  ClipboardCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
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
  transaksiPerBulan,
} from "../utils/format";
import { Skeleton } from "../components/ui/Skeleton";
import { ChartBar, CHART_COLORS } from "../components/ui/Chart";
import { useToast } from "../contexts/ToastContext";

interface AktivitasItem {
  id: string;
  tanggal: string;
  warna: string;
  judul: string;
  deskripsi: string;
}

function SummaryCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: ReactNode }) {
  return (
    <div className="summary-card">
      <div className="summary-card-head">
        <span className="summary-card-label">{label}</span>
        <span className="summary-card-icon">{icon}</span>
      </div>
      <span className="summary-card-value">{value}</span>
      <span className="summary-card-sub">{sub}</span>
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="summary-card summary-card-skeleton">
      <div className="summary-card-head">
        <Skeleton width={110} height={14} />
        <Skeleton width={38} height={38} borderRadius={10} />
      </div>
      <Skeleton width={90} height={28} />
      <Skeleton width={130} height={12} />
    </div>
  );
}

function StatusProgress({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const persen = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="status-progress-item">
      <div className="status-progress-head">
        <strong>{label}</strong>
        <span>
          {value} · {persen}%
        </span>
      </div>
      <div className="status-progress-track">
        <div className="status-progress-fill" style={{ width: `${persen}%`, background: color }} />
      </div>
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

  const chartData = useMemo(() => transaksiPerBulan(transaksi, new Date().getFullYear()), [transaksi]);

  const statusAnggota = data
    ? [
        { label: "Aktif", value: data.anggota.aktif, color: CHART_COLORS.hijau },
        { label: "Cuti", value: data.anggota.cuti, color: CHART_COLORS.kuning },
        { label: "Tidak Aktif", value: data.anggota.tidakAktif, color: CHART_COLORS.merah },
      ]
    : [];

  const aktivitas = useMemo<AktivitasItem[]>(() => {
    const items: AktivitasItem[] = [];

    const sesiList = buatSesiAbsensi(absensi);
    for (const s of sesiList.slice(-3)) {
      items.push({
        id: `ab-${s.key}`,
        tanggal: s.tanggal,
        warna: CHART_COLORS.biru,
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
        warna: CHART_COLORS.hijau,
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
        warna: masuk ? CHART_COLORS.hijau : CHART_COLORS.merah,
        judul: masuk ? "Transaksi pemasukan" : "Transaksi pengeluaran",
        deskripsi: `${t.kategori} · ${formatRupiah(t.nominal)}`,
      });
    }

    return items.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 6);
  }, [absensi, anggota, transaksi, transaksiMedia]);

  const persenAktif = data && data.anggota.total > 0 ? Math.round((data.anggota.aktif / data.anggota.total) * 100) : 0;

  return (
    <div className="page-grid">
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
              value={String(data.anggota.total)}
              sub="Seluruh anggota"
              icon={<Users size={20} />}
            />
            <SummaryCard
              label="Anggota Aktif"
              value={String(data.anggota.aktif)}
              sub={`${persenAktif}% dari total`}
              icon={<UserCheck size={20} />}
            />
            <SummaryCard
              label="Kehadiran"
              value={`${data.absensi.persentase}%`}
              sub={`${data.absensi.total} catatan`}
              icon={<ClipboardCheck size={20} />}
            />
            <SummaryCard
              label="Saldo MB Chondro"
              value={formatRupiah(data.keuanganChondro.saldo)}
              sub="Keuangan utama"
              icon={<Wallet size={20} />}
            />
          </>
        )}
      </div>

      <div className="dash-main-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Grafik Keuangan MB Chondro</h2>
              <p>Pemasukan vs pengeluaran per bulan ({new Date().getFullYear()})</p>
            </div>
          </div>
          {loading || !data ? (
            <div className="chart-skeleton">
              <Skeleton height={200} />
            </div>
          ) : (
            <>
              <ChartBar data={chartData} height={200} />
              <div className="chart-legend-hint">
                <span><i style={{ background: CHART_COLORS.merah }} /> Pemasukan</span>
                <span><i style={{ background: "#cbd5e1" }} /> Pengeluaran</span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Status Anggota</h2>
              <p>Distribusi status keanggotaan</p>
            </div>
          </div>
          {loading || !data ? (
            <div className="status-progress-list">
              <Skeleton height={38} />
              <Skeleton height={38} />
              <Skeleton height={38} />
            </div>
          ) : (
            <div className="status-progress-list">
              {statusAnggota.map((s) => (
                <StatusProgress key={s.label} label={s.label} value={s.value} total={data.anggota.total} color={s.color} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dash-sub-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Aktivitas Terbaru</h2>
              <p>Kegiatan terkini organisasi</p>
            </div>
          </div>
          {loading ? (
            <div className="aktivitas-list">
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : aktivitas.length === 0 ? (
            <p className="text-muted-sm">Tidak ada aktivitas terbaru.</p>
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

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Keuangan Media</h2>
              <p>Kas media MB Chondro</p>
            </div>
          </div>
          {loading || !data ? (
            <div className="dash-media-list">
              <Skeleton height={20} />
              <Skeleton height={20} />
              <Skeleton height={1} />
              <Skeleton height={22} />
            </div>
          ) : (
            <div className="dash-media-list">
              <div className="dash-media-row">
                <span>Pemasukan</span>
                <strong>{formatRupiah(data.keuanganMedia.pemasukan)}</strong>
              </div>
              <div className="dash-media-row">
                <span>Pengeluaran</span>
                <strong>{formatRupiah(data.keuanganMedia.pengeluaran)}</strong>
              </div>
              <div className="dash-media-divider" />
              <div className="dash-media-row dash-media-total">
                <span>Saldo</span>
                <strong>{formatRupiah(data.keuanganMedia.saldo)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dash-quick">
        <div>
          <div className="dash-quick-title">Aksi Cepat</div>
          <p className="dash-quick-sub">Navigasi cepat ke halaman pengelolaan</p>
        </div>
        <div className="dash-quick-actions">
          <Link to="/anggota" className="btn btn-outline">
            <UserPlus size={16} /> Tambah Anggota
          </Link>
          <Link to="/absensi" className="btn btn-outline">
            <ClipboardCheck size={16} /> Input Absensi
          </Link>
          <Link to="/keuangan" className="btn btn-outline">
            <ArrowUpCircle size={16} /> Tambah Transaksi
          </Link>
        </div>
      </div>
    </div>
  );
}
