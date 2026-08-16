import type { StatusAnggota, StatusKehadiran } from "../../config";

type StatusValue = StatusAnggota | StatusKehadiran | string;

const STATUS_VARIANTS: Record<string, { label: string; className: string }> = {
  Aktif: { label: "Aktif", className: "badge-success" },
  Cuti: { label: "Cuti", className: "badge-warning" },
  "Tidak Aktif": { label: "Tidak Aktif", className: "badge-danger" },
  Hadir: { label: "Hadir", className: "badge-success" },
  Izin: { label: "Izin", className: "badge-info" },
  Sakit: { label: "Sakit", className: "badge-warning" },
  Alpa: { label: "Alpa", className: "badge-danger" },
  Pemasukan: { label: "Pemasukan", className: "badge-success" },
  Pengeluaran: { label: "Pengeluaran", className: "badge-danger" },
};

export function StatusBadge({ value }: { value: StatusValue }) {
  const variant = STATUS_VARIANTS[value] ?? { label: value, className: "badge-neutral" };
  return <span className={`badge ${variant.className}`}>{variant.label}</span>;
}