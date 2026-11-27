// Pulls author metrics and publications from Scopus for every lecturer with a
// Scopus ID, stores a dated snapshot, then refreshes CiteScore data for new sources.
// Usage: npm run sync            (all lecturers)
//        npm run sync -- --only 6506961084   (one Scopus author id, for testing)
import { getSql } from "../lib/db.ts";
import { getAuthorDocuments, getAuthorMetrics, getSourceCiteScores, ScopusError } from "../lib/scopus.ts";

const sql = getSql();
const today = new Date().toISOString().slice(0, 10);
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;

const [run] = await sql`INSERT INTO sync_runs DEFAULT VALUES RETURNING id`;
let ok = 0, failed = 0, pubCount = 0;
const errors: string[] = [];

const lecturers = await sql`
  SELECT id, name, scopus_id FROM lecturers
  WHERE scopus_id IS NOT NULL ${only ? sql`AND scopus_id = ${only}` : sql``}
  ORDER BY id`;

for (const l of lecturers) {
  try {
    const m = await getAuthorMetrics(l.scopus_id);
    const docs = await getAuthorDocuments(l.scopus_id);
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO author_snapshots (lecturer_id, snapshot_date, document_count, citation_count, cited_by_count, h_index)
        VALUES (${l.id}, ${today}, ${m.documentCount}, ${m.citationCount}, ${m.citedByCount}, ${m.hIndex})
        ON CONFLICT (lecturer_id, snapshot_date) DO UPDATE SET
          document_count = EXCLUDED.document_count, citation_count = EXCLUDED.citation_count,
          cited_by_count = EXCLUDED.cited_by_count, h_index = EXCLUDED.h_index`;
      for (const d of docs) {
        await tx`
          INSERT INTO publications (eid, doi, title, source_title, source_id, issn, eissn, pub_year,
                                    cover_date, doc_type, cited_by, open_access, updated_at)
          VALUES (${d.eid}, ${d.doi}, ${d.title}, ${d.sourceTitle}, ${d.sourceId}, ${d.issn}, ${d.eissn},
                  ${d.year}, ${d.coverDate}, ${d.docType}, ${d.citedBy}, ${d.openAccess}, now())
          ON CONFLICT (eid) DO UPDATE SET
            doi = EXCLUDED.doi, title = EXCLUDED.title, source_title = EXCLUDED.source_title,
            source_id = EXCLUDED.source_id, issn = EXCLUDED.issn, eissn = EXCLUDED.eissn,
            pub_year = EXCLUDED.pub_year, cover_date = EXCLUDED.cover_date, doc_type = EXCLUDED.doc_type,
            cited_by = EXCLUDED.cited_by, open_access = EXCLUDED.open_access, updated_at = now()`;
        await tx`INSERT INTO publication_authors (eid, lecturer_id) VALUES (${d.eid}, ${l.id}) ON CONFLICT DO NOTHING`;
        await tx`
          INSERT INTO publication_snapshots (eid, snapshot_date, cited_by) VALUES (${d.eid}, ${today}, ${d.citedBy})
          ON CONFLICT (eid, snapshot_date) DO UPDATE SET cited_by = EXCLUDED.cited_by`;
      }
    });
    ok++;
    pubCount += docs.length;
    console.log(`✓ ${l.name}: ${docs.length} documents, h=${m.hIndex ?? "?"}, citations=${m.citationCount ?? "?"}`);
  } catch (e) {
    failed++;
    const msg = `${l.name} (${l.scopus_id}): ${(e as Error).message}`;
    errors.push(msg);
    console.error(`✗ ${msg}`);
    // An invalid key or missing entitlement fails every request: stop early.
    if (e instanceof ScopusError && (e.status === 401 || e.status === 403) && ok === 0 && failed >= 2) break;
  }
}

// CiteScore for sources that have no 'scopus' metrics yet, or were refreshed over 6 months ago.
const sources = await sql`
  SELECT DISTINCT p.source_id FROM publications p
  WHERE p.source_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM source_metrics m
    WHERE m.origin = 'scopus' AND m.source_id = p.source_id AND m.updated_at > now() - interval '180 days')`;
let srcOk = 0;
for (const s of sources) {
  try {
    for (const y of await getSourceCiteScores(s.source_id)) {
      await sql`
        INSERT INTO source_metrics (source_id, issn, metric_year, citescore, citescore_percentile, origin, updated_at)
        VALUES (${s.source_id}, NULL, ${y.year}, ${y.citescore}, ${y.percentile}, 'scopus', now())
        ON CONFLICT (COALESCE(source_id, ''), COALESCE(issn, ''), metric_year, origin) DO UPDATE SET
          citescore = EXCLUDED.citescore, citescore_percentile = EXCLUDED.citescore_percentile, updated_at = now()`;
    }
    srcOk++;
  } catch (e) {
    console.warn(`! CiteScore for source ${s.source_id}: ${(e as Error).message}`);
  }
}

const status = failed === 0 ? "ok" : ok === 0 ? "failed" : "partial";
await sql`
  UPDATE sync_runs SET finished_at = now(), status = ${status}, lecturers_ok = ${ok},
    lecturers_err = ${failed}, publications = ${pubCount}, message = ${errors.join("\n").slice(0, 4000) || null}
  WHERE id = ${run.id}`;
console.log(`\nDone: ${ok} lecturers ok, ${failed} failed, ${pubCount} documents, ${srcOk}/${sources.length} sources ranked. Status: ${status}`);
await sql.end();
if (status === "failed") process.exit(1);
