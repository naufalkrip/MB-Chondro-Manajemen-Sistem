import type { JenisTransaksi, StatusAnggota, StatusKehadiran, WaktuAbsensi } from "../config";

export interface Anggota {
  id: string;
  nama: string;
  divisi: string;
  jabatan: string;
  noHp: string;
  status: StatusAnggota;
  tanggalBergabung: string;
  keterangan: string;
}

export interface Absensi {
  id: string;
  idAnggota: string;
  nama: string;
  tanggal: string;
  kegiatan: string;
  status: StatusKehadiran;
  keterangan: string;
  waktu: WaktuAbsensi;
}

/** Satu sesi absensi = kombinasi tanggal + kegiatan + waktu yang berisi beberapa anggota */
export interface SesiAbsensi {
  key: string;
  tanggal: string;
  kegiatan: string;
  waktu: WaktuAbsensi;
  daftar: Absensi[];
  jumlahAnggota: number;
}

export interface Transaksi {
  id: string;
  tanggal: string;
  jenis: JenisTransaksi;
  kategori: string;
  keterangan: string;
  nominal: number;
  penanggungJawab: string;
}

export interface StatKehadiran {
  hadir: number;
  izin: number;
  sakit: number;
  cuti: number;
  alpa: number;
  total: number;
  persentase: number;
}

export interface RekapAbsensi {
  idAnggota: string;
  nama: string;
  hadir: number;
  izin: number;
  sakit: number;
  cuti: number;
  alpa: number;
  total: number;
  persentase: number;
}

export interface DashboardData {
  anggota: {
    total: number;
    aktif: number;
    cuti: number;
    tidakAktif: number;
  };
  absensi: {
    hadir: number;
    izin: number;
    sakit: number;
    cuti: number;
    alpa: number;
    total: number;
    persentase: number;
  };
  keuanganChondro: {
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
  };
  keuanganMedia: {
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
  };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;