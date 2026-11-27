import Link from "next/link";
import type { DivisionSummary } from "@/lib/queries.ts";
import DivisionIcon from "./DivisionIcon.tsx";
import { fmt, fmt1 } from "@/lib/format.ts";

/** Recap per division over the selected years. */
export default function DivisionTable({ rows, years, qs }: { rows: DivisionSummary[]; years: number[]; qs: string }) {
  const sum = (f: (r: DivisionSummary) => number) => rows.reduce((a, r) => a + f(r), 0);
  const avg = (r: DivisionSummary) => (r.lecturers_active ? r.publications / years.length / r.lecturers_active : 0);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Divisi</th>
            <th className="n">Dosen aktif</th>
            {years.map((y) => <th key={y} className="n">{y}</th>)}
            <th className="n" title="Jumlah publikasi divisi ÷ jumlah tahun ÷ dosen aktif">Rata-rata per dosen per tahun</th>
            <th className="n">Q1</th>
            <th className="n">Top Tier</th>
            <th className="n">Sitasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className="wrap" style={{ minWidth: 200 }}><span className="inline-div"><DivisionIcon code={r.code} badge size={16} /><Link href={`/divisi/${r.code}${qs}`}>{r.name}</Link></span></td>
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
