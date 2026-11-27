// Skeleton shown while any page loads its data.
export default function Loading() {
  return (
    <div className="skeleton" role="status" aria-label="Memuat data">
      <div className="sk sk-title" />
      <div className="sk sk-line" />
      <div className="kpis">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="kpi"><div className="sk sk-line short" /><div className="sk sk-num" /></div>)}
      </div>
      <div className="card"><div className="sk sk-line short" /><div className="sk sk-chart" /></div>
      <div className="card">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk sk-row" />)}
      </div>
      <span className="loading-inline"><span className="spinner" aria-hidden />Memuat data…</span>
    </div>
  );
}
