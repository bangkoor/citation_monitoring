// Loads data/dosen_kshe.csv into the divisions and lecturers tables.
// Re-run after editing the CSV; existing rows are updated by name.
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { getSql } from "../lib/db.ts";
import { DIVISIONS, divisionCodeFor } from "../lib/divisions.ts";

type Row = Record<string, string>;
const rows: Row[] = parse(readFileSync(new URL("../data/dosen_kshe.csv", import.meta.url)), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const sql = getSql();
for (const d of DIVISIONS) {
  await sql`INSERT INTO divisions (code, name) VALUES (${d.code}, ${d.name})
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`;
}
const divIds = new Map((await sql`SELECT id, code FROM divisions`).map((r) => [r.code as string, r.id as number]));

const blank = (v?: string) => (v && v.trim() ? v.trim() : null);
let n = 0;
for (const r of rows) {
  const code = divisionCodeFor(r.divisi ?? "");
  if (!code) console.warn(`! No division match for "${r.nama}" (divisi="${r.divisi}")`);
  const active = (r.aktif ?? "ya").toLowerCase() !== "tidak";
  const yearMatch = (r.status ?? "").match(/(19|20)\d{2}/);
  await sql`
    INSERT INTO lecturers (name, division_id, academic_rank, active, status_note, end_year,
                           scopus_id, sinta_id, google_scholar_id, orcid, researchgate, updated_at)
    VALUES (${r.nama}, ${code ? divIds.get(code)! : null}, ${blank(r.jabatan_akademik)}, ${active},
            ${blank(r.status)}, ${active || !yearMatch ? null : Number(yearMatch[0])},
            ${blank(r.scopus_id)}, ${blank(r.sinta_id)}, ${blank(r.google_scholar_id)},
            ${blank(r.orcid)}, ${blank(r.researchgate)}, now())
    ON CONFLICT (name) DO UPDATE SET
      division_id = EXCLUDED.division_id, academic_rank = EXCLUDED.academic_rank,
      active = EXCLUDED.active, status_note = EXCLUDED.status_note, end_year = EXCLUDED.end_year,
      scopus_id = EXCLUDED.scopus_id, sinta_id = EXCLUDED.sinta_id,
      google_scholar_id = EXCLUDED.google_scholar_id, orcid = EXCLUDED.orcid,
      researchgate = EXCLUDED.researchgate, updated_at = now()`;
  n++;
}
console.log(`Seeded ${n} lecturers.`);
await sql.end();
