"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DailyConversion, TREND_PERIOD_OPTIONS, TrendPeriodValue } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

interface ConversionsTrendProps {
  /** If provided, fetches trend for this specific account.
   *  If omitted, fetches the aggregated dashboard trend. */
  accountId?: string;
  title?: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const rawDate: string = payload[0]?.payload?.date ?? "";
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#8b8b9a]">
        {rawDate ? format(parseISO(rawDate), "dd MMM yyyy") : ""}
      </p>
      <p className="text-sm font-semibold text-[#00fff9]">
        {payload[0].value.toLocaleString()} conversions
      </p>
    </div>
  );
}

export default function ConversionsTrend({ accountId, title }: ConversionsTrendProps) {
  const [period, setPeriod] = useState<TrendPeriodValue>("LAST_6_MONTHS");
  const [data, setData] = useState<DailyConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentLabel = TREND_PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "Last 6 months";
  const defaultTitle = accountId
    ? "Conversions Trend"
    : "Conversions Trend — All Active Accounts";
  const subtitle = accountId ? "This account" : "All active accounts";

  useEffect(() => {
    setLoading(true);
    setData([]);
    const url = accountId
      ? `/api/account/${accountId}/trend?period=${period}`
      : `/api/trend?period=${period}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [accountId, period]);

  const totalConversions = data.reduce((s, d) => s + d.conversions, 0);
  const avgDaily = data.length ? Math.round(totalConversions / data.length) : 0;

  const chartData = data.map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), "dd MMM"),
  }));

  // Thin out X-axis labels so they don't overlap for longer periods
  const tickInterval = data.length > 120 ? 20 : data.length > 60 ? 10 : data.length > 30 ? 6 : 4;

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title ?? defaultTitle}</h2>
          <p className="mt-0.5 text-[12px] text-[#4e4e63]">{subtitle}</p>
        </div>

        <div className="flex items-center gap-5">
          {/* Summary stats */}
          <div className="flex gap-5">
            <Stat label="Total" value={loading ? "—" : totalConversions.toLocaleString()} />
            <Stat label="Daily Avg" value={loading ? "—" : avgDaily.toLocaleString()} />
          </div>

          {/* Period dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-1.5 text-[12px] text-white hover:border-[#00fff9]/40 transition-colors"
            >
              {currentLabel}
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                className={clsx("transition-transform", dropdownOpen && "rotate-180")}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] shadow-xl overflow-hidden min-w-[150px]">
                {TREND_PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setDropdownOpen(false); }}
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
        </div>
      </div>

      {loading ? (
        <div className="flex h-[200px] items-center justify-center text-[#4e4e63] text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="animate-spin mr-2">
            <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
          </svg>
          Loading trend…
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
                <stop offset="0%" stopColor="#00fff9" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00fff9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10, fill: "#4e4e63" }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#4e4e63" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2e2e3e" }} />
            <Area
              type="monotone"
              dataKey="conversions"
              stroke="#00fff9"
              strokeWidth={2}
              fill="url(#tealGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#00fff9", stroke: "#0d0d18", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
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
