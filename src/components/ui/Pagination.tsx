import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages: (number | "…")[] = [];
  const push = (p: number) => {
    if (pages[pages.length - 1] !== p) pages.push(p);
  };
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) push(i);
  }
  const withEllipsis: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (typeof p === "number" && prev + 1 < p) withEllipsis.push("…");
    withEllipsis.push(p);
    if (typeof p === "number") prev = p;
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        Menampilkan {start}–{end} dari {totalItems}
      </span>
      <div className="pagination-controls">
        <button
          className="btn btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>
        {withEllipsis.map((p, idx) =>
          p === "…" ? (
            <span key={`e-${idx}`} className="pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? "btn-primary" : "btn-ghost"}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-ghost btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}