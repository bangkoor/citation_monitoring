import { Suspense } from "react";
import YearRangeFilter from "./YearRangeFilter.tsx";
import { CURRENT_YEAR, DEFAULT_FROM, type YearRange } from "@/lib/range.ts";

/** Range picker row shared by the dashboard pages. */
export default function PageTools({ range, firstYear }: { range: YearRange; firstYear: number | null }) {
  const minYear = Math.min(firstYear ?? DEFAULT_FROM, DEFAULT_FROM, range.from);
  return (
    <Suspense fallback={<div className="range" />}>
      <YearRangeFilter from={range.from} to={range.to} minYear={minYear} maxYear={CURRENT_YEAR} defaultFrom={DEFAULT_FROM} />
    </Suspense>
  );
}
