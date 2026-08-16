import { API_URL } from "../config";
import type {
  Absensi,
  Anggota,
  ApiResult,
  DashboardData,
  Transaksi,
} from "../types";
import { normAbsensi, normAnggota, normTransaksi } from "../utils/format";

// ============================================================
// SERVICE LAYER — semua komunikasi ke Google Apps Script
// ============================================================
// Semua request melewati fungsi `request` di bawah ini.
// POST menggunakan Content-Type "text/plain" agar tidak memicu
// preflight (OPTIONS) yang tidak didukung Apps Script Web App.
// ============================================================

export const API_CONFIGURED =
  API_URL.includes("REPLACE_WITH_YOUR_DEPLOYMENT_ID");

interface ApiResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

const VALID_ACTIONS = new Set([
  "getDashboard",
  "getAnggota",
  "addAnggota",
  "updateAnggota",
  "deleteAnggota",
  "getAbsensi",
  "addAbsensi",
  "updateAbsensi",
  "deleteAbsensi",
  "saveAbsensiBatch",
  "updateAbsensiBatch",
  "deleteAbsensiBatch",
  "getKeuanganChondro",
  "addKeuanganChondro",
  "updateKeuanganChondro",
  "deleteKeuanganChondro",
  "getKeuanganMedia",
  "addKeuanganMedia",
  "updateKeuanganMedia",
  "deleteKeuanganMedia",
]);

type ActionName = (typeof VALID_ACTIONS extends Set<infer T> ? T : never) & string;

async function request<T>(action: ActionName, data?: Record<string, unknown>): Promise<T> {
  if (API_CONFIGURED) {
    throw new Error("API_URL belum dikonfigurasi. Baca README.md untuk langkah deploy.");
  }

  const body = JSON.stringify({ action, data: data ?? {} });
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });
  } catch {
    throw new Error("Gagal menghubungi server.");
  }

  const text = await response.text();
  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Respons server tidak valid.");
  }

  if (!parsed || parsed.success !== true) {
    throw new Error(parsed?.message || parsed?.error || "Terjadi kesalahan pada server.");
  }
  return parsed.data as T;
}

// ---------------- ANGGOTA ----------------

export async function getAnggota(): Promise<Anggota[]> {
  const raw = await request<unknown[]>("getAnggota");
  return (raw ?? []).map((item) => normAnggota(item as Record<string, unknown>));
}

export async function addAnggota(data: Omit<Anggota, "id">): Promise<ApiResult<Anggota>> {
  try {
    const result = await request<Record<string, unknown>>("addAnggota", {
      nama: data.nama,
      divisi: data.divisi,
      jabatan: data.jabatan,
      noHp: data.noHp,
      status: data.status,
      tanggalBergabung: data.tanggalBergabung,
      keterangan: data.keterangan,
    });
    return { success: true, data: normAnggota(result), message: String(result?.message ?? "") };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

export async function updateAnggota(id: string, data: Omit<Anggota, "id">): Promise<ApiResult<Anggota>> {
  try {
    const result = await request<unknown>("updateAnggota", {
      id,
      nama: data.nama,
      divisi: data.divisi,
      jabatan: data.jabatan,
      noHp: data.noHp,
      status: data.status,
      tanggalBergabung: data.tanggalBergabung,
      keterangan: data.keterangan,
    });
    return { success: true, data: normAnggota(result as Record<string, unknown>) };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

export async function deleteAnggota(id: string): Promise<ApiResult<null>> {
  try {
    await request<unknown>("deleteAnggota", { id });
    return { success: true, data: null };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menghapus data." };
  }
}

// ---------------- ABSENSI ----------------

export async function getAbsensi(): Promise<Absensi[]> {
  const raw = await request<unknown[]>("getAbsensi");
  return (raw ?? []).map((item) => normAbsensi(item as Record<string, unknown>));
}

export async function addAbsensi(data: Omit<Absensi, "id" | "nama">): Promise<ApiResult<Absensi>> {
  try {
    const result = await request<unknown>("addAbsensi", {
      idAnggota: data.idAnggota,
      tanggal: data.tanggal,
      kegiatan: data.kegiatan,
      status: data.status,
      keterangan: data.keterangan,
      waktu: data.waktu,
    });
    return { success: true, data: normAbsensi(result as Record<string, unknown>) };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

export async function updateAbsensi(id: string, data: Omit<Absensi, "id" | "nama">): Promise<ApiResult<Absensi>> {
  try {
    const result = await request<unknown>("updateAbsensi", {
      id,
      idAnggota: data.idAnggota,
      tanggal: data.tanggal,
      kegiatan: data.kegiatan,
      status: data.status,
      keterangan: data.keterangan,
      waktu: data.waktu,
    });
    return { success: true, data: normAbsensi(result as Record<string, unknown>) };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

export async function deleteAbsensi(id: string): Promise<ApiResult<null>> {
  try {
    await request<unknown>("deleteAbsensi", { id });
    return { success: true, data: null };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menghapus data." };
  }
}

// ---------- Absensi BATCH (satu request untuk banyak baris → cepat/realtime) ----------

export async function saveAbsensiBatch(
  items: Omit<Absensi, "id" | "nama">[]
): Promise<ApiResult<Absensi[]>> {
  try {
    const result = await request<unknown[]>("saveAbsensiBatch", {
      items: items.map((d) => ({
        idAnggota: d.idAnggota,
        tanggal: d.tanggal,
        kegiatan: d.kegiatan,
        status: d.status,
        keterangan: d.keterangan,
        waktu: d.waktu,
      })),
    });
    return {
      success: true,
      data: (result ?? []).map((r) => normAbsensi(r as Record<string, unknown>)),
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

export async function updateAbsensiBatch(
  items: Omit<Absensi, "nama">[]
): Promise<ApiResult<Absensi[]>> {
  try {
    const result = await request<unknown[]>("updateAbsensiBatch", {
      items: items.map((d) => ({
        id: d.id,
        idAnggota: d.idAnggota,
        tanggal: d.tanggal,
        kegiatan: d.kegiatan,
        status: d.status,
        keterangan: d.keterangan,
        waktu: d.waktu,
      })),
    });
    return {
      success: true,
      data: (result ?? []).map((r) => normAbsensi(r as Record<string, unknown>)),
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

export async function deleteAbsensiBatch(ids: string[]): Promise<ApiResult<null>> {
  try {
    await request<unknown>("deleteAbsensiBatch", { ids });
    return { success: true, data: null };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menghapus data." };
  }
}

// ---------------- KEUANGAN ----------------

type KeuanganSheet = "KEUANGAN_CHONDRO" | "KEUANGAN_MEDIA";

async function getKeuangan(sheet: KeuanganSheet): Promise<Transaksi[]> {
  const action = sheet === "KEUANGAN_CHONDRO" ? "getKeuanganChondro" : "getKeuanganMedia";
  const raw = await request<unknown[]>(action);
  return (raw ?? []).map((item) => normTransaksi(item as Record<string, unknown>));
}

async function addKeuangan(sheet: KeuanganSheet, data: Omit<Transaksi, "id">): Promise<ApiResult<Transaksi>> {
  try {
    const action = (sheet === "KEUANGAN_CHONDRO" ? "addKeuanganChondro" : "addKeuanganMedia") as ActionName;
    const result = await request<unknown>(action, {
      tanggal: data.tanggal,
      jenis: data.jenis,
      kategori: data.kategori,
      keterangan: data.keterangan,
      nominal: data.nominal,
      penanggungJawab: data.penanggungJawab,
    });
    return { success: true, data: normTransaksi(result as Record<string, unknown>) };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

async function updateKeuangan(sheet: KeuanganSheet, id: string, data: Omit<Transaksi, "id">): Promise<ApiResult<Transaksi>> {
  try {
    const action = (sheet === "KEUANGAN_CHONDRO" ? "updateKeuanganChondro" : "updateKeuanganMedia") as ActionName;
    const result = await request<unknown>(action, {
      id,
      tanggal: data.tanggal,
      jenis: data.jenis,
      kategori: data.kategori,
      keterangan: data.keterangan,
      nominal: data.nominal,
      penanggungJawab: data.penanggungJawab,
    });
    return { success: true, data: normTransaksi(result as Record<string, unknown>) };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menyimpan data." };
  }
}

async function deleteKeuangan(sheet: KeuanganSheet, id: string): Promise<ApiResult<null>> {
  try {
    const action = (sheet === "KEUANGAN_CHONDRO" ? "deleteKeuanganChondro" : "deleteKeuanganMedia") as ActionName;
    await request<unknown>(action, { id });
    return { success: true, data: null };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal menghapus data." };
  }
}

export const getKeuanganChondro = () => getKeuangan("KEUANGAN_CHONDRO");
export const addKeuanganChondro = (data: Omit<Transaksi, "id">) => addKeuangan("KEUANGAN_CHONDRO", data);
export const updateKeuanganChondro = (id: string, data: Omit<Transaksi, "id">) => updateKeuangan("KEUANGAN_CHONDRO", id, data);
export const deleteKeuanganChondro = (id: string) => deleteKeuangan("KEUANGAN_CHONDRO", id);

export const getKeuanganMedia = () => getKeuangan("KEUANGAN_MEDIA");
export const addKeuanganMedia = (data: Omit<Transaksi, "id">) => addKeuangan("KEUANGAN_MEDIA", data);
export const updateKeuanganMedia = (id: string, data: Omit<Transaksi, "id">) => updateKeuangan("KEUANGAN_MEDIA", id, data);
export const deleteKeuanganMedia = (id: string) => deleteKeuangan("KEUANGAN_MEDIA", id);

// ---------------- DASHBOARD ----------------

export async function getDashboard(): Promise<DashboardData> {
  const raw = await request<Record<string, unknown>>("getDashboard");
  return {
    anggota: (raw?.anggota ?? {}) as DashboardData["anggota"],
    absensi: (raw?.absensi ?? {}) as DashboardData["absensi"],
    keuanganChondro: (raw?.keuanganChondro ?? {}) as DashboardData["keuanganChondro"],
    keuanganMedia: (raw?.keuanganMedia ?? {}) as DashboardData["keuanganMedia"],
  };
}