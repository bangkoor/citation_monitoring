import type { ReactNode } from "react";
import { colorFor } from "@/lib/colors.ts";

// One stroke icon per division (24px grid), drawn in the division's colour.
const ICONS: Record<string, ReactNode> = {
  // Ekologi & Manajemen Hidupan Liar: jejak satwa
  EMHL: (
    <>
      <path d="M12 12.5c-2.8 0-5 2.5-5 4.8 0 1.6 1.3 2.5 2.7 2.5.9 0 1.5-.5 2.3-.5s1.4.5 2.3.5c1.4 0 2.7-.9 2.7-2.5 0-2.3-2.2-4.8-5-4.8z" />
      <circle cx="5.3" cy="10.2" r="1.7" /><circle cx="9.3" cy="6" r="1.9" />
      <circle cx="14.7" cy="6" r="1.9" /><circle cx="18.7" cy="10.2" r="1.7" />
    </>
  ),
  // Bioprospeksi & Pemanfaatan Lestari: labu uji berisi daun
  BPHL: (
    <>
      <path d="M9 3h6M10 3v6l-5.2 9.1A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.9L14 9V3" />
      <path d="M9.5 18.5c0-2.6 2-4.3 4.8-4.3 0 2.6-2 4.3-4.8 4.3zM9.5 18.5l2.6-2.2" />
    </>
  ),
  // Manajemen Kawasan Konservasi: perisai dengan pohon
  MKK: (
    <>
      <path d="M12 3l7 3v5c0 4.6-3 8.5-7 10-4-1.5-7-5.4-7-10V6l7-3z" />
      <path d="M12 7.5l-3 4.3h1.8L9 14.6h6l-1.8-2.8H15L12 7.5zM12 14.6v3" />
    </>
  ),
  // Rekreasi Alam & Ekowisata: tenda
  RAE: (
    <>
      <path d="M12 4 3.5 20M12 4l8.5 16M2.5 20h19M12 12.5 9 20M12 12.5l3 7.5" />
    </>
  ),
  // Analisis Lingkungan & Geo-Spasial: peta terlipat dengan penanda
  ALGM: (
    <>
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7zM9 4v13M15 7v13" />
    </>
  ),
};

/** Division icon. `badge` puts it on a soft tinted circle. */
export default function DivisionIcon({ code, size = 18, badge = false, inherit = false }:
  { code: string | null | undefined; size?: number; badge?: boolean; inherit?: boolean }) {
  const color = colorFor(code);
  const svg = (
    <svg className="divicon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={inherit ? undefined : { color }}>
      {(code && ICONS[code]) || <circle cx="12" cy="12" r="5" />}
    </svg>
  );
  if (!badge) return svg;
  return <span className="divbadge" style={{ ["--c" as string]: color, width: size + 12, height: size + 12 }}>{svg}</span>;
}
