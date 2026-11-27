// Imports a SCImago Journal Rank export to get SJR quartiles.
// Download "scimagojr <YEAR>.csv" from https://www.scimagojr.com/journalrank.php (Download data),
// then run:  npm run import:scimago -- "path/to/scimagojr 2025.csv" 2025
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { getSql } from "../lib/db.ts";

const [file, yearArg] = process.argv.slice(2);
const year = Number(yearArg);
if (!file || !Number.isInteger(year)) {
  console.error('Usage: npm run import:scimago -- "<scimagojr YEAR.csv>" <YEAR>');
  process.exit(1);
}

// SCImago files are ';'-separated and use ',' as the decimal mark.
const rows: Record<string, string>[] = parse(readFileSync(file), {
  columns: true, delimiter: ";", skip_empty_lines: true, relax_quotes: true, bom: true,
});

const sql = getSql();
let n = 0;
for (const r of rows) {
  const quartile = (r["SJR Best Quartile"] ?? "").trim();
  const sjr = Number((r["SJR"] ?? "").replace(",", "."));
  const issns = (r["Issn"] ?? "").split(",").map((s) => s.trim().replace(/-/g, "")).filter(Boolean);
  if (!/^Q[1-4]$/.test(quartile) || issns.length === 0) continue;
  for (const issn of issns) {
    await sql`
      INSERT INTO source_metrics (source_id, issn, metric_year, sjr, sjr_quartile, origin, updated_at)
      VALUES (NULL, ${issn}, ${year}, ${Number.isFinite(sjr) ? sjr : null}, ${quartile}, 'scimago', now())
      ON CONFLICT (COALESCE(source_id, ''), COALESCE(issn, ''), metric_year, origin) DO UPDATE SET
        sjr = EXCLUDED.sjr, sjr_quartile = EXCLUDED.sjr_quartile, updated_at = now()`;
    n++;
  }
}
console.log(`Imported ${n} ISSN rows for ${year}.`);
await sql.end();
