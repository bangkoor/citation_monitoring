import Link from "next/link";
import type { DivisionSummary } from "@/lib/queries.ts";
import { colorFor } from "@/lib/colors.ts";
import { fmt, fmt1 } from "@/lib/format.ts";

/** Recap per division: publications per year, average per active lecturer, Q1, top tier, citations. */
export default function DivisionTable({ rows, years, avgYears }: { rows: DivisionSummary[]; years: number[]; avgYears: number[] }) {
  const sum = (f: (r: DivisionSummary) => number) => rows.reduce((a, r) => a + f(r), 0);
  const avg = (r: DivisionSummary) =>
    r.lecturers_active ? avgYears.reduce((a, y) => a + (r.by_year[y]?.publications ?? 0), 0) / avgYears.length / r.lecturers_active : 0;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Divisi</th>
            <th className="n">Dosen aktif</th>
            {years.map((y) => <th key={y} className="n">{y}</th>)}
            <th className="n" title={`Rata-rata publikasi per dosen aktif per tahun, ${avgYears[0]}–${avgYears.at(-1)}`}>
              Rata-rata/dosen<br />{avgYears[0]}–{String(avgYears.at(-1)).slice(2)}
            </th>
            <th className="n">Q1</th>
            <th className="n">Top Tier</th>
            <th className="n">Total sitasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className="wrap" style={{ minWidth: 200 }}><span className="swatch" style={{ background: colorFor(r.code) }} /><Link href={`/divisi/${r.code}`}>{r.name}</Link></td>
              <td className="n">{r.lecturers_active}</td>
              {years.map((y) => <td key={y} className="n">{fmt(r.by_year[y]?.publications ?? 0)}</td>)}
              <td className="n">{fmt1(avg(r))}</td>
              <td className="n">{fmt(r.q1)}</td>
              <td className="n">{fmt(r.top_tier)}</td>
              <td className="n">{fmt(r.citations)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Jumlah divisi*</td>
            <td className="n">{sum((r) => r.lecturers_active)}</td>
            {years.map((y) => <td key={y} className="n">{fmt(sum((r) => r.by_year[y]?.publications ?? 0))}</td>)}
            <td />
            <td className="n">{fmt(sum((r) => r.q1))}</td>
            <td className="n">{fmt(sum((r) => r.top_tier))}</td>
            <td className="n">{fmt(sum((r) => r.citations))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
