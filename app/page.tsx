import { TrendChart } from "@/components/Charts.tsx";
import DivisionTable from "@/components/DivisionTable.tsx";
import { colorFor } from "@/lib/colors.ts";
import { fmt, fmtDate } from "@/lib/format.ts";
import { CURRENT_YEAR, YEARS, getDepartmentTotals, getDivisionSummaries, getLastSync } from "@/lib/queries.ts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [totals, divisions, lastSync] = await Promise.all([getDepartmentTotals(), getDivisionSummaries(), getLastSync()]);
  const series = divisions.map((d) => ({ key: d.code, label: d.name, color: colorFor(d.code) }));
  const pubTrend = YEARS.map((y) => ({ year: String(y), ...Object.fromEntries(divisions.map((d) => [d.code, d.by_year[y].publications])) }));
  const avgYears = [CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1];

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
        <a className="btn primary" href="/api/export" download>Unduh xlsx</a>
      </div>

      <section className="kpis">
        <div className="kpi"><div className="label">Total publikasi</div><div className="value">{fmt(totals.publications)}</div><div className="note">dokumen unik, semua tahun</div></div>
        <div className="kpi"><div className="label">Total sitasi</div><div className="value">{fmt(totals.citations)}</div><div className="note">dari seluruh publikasi tersebut</div></div>
        <div className="kpi"><div className="label">Publikasi {CURRENT_YEAR}</div><div className="value">{fmt(totals.pubsThisYear)}</div><div className="note">tahun berjalan</div></div>
        <div className="kpi"><div className="label">Dosen aktif</div><div className="value">{fmt(totals.activeLecturers)}</div><div className="note">5 divisi</div></div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Publikasi per tahun menurut divisi</h2>
          <p>Artikel yang ditulis bersama oleh beberapa dosen dalam satu divisi dihitung satu kali.</p>
        </div>
        <TrendChart data={pubTrend} series={series} unit="publikasi" />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Rekap per divisi</h2>
          <p>Jumlah publikasi per tahun ({YEARS[0]}–{CURRENT_YEAR})</p>
        </div>
        <DivisionTable rows={divisions} years={YEARS} avgYears={avgYears} />
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          * Artikel kolaborasi antardivisi terhitung di setiap divisi, sehingga jumlah divisi bisa lebih besar daripada total departemen.
          Q1 memakai kuartil SJR bila tersedia, atau persentil CiteScore ≥ 75. Top Tier = persentil CiteScore ≥ 90.
        </p>
      </section>

      <p className="footer-note">Sumber data: Scopus (Elsevier). Profil dosen: website Departemen KSHE.</p>
    </>
  );
}
