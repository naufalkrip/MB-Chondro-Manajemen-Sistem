import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Percent,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import { getAbsensi, getDashboard, getKeuanganChondro } from "../services/api";
import { CACHE_KEYS, cacheGet, cacheSet } from "../services/cache";
import type { DashboardData } from "../types";
import { formatRupiah, transaksiPerBulan } from "../utils/format";
import { StatCard } from "../components/ui/StatCard";
import { Skeleton, StatCardSkeleton } from "../components/ui/Skeleton";
import { ChartBar, CHART_COLORS, DonutChart, DonutLegend } from "../components/ui/Chart";
import { useToast } from "../contexts/ToastContext";
import type { Transaksi } from "../types";

export function Dashboard() {
  const { error: toastError } = useToast();
  const [data, setData] = useState<DashboardData | null>(() => cacheGet<DashboardData>(CACHE_KEYS.DASHBOARD));
  const [transaksi, setTransaksi] = useState<Transaksi[]>(() => cacheGet<Transaksi[]>(CACHE_KEYS.KEUANGAN_CHONDRO) ?? []);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(!data);
      try {
        const [dashboard, absensi, keuangan] = await Promise.all([
          getDashboard(),
          getAbsensi(),
          getKeuanganChondro(),
        ]);
        if (cancelled) return;
        setData(dashboard);
        setTransaksi(keuangan);
        cacheSet(CACHE_KEYS.DASHBOARD, dashboard);
        cacheSet(CACHE_KEYS.KEUANGAN_CHONDRO, keuangan);
        void absensi;
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
  }, [toastError]);

  const chartData = useMemo(() => {
    const tahun = new Date().getFullYear();
    return transaksiPerBulan(transaksi, tahun);
  }, [transaksi]);

  const absensiDonut = [
    { label: "Hadir", value: data?.absensi.hadir ?? 0, color: CHART_COLORS.hijau },
    { label: "Izin", value: data?.absensi.izin ?? 0, color: CHART_COLORS.biru },
    { label: "Sakit", value: data?.absensi.sakit ?? 0, color: CHART_COLORS.kuning },
    { label: "Cuti", value: data?.absensi.cuti ?? 0, color: CHART_COLORS.ungu },
    { label: "Alpa", value: data?.absensi.alpa ?? 0, color: CHART_COLORS.merah },
  ];

  const statusDonut = [
    { label: "Aktif", value: data?.anggota.aktif ?? 0, color: CHART_COLORS.hijau },
    { label: "Cuti", value: data?.anggota.cuti ?? 0, color: CHART_COLORS.kuning },
    { label: "Tidak Aktif", value: data?.anggota.tidakAktif ?? 0, color: CHART_COLORS.merah },
  ];

  const chartSkeleton = (
    <div className="chart-skeleton">
      <Skeleton height={200} />
    </div>
  );

  return (
    <div className="page-grid">
      <div className="stat-grid">
        {loading || !data ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Anggota" value={String(data.anggota.total)} icon={<Users size={20} />} accent="red" sub="Seluruh anggota" />
            <StatCard label="Anggota Aktif" value={String(data.anggota.aktif)} icon={<UserCheck size={20} />} accent="green" />
            <StatCard label="Anggota Cuti" value={String(data.anggota.cuti)} icon={<Clock3 size={20} />} accent="amber" />
            <StatCard label="Anggota Tidak Aktif" value={String(data.anggota.tidakAktif)} icon={<UserX size={20} />} accent="slate" />
            <StatCard label="Persentase Kehadiran" value={`${data.absensi.persentase}%`} icon={<Percent size={20} />} accent="blue" sub={`${data.absensi.total} catatan absensi`} />
            <StatCard label="Pemasukan MB Chondro" value={formatRupiah(data.keuanganChondro.pemasukan)} icon={<TrendingUp size={20} />} accent="green" />
            <StatCard label="Pengeluaran MB Chondro" value={formatRupiah(data.keuanganChondro.pengeluaran)} icon={<TrendingDown size={20} />} accent="red" />
            <StatCard label="Saldo MB Chondro" value={formatRupiah(data.keuanganChondro.saldo)} icon={<Wallet size={20} />} accent="amber" />
            <StatCard label="Pemasukan Media" value={formatRupiah(data.keuanganMedia.pemasukan)} icon={<TrendingUp size={20} />} accent="green" />
            <StatCard label="Pengeluaran Media" value={formatRupiah(data.keuanganMedia.pengeluaran)} icon={<TrendingDown size={20} />} accent="red" />
            <StatCard label="Saldo Media" value={formatRupiah(data.keuanganMedia.saldo)} icon={<WalletCards size={20} />} accent="blue" />
          </>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Grafik Keuangan MB Chondro</h2>
              <p>Pemasukan vs pengeluaran per bulan ({new Date().getFullYear()})</p>
            </div>
          </div>
          {loading || !data ? chartSkeleton : (
            <>
              <ChartBar data={chartData} />
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
          {loading || !data ? chartSkeleton : (
            <div className="donut-layout">
              <DonutChart data={statusDonut} />
              <DonutLegend data={statusDonut} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Statistik Kehadiran</h2>
              <p>Rekap status kehadiran</p>
            </div>
          </div>
          {loading || !data ? chartSkeleton : (
            <div className="donut-layout">
              <DonutChart data={absensiDonut} />
              <DonutLegend data={absensiDonut} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Ringkasan Keuangan</h2>
              <p>Saldo kedua kas organisasi</p>
            </div>
          </div>
          {loading || !data ? (
            <div className="summary-list">
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={1} />
              <Skeleton height={22} />
            </div>
          ) : (
            <div className="summary-list">
              <div className="summary-row">
                <span className="summary-label">Saldo MB Chondro</span>
                <span className="summary-value">{formatRupiah(data.keuanganChondro.saldo)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Saldo Media</span>
                <span className="summary-value">{formatRupiah(data.keuanganMedia.saldo)}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row">
                <span className="summary-label">Total Saldo</span>
                <span className="summary-value strong">
                  {formatRupiah(data.keuanganChondro.saldo + data.keuanganMedia.saldo)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}