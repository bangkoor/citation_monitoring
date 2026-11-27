const nf = new Intl.NumberFormat("id-ID");
export const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "–" : nf.format(v));
export const fmt1 = (v: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v);
export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(d));
