// ============================================================
// CACHE LOKAL — agar halaman langsung menampilkan data
// tanpa menunggu respons API Google Apps Script yang lambat.
// ============================================================

const CACHE_PREFIX = "mbc-cache:";
const TTL = 30 * 60 * 1000;

export const CACHE_KEYS = {
  ANGGOTA: "anggota",
  ABSENSI: "absensi",
  KEUANGAN_CHONDRO: "keuangan-chondro",
  KEUANGAN_MEDIA: "keuangan-media",
  DASHBOARD: "dashboard",
} as const;

interface CacheEntry {
  t: number;
  v: unknown;
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.t !== "number" || !("v" in parsed)) return null;
    if (Date.now() - parsed.t > TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.v as T;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // Abaikan error (mis. storage penuh / mode pribadi).
  }
}

export function cacheClear(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // abaikan
  }
}