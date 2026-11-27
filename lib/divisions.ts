// The five KSHE divisions. `aliases` are the spellings used on the KSHE website.
export const DIVISIONS = [
  { code: "EMHL", name: "Ekologi dan Manajemen Hidupan Liar", aliases: ["Ekologi dan Manajemen Satwa Liar"] },
  { code: "BPHL", name: "Bioprospeksi dan Pemanfaatan Lestari Hidupan Liar", aliases: ["Bioprospeksi dan Pemanfaatan Hidupan Liar"] },
  { code: "MKK", name: "Manajemen Kawasan Konservasi", aliases: [] },
  { code: "RAE", name: "Rekreasi Alam dan Ekowisata", aliases: [] },
  { code: "ALGM", name: "Analisis Lingkungan dan Geo-Spasial Modeling", aliases: ["Analisis Lingkungan dan Geo Spasial Modeling", "Analisis Lingkungan dan Geospasial Modelling"] },
] as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export function divisionCodeFor(label: string): string | null {
  const n = norm(label);
  if (!n) return null;
  for (const d of DIVISIONS) {
    if ([d.name, ...d.aliases].some((a) => norm(a) === n)) return d.code;
  }
  return null;
}
