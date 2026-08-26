import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { Loading } from "./Loading";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "Belum ada data yang tersimpan.",
  emptyTitle = "Tidak ada data",
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="table-wrapper">
      {loading ? (
        <Loading label="Memuat data..." />
      ) : data.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={rowKey(row)} onClick={() => onRowClick?.(row)} className={onRowClick ? "clickable" : ""}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}