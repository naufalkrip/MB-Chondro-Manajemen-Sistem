export function Loading({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="loading-wrapper" role="status">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function LoadingPage({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="loading-page">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}