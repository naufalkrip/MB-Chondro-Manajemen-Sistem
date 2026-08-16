// ============================================================
// KONFIGURASI GLOBAL MB CHONDRO
// ============================================================
// Isi API_URL dengan URL Web App deployment dari Google Apps Script
// yang diakhiri dengan "/exec".
//
// Contoh:
// export const API_URL = "https://script.google.com/macros/s/XXXXX/exec";
//
// Lihat README.md untuk langkah-langkah deploy.
// ============================================================

export const API_URL = "https://script.google.com/macros/s/AKfycbwbuiwe6h_a5vpU_HaNxaUoGXgb3e6v67CH-bV98mSlxhdynUXcQgNWz1hWEz6XVBbw/exec";

// Nama sheet pada Google Spreadsheet (harus sama dengan Code.gs)
export const SHEETS = {
  ANGGOTA: "ANGGOTA",
  ABSENSI: "ABSENSI",
  KEUANGAN_CHONDRO: "KEUANGAN_CHONDRO",
  KEUANGAN_MEDIA: "KEUANGAN_MEDIA",
} as const;

// Status anggota yang valid
export const STATUS_ANGGOTA = ["Aktif", "Cuti", "Tidak Aktif"] as const;

// Status kehadiran yang valid
export const STATUS_KEHADIRAN = ["Hadir", "Izin", "Sakit", "Cuti", "Alpa"] as const;

// Waktu/sesi absensi yang valid
export const WAKTU_ABSENSI = ["Pagi", "Siang", "Malam"] as const;

// Jenis transaksi yang valid
export const JENIS_TRANSAKSI = ["Pemasukan", "Pengeluaran"] as const;

// Opsi divisi (kategori fleksibel, diambil dari data; daftar ini hanya referensi)
export const DIVISI = ["Musik", "Media", "Perlengkapan", "Kesehatan", "Sekretariat", "Lainnya"] as const;

export type StatusAnggota = (typeof STATUS_ANGGOTA)[number];
export type StatusKehadiran = (typeof STATUS_KEHADIRAN)[number];
export type JenisTransaksi = (typeof JENIS_TRANSAKSI)[number];
export type WaktuAbsensi = (typeof WAKTU_ABSENSI)[number];