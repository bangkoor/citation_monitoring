import Link from "next/link";
import { notFound } from "next/navigation";
import { PubCiteCharts } from "@/components/Charts.tsx";
import Icon from "@/components/Icon.tsx";
import ExportButton from "@/components/ExportButton.tsx";
import LecturerTable from "@/components/LecturerTable.tsx";
import PageTools from "@/components/PageTools.tsx";
import { colorFor } from "@/lib/colors.ts";
import DivisionIcon from "@/components/DivisionIcon.tsx";
import { fmt } from "@/lib/format.ts";
import { getDivisionSummaries, getFirstPubYear, getLecturers } from "@/lib/queries.ts";
import { parseRange, rangeLabel, rangeQuery } from "@/lib/range.ts";

export const dynamic = "force-dynamic";

export default async function DivisiPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const range = parseRange(await searchParams);
  const qs = rangeQuery(range);
  const [summaries, firstYear] = await Promise.all([getDivisionSummaries(range), getFirstPubYear()]);
  const d = summaries.find((s) => s.code === code.toUpperCase());
  if (!d) notFound();
  const lecturers = await getLecturers(range, d.code);
  const label = rangeLabel(range);

  return (
    <>
      <nav className="filters" aria-label="Pilih divisi">
        {summaries.map((s) => (
          <Link key={s.code} href={`/divisi/${s.code}${qs}`} className={`btn ${s.code === d.code ? "primary" : ""}`}>
            <DivisionIcon code={s.code} size={18} />{s.code}
          </Link>
        ))}
      </nav>
      <div className="page-head">
        <div>
          <h1><span className="soft">Divisi</span> {d.name}</h1>
          <p className="sub">{d.lecturers_active} dosen aktif · publikasi {label}</p>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <PageTools range={range} firstYear={firstYear} />
          <ExportButton href={`/api/export${rangeQuery(range, { divisi: d.code })}`} label="Unduh xlsx divisi" />
        </div>
      </div>

      <section className="kpis">
        <div className="kpi hero"><div className="label">Sitasi</div><div className="value" style={{ margin: "4px 0 2px", fontSize: 34 }}>{fmt(d.citations)}</div><div className="foot">yang diterima publikasi {label}</div></div>
        <div className="kpi"><div className="label">Publikasi {label}</div><div className="value">{fmt(d.publications)}</div><div className="note">dokumen unik</div></div>
        <div className="kpi"><div className="label">Q1</div><div className="value">{fmt(d.q1)}</div></div>
        <div className="kpi"><div className="label">Top Tier</div><div className="value">{fmt(d.top_tier)}</div></div>
      </section>

      <section className="card">
        <PubCiteCharts syncId={`div-${d.code}`} color={colorFor(d.code)}
          data={range.years.map((y) => ({ year: y, publikasi: d.by_year[y].publications, sitasi: d.by_year[y].citations }))} />
      </section>

      <section className="card">
        <div className="card-head"><div className="card-title"><span className="card-icon"><Icon name="users" /></span><div><h2>Dosen</h2><p>Klik nama untuk melihat profil</p></div></div></div>
        <LecturerTable rows={lecturers} years={range.years} rangeLabel={label} qs={qs} divisions={[]} showDivisionFilter={false} />
      </section>
    </>
  );
}
