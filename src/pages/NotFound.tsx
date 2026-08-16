import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="empty-state">
      <h4>404 — Halaman tidak ditemukan</h4>
      <p>Halaman yang Anda cari tidak tersedia.</p>
      <Link to="/" className="btn btn-primary">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}