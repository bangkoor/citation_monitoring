import Link from "next/link";
import { notFound } from "next/navigation";
import { SnapshotLine, YearBars } from "@/components/Charts.tsx";
import { colorFor } from "@/lib/colors.ts";
import { fmt } from "@/lib/format.ts";
import { YEARS, getLecturer } from "@/lib/queries.ts";

export const dynamic = "force-dynamic";

export default async function LecturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = Number.isInteger(Number(id)) ? await getLecturer(Number(id)) : null;
  if (!data) notFound();
  const { lecturer: l, snapshots, publications } = data;
  const latest = snapshots.at(-1);
  const byYear = YEARS.map((y) => ({ year: y, value: publications.filter((p) => p.pub_year === y).length }));
  const q1 = publications.filter((p) => p.quartile === "Q1").length;

  return (
    <>
      <p className="sub" style={{ marginBottom: 8 }}><Link href="/dosen">← Semua dosen</Link></p>
      <h1>{l.name}</h1>
      <p className="sub">
        {l.division_code && <><span className="swatch" style={{ background: colorFor(l.division_code) }} /><Link href={`/divisi/${l.division_code}`}>Divisi {l.division_name}</Link> · </>}
        {l.academic_rank ?? ""}{l.status_note ? ` · ${l.status_note}` : ""}
      </p>
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
            <div className="kpi"><div className="label">Dokumen Scopus</div><div className="value">{fmt(latest?.documents)}</div></div>
            <div className="kpi"><div className="label">Sitasi</div><div className="value">{fmt(latest?.citations)}</div></div>
            <div className="kpi"><div className="label">h-index</div><div className="value">{fmt(latest?.h_index)}</div></div>
            <div className="kpi"><div className="label">Publikasi Q1</div><div className="value">{fmt(q1)}</div></div>
          </section>

          <section className="card">
            <div className="card-head"><h2>Publikasi per tahun</h2></div>
            <YearBars data={byYear} label="Publikasi" color={colorFor(l.division_code)} />
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
            <div className="card-head"><h2>Daftar publikasi</h2><p>{publications.length} dokumen</p></div>
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
