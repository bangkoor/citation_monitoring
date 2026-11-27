"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { LecturerRow } from "@/lib/queries.ts";

const nf = new Intl.NumberFormat("id-ID");
const f = (v: number | null | undefined) => (v === null || v === undefined ? "–" : nf.format(v));

type Key = "name" | "division_code" | "documents" | "citations" | "h_index" | "growth" | "q1" | `y${number}`;

export default function LecturerTable({
  rows, years, divisions, showDivisionFilter = true,
}: {
  rows: LecturerRow[];
  years: number[];
  divisions: { code: string; name: string }[];
  showDivisionFilter?: boolean;
}) {
  const [q, setQ] = useState("");
  const [div, setDiv] = useState("");
  const [status, setStatus] = useState("aktif");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "citations", dir: -1 });

  const growth = (r: LecturerRow) =>
    r.citations !== null && r.citations_prev !== null ? r.citations - r.citations_prev : null;

  const value = (r: LecturerRow, k: Key): string | number | null => {
    if (k === "growth") return growth(r);
    if (k.startsWith("y")) return r.by_year[k.slice(1)] ?? 0;
    return (r as any)[k];
  };

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter((r) => (!qq || r.name.toLowerCase().includes(qq)) && (!div || r.division_code === div) &&
        (status === "semua" || (status === "aktif" ? r.active : !r.active)))
      .sort((a, b) => {
        const va = value(a, sort.key), vb = value(b, sort.key);
        if (va === vb) return a.name.localeCompare(b.name);
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va < vb ? -1 : 1) * sort.dir;
      });
  }, [rows, q, div, status, sort]);

  const th = (k: Key, label: string, num = true) => (
    <th className={`sortable ${num ? "n" : ""}`} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : num ? -1 : 1 }))}>
      {label}{sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <>
      <div className="filters">
        <input type="search" placeholder="Cari nama dosen…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama dosen" />
        {showDivisionFilter && (
          <select value={div} onChange={(e) => setDiv(e.target.value)} aria-label="Filter divisi">
            <option value="">Semua divisi</option>
            {divisions.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        )}
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value="aktif">Dosen aktif</option>
          <option value="nonaktif">Pensiun / tidak aktif</option>
          <option value="semua">Semua</option>
        </select>
        <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>{shown.length} dosen</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {th("name", "Nama", false)}
              {showDivisionFilter && th("division_code", "Divisi", false)}
              {th("documents", "Dokumen")}
              {th("citations", "Sitasi")}
              {th("growth", "Δ Sitasi")}
              {th("h_index", "h-index")}
              {th("q1", "Q1")}
              {years.map((y) => th(`y${y}`, String(y)))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const g = growth(r);
              return (
                <tr key={r.id} className={r.active ? "" : "inactive"}>
                  <td>
                    <Link href={`/dosen/${r.id}`}>{r.name}</Link>
                    {!r.active && <span className="pill" style={{ marginLeft: 6 }}>tidak aktif</span>}
                    {!r.scopus_id && <span className="pill" style={{ marginLeft: 6 }}>tanpa Scopus ID</span>}
                  </td>
                  {showDivisionFilter && <td>{r.division_code ?? "–"}</td>}
                  <td className="n">{f(r.documents)}</td>
                  <td className="n">{f(r.citations)}</td>
                  <td className="n">{g === null ? "–" : g > 0 ? <span className="up">+{nf.format(g)}</span> : nf.format(g)}</td>
                  <td className="n">{f(r.h_index)}</td>
                  <td className="n">{f(r.q1)}</td>
                  {years.map((y) => <td key={y} className="n">{f(r.by_year[y] ?? 0)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Δ Sitasi = pertambahan sitasi sejak pembaruan data sebelumnya. Kolom tahun = jumlah publikasi terindeks Scopus pada tahun tersebut.
      </p>
    </>
  );
}
