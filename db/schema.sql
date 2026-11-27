-- Schema for the KSHE citation monitoring dashboard (PostgreSQL / Neon).
-- Safe to run repeatedly: every statement is idempotent.

CREATE TABLE IF NOT EXISTS divisions (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,          -- short code, e.g. EMHL
  name        TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS lecturers (
  id                 SERIAL PRIMARY KEY,
  name               TEXT UNIQUE NOT NULL,
  division_id        INT REFERENCES divisions(id),
  academic_rank      TEXT,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  status_note        TEXT,                   -- e.g. "Pensiun sejak Mei 2026"
  end_year           INT,                    -- last active year, for inactive lecturers
  scopus_id          TEXT UNIQUE,
  sinta_id           TEXT,
  google_scholar_id  TEXT,
  orcid              TEXT,
  researchgate       TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per Scopus document (EID). Co-authored papers appear once here.
CREATE TABLE IF NOT EXISTS publications (
  eid            TEXT PRIMARY KEY,
  doi            TEXT,
  title          TEXT NOT NULL,
  source_title   TEXT,
  source_id      TEXT,
  issn           TEXT,
  eissn          TEXT,
  pub_year       INT,
  cover_date     DATE,
  doc_type       TEXT,                       -- Article, Review, Conference Paper, ...
  cited_by       INT NOT NULL DEFAULT 0,
  open_access    BOOLEAN,
  first_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publications_year_idx ON publications(pub_year);
CREATE INDEX IF NOT EXISTS publications_source_idx ON publications(source_id);

-- Which KSHE lecturers authored which document.
CREATE TABLE IF NOT EXISTS publication_authors (
  eid          TEXT REFERENCES publications(eid) ON DELETE CASCADE,
  lecturer_id  INT  REFERENCES lecturers(id)     ON DELETE CASCADE,
  PRIMARY KEY (eid, lecturer_id)
);
CREATE INDEX IF NOT EXISTS publication_authors_lecturer_idx ON publication_authors(lecturer_id);

-- Author-level metrics captured at every sync. Trends come from this table.
CREATE TABLE IF NOT EXISTS author_snapshots (
  lecturer_id     INT  REFERENCES lecturers(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  document_count  INT,
  citation_count  INT,                       -- total citations received
  cited_by_count  INT,                       -- number of citing documents
  h_index         INT,
  PRIMARY KEY (lecturer_id, snapshot_date)
);

-- Citation count of each document at every sync, so growth per period can be computed.
CREATE TABLE IF NOT EXISTS publication_snapshots (
  eid            TEXT REFERENCES publications(eid) ON DELETE CASCADE,
  snapshot_date  DATE NOT NULL,
  cited_by       INT NOT NULL,
  PRIMARY KEY (eid, snapshot_date)
);

-- Journal rankings per year. Filled from the Scopus Serial Title API (CiteScore)
-- and/or a SCImago CSV import (SJR quartile).
CREATE TABLE IF NOT EXISTS source_metrics (
  source_id            TEXT,                 -- Scopus source id when known
  issn                 TEXT,                 -- normalized, no hyphen
  metric_year          INT NOT NULL,
  sjr                  NUMERIC,
  sjr_quartile         TEXT,                 -- Q1..Q4 (SCImago best quartile)
  citescore            NUMERIC,
  citescore_percentile INT,                  -- best percentile across subject areas
  origin               TEXT NOT NULL,        -- 'scopus' or 'scimago'
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS source_metrics_key
  ON source_metrics (COALESCE(source_id, ''), COALESCE(issn, ''), metric_year, origin);
CREATE INDEX IF NOT EXISTS source_metrics_issn_idx ON source_metrics(issn);

-- Log of every sync run, shown on the dashboard as "last updated".
CREATE TABLE IF NOT EXISTS sync_runs (
  id             SERIAL PRIMARY KEY,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'running',  -- running | ok | partial | failed
  lecturers_ok   INT DEFAULT 0,
  lecturers_err  INT DEFAULT 0,
  publications   INT DEFAULT 0,
  message        TEXT
);

-- Best available quartile per publication: SJR quartile of the publication year
-- (or the nearest earlier year), falling back to a CiteScore-derived quartile.
CREATE OR REPLACE VIEW publication_ranking AS
SELECT
  p.eid,
  p.pub_year,
  sj.sjr_quartile,
  cs.citescore_percentile,
  COALESCE(
    sj.sjr_quartile,
    CASE
      WHEN cs.citescore_percentile >= 75 THEN 'Q1'
      WHEN cs.citescore_percentile >= 50 THEN 'Q2'
      WHEN cs.citescore_percentile >= 25 THEN 'Q3'
      WHEN cs.citescore_percentile IS NOT NULL THEN 'Q4'
    END
  ) AS quartile,
  (cs.citescore_percentile >= 90) AS top_tier   -- top 10% CiteScore; confirm against DKSRA definition
FROM publications p
LEFT JOIN LATERAL (
  SELECT m.sjr_quartile FROM source_metrics m
  WHERE m.origin = 'scimago'
    AND m.issn IN (replace(p.issn, '-', ''), replace(p.eissn, '-', ''))
    AND m.metric_year <= COALESCE(p.pub_year, 9999)
  ORDER BY m.metric_year DESC LIMIT 1
) sj ON TRUE
LEFT JOIN LATERAL (
  SELECT m.citescore_percentile FROM source_metrics m
  WHERE m.origin = 'scopus' AND m.source_id = p.source_id
    AND m.metric_year <= COALESCE(p.pub_year, 9999)
  ORDER BY m.metric_year DESC LIMIT 1
) cs ON TRUE;

-- Latest metrics per lecturer, for the dashboard tables.
CREATE OR REPLACE VIEW lecturer_latest AS
SELECT DISTINCT ON (l.id)
  l.id, l.name, d.code AS division_code, d.name AS division_name, l.active,
  s.snapshot_date, s.document_count, s.citation_count, s.h_index
FROM lecturers l
LEFT JOIN divisions d ON d.id = l.division_id
LEFT JOIN author_snapshots s ON s.lecturer_id = l.id
ORDER BY l.id, s.snapshot_date DESC NULLS LAST;

-- Yearly output per division. A paper co-authored by several lecturers of the
-- same division is counted once for that division.
CREATE OR REPLACE VIEW division_yearly AS
WITH div_pubs AS (
  SELECT DISTINCT l.division_id, pa.eid
  FROM publication_authors pa
  JOIN lecturers l ON l.id = pa.lecturer_id
  WHERE l.division_id IS NOT NULL
)
SELECT
  d.code AS division_code,
  p.pub_year,
  COUNT(*)                                   AS publications,
  COUNT(*) FILTER (WHERE r.quartile = 'Q1')  AS q1,
  COUNT(*) FILTER (WHERE r.top_tier)         AS top_tier,
  SUM(p.cited_by)                            AS citations
FROM div_pubs dp
JOIN divisions d ON d.id = dp.division_id
JOIN publications p ON p.eid = dp.eid
LEFT JOIN publication_ranking r ON r.eid = p.eid
GROUP BY d.code, p.pub_year;
