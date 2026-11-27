// Fixed categorical slot per division (follows the entity, never its rank).
export const DIVISION_COLOR: Record<string, string> = {
  EMHL: "var(--series-1)",
  BPHL: "var(--series-2)",
  MKK: "var(--series-3)",
  RAE: "var(--series-4)",
  ALGM: "var(--series-5)",
};
export const colorFor = (code: string | null | undefined) => (code && DIVISION_COLOR[code]) || "var(--text-2)";
