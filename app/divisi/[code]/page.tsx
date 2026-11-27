import Link from "next/link";
import { notFound } from "next/navigation";
import { YearBars } from "@/components/Charts.tsx";
import LecturerTable from "@/components/LecturerTable.tsx";
import { colorFor } from "@/lib/colors.ts";
import { fmt } from "@/lib/format.ts";
import { YEARS, getDivisionSummaries, getLecturers } from "@/lib/queries.ts";

export const dynamic = "force-dynamic";

export default async function DivisiPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const summaries = await getDivisionSummaries();
  const d = summaries.find((s) => s.code === code.toUpperCase());
  if (!d) notFound();
  const lecturers = await getLecturers(d.code);
  const color = colorFor(d.code);

  return (
    <>
      <nav className="filters" aria-label="Pilih divisi">
        {summaries.map((s) => (
          <Link key={s.code} href={`/divisi/${s.code}`} className="btn" style={s.code === d.code ? { borderColor: colorFor(s.code), fontWeight: 650 } : undefined}>
            <span className="swatch" style={{ background: colorFor(s.code) }} />{s.code}
          </Link>
        ))}
      </nav>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h1>Divisi {d.name}</h1>
          <p className="sub">{d.lecturers_active} dosen aktif</p>
        </div>
        <a className="btn primary" href={`/api/export?divisi=${d.code}`} download>Unduh xlsx divisi ini</a>
      </div>

      <section className="kpis">
        <div className="kpi"><div className="label">Publikasi</div><div className="value">{fmt(d.publications)}</div><div className="note">dokumen unik, semua tahun</div></div>
        <div className="kpi"><div className="label">Sitasi</div><div className="value">{fmt(d.citations)}</div></div>
        <div className="kpi"><div className="label">Q1</div><div className="value">{fmt(d.q1)}</div></div>
        <div className="kpi"><div className="label">Top Tier</div><div className="value">{fmt(d.top_tier)}</div></div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Publikasi per tahun</h2></div>
        <YearBars data={YEARS.map((y) => ({ year: y, value: d.by_year[y].publications }))} label="Publikasi" color={color} />
      </section>

      <section className="card">
        <div className="card-head"><h2>Dosen</h2></div>
        <LecturerTable rows={lecturers} years={YEARS} divisions={[]} showDivisionFilter={false} />
      </section>
    </>
  );
}
