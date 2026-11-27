"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "./Icon.tsx";
import DivisionIcon from "./DivisionIcon.tsx";

import { DIVISIONS } from "@/lib/divisions.ts";

const DIVS = DIVISIONS.map((d) => d.code as string);
const NAME = Object.fromEntries(DIVISIONS.map((d) => [d.code as string, d.name]));

/** Keeps the selected year range when moving between pages. */
function useRangeQs() {
  const p = useSearchParams();
  const q = new URLSearchParams();
  for (const k of ["dari", "sampai"]) { const v = p.get(k); if (v) q.set(k, v); }
  const s = q.toString();
  return s ? `?${s}` : "";
}

const section = (path: string) => (path.startsWith("/dosen") ? "dosen" : path.startsWith("/divisi") ? "divisi" : "home");

export function PillNav() {
  const path = usePathname();
  const qs = useRangeQs();
  const s = section(path);
  return (
    <nav className="pillnav" aria-label="Navigasi utama">
      <Link href={`/${qs}`} className={s === "home" ? "on" : ""}>Ringkasan</Link>
      <Link href={`/dosen${qs}`} className={s === "dosen" ? "on" : ""}>Dosen</Link>
      <Link href={`/divisi/EMHL${qs}`} className={s === "divisi" ? "on" : ""}>Divisi</Link>
    </nav>
  );
}

export function Rail() {
  const path = usePathname();
  const qs = useRangeQs();
  const s = section(path);
  return (
    <aside className="rail" aria-label="Navigasi samping">
      <div className="rail-group">
        <Link href={`/${qs}`} className={s === "home" ? "on" : ""} aria-label="Ringkasan"><Icon name="grid" /><span className="tag">Ringkasan</span></Link>
        <Link href={`/dosen${qs}`} className={s === "dosen" ? "on" : ""} aria-label="Dosen"><Icon name="users" /><span className="tag">Dosen</span></Link>
        <a href={`/api/export${qs}`} aria-label="Unduh xlsx"><Icon name="download" /><span className="tag">Unduh xlsx</span></a>
      </div>
      <div className="rail-group">
        {DIVS.map((d) => (
          <Link key={d} href={`/divisi/${d}${qs}`} className={path.toUpperCase().startsWith(`/DIVISI/${d}`) ? "on" : ""} aria-label={`Divisi ${d}`}>
            <DivisionIcon code={d} size={20} /><span className="tag"><b>{d}</b> · {NAME[d]}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
