"use client";
import { useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const nf = new Intl.NumberFormat("id-ID");
type Row = { year: number; publications: number; citations: number };

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Row;
  return (
    <div className="tooltip">
      <div className="t">{label}</div>
      <div className="r"><span><span className="swatch" style={{ background: "var(--accent-bar)" }} />Publikasi</span><span className="num">{nf.format(d.publications)}</span></div>
      <div className="r"><span><span className="swatch" style={{ background: "var(--accent)" }} />Sitasi</span><span className="num">{nf.format(d.citations)}</span></div>
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>sitasi yang diterima publikasi terbitan {label}</div>
    </div>
  );
}

/**
 * Department publications per year (bars, left axis) with the citations those papers received (line, right axis).
 * The hovered (or latest) year is solid, with a bubble showing the change in publications.
 */
export default function DeptBars({ data }: { data: Row[] }) {
  const metric = "publications" as const;
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? data.length - 1;

  const change = (i: number) => {
    if (i <= 0) return null;
    const prev = data[i - 1][metric], cur = data[i][metric];
    if (!prev) return null;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const Bubble = (props: any) => {
    const { x, y, width, index } = props;
    if (index !== active) return null;
    const c = change(index);
    const text = c === null ? nf.format(data[index][metric]) : `${c > 0 ? "+" : ""}${c}%`;
    const w = Math.max(44, text.length * 7.5 + 18);
    const cx = x + width / 2;
    return (
      <g pointerEvents="none">
        <rect x={cx - w / 2} y={y - 34} width={w} height={22} rx={11} fill="var(--accent)" />
        <path d={`M${cx - 5} ${y - 12.5} L${cx} ${y - 7} L${cx + 5} ${y - 12.5} Z`} fill="var(--accent)" />
        <text x={cx} y={y - 19} textAnchor="middle" fill="var(--on-accent)" fontSize={12} fontWeight={650}>{text}</text>
      </g>
    );
  };

  return (
    <>
      <div className="card-head">
        <div className="card-title">
          <span className="card-icon" aria-hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></span>
          <div><h2>Publikasi dan sitasi per tahun</h2>
            <p>Dokumen unik seluruh departemen, dan sitasi yang diterimanya</p></div>
        </div>
        </div>
      <div className="combo-legend" style={{ marginBottom: 4 }}>
        <span><span className="key bar" /><span>Publikasi <em>(sumbu kiri)</em></span></span>
        <span><span className="key line" /><span>Sitasi yang diterima <em>(sumbu kanan)</em></span></span>
      </div>
      <div className="chart" style={{ height: 320 }} role="img" aria-label="Grafik publikasi dan sitasi per tahun">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 40, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%"
            onMouseMove={(s: any) => setHover(typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : null)}
            onMouseLeave={() => setHover(null)}>
            <defs>
              <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" style={{ fill: "var(--accent-bar)" }} />
                <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: "var(--surface)", strokeOpacity: 0.35 }} strokeWidth="3" />
              </pattern>
              <pattern id="hatch-on" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" style={{ fill: "var(--accent-strong)" }} />
                <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: "var(--accent)" }} strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="year" stroke="var(--text-2)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="pub" stroke="var(--text-2)" fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false}
              tickFormatter={(v) => nf.format(v)} />
            <YAxis yAxisId="cit" orientation="right" stroke="var(--text-2)" fontSize={12} tickLine={false} axisLine={false} width={48} allowDecimals={false}
              tickFormatter={(v) => (v >= 1000 ? `${nf.format(v / 1000)}rb` : nf.format(v))} />
            <Tooltip content={<Tip />} cursor={false} />
            <Bar yAxisId="pub" dataKey={metric} radius={999} maxBarSize={64} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={i === active ? "url(#hatch-on)" : "url(#hatch)"} />)}
              <LabelList dataKey={metric} content={<Bubble />} />
            </Bar>
            <Line yAxisId="cit" type="monotone" dataKey="citations" stroke="var(--accent)" strokeWidth={2.5}
              dot={{ r: 4.5, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--accent)" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
