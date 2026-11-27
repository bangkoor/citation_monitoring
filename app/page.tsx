import Link from "next/link";
import Avatar from "@/components/Avatar.tsx";
import { TrendChart } from "@/components/Charts.tsx";
import DeptBars from "@/components/DeptBars.tsx";
import DivisionTable from "@/components/DivisionTable.tsx";
import ExportButton from "@/components/ExportButton.tsx";
import Icon from "@/components/Icon.tsx";
import PageTools from "@/components/PageTools.tsx";
import { colorFor } from "@/lib/colors.ts";
import DivisionIcon from "@/components/DivisionIcon.tsx";
import { fmt, fmt1, fmtDate } from "@/lib/format.ts";
import {
  getDepartmentTotals, getDepartmentYearly, getDivisionSummaries, getFirstPubYear, getLastSync, getLecturers,
} from "@/lib/queries.ts";
import { parseRange, rangeLabel, rangeQuery } from "@/lib/range.ts";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange(await searchParams);
  const qs = rangeQuery(range);
  const label = rangeLabel(range);
  const [totals, yearly, divisions, lecturers, lastSync, firstYear] = await Promise.all([
    getDepartmentTotals(range), getDepartmentYearly(range), getDivisionSummaries(range),
    getLecturers(range), getLastSync(), getFirstPubYear(),
  ]);

  const series = divisions.map((d) => ({ key: d.code, label: d.name, color: colorFor(d.code) }));
  const pubTrend = range.years.map((y) => ({ year: String(y), ...Object.fromEntries(divisions.map((d) => [d.code, d.by_year[y].publications])) }));
  const last = yearly.at(-1)!;
  const prev = yearly.at(-2);
  const lastChange = prev && prev.publications ? Math.round(((last.publications - prev.publications) / prev.publications) * 100) : null;
  const perLecturer = totals.activeLecturers ? totals.publications / range.years.length / totals.activeLecturers : 0;
  const q1Share = totals.publications ? Math.round((100 * totals.q1) / totals.publications) : 0;
  const top = lecturers.filter((l) => l.cites_range > 0).slice(0, 5);
  const active = lecturers.filter((l) => l.active);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ringkasan <span className="soft">Departemen</span></h1>
          <p className="sub">
            Publikasi dan sitasi terindeks Scopus, {label}.{" "}
            {lastSync ? <>Data diperbarui {fmtDate(lastSync.finishedAt)}.</> : <>Belum ada data yang disinkronkan.</>}
          </p>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <PageTools range={range} firstYear={firstYear} />
          <ExportButton href={`/api/export${qs}`} />
        </div>
      </div>

      <section className="grid-home">
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div><h2>Sitasi</h2><p>Yang diterima publikasi {label}</p></div>
              <Link className="arrow" href={`/dosen${qs}`} aria-label="Lihat sitasi per dosen"><Icon name="arrow" size={18} /></Link>
            </div>
            <div className="hero">
              <div className="label">Total sitasi</div>
              <div className="value">{fmt(totals.citations)}</div>
              <div className="foot"><span>{fmt(totals.publications)} publikasi</span><span>{fmt(totals.citations && totals.publications ? Math.round(totals.citations / totals.publications) : 0)} sitasi/publikasi</span></div>
            </div>
          </div>
          <div className="card">
            <div className="label muted" style={{ fontSize: 13 }}>Publikasi {last.year}</div>
            <div className="metric-row">
              <div className="big">{fmt(last.publications)}</div>
              {lastChange !== null && <span className={`badge ${lastChange < 0 ? "down" : ""}`}>{lastChange > 0 ? "+" : ""}{lastChange}%</span>}
            </div>
            <p className="sub" style={{ fontSize: 12 }}>{prev ? <>dibanding {fmt(prev.publications)} pada {prev.year}</> : "tahun terakhir dalam rentang"}</p>
            <p className="shares-title">Per divisi, {last.year}</p>
            <ul className="shares">
              {divisions.map((d) => {
                const v = d.by_year[last.year]?.publications ?? 0;
                const max = Math.max(1, ...divisions.map((x) => x.by_year[last.year]?.publications ?? 0));
                return (
                  <li key={d.code} title={d.name}>
                    <Link className="code" href={`/divisi/${d.code}${qs}`} style={{ color: "var(--text)" }}><DivisionIcon code={d.code} size={16} />{d.code}</Link>
                    <span className="track"><span className="fill" style={{ width: `${(100 * v) / max}%`, background: colorFor(d.code) }} /></span>
                    <span className="v">{fmt(v)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="card wide">
          <DeptBars data={yearly} />
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div><h2>Produktivitas</h2><p>Publikasi per dosen aktif per tahun</p></div>
            </div>
            <div className="metric-row">
              <div className="big">{fmt1(perLecturer)}</div>
              <span className="badge">{q1Share}% Q1</span>
            </div>
            <div className="inset">
              <div className="row" style={{ alignItems: "center" }}>
                <div><b style={{ fontSize: 14 }}>Dosen aktif</b><div className="muted" style={{ fontSize: 12 }}>{fmt(active.length)} dosen, 5 divisi</div></div>
                <Link className="arrow" href={`/dosen${qs}`} aria-label="Semua dosen"><Icon name="arrow" size={18} /></Link>
              </div>
              <div className="faces" style={{ marginTop: 12 }}>
                {active.slice(0, 5).map((l) => <Avatar key={l.id} name={l.name} division={l.division_code} />)}
                {active.length > 5 && <span className="avatar more">+{active.length - 5}</span>}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div><h2>Sitasi tertinggi</h2><p>Publikasi {label}</p></div></div>
            <ul className="people">
              {top.map((l) => (
                <li key={l.id}>
                  <Link href={`/dosen/${l.id}${qs}`}>
                    <Avatar name={l.name} division={l.division_code} />
                    <span className="who"><b>{l.name}</b><span>{l.division_code} · {fmt(l.pubs_range)} publikasi</span></span>
                    <span className="val">{fmt(l.cites_range)}</span>
                  </Link>
                </li>
              ))}
              {top.length === 0 && <li className="muted" style={{ fontSize: 13 }}>Belum ada data.</li>}
            </ul>
          </div>
        </div>
      </section>

      <div style={{ height: 20 }} />

      {range.years.length > 1 && (
        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <span className="card-icon"><Icon name="layers" /></span>
              <div><h2>Publikasi per divisi</h2><p>Artikel yang ditulis bersama oleh beberapa dosen dalam satu divisi dihitung satu kali.</p></div>
            </div>
          </div>
          <TrendChart data={pubTrend} series={series} unit="publikasi" />
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <span className="card-icon"><Icon name="book" /></span>
            <div><h2>Rekap per divisi</h2><p>Jumlah publikasi per tahun, {label}</p></div>
          </div>
        </div>
        <DivisionTable rows={divisions} years={range.years} qs={qs} />
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          * Artikel kolaborasi antardivisi terhitung di setiap divisi, sehingga jumlah divisi bisa lebih besar daripada total departemen.
          Sitasi = sitasi yang diterima publikasi terbitan {label}. Q1 memakai kuartil SJR bila tersedia, atau persentil CiteScore ≥ 75. Top Tier = persentil CiteScore ≥ 90.
        </p>
      </section>

      <p className="footer-note">Sumber data: Scopus (Elsevier). Profil dosen: website Departemen KSHE.</p>
    </>
  );
}
