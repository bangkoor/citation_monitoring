import Link from "next/link";
import { notFound } from "next/navigation";
import { PubCiteCharts, SnapshotLine } from "@/components/Charts.tsx";
import Avatar from "@/components/Avatar.tsx";
import PageTools from "@/components/PageTools.tsx";
import { colorFor } from "@/lib/colors.ts";
import DivisionIcon from "@/components/DivisionIcon.tsx";
import { fmt } from "@/lib/format.ts";
import { getFirstPubYear, getLecturer } from "@/lib/queries.ts";
import { parseRange, rangeLabel, rangeQuery } from "@/lib/range.ts";

export const dynamic = "force-dynamic";

export default async function LecturerPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const range = parseRange(await searchParams);
  const qs = rangeQuery(range);
  const label = rangeLabel(range);
  const [data, firstYear] = await Promise.all([
    Number.isInteger(Number(id)) ? getLecturer(Number(id)) : null,
    getFirstPubYear(),
  ]);
  if (!data) notFound();
  const { lecturer: l, snapshots, publications: all } = data;
  const latest = snapshots.at(-1);
  const publications = all.filter((p) => p.pub_year !== null && p.pub_year >= range.from && p.pub_year <= range.to);
  const byYear = range.years.map((y) => {
    const ps = publications.filter((p) => p.pub_year === y);
    return { year: y, publikasi: ps.length, sitasi: ps.reduce((a, p) => a + p.cited_by, 0) };
  });
  const q1 = publications.filter((p) => p.quartile === "Q1").length;
  const citesRange = publications.reduce((a, p) => a + p.cited_by, 0);

  return (
    <>
      <Link className="back" href={`/dosen${qs}`}>← Semua dosen</Link>
      <div className="page-head">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ transform: "scale(1.6)", transformOrigin: "left center", marginRight: 22 }}><Avatar name={l.name} division={l.division_code} /></span>
          <div>
            <h1>{l.name}</h1>
      <p className="sub">
        {l.division_code && <><DivisionIcon code={l.division_code} size={16} /> <Link href={`/divisi/${l.division_code}${qs}`}>Divisi {l.division_name}</Link> · </>}
        {l.academic_rank ?? ""}{l.status_note ? ` · ${l.status_note}` : ""}
      </p>
          </div>
        </div>
        {l.scopus_id && <PageTools range={range} firstYear={firstYear} />}
      </div>
      <p className="links">
        {l.scopus_id && <a href={`https://www.scopus.com/authid/detail.uri?authorId=${l.scopus_id}`} target="_blank" rel="noopener">Scopus</a>}
        {l.sinta_id && <a href={`https://sinta.kemdiktisaintek.go.id/authors/profile/${l.sinta_id}`} target="_blank" rel="noopener">SINTA</a>}
        {l.google_scholar_id && <a href={`https://scholar.google.com/citations?user=${l.google_scholar_id}`} target="_blank" rel="noopener">Google Scholar</a>}
        {l.orcid && <a href={`https://orcid.org/${l.orcid}`} target="_blank" rel="noopener">ORCID</a>}
      </p>

      {!l.scopus_id ? (
        <section className="card"><p>Scopus Author ID untuk dosen ini belum tercatat, sehingga datanya belum dapat ditampilkan.</p></section>
      ) : (
        <>
          <section className="kpis">
            <div className="kpi hero"><div className="label">Sitasi</div><div className="value" style={{ margin: "4px 0 2px", fontSize: 34 }}>{fmt(citesRange)}</div><div className="foot">yang diterima publikasi {label}</div></div>
            <div className="kpi"><div className="label">Publikasi {label}</div><div className="value">{fmt(publications.length)}</div><div className="note">{fmt(q1)} di antaranya Q1</div></div>
            <div className="kpi"><div className="label">Total sitasi Scopus</div><div className="value">{fmt(latest?.citations)}</div><div className="note">seluruh karier, {fmt(latest?.documents)} dokumen</div></div>
            <div className="kpi"><div className="label">h-index</div><div className="value">{fmt(latest?.h_index)}</div><div className="note">seluruh karier</div></div>
          </section>

          <section className="card">
            <PubCiteCharts syncId={`dosen-${l.id}`} data={byYear} color={colorFor(l.division_code)} />
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Perkembangan total sitasi</h2>
              <p>Satu titik per pembaruan data</p>
            </div>
            {snapshots.length < 2 ? (
              <p className="muted">Grafik muncul setelah minimal dua kali pembaruan data. Saat ini: {fmt(latest?.citations)} sitasi.</p>
            ) : (
              <SnapshotLine data={snapshots.map((s) => ({ date: s.date, value: s.citations }))} label="Total sitasi" />
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2>Daftar publikasi {label}</h2><p>{publications.length} dari {all.length} dokumen</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th className="n">Tahun</th><th>Judul</th><th>Sumber</th><th>Kuartil</th><th className="n">Sitasi</th></tr></thead>
                <tbody>
                  {publications.map((p) => (
                    <tr key={p.eid}>
                      <td className="n">{p.pub_year ?? "–"}</td>
                      <td className="wrap">{p.doi ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener">{p.title}</a> : p.title}</td>
                      <td className="wrap muted">{p.source_title ?? "–"}</td>
                      <td>{p.quartile ? <span className={`pill ${p.quartile === "Q1" ? "q1" : ""}`}>{p.quartile}{p.top_tier ? " · Top" : ""}</span> : "–"}</td>
                      <td className="n">{fmt(p.cited_by)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
