// Minimal client for the Elsevier Scopus APIs used by the sync job.
// Docs: https://dev.elsevier.com/api_docs.html

const BASE = "https://api.elsevier.com/content";

export class ScopusError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function headers(): Record<string, string> {
  const key = process.env.SCOPUS_API_KEY;
  if (!key) throw new Error("SCOPUS_API_KEY is not set");
  const h: Record<string, string> = { "X-ELS-APIKey": key, Accept: "application/json" };
  if (process.env.SCOPUS_INSTTOKEN) h["X-ELS-Insttoken"] = process.env.SCOPUS_INSTTOKEN;
  return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, attempt = 1): Promise<any> {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new ScopusError(`HTTP ${res.status} after retries: ${url}`, res.status);
    const reset = Number(res.headers.get("X-RateLimit-Reset"));
    const wait = res.status === 429 && reset ? Math.max(1000, reset * 1000 - Date.now()) : 2000 * attempt;
    await sleep(Math.min(wait, 60_000));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new ScopusError(`HTTP ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  // Stay well below the default 9 requests/second throttle.
  if (!process.env.MOCK) await sleep(150);
  return res.json();
}

const int = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export interface AuthorMetrics {
  documentCount: number | null;
  citationCount: number | null;
  citedByCount: number | null;
  hIndex: number | null;
}

/** Author Retrieval API, METRICS view. */
export async function getAuthorMetrics(authorId: string): Promise<AuthorMetrics> {
  const data = await getJson(`${BASE}/author/author_id/${encodeURIComponent(authorId)}?view=METRICS`);
  const r = data?.["author-retrieval-response"]?.[0] ?? data?.["author-retrieval-response"];
  const core = r?.coredata ?? {};
  return {
    documentCount: int(core["document-count"]),
    citationCount: int(core["citation-count"]),
    citedByCount: int(core["cited-by-count"]),
    hIndex: int(r?.["h-index"]),
  };
}

export interface ScopusDocument {
  eid: string;
  doi: string | null;
  title: string;
  sourceTitle: string | null;
  sourceId: string | null;
  issn: string | null;
  eissn: string | null;
  year: number | null;
  coverDate: string | null;
  docType: string | null;
  citedBy: number;
  openAccess: boolean | null;
}

export function parseEntry(e: any): ScopusDocument | null {
  if (!e?.eid) return null;
  const coverDate: string | null = e["prism:coverDate"] ?? null;
  return {
    eid: e.eid,
    doi: e["prism:doi"] ?? null,
    title: e["dc:title"] ?? "(untitled)",
    sourceTitle: e["prism:publicationName"] ?? null,
    sourceId: e["source-id"] ?? null,
    issn: e["prism:issn"] ?? null,
    eissn: e["prism:eIssn"] ?? null,
    year: coverDate ? int(coverDate.slice(0, 4)) : null,
    coverDate: coverDate && /^\d{4}-\d{2}-\d{2}$/.test(coverDate) ? coverDate : null,
    docType: e.subtypeDescription ?? null,
    citedBy: int(e["citedby-count"]) ?? 0,
    openAccess: e.openaccessFlag === undefined ? null : Boolean(e.openaccessFlag),
  };
}

/** Scopus Search API: every document of one author. */
export async function getAuthorDocuments(authorId: string): Promise<ScopusDocument[]> {
  const pageSize = 25;
  const docs: ScopusDocument[] = [];
  for (let start = 0; start < 5000; start += pageSize) {
    const q = new URLSearchParams({
      query: `AU-ID(${authorId})`,
      start: String(start),
      count: String(pageSize),
      view: "STANDARD",
      sort: "-coverDate",
    });
    const data = await getJson(`${BASE}/search/scopus?${q}`);
    const sr = data?.["search-results"];
    const entries: any[] = sr?.entry ?? [];
    if (entries.length === 1 && entries[0].error) break; // "Result set was empty"
    for (const e of entries) {
      const d = parseEntry(e);
      if (d) docs.push(d);
    }
    const total = int(sr?.["opensearch:totalResults"]) ?? 0;
    if (start + pageSize >= total || entries.length === 0) break;
  }
  return docs;
}

export interface SourceCiteScore {
  year: number;
  citescore: number | null;
  percentile: number | null;
}

/** Serial Title API: CiteScore and best subject percentile per year for a source. */
export async function getSourceCiteScores(sourceId: string): Promise<SourceCiteScore[]> {
  const data = await getJson(`${BASE}/serial/title?source-id=${encodeURIComponent(sourceId)}&view=CITESCORE`);
  const entry = data?.["serial-metadata-response"]?.entry?.[0];
  const list: any[] = entry?.citeScoreYearInfoList?.citeScoreYearInfo ?? [];
  const out: SourceCiteScore[] = [];
  for (const y of list) {
    if (y["@status"] && y["@status"] !== "Complete") continue;
    const info = y.citeScoreInformationList?.[0]?.citeScoreInfo?.[0];
    if (!info) continue;
    const percentiles = (info.citeScoreSubjectRank ?? [])
      .map((r: any) => int(r.percentile))
      .filter((n: number | null): n is number => n !== null);
    out.push({
      year: Number(y["@year"]),
      citescore: int(info.citeScore),
      percentile: percentiles.length ? Math.max(...percentiles) : null,
    });
  }
  return out;
}
