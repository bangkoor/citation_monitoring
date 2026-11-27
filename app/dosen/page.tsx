import ExportButton from "@/components/ExportButton.tsx";
import LecturerTable from "@/components/LecturerTable.tsx";
import PageTools from "@/components/PageTools.tsx";
import { fmtDate } from "@/lib/format.ts";
import { getDivisions, getFirstPubYear, getLastSync, getLecturers } from "@/lib/queries.ts";
import { parseRange, rangeLabel, rangeQuery } from "@/lib/range.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dosen · Sitasi Dosen KSHE" };

export default async function DosenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange(await searchParams);
  const qs = rangeQuery(range);
  const [rows, divisions, lastSync, firstYear] = await Promise.all([getLecturers(range), getDivisions(), getLastSync(), getFirstPubYear()]);
  return (
    <>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h1>Sitasi per dosen</h1>
          <p className="sub">Klik judul kolom untuk mengurutkan. {lastSync && <>Data diperbarui {fmtDate(lastSync.finishedAt)}.</>}</p>
        </div>
        <ExportButton href={`/api/export${qs}`} />
      </div>
      <PageTools range={range} firstYear={firstYear} />
      <section className="card">
        <LecturerTable rows={rows} years={range.years} rangeLabel={rangeLabel(range)} qs={qs} divisions={divisions} />
      </section>
    </>
  );
}
