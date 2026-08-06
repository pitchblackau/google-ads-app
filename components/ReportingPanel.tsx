"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { AccountReport } from "@/lib/types";

interface Props {
  accountId: string;
  accountName: string;
  currency: string;
}

const REPORT_PERIODS = [
  { label: "Last 7 Days",  value: "LAST_7_DAYS"  },
  { label: "Last 14 Days", value: "LAST_14_DAYS" },
  { label: "Last Month",   value: "LAST_MONTH"   },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
] as const;
type ReportPeriod = typeof REPORT_PERIODS[number]["value"];

const DEVICE_COLORS: Record<string, string> = {
  Mobile:  "#4285f4",
  Desktop: "#34a853",
  Tablet:  "#fbbc04",
  TV:      "#ea4335",
  Other:   "#9aa0b4",
};

function fmt(currency: string, value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 2,
  }).format(value);
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtDate(iso: string) {
  try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return iso; }
}

function Change({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-[#6b7280] text-xs">—</span>;
  const improved = inverse ? value < 0 : value >= 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${improved ? "text-[#34a853]" : "text-[#ea4335]"}`}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function StatTile({ label, value, change, inverse = false }: { label: string; value: string; change: number | null; inverse?: boolean }) {
  return (
    <div className="bg-[#141a2e] rounded-lg p-3 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-wider text-[#8b93b0] font-medium">{label}</p>
      <p className="text-xl font-bold text-white leading-tight">{value}</p>
      <Change value={change} inverse={inverse} />
    </div>
  );
}

function SectionChart({
  data, leftKey, rightKey, leftLabel, rightLabel, leftFormatter, rightFormatter,
}: {
  data: AccountReport["dailyData"];
  leftKey: keyof AccountReport["dailyData"][0];
  rightKey: keyof AccountReport["dailyData"][0];
  leftLabel: string; rightLabel: string;
  leftFormatter?: (v: number) => string;
  rightFormatter?: (v: number) => string;
}) {
  const lf = leftFormatter  ?? ((v) => String(v));
  const rf = rightFormatter ?? ((v) => `${v}%`);
  const chartData = data.map((d) => ({ date: d.date, [leftKey]: d[leftKey], [rightKey]: d[rightKey] }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" vertical={false} />
        <XAxis
          dataKey="date" tick={{ fill: "#6b7280", fontSize: 9 }} tickLine={false} axisLine={false}
          tickFormatter={(v) => { try { return format(parseISO(v), "d MMM"); } catch { return v; } }}
          interval={Math.max(1, Math.floor(data.length / 5))}
        />
        <YAxis yAxisId="left"  tick={{ fill: "#6b7280", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={lf} width={36} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#6b7280", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={rf} width={36} />
        <Tooltip
          contentStyle={{ background: "#0d1120", border: "1px solid #1e2a44", borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: "#9aa0b4" }} itemStyle={{ color: "#d1d5db" }}
          labelFormatter={(v) => { try { return format(parseISO(v), "MMM d, yyyy"); } catch { return v; } }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((rawValue: any, name: any) => {
            const v = Number(rawValue ?? 0);
            if (name === (leftKey as string))  return [lf(v), leftLabel];
            if (name === (rightKey as string)) return [rf(v), rightLabel];
            return [v, name];
          }) as any}
        />
        <Line yAxisId="left"  type="monotone" dataKey={leftKey as string}  stroke="#34a853" strokeWidth={2} dot={false} name={leftKey as string} />
        <Line yAxisId="right" type="monotone" dataKey={rightKey as string} stroke="#4285f4" strokeWidth={2} dot={false} name={rightKey as string} />
        <Legend
          wrapperStyle={{ fontSize: 9, paddingTop: 2 }}
          formatter={(value) => value === (leftKey as string) ? leftLabel : rightLabel}
          iconType="line"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function DeviceDonut({
  devices, metric, label, formatter,
}: {
  devices: AccountReport["devices"];
  metric: keyof AccountReport["devices"][0];
  label: string;
  formatter: (v: number) => string;
}) {
  const data = devices
    .filter((d) => Number(d[metric]) > 0)
    .map((d) => ({ name: d.device, value: Number(d[metric]) }));

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-[#8b93b0] font-semibold">{label}</p>
      <div className="relative">
        <PieChart width={140} height={140}>
          <Pie
            data={data}
            cx={65} cy={65}
            innerRadius={40} outerRadius={62}
            dataKey="value"
            stroke="none"
            startAngle={90} endAngle={-270}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={DEVICE_COLORS[entry.name] ?? "#9aa0b4"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#0d1120", border: "1px solid #1e2a44", borderRadius: 6, fontSize: 11 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((v: any) => [formatter(Number(v ?? 0)), ""]) as any}
          />
        </PieChart>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-[#6b7280]">Total</p>
          <p className="text-sm font-bold text-white leading-tight">{formatter(total)}</p>
        </div>
      </div>
      {/* Legend */}
      <div className="w-full flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DEVICE_COLORS[d.name] ?? "#9aa0b4" }} />
            <span className="text-[#9aa0b4] flex-1">{d.name}</span>
            <span className="text-white font-medium tabular-nums">{formatter(d.value)}</span>
            <span className="text-[#4e4e63] tabular-nums w-10 text-right">
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportingPanel({ accountId, accountName, currency }: Props) {
  const [period, setPeriod]     = useState<ReportPeriod>("LAST_30_DAYS");
  const [open, setOpen]         = useState(false);
  const [report, setReport]     = useState<AccountReport | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/account/${accountId}/report-data?period=${period}`)
      .then((r) => r.json())
      .then((data) => { setReport(data); setLoading(false); })
      .catch(() => { setError("Failed to load report data"); setLoading(false); });
  }, [accountId, period]);

  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportPdf = useCallback(async () => {
    const el = document.getElementById(`report-panel-${accountId}`);
    if (!el) {
      setExportError("Could not find report element — try refreshing.");
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);

      const dataUrl = await toPng(el, {
        backgroundColor: "#0a0e1a",
        pixelRatio: 2,
        skipFonts: false,
      });

      const img    = new Image();
      img.src      = dataUrl;
      await new Promise((res) => { img.onload = res; });

      const pdf    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW  = pdf.internal.pageSize.getWidth();
      const pageH  = pdf.internal.pageSize.getHeight();
      const ratio  = pageW / img.naturalWidth;
      const totalH = img.naturalHeight * ratio;

      // Slice across pages if taller than one A4 landscape sheet
      const canvas     = document.createElement("canvas");
      canvas.width     = img.naturalWidth;
      canvas.height    = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);

      let remaining = totalH;
      let page      = 0;

      while (remaining > 0) {
        const sliceH    = Math.min(pageH, remaining);
        const srcY      = (page * pageH) / ratio;
        const srcSliceH = sliceH / ratio;

        const slice = document.createElement("canvas");
        slice.width  = img.naturalWidth;
        slice.height = Math.ceil(srcSliceH);
        slice.getContext("2d")!.drawImage(canvas, 0, Math.floor(srcY), img.naturalWidth, Math.ceil(srcSliceH), 0, 0, img.naturalWidth, Math.ceil(srcSliceH));

        if (page > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageW, sliceH);
        remaining -= pageH;
        page++;
      }

      pdf.save(`${accountName || accountId}-google-ads-report.pdf`);
    } catch (err) {
      console.error("PDF export error", err);
      setExportError(err instanceof Error ? err.message : "Export failed — check console.");
    } finally {
      setExporting(false);
    }
  }, [accountId, accountName]);

  const periodLabel = REPORT_PERIODS.find((p) => p.value === period)?.label ?? "Last 30 Days";

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-[#4e4e63] text-sm gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
          <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
        </svg>
        Loading report…
      </div>
    );
  }
  if (error || !report) {
    return <div className="py-6 text-red-400 text-sm text-center">{error ?? "No data"}</div>;
  }

  const m = report.metrics;
  const cur = currency;

  return (
    <div className="report-panel text-white" id={`report-panel-${accountId}`}>

      {/* Account name */}
      <div className="mb-3 pb-3 border-b border-[#1e2a44]">
        <h2 className="text-base font-bold text-white">{accountName}</h2>
        <p className="text-xs text-[#6b7280] mt-0.5">Google Ads Performance Report</p>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Period dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="no-print flex items-center gap-2 rounded-lg border border-[#2a3a5c] bg-[#141a2e] px-3 py-1.5 text-xs font-semibold text-white hover:border-[#4285f4]/50 transition-colors"
            >
              {periodLabel}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${open ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 z-30 rounded-lg border border-[#1e2a44] bg-[#0d1120] shadow-xl overflow-hidden min-w-[140px]">
                {REPORT_PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setPeriod(p.value); setOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-xs hover:bg-[#ffffff08] transition-colors ${
                      p.value === period ? "text-[#4285f4] font-semibold" : "text-[#c8cfe8]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-[#6b7280]">
            {fmtDate(report.periodStart)} — {fmtDate(report.periodEnd)}
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-[#2a3a5c] bg-[#141a2e] px-3 py-1.5 text-xs font-medium text-[#8b93b0] hover:border-[#4285f4]/50 hover:text-[#4285f4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400 flex items-center justify-between">
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="ml-3 text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Section banner */}
      <div className="bg-[#1a2540] rounded-lg px-4 py-2 mb-4">
        <p className="text-xs font-semibold text-[#7b8db0] uppercase tracking-widest">Overview</p>
      </div>

      {/* Three metric sections */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* 1 — CTR & Impressions */}
        <div className="bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider">Click Through Rate &amp; Impressions</p>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Clicks"      value={fmtK(m.clicks)}        change={m.clicksChange} />
            <StatTile label="CTR"         value={`${m.ctr.toFixed(1)}%`} change={m.ctrChange} />
            <StatTile label="Impressions" value={fmtK(m.impressions)}    change={m.impressionsChange} />
          </div>
          <SectionChart
            data={report.dailyData}
            leftKey="clicks"   leftLabel="Clicks"   leftFormatter={fmtK}
            rightKey="ctr"     rightLabel="CTR"      rightFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </div>

        {/* 2 — Conversion Rate & Cost */}
        <div className="bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider">Conversion Rate &amp; Cost</p>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Conversions"     value={m.conversions.toFixed(1)}                                             change={m.conversionsChange} />
            <StatTile label="Conv. rate"      value={`${m.convRate.toFixed(1)}%`}                                          change={m.convRateChange} />
            <StatTile label="Cost / conv."    value={m.costPerConv !== null ? fmt(cur, m.costPerConv) : "—"}               change={m.costPerConvChange} inverse />
            <StatTile label="All conv. value" value={m.allConvValue >= 1000 ? `${(m.allConvValue / 1000).toFixed(1)}K` : fmt(cur, m.allConvValue)} change={m.allConvValueChange} />
          </div>
          <SectionChart
            data={report.dailyData}
            leftKey="conversions" leftLabel="Conversions" leftFormatter={(v) => v.toFixed(1)}
            rightKey="convRate"   rightLabel="Conv. rate"  rightFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </div>

        {/* 3 — Cost Per Click */}
        <div className="bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider">Cost Per Click</p>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Cost"     value={fmt(cur, m.cost)}   change={m.costChange}   inverse />
            <StatTile label="Avg. CPC" value={fmt(cur, m.avgCpc)} change={m.avgCpcChange} inverse />
          </div>
          <SectionChart
            data={report.dailyData}
            leftKey="cost"    leftLabel="Cost"     leftFormatter={(v) => fmt(cur, v)}
            rightKey="avgCpc" rightLabel="Avg. CPC" rightFormatter={(v) => fmt(cur, v)}
          />
        </div>
      </div>

      {/* Bottom: Campaigns + Device Breakdown */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">

        {/* Top Campaigns */}
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

        {/* Device Breakdown — three donut charts */}
        <div className="xl:col-span-2 bg-[#0d1120] rounded-xl border border-[#1e2a44] p-4">
          <p className="text-xs font-semibold text-[#8b93b0] uppercase tracking-wider mb-4">Device Breakdown</p>
          {report.devices.length === 0 ? (
            <p className="text-center text-[#4e4e63] text-sm py-8">No device data</p>
          ) : (
            <div className="flex gap-4 justify-around">
              <DeviceDonut devices={report.devices} metric="clicks"      label="Clicks"      formatter={fmtK} />
              <DeviceDonut devices={report.devices} metric="cost"        label="Cost"        formatter={(v) => fmt(cur, v)} />
              <DeviceDonut devices={report.devices} metric="conversions" label="Conversions" formatter={(v) => v.toFixed(1)} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
