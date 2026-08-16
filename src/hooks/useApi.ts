import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { cacheGet, cacheSet } from "../services/cache";

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook bantu untuk mengambil data dari API.
 * Bila `cacheKey` diberikan, data dari cache lokal langsung ditampilkan
 * saat halaman dibuka (tanpa layar memuat), lalu di-refresh di latar belakang.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  errorMessage = "Gagal mengambil data.",
  cacheKey?: string
): UseApiResult<T> {
  const cached = useMemo(() => (cacheKey ? cacheGet<T>(cacheKey) : null), [cacheKey]);
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const { error: toastError } = useToast();

  const dataRef = useRef<T | null>(cached);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    setLoading(dataRef.current === null);
    setError(null);
    try {
      const result = await fetcher();
      dataRef.current = result;
      setData(result);
      if (cacheKey) cacheSet(cacheKey, result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : errorMessage;
      if (dataRef.current === null) {
        setError(msg);
        toastError(msg);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

/** Hook untuk state pagination sederhana */
export function usePagination(totalItems: number, pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  return { page, setPage, totalPages, start, end, pageSize };
}