import { db } from "./db.ts";
import type { YearRange } from "./range.ts";

export interface Division { id: number; code: string; name: string }

export interface LecturerRow {
  id: number;
  name: string;
  division_code: string | null;
  division_name: string | null;
  academic_rank: string | null;
  active: boolean;
  status_note: string | null;
  scopus_id: string | null;
  sinta_id: string | null;
  google_scholar_id: string | null;
  documents: number | null;        // all-time, latest Scopus snapshot
  citations: number | null;        // all-time, latest Scopus snapshot
  h_index: number | null;
  citations_prev: number | null;   // citation count at the previous snapshot
  snapshot_date: string | null;
  pubs_range: number;              // publications in the selected years
  cites_range: number;             // citations received by those publications
  q1: number;                      // Q1 publications in the selected years
  by_year: Record<string, number>; // publications per year
}

export interface YearStats { publications: number; q1: number; top_tier: number; citations: number }

export interface DivisionSummary extends Division {
  lecturers_active: number;
  publications: number;
  citations: number;
  q1: number;
  top_tier: number;
  by_year: Record<string, YearStats>;
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getDivisions(): Promise<Division[]> {
  return (await db()`SELECT id, code, name FROM divisions ORDER BY id`) as unknown as Division[];
}

export async function getLastSync() {
  const [r] = await db()`
    SELECT finished_at, status FROM sync_runs WHERE status IN ('ok','partial') ORDER BY finished_at DESC LIMIT 1`;
  return r ? { finishedAt: r.finished_at as Date, status: r.status as string } : null;
}

/** Earliest publication year in the database, for the range picker. */
export async function getFirstPubYear(): Promise<number | null> {
  const [r] = await db()`SELECT MIN(pub_year) AS y FROM publications WHERE pub_year >= 2000`;
  return n(r?.y);
}

export async function getLecturers(range: YearRange, divisionCode?: string): Promise<LecturerRow[]> {
  const sql = db();
  const rows = await sql`
    WITH snaps AS (
      SELECT lecturer_id, snapshot_date, document_count, citation_count, h_index,
             LAG(citation_count) OVER (PARTITION BY lecturer_id ORDER BY snapshot_date) AS prev,
             ROW_NUMBER() OVER (PARTITION BY lecturer_id ORDER BY snapshot_date DESC) AS rn
      FROM author_snapshots
    ),
    pubs AS (
      SELECT pa.lecturer_id, p.pub_year, p.cited_by, r.quartile
      FROM publication_authors pa
      JOIN publications p ON p.eid = pa.eid
      LEFT JOIN publication_ranking r ON r.eid = p.eid
      WHERE p.pub_year BETWEEN ${range.from} AND ${range.to}
    ),
    yearly AS (SELECT lecturer_id, pub_year, COUNT(*) AS c FROM pubs GROUP BY 1, 2),
    agg AS (
      SELECT lecturer_id, COUNT(*) AS pubs, SUM(cited_by) AS cites, COUNT(*) FILTER (WHERE quartile = 'Q1') AS q1
      FROM pubs GROUP BY 1
    )
    SELECT l.id, l.name, d.code AS division_code, d.name AS division_name, l.academic_rank,
           l.active, l.status_note, l.scopus_id, l.sinta_id, l.google_scholar_id,
           s.document_count AS documents, s.citation_count AS citations, s.h_index,
           s.prev AS citations_prev, s.snapshot_date,
           COALESCE(a.pubs, 0) AS pubs_range, COALESCE(a.cites, 0) AS cites_range, COALESCE(a.q1, 0) AS q1,
           COALESCE((SELECT json_object_agg(y.pub_year, y.c) FROM yearly y WHERE y.lecturer_id = l.id), '{}'::json) AS by_year
    FROM lecturers l
    LEFT JOIN divisions d ON d.id = l.division_id
    LEFT JOIN snaps s ON s.lecturer_id = l.id AND s.rn = 1
    LEFT JOIN agg a ON a.lecturer_id = l.id
    ${divisionCode ? sql`WHERE d.code = ${divisionCode}` : sql``}
    ORDER BY a.cites DESC NULLS LAST, l.name`;
  return rows.map((r) => ({
    ...(r as any),
    documents: n(r.documents),
    citations: n(r.citations),
    h_index: n(r.h_index),
    citations_prev: n(r.citations_prev),
    pubs_range: Number(r.pubs_range),
    cites_range: Number(r.cites_range),
    q1: Number(r.q1),
    snapshot_date: r.snapshot_date ? new Date(r.snapshot_date).toISOString().slice(0, 10) : null,
    by_year: Object.fromEntries(Object.entries(r.by_year ?? {}).map(([k, v]) => [k, Number(v)])),
  }));
}

export async function getDivisionSummaries(range: YearRange): Promise<DivisionSummary[]> {
  const sql = db();
  const [divs, yearly, counts] = await Promise.all([
    getDivisions(),
    sql`SELECT division_code, pub_year, publications, q1, top_tier, citations
        FROM division_yearly WHERE pub_year BETWEEN ${range.from} AND ${range.to}`,
    sql`SELECT division_id, COUNT(*) FILTER (WHERE active) AS active FROM lecturers GROUP BY division_id`,
  ]);
  return divs.map((d) => {
    const by_year: Record<string, YearStats> = {};
    for (const y of range.years) {
      const r = yearly.find((x) => x.division_code === d.code && Number(x.pub_year) === y);
      by_year[y] = {
        publications: Number(r?.publications ?? 0), q1: Number(r?.q1 ?? 0),
        top_tier: Number(r?.top_tier ?? 0), citations: Number(r?.citations ?? 0),
      };
    }
    const total = (k: keyof YearStats) => Object.values(by_year).reduce((a, v) => a + v[k], 0);
    return {
      ...d,
      lecturers_active: Number(counts.find((x) => x.division_id === d.id)?.active ?? 0),
      publications: total("publications"),
      citations: total("citations"),
      q1: total("q1"),
      top_tier: total("top_tier"),
      by_year,
    };
  });
}

export async function getDepartmentTotals(range: YearRange) {
  const [r] = await db()`
    SELECT COUNT(DISTINCT p.eid) AS pubs, COALESCE(SUM(p.cited_by), 0) AS cites,
           COUNT(DISTINCT p.eid) FILTER (WHERE rk.quartile = 'Q1') AS q1,
           (SELECT COUNT(*) FROM lecturers WHERE active) AS active
    FROM publications p
    LEFT JOIN publication_ranking rk ON rk.eid = p.eid
    WHERE p.pub_year BETWEEN ${range.from} AND ${range.to}
      AND EXISTS (SELECT 1 FROM publication_authors pa WHERE pa.eid = p.eid)`;
  return { publications: Number(r.pubs), citations: Number(r.cites), q1: Number(r.q1), activeLecturers: Number(r.active) };
}

export interface PublicationRow {
  eid: string; title: string; source_title: string | null; pub_year: number | null; doc_type: string | null;
  doi: string | null; cited_by: number; quartile: string | null; top_tier: boolean | null; authors?: string;
}

export async function getLecturer(id: number) {
  const sql = db();
  const [l] = await sql`
    SELECT l.*, d.code AS division_code, d.name AS division_name
    FROM lecturers l LEFT JOIN divisions d ON d.id = l.division_id WHERE l.id = ${id}`;
  if (!l) return null;
  const [snapshots, pubs] = await Promise.all([
    sql`SELECT snapshot_date, document_count, citation_count, h_index FROM author_snapshots
        WHERE lecturer_id = ${id} ORDER BY snapshot_date`,
    sql`SELECT p.eid, p.title, p.source_title, p.pub_year, p.doc_type, p.doi, p.cited_by, r.quartile, r.top_tier
        FROM publication_authors pa JOIN publications p ON p.eid = pa.eid
        LEFT JOIN publication_ranking r ON r.eid = p.eid
        WHERE pa.lecturer_id = ${id} ORDER BY p.pub_year DESC NULLS LAST, p.cited_by DESC`,
  ]);
  return {
    lecturer: l as any,
    snapshots: snapshots.map((s) => ({
      date: new Date(s.snapshot_date).toISOString().slice(0, 10),
      documents: n(s.document_count), citations: n(s.citation_count), h_index: n(s.h_index),
    })),
    publications: pubs.map((p) => ({ ...(p as any), cited_by: Number(p.cited_by), pub_year: n(p.pub_year) })) as PublicationRow[],
  };
}

/** Publications in the range with the KSHE authors on each, for the xlsx export. */
export async function getAllPublications(range: YearRange): Promise<PublicationRow[]> {
  const rows = await db()`
    SELECT p.eid, p.title, p.source_title, p.pub_year, p.doc_type, p.doi, p.cited_by, r.quartile, r.top_tier,
           string_agg(l.name, '; ' ORDER BY l.name) AS authors
    FROM publications p
    JOIN publication_authors pa ON pa.eid = p.eid
    JOIN lecturers l ON l.id = pa.lecturer_id
    LEFT JOIN publication_ranking r ON r.eid = p.eid
    WHERE p.pub_year BETWEEN ${range.from} AND ${range.to}
    GROUP BY p.eid, r.quartile, r.top_tier
    ORDER BY p.pub_year DESC NULLS LAST, p.cited_by DESC`;
  return rows.map((p) => ({ ...(p as any), cited_by: Number(p.cited_by), pub_year: n(p.pub_year) }));
}
