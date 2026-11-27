import { TrendChart } from "@/components/Charts.tsx";
import DivisionTable from "@/components/DivisionTable.tsx";
import ExportButton from "@/components/ExportButton.tsx";
import PageTools from "@/components/PageTools.tsx";
import { colorFor } from "@/lib/colors.ts";
import { fmt, fmtDate } from "@/lib/format.ts";
import { getDepartmentTotals, getDivisionSummaries, getFirstPubYear, getLastSync } from "@/lib/queries.ts";
import { parseRange, rangeLabel, rangeQuery } from "@/lib/range.ts";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange(await searchParams);
  const qs = rangeQuery(range);
  const [totals, divisions, lastSync, firstYear] = await Promise.all([
    getDepartmentTotals(range), getDivisionSummaries(range), getLastSync(), getFirstPubYear(),
  ]);
  const series = divisions.map((d) => ({ key: d.code, label: d.name, color: colorFor(d.code) }));
  const pubTrend = range.years.map((y) => ({ year: String(y), ...Object.fromEntries(divisions.map((d) => [d.code, d.by_year[y].publications])) }));
  const label = rangeLabel(range);

  return (
    <>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h1>Ringkasan Departemen</h1>
          <p className="sub">
            Publikasi dan sitasi terindeks Scopus.{" "}
            {lastSync ? <>Data diperbarui {fmtDate(lastSync.finishedAt)}.</> : <>Belum ada data yang disinkronkan.</>}
          </p>
        </div>
        <ExportButton href={`/api/export${qs}`} />
      </div>
      <PageTools range={range} firstYear={firstYear} />

      <section className="kpis">
        <div className="kpi"><div className="label">Publikasi {label}</div><div className="value">{fmt(totals.publications)}</div><div className="note">dokumen unik</div></div>
        <div className="kpi"><div className="label">Sitasi</div><div className="value">{fmt(totals.citations)}</div><div className="note">yang diterima publikasi {label}</div></div>
        <div className="kpi"><div className="label">Publikasi Q1</div><div className="value">{fmt(totals.q1)}</div><div className="note">{totals.publications ? Math.round((100 * totals.q1) / totals.publications) : 0}% dari publikasi</div></div>
        <div className="kpi"><div className="label">Dosen aktif</div><div className="value">{fmt(totals.activeLecturers)}</div><div className="note">5 divisi</div></div>
      </section>

      {range.years.length > 1 && (
        <section className="card">
          <div className="card-head">
            <h2>Publikasi per tahun menurut divisi</h2>
            <p>Artikel yang ditulis bersama oleh beberapa dosen dalam satu divisi dihitung satu kali.</p>
          </div>
          <TrendChart data={pubTrend} series={series} unit="publikasi" />
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Rekap per divisi</h2>
          <p>Jumlah publikasi per tahun, {label}</p>
        </div>
        <DivisionTable rows={divisions} years={range.years} qs={qs} />
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          * Artikel kolaborasi antardivisi terhitung di setiap divisi, sehingga jumlah divisi bisa lebih besar daripada total departemen.
          Sitasi = sitasi yang diterima publikasi terbitan {label}. Q1 memakai kuartil SJR bila tersedia, atau persentil CiteScore ≥ 75. Top Tier = persentil CiteScore ≥ 90.
        </p>
      </section>

      <p className="footer-note">Sumber data: Scopus (Elsevier). Profil dosen: website Departemen KSHE.</p>
    </>
  );
}
