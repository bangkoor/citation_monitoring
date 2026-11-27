// Year range used by every page and the xlsx export, read from ?dari=YYYY&sampai=YYYY.
export const CURRENT_YEAR = new Date().getFullYear();
export const MIN_YEAR = 2000;
export const DEFAULT_FROM = CURRENT_YEAR - 5;

export interface YearRange { from: number; to: number; years: number[]; isDefault: boolean }

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function pick(p: Params, k: string): string | undefined {
  if (p instanceof URLSearchParams) return p.get(k) ?? undefined;
  const v = p[k];
  return Array.isArray(v) ? v[0] : v;
}

export function parseRange(p: Params = {}): YearRange {
  const clamp = (v: number) => Math.min(CURRENT_YEAR, Math.max(MIN_YEAR, v));
  const num = (s: string | undefined, d: number) => (s && /^\d{4}$/.test(s) ? clamp(Number(s)) : d);
  let from = num(pick(p, "dari"), DEFAULT_FROM);
  let to = num(pick(p, "sampai"), CURRENT_YEAR);
  if (from > to) [from, to] = [to, from];
  return {
    from, to,
    years: Array.from({ length: to - from + 1 }, (_, i) => from + i),
    isDefault: from === DEFAULT_FROM && to === CURRENT_YEAR,
  };
}

/** Query string for links that keep the current range, e.g. "?dari=2021&sampai=2026". */
export function rangeQuery(r: YearRange, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams(extra);
  if (!r.isDefault) { q.set("dari", String(r.from)); q.set("sampai", String(r.to)); }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const rangeLabel = (r: YearRange) => (r.from === r.to ? String(r.from) : `${r.from}–${r.to}`);
