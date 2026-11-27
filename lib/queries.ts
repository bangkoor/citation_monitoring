import { db } from "./db.ts";

export const FIRST_YEAR = 2021;
export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

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
  documents: number | null;
  citations: number | null;
  h_index: number | null;
  citations_prev: number | null;   // citation count at the previous snapshot
  snapshot_date: string | null;
  q1: number;
  by_year: Record<string, number>; // publications per year
}

export interface DivisionYear {
  division_code: string;
  pub_year: number;
  publications: number;
  q1: number;
  top_tier: number;
  citations: number;
}

export interface DivisionSummary extends Division {
  lecturers_active: number;
  publications: number;
  citations: number;
  q1: number;
  top_tier: number;
  by_year: Record<string, { publications: number; q1: number; top_tier: number; citations: number }>;
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

export async function getLecturers(divisionCode?: string): Promise<LecturerRow[]> {
  const sql = db();
  const rows = await sql`
    WITH snaps AS (
      SELECT lecturer_id, snapshot_date, document_count, citation_count, h_index,
             LAG(citation_count) OVER (PARTITION BY lecturer_id ORDER BY snapshot_date) AS prev,
             ROW_NUMBER() OVER (PARTITION BY lecturer_id ORDER BY snapshot_date DESC) AS rn
      FROM author_snapshots
    ),
    yearly AS (
      SELECT pa.lecturer_id, p.pub_year, COUNT(*) AS c
      FROM publication_authors pa JOIN publications p ON p.eid = pa.eid
      WHERE p.pub_year >= ${FIRST_YEAR}
      GROUP BY pa.lecturer_id, p.pub_year
    ),
    q1 AS (
      SELECT pa.lecturer_id, COUNT(*) AS c
      FROM publication_authors pa JOIN publication_ranking r ON r.eid = pa.eid
      WHERE r.quartile = 'Q1' GROUP BY pa.lecturer_id
    )
    SELECT l.id, l.name, d.code AS division_code, d.name AS division_name, l.academic_rank,
           l.active, l.status_note, l.scopus_id, l.sinta_id, l.google_scholar_id,
           s.document_count AS documents, s.citation_count AS citations, s.h_index,
           s.prev AS citations_prev, s.snapshot_date,
           COALESCE(q1.c, 0) AS q1,
           COALESCE((SELECT json_object_agg(y.pub_year, y.c) FROM yearly y WHERE y.lecturer_id = l.id), '{}'::json) AS by_year
    FROM lecturers l
    LEFT JOIN divisions d ON d.id = l.division_id
    LEFT JOIN snaps s ON s.lecturer_id = l.id AND s.rn = 1
    LEFT JOIN q1 ON q1.lecturer_id = l.id
    ${divisionCode ? sql`WHERE d.code = ${divisionCode}` : sql``}
    ORDER BY s.citation_count DESC NULLS LAST, l.name`;
  return rows.map((r) => ({
    ...(r as any),
    documents: n(r.documents),
    citations: n(r.citations),
    h_index: n(r.h_index),
    citations_prev: n(r.citations_prev),
    q1: Number(r.q1),
    snapshot_date: r.snapshot_date ? new Date(r.snapshot_date).toISOString().slice(0, 10) : null,
    by_year: Object.fromEntries(Object.entries(r.by_year ?? {}).map(([k, v]) => [k, Number(v)])),
  }));
}

export async function getDivisionYearly(): Promise<DivisionYear[]> {
  const rows = await db()`
    SELECT division_code, pub_year, publications, q1, top_tier, citations
    FROM division_yearly WHERE pub_year >= ${FIRST_YEAR} ORDER BY division_code, pub_year`;
  return rows.map((r) => ({
    division_code: r.division_code,
    pub_year: Number(r.pub_year),
    publications: Number(r.publications),
    q1: Number(r.q1),
    top_tier: Number(r.top_tier),
    citations: Number(r.citations ?? 0),
  }));
}

export async function getDivisionSummaries(): Promise<DivisionSummary[]> {
  const sql = db();
  const [divs, yearly, counts, totals] = await Promise.all([
    getDivisions(),
    getDivisionYearly(),
    sql`SELECT division_id, COUNT(*) FILTER (WHERE active) AS active FROM lecturers GROUP BY division_id`,
    sql`
      WITH dp AS (SELECT DISTINCT l.division_id, pa.eid FROM publication_authors pa JOIN lecturers l ON l.id = pa.lecturer_id)
      SELECT dp.division_id, COUNT(*) AS pubs, SUM(p.cited_by) AS cites,
             COUNT(*) FILTER (WHERE r.quartile = 'Q1') AS q1, COUNT(*) FILTER (WHERE r.top_tier) AS top_tier
      FROM dp JOIN publications p ON p.eid = dp.eid LEFT JOIN publication_ranking r ON r.eid = dp.eid
      GROUP BY dp.division_id`,
  ]);
  return divs.map((d) => {
    const c = counts.find((x) => x.division_id === d.id);
    const t = totals.find((x) => x.division_id === d.id);
    const by_year: DivisionSummary["by_year"] = {};
    for (const y of YEARS) {
      const r = yearly.find((x) => x.division_code === d.code && x.pub_year === y);
      by_year[y] = { publications: r?.publications ?? 0, q1: r?.q1 ?? 0, top_tier: r?.top_tier ?? 0, citations: r?.citations ?? 0 };
    }
    return {
      ...d,
      lecturers_active: Number(c?.active ?? 0),
      publications: Number(t?.pubs ?? 0),
      citations: Number(t?.cites ?? 0),
      q1: Number(t?.q1 ?? 0),
      top_tier: Number(t?.top_tier ?? 0),
      by_year,
    };
  });
}

export async function getDepartmentTotals() {
  const [r] = await db()`
    SELECT COUNT(DISTINCT p.eid) AS pubs, COALESCE(SUM(p.cited_by), 0) AS cites,
           COUNT(DISTINCT p.eid) FILTER (WHERE p.pub_year = ${CURRENT_YEAR}) AS pubs_this_year,
           (SELECT COUNT(*) FROM lecturers WHERE active) AS active
    FROM publications p WHERE EXISTS (SELECT 1 FROM publication_authors pa WHERE pa.eid = p.eid)`;
  return { publications: Number(r.pubs), citations: Number(r.cites), pubsThisYear: Number(r.pubs_this_year), activeLecturers: Number(r.active) };
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

/** Every publication with the KSHE authors on it, for the xlsx export. */
export async function getAllPublications(): Promise<PublicationRow[]> {
  const rows = await db()`
    SELECT p.eid, p.title, p.source_title, p.pub_year, p.doc_type, p.doi, p.cited_by, r.quartile, r.top_tier,
           string_agg(l.name, '; ' ORDER BY l.name) AS authors
    FROM publications p
    JOIN publication_authors pa ON pa.eid = p.eid
    JOIN lecturers l ON l.id = pa.lecturer_id
    LEFT JOIN publication_ranking r ON r.eid = p.eid
    GROUP BY p.eid, r.quartile, r.top_tier
    ORDER BY p.pub_year DESC NULLS LAST, p.cited_by DESC`;
  return rows.map((p) => ({ ...(p as any), cited_by: Number(p.cited_by), pub_year: n(p.pub_year) }));
}
