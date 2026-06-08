"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DailyConversion, TREND_PERIOD_OPTIONS, TrendPeriodValue } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

interface Props {
  accountId?: string;
}

// ── MA window adapts to the chosen period ─────────────────────────
function maWindow(period: TrendPeriodValue): number {
  if (period === "THIS_YEAR")     return 30;
  if (period === "LAST_6_MONTHS") return 14;
  return 7;
}

function computeMA(
  data: DailyConversion[],
  win: number
): Array<{ date: string; displayDate: string; ma: number }> {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - win + 1), i + 1);
    const avg   = slice.reduce((s, x) => s + x.conversions, 0) / slice.length;
    return {
      date:        d.date,
      displayDate: format(parseISO(d.date), "dd MMM"),
      ma:          Math.round(avg * 10) / 10,
    };
  });
}

function tickInterval(len: number) {
  return len > 120 ? 20 : len > 60 ? 10 : len > 30 ? 6 : 4;
}

// ── Tooltips ──────────────────────────────────────────────────────
function RawTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: string = payload[0]?.payload?.date ?? "";
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#8b8b9a]">{d ? format(parseISO(d), "dd MMM yyyy") : ""}</p>
      <p className="text-sm font-semibold text-[#00fff9]">{payload[0].value.toLocaleString()} conversions</p>
    </div>
  );
}

function MATooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: string = payload[0]?.payload?.date ?? "";
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#8b8b9a]">{d ? format(parseISO(d), "dd MMM yyyy") : ""}</p>
      <p className="text-sm font-semibold text-[#00fff9]">{payload[0].value.toLocaleString()} avg conversions</p>
    </div>
  );
}

// ── Period dropdown (reusable) ────────────────────────────────────
function PeriodDropdown({
  period, open, onToggle, onChange,
}: {
  period: TrendPeriodValue;
  open: boolean;
  onToggle: () => void;
  onChange: (v: TrendPeriodValue) => void;
}) {
  const label = TREND_PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "";
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-1.5 text-[12px] text-white hover:border-[#00fff9]/40 transition-colors"
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={clsx("transition-transform", open && "rotate-180")}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] shadow-xl overflow-hidden min-w-[150px]">
          {TREND_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={clsx(
                "w-full px-4 py-2 text-left text-[12px] hover:bg-[#ffffff08] transition-colors",
                opt.value === period ? "text-[#00fff9]" : "text-[#c8c8d8]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function ConversionsTrend({ accountId }: Props) {
  const subtitle = accountId ? "This account" : "All active accounts";

  // ── Card 1: raw conversions ───────────────────────────────────
  const [period,   setPeriod]   = useState<TrendPeriodValue>("LAST_6_MONTHS");
  const [data,     setData]     = useState<DailyConversion[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [ddOpen,   setDDOpen]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setData([]);
    const url = accountId
      ? `/api/account/${accountId}/trend?period=${period}`
      : `/api/trend?period=${period}`;
    fetch(url)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [accountId, period]);

  const totalConversions = data.reduce((s, d) => s + d.conversions, 0);
  const avgDaily         = data.length ? Math.round(totalConversions / data.length) : 0;
  const chartData        = data.map((d) => ({ ...d, displayDate: format(parseISO(d.date), "dd MMM") }));

  // ── Card 2: moving average — fully independent ────────────────
  const [maPeriod,  setMAPeriod]  = useState<TrendPeriodValue>("LAST_6_MONTHS");
  const [maRaw,     setMARaw]     = useState<DailyConversion[]>([]);
  const [maLoading, setMALoading] = useState(true);
  const [maDDOpen,  setMADDOpen]  = useState(false);

  useEffect(() => {
    setMALoading(true);
    setMARaw([]);
    const url = accountId
      ? `/api/account/${accountId}/trend?period=${maPeriod}`
      : `/api/trend?period=${maPeriod}`;
    fetch(url)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setMARaw(Array.isArray(d) ? d : []))
      .catch(() => setMARaw([]))
      .finally(() => setMALoading(false));
  }, [accountId, maPeriod]);

  const win       = maWindow(maPeriod);
  const maData    = computeMA(maRaw, win);
  const peakMA    = maData.length ? Math.max(...maData.map((d) => d.ma)) : 0;
  const lastMA    = maData.length ? maData[maData.length - 1].ma : 0;
  const maTickInt = tickInterval(maRaw.length);

  return (
    <>
      {/* ── Card 1: Conversions ───────────────────────────────── */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <div className="mb-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Conversions</h2>
            <p className="mt-0.5 text-[12px] text-[#4e4e63]">{subtitle}</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-5">
            {!loading && data.length > 0 && (
              <div className="flex gap-4 sm:gap-5">
                <Stat label="Total"     value={totalConversions.toLocaleString()} />
                <Stat label="Daily Avg" value={avgDaily.toLocaleString()} />
              </div>
            )}
            <PeriodDropdown
              period={period}
              open={ddOpen}
              onToggle={() => setDDOpen((o) => !o)}
              onChange={(v) => { setPeriod(v); setDDOpen(false); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-[#4e4e63] text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="animate-spin mr-2">
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
            </svg>
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-[#4e4e63] text-sm">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00fff9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00fff9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: "#4e4e63" }}
                axisLine={false} tickLine={false} interval={tickInterval(data.length)} />
              <YAxis tick={{ fontSize: 10, fill: "#4e4e63" }}
                axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<RawTooltip />} cursor={{ stroke: "#2e2e3e" }} />
              <Area type="monotone" dataKey="conversions" stroke="#00fff9" strokeWidth={2}
                fill="url(#tealGrad)" dot={false}
                activeDot={{ r: 4, fill: "#00fff9", stroke: "#0d0d18", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Card 2: Conversion Trend (rolling average) ───────────── */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <div className="mb-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Conversion Trend</h2>
            <p className="mt-0.5 text-[12px] text-[#4e4e63]">
              {win}-day rolling average · {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4 sm:gap-5">
            {!maLoading && maData.length > 0 && (
              <div className="flex gap-4 sm:gap-5">
                <Stat label="Peak Avg"   value={peakMA.toLocaleString()} />
                <Stat label="Latest Avg" value={lastMA.toLocaleString()} />
              </div>
            )}
            <PeriodDropdown
              period={maPeriod}
              open={maDDOpen}
              onToggle={() => setMADDOpen((o) => !o)}
              onChange={(v) => { setMAPeriod(v); setMADDOpen(false); }}
            />
          </div>
        </div>

        {maLoading ? (
          <div className="flex h-[200px] items-center justify-center text-[#4e4e63] text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="animate-spin mr-2">
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
            </svg>
            Loading…
          </div>
        ) : maData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-[#4e4e63] text-sm">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={maData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00fff9" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00fff9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: "#4e4e63" }}
                axisLine={false} tickLine={false} interval={maTickInt} />
              <YAxis tick={{ fontSize: 10, fill: "#4e4e63" }}
                axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<MATooltip />} cursor={{ stroke: "#2e2e3e" }} />
              <Line type="monotone" dataKey="ma" stroke="#00fff9" strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "#00fff9", stroke: "#0d0d18", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-[#4e4e63]">{label}</p>
      <p className="text-lg font-bold text-[#00fff9]">{value}</p>
    </div>
  );
}
