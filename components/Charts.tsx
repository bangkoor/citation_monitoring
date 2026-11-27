"use client";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const nf = new Intl.NumberFormat("id-ID");
const axis = { stroke: "var(--text-2)", fontSize: 12, tickLine: false, axisLine: false } as const;

export interface Series { key: string; label: string; color: string }

function Tip({ active, payload, label, series }: any) {
  if (!active || !payload?.length) return null;
  const rows = [...payload].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="tooltip">
      <div className="t">{label}</div>
      {rows.map((p: any) => {
        const s = series?.find((x: Series) => x.key === p.dataKey);
        return (
          <div className="r" key={p.dataKey}>
            <span><span className="swatch" style={{ background: p.color }} />{s?.label ?? p.name}</span>
            <span className="num">{nf.format(p.value ?? 0)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Multi-series trend over years, one line per division. */
export function TrendChart({ data, series, unit }: { data: Record<string, number | string>[]; series: Series[]; unit?: string }) {
  return (
    <>
      <div className="legend">
        {series.map((s) => (
          <span key={s.key}><span className="swatch" style={{ background: s.color }} /><span className="code">{s.key}</span>{s.label}</span>
        ))}
      </div>
      <div className="chart" role="img" aria-label={`Grafik tren ${unit ?? ""} per tahun`}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="year" {...axis} />
            <YAxis {...axis} width={44} allowDecimals={false} tickFormatter={(v) => nf.format(v)} />
            <Tooltip content={<Tip series={series} />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: s.color }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/** Single-series bars, e.g. publications per year for one lecturer. */
export function YearBars({ data, label, color = "var(--series-1)" }: { data: { year: number | string; value: number }[]; label: string; color?: string }) {
  const series = [{ key: "value", label, color }];
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="year" {...axis} />
          <YAxis {...axis} width={44} allowDecimals={false} tickFormatter={(v) => nf.format(v)} />
          <Tooltip content={<Tip series={series} />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="value" name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series line over sync dates, e.g. total citations per snapshot. */
export function SnapshotLine({ data, label }: { data: { date: string; value: number | null }[]; label: string }) {
  const series = [{ key: "value", label, color: "var(--series-1)" }];
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" {...axis} />
          <YAxis {...axis} width={52} allowDecimals={false} tickFormatter={(v) => nf.format(v)} domain={["auto", "auto"]} />
          <Tooltip content={<Tip series={series} />} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey="value" name={label} stroke="var(--series-1)" strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--series-1)" }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
