"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { AccountReport } from "@/lib/types";

interface Props {
  accountId: string;
  accountName: string;
  currency: string;
}

function fmt(currency: string, value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 2,
  }).format(value);
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return iso; }
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#6b7280] text-xs">—</span>;
  const pos = value >= 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${pos ? "text-[#34a853]" : "text-[#ea4335]"}`}>
      {pos ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  change: number | null;
}

function StatTile({ label, value, change }: StatTileProps) {
  return (
    <div className="bg-[#141a2e] rounded-lg p-3 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-wider text-[#8b93b0] font-medium">{label}</p>
      <p className="text-xl font-bold text-white leading-tight">{value}</p>
      <Change value={change} />
    </div>
  );
}

const CHART_COLORS = { green: "#34a853", blue: "#4285f4" };

interface SectionChartProps {
  data: AccountReport["dailyData"];
  leftKey: keyof AccountReport["dailyData"][0];
  rightKey: keyof AccountReport["dailyData"][0];
  leftLabel: string;
  rightLabel: string;
  leftFormatter?: (v: number) => string;
  rightFormatter?: (v: number) => string;
}

function SectionChart({
  data, leftKey, rightKey, leftLabel, rightLabel,
  leftFormatter = (v) => String(v),
  rightFormatter = (v) => `${v}%`,
}: SectionChartProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    [leftKey]:  d[leftKey],
    [rightKey]: d[rightKey],
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => { try { return format(parseISO(v), "d MMM"); } catch { return v; } }}
          interval={Math.floor(data.length / 5)}
        />
        <YAxis yAxisId="left"  tick={{ fill: "#6b7280", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={leftFormatter}  width={36} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#6b7280", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={rightFormatter} width={36} />
        <Tooltip
          contentStyle={{ background: "#0d1120", border: "1px solid #1e2a44", borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: "#9aa0b4" }}
          itemStyle={{ color: "#d1d5db" }}
          labelFormatter={(v) => { try { return format(parseISO(v), "MMM d, yyyy"); } catch { return v; } }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((rawValue: any, name: any) => {
            const v = Number(rawValue ?? 0);
            if (name === (leftKey as string))  return [leftFormatter(v),  leftLabel];
            if (name === (rightKey as string)) return [rightFormatter(v), rightLabel];
            return [v, name];
          }) as any}
        />
        <Line yAxisId="left"  type="monotone" dataKey={leftKey as string}  stroke={CHART_COLORS.green} strokeWidth={2} dot={false} name={leftKey as string} />
        <Line yAxisId="right" type="monotone" dataKey={rightKey as string} stroke={CHART_COLORS.blue}  strokeWidth={2} dot={false} name={rightKey as string} />
        <Legend
          wrapperStyle={{ fontSize: 9, paddingTop: 2 }}
          formatter={(value) => value === (leftKey as string) ? leftLabel : rightLabel}
          iconType="line"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function ReportingPanel({ accountId, accountName, currency }: Props) {
  const [report, setReport]   = useState<AccountReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/account/${accountId}/report-data`)
      .then((r) => r.json())
      .then((data) => { setReport(data); setLoading(false); })
      .catch(() => { setError("Failed to load report data"); setLoading(false); });
  }, [accountId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center text-[#4e4e63] text-sm">
        Loading report…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="py-6 text-red-400 text-sm text-center">{error ?? "No data"}</div>
    );
  }

  const m = report.metrics;
  const cur = currency;

  return (
    <div className="report-panel text-white" id={`report-${accountId}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] text-[#8b93b0] uppercase tracking-wider mb-0.5">Report period</p>
          <p className="text-sm font-semibold text-[#c8cfe8]">
            {fmtDate(report.periodStart)} — {fmtDate(report.periodEnd)}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="no-print flex items-center gap-1.5 rounded-lg border border-[#2a3a5c] bg-[#141a2e] px-3 py-1.5 text-xs font-medium text-[#8b93b0] hover:border-[#4285f4]/50 hover:text-[#4285f4] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          Download PDF
        </button>
      </div>

      {/* Section banner */}
      <div className="bg-[#1a2540] rounded-lg px-4 py-2 mb-4">
        <p className="text-xs font-semibold text-[#7b8db0] uppercase tracking-widest">Overview</p>
      </div>

      {/* Three metric sections */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* 1. Click Through Rate & Impressions */}
        <div className="bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider">Click Through Rate &amp; Impressions</p>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Clicks"      value={fmtK(m.clicks)}           change={m.clicksChange} />
            <StatTile label="CTR"         value={`${m.ctr.toFixed(1)}%`}    change={m.ctrChange} />
            <StatTile label="Impressions" value={fmtK(m.impressions)}       change={m.impressionsChange} />
          </div>
          <SectionChart
            data={report.dailyData}
            leftKey="clicks" leftLabel="Clicks" leftFormatter={(v) => fmtK(v)}
            rightKey="ctr"   rightLabel="CTR"   rightFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </div>

        {/* 2. Conversion Rate & Cost */}
        <div className="bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider">Conversion Rate &amp; Cost</p>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Conversions"    value={m.conversions.toFixed(1)}                                       change={m.conversionsChange} />
            <StatTile label="Conv. rate"     value={`${m.convRate.toFixed(1)}%`}                                    change={m.convRateChange} />
            <StatTile label="Cost / conv."   value={m.costPerConv !== null ? fmt(cur, m.costPerConv) : "—"}         change={m.costPerConvChange} />
            <StatTile label="All conv. value" value={m.allConvValue >= 1000 ? `${fmt(cur, m.allConvValue / 1000).replace(/\.00$/, "")}K` : fmt(cur, m.allConvValue)} change={m.allConvValueChange} />
          </div>
          <SectionChart
            data={report.dailyData}
            leftKey="conversions" leftLabel="Conversions" leftFormatter={(v) => v.toFixed(1)}
            rightKey="convRate"   rightLabel="Conv. rate"  rightFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </div>

        {/* 3. Cost Per Click */}
        <div className="bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider">Cost Per Click</p>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Cost"     value={fmt(cur, m.cost)}    change={m.costChange} />
            <StatTile label="Avg. CPC" value={fmt(cur, m.avgCpc)}  change={m.avgCpcChange} />
          </div>
          <SectionChart
            data={report.dailyData}
            leftKey="cost"   leftLabel="Cost"     leftFormatter={(v) => fmt(cur, v)}
            rightKey="avgCpc" rightLabel="Avg. CPC" rightFormatter={(v) => fmt(cur, v)}
          />
        </div>
      </div>

      {/* Bottom: Campaigns + Device Breakdown */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">

        {/* Top Campaigns — wider */}
        <div className="xl:col-span-3 bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider mb-3">Top Campaigns</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6b7280] border-b border-[#1e2a44]">
                  <th className="text-left pb-2 pr-3 font-medium">Campaign</th>
                  <th className="text-right pb-2 px-2 font-medium whitespace-nowrap">Avg. CPC</th>
                  <th className="text-right pb-2 px-2 font-medium whitespace-nowrap">Cost/conv.</th>
                  <th className="text-right pb-2 px-2 font-medium whitespace-nowrap">Cost</th>
                  <th className="text-right pb-2 px-2 font-medium whitespace-nowrap">Conv. value</th>
                  <th className="text-right pb-2 pl-2 font-medium whitespace-nowrap">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {report.campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-[#1e2a44]/50 hover:bg-[#141a2e]/60">
                    <td className="py-2 pr-3 text-[#c8cfe8] max-w-[160px] truncate" title={c.name}>{c.name}</td>
                    <td className="py-2 px-2 text-right text-[#9aa0b4]">{fmt(cur, c.avgCpc)}</td>
                    <td className="py-2 px-2 text-right text-[#9aa0b4]">{c.costPerConv !== null ? fmt(cur, c.costPerConv) : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#9aa0b4]">{fmt(cur, c.cost)}</td>
                    <td className="py-2 px-2 text-right text-[#9aa0b4]">{fmt(cur, c.allConvValue)}</td>
                    <td className="py-2 pl-2 text-right text-[#c8cfe8] font-medium">{c.conversions.toFixed(1)}</td>
                  </tr>
                ))}
                {report.campaigns.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-[#4e4e63]">No campaign data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="xl:col-span-2 bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider mb-3">Device Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6b7280] border-b border-[#1e2a44]">
                  <th className="text-left pb-2 pr-3 font-medium">Device</th>
                  <th className="text-right pb-2 px-2 font-medium">Clicks</th>
                  <th className="text-right pb-2 px-2 font-medium">Cost</th>
                  <th className="text-right pb-2 pl-2 font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {report.devices.map((d, i) => (
                  <tr key={i} className="border-b border-[#1e2a44]/50 hover:bg-[#141a2e]/60">
                    <td className="py-2 pr-3 text-[#c8cfe8]">{d.device}</td>
                    <td className="py-2 px-2 text-right text-[#9aa0b4]">{fmtK(d.clicks)}</td>
                    <td className="py-2 px-2 text-right text-[#9aa0b4]">{fmt(cur, d.cost)}</td>
                    <td className="py-2 pl-2 text-right text-[#c8cfe8] font-medium">{d.conversions.toFixed(1)}</td>
                  </tr>
                ))}
                {report.devices.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-[#4e4e63]">No device data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .report-panel, .report-panel * { visibility: visible !important; }
          .report-panel {
            position: fixed !important;
            inset: 0 !important;
            padding: 20px !important;
            background: #0a0e1a !important;
            overflow: auto !important;
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
