import LecturerTable from "@/components/LecturerTable.tsx";
import { fmtDate } from "@/lib/format.ts";
import { YEARS, getDivisions, getLastSync, getLecturers } from "@/lib/queries.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dosen · Sitasi Dosen KSHE" };

export default async function DosenPage() {
  const [rows, divisions, lastSync] = await Promise.all([getLecturers(), getDivisions(), getLastSync()]);
  return (
    <>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h1>Sitasi per dosen</h1>
          <p className="sub">Klik judul kolom untuk mengurutkan. {lastSync && <>Data diperbarui {fmtDate(lastSync.finishedAt)}.</>}</p>
        </div>
        <a className="btn primary" href="/api/export" download>Unduh xlsx</a>
      </div>
      <section className="card">
        <LecturerTable rows={rows} years={YEARS} divisions={divisions} />
      </section>
    </>
  );
}
