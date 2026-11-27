"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";

/** Year range picker that writes ?dari=&sampai= to the URL and shows a loading state while the page reloads. */
export default function YearRangeFilter({ from, to, minYear, maxYear, defaultFrom }: {
  from: number; to: number; minYear: number; maxYear: number; defaultFrom: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  useEffect(() => {
    document.body.toggleAttribute("data-loading", pending);
    return () => document.body.removeAttribute("data-loading");
  }, [pending]);

  const go = (f: number, t: number) => {
    const q = new URLSearchParams(params.toString());
    if (f > t) [f, t] = [t, f];
    if (f === defaultFrom && t === maxYear) { q.delete("dari"); q.delete("sampai"); }
    else { q.set("dari", String(f)); q.set("sampai", String(t)); }
    const s = q.toString();
    start(() => router.push(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }));
  };

  const presets = [
    { label: "3 tahun", f: maxYear - 2, t: maxYear },
    { label: "5 tahun", f: defaultFrom, t: maxYear },
    { label: "Semua", f: minYear, t: maxYear },
  ];

  return (
    <div className="range" role="group" aria-label="Filter rentang tahun">
      <label>
        <span>Dari</span>
        <select value={from} onChange={(e) => go(Number(e.target.value), to)} disabled={pending}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label>
        <span>Sampai</span>
        <select value={to} onChange={(e) => go(from, Number(e.target.value))} disabled={pending}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <div className="presets">
        {presets.map((p) => (
          <button key={p.label} type="button" className={`chip ${p.f === from && p.t === to ? "on" : ""}`}
            onClick={() => go(p.f, p.t)} disabled={pending} aria-pressed={p.f === from && p.t === to}>
            {p.label}
          </button>
        ))}
      </div>
      {pending && <span className="loading-inline" role="status"><span className="spinner" aria-hidden />Memuat…</span>}
    </div>
  );
}
