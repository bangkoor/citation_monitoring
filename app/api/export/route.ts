import ExcelJS from "exceljs";
import { getAllPublications, getDivisionSummaries, getLastSync, getLecturers } from "@/lib/queries.ts";
import { parseRange, rangeLabel } from "@/lib/range.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6B3A" } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 30;
  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const divisi = params.get("divisi")?.toUpperCase() || null;
  const range = parseRange(params);
  const YEARS = range.years;
  const label = rangeLabel(range);
  const [summaries, lecturersAll, pubsAll, lastSync] = await Promise.all([
    getDivisionSummaries(range), getLecturers(range), getAllPublications(range), getLastSync(),
  ]);
  const divisions = divisi ? summaries.filter((d) => d.code === divisi) : summaries;
  if (divisi && divisions.length === 0) return new Response("Divisi tidak ditemukan", { status: 404 });
  const lecturers = divisi ? lecturersAll.filter((l) => l.division_code === divisi) : lecturersAll;
  const names = new Set(lecturers.map((l) => l.name));
  const pubs = divisi ? pubsAll.filter((p) => (p.authors ?? "").split("; ").some((a) => names.has(a))) : pubsAll;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sitasi Dosen KSHE";
  wb.created = new Date();

  // Sheet 1: division recap
  const ws1 = wb.addWorksheet("Rekap Divisi");
  ws1.columns = [
    { header: "Kode", key: "code", width: 8 },
    { header: "Divisi", key: "name", width: 44 },
    { header: "Dosen aktif", key: "active", width: 11 },
    ...YEARS.map((y) => ({ header: `Publikasi ${y}`, key: `p${y}`, width: 12 })),
    { header: `Rata-rata publikasi per dosen per tahun ${label}`, key: "avg", width: 18, style: { numFmt: "0.00" } },
    ...YEARS.map((y) => ({ header: `Q1 ${y}`, key: `q${y}`, width: 9 })),
    ...YEARS.map((y) => ({ header: `Sitasi ${y}`, key: `c${y}`, width: 10 })),
    { header: `Total publikasi ${label}`, key: "pubs", width: 12 },
    { header: "Total Q1", key: "q1", width: 10 },
    { header: "Total Top Tier", key: "tt", width: 12 },
    { header: "Total sitasi", key: "cites", width: 12 },
  ];
  for (const d of divisions) {
    const row: Record<string, unknown> = { code: d.code, name: d.name, active: d.lecturers_active, pubs: d.publications, q1: d.q1, tt: d.top_tier, cites: d.citations };
    for (const y of YEARS) { row[`p${y}`] = d.by_year[y].publications; row[`q${y}`] = d.by_year[y].q1; row[`c${y}`] = d.by_year[y].citations; }
    row.avg = d.lecturers_active ? d.publications / YEARS.length / d.lecturers_active : 0;
    ws1.addRow(row);
  }
  styleHeader(ws1);

  // Sheet 2: lecturers
  const ws2 = wb.addWorksheet("Dosen");
  ws2.columns = [
    { header: "Nama", key: "name", width: 30 },
    { header: "Divisi", key: "div", width: 8 },
    { header: "Jabatan akademik", key: "rank", width: 20 },
    { header: "Status", key: "status", width: 22 },
    { header: "Scopus ID", key: "scopus", width: 14 },
    { header: "SINTA ID", key: "sinta", width: 11 },
    { header: `Publikasi ${label}`, key: "pubs", width: 11 },
    { header: `Sitasi publikasi ${label}`, key: "citesr", width: 12 },
    { header: `Q1 ${label}`, key: "q1", width: 10 },
    { header: "Dokumen Scopus (seluruh karier)", key: "docs", width: 13 },
    { header: "Total sitasi Scopus (seluruh karier)", key: "cites", width: 13 },
    { header: "Δ sitasi sejak pembaruan sebelumnya", key: "growth", width: 16 },
    { header: "h-index", key: "h", width: 9 },
    ...YEARS.map((y) => ({ header: `Publikasi ${y}`, key: `p${y}`, width: 11 })),
    { header: "Tanggal data", key: "date", width: 13 },
  ];
  for (const l of lecturers) {
    const row: Record<string, unknown> = {
      name: l.name, div: l.division_code, rank: l.academic_rank, status: l.active ? "Aktif" : (l.status_note ?? "Tidak aktif"),
      scopus: l.scopus_id, sinta: l.sinta_id, pubs: l.pubs_range, citesr: l.cites_range, docs: l.documents, cites: l.citations,
      growth: l.citations !== null && l.citations_prev !== null ? l.citations - l.citations_prev : null,
      h: l.h_index, q1: l.q1, date: l.snapshot_date,
    };
    for (const y of YEARS) row[`p${y}`] = l.by_year[y] ?? 0;
    ws2.addRow(row);
  }
  styleHeader(ws2);

  // Sheet 3: publications
  const ws3 = wb.addWorksheet("Publikasi");
  ws3.columns = [
    { header: "Tahun", key: "year", width: 7 },
    { header: "Judul", key: "title", width: 70 },
    { header: "Dosen KSHE", key: "authors", width: 36 },
    { header: "Sumber", key: "source", width: 36 },
    { header: "Jenis", key: "type", width: 16 },
    { header: "Kuartil", key: "q", width: 8 },
    { header: "Top Tier", key: "tt", width: 9 },
    { header: "Sitasi", key: "cites", width: 8 },
    { header: "DOI", key: "doi", width: 30 },
    { header: "Scopus EID", key: "eid", width: 22 },
  ];
  for (const p of pubs) {
    ws3.addRow({ year: p.pub_year, title: p.title, authors: p.authors, source: p.source_title, type: p.doc_type,
      q: p.quartile, tt: p.top_tier ? "Ya" : "", cites: p.cited_by, doi: p.doi, eid: p.eid });
  }
  styleHeader(ws3);

  // Sheet 4: notes
  const ws4 = wb.addWorksheet("Keterangan");
  ws4.columns = [{ header: "Keterangan", key: "k", width: 110 }];
  [
    `Sumber data: Scopus (Elsevier). Pembaruan terakhir: ${lastSync ? new Date(lastSync.finishedAt).toISOString().slice(0, 10) : "-"}.`,
    "Publikasi divisi: artikel yang ditulis bersama oleh beberapa dosen dalam satu divisi dihitung satu kali.",
    `Rentang tahun publikasi: ${label}. Sitasi per tahun = sitasi yang diterima publikasi terbitan tahun tersebut.`,
    `Rata-rata publikasi per dosen per tahun: jumlah publikasi divisi ${label} dibagi ${YEARS.length} tahun dan jumlah dosen aktif saat ini.`,
    "Kuartil: kuartil SJR (SCImago) bila tersedia; jika tidak, persentil CiteScore Scopus (≥75 = Q1).",
    "Top Tier: persentil CiteScore ≥ 90 (10% teratas).",
  ].forEach((k) => ws4.addRow({ k }));
  ws4.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `sitasi-kshe${divisi ? `-${divisi}` : ""}-${range.from}-${range.to}-${stamp}.xlsx`;
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
