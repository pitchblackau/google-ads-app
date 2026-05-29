"use client";

import { useEffect } from "react";
import { Account } from "@/lib/types";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface AccountModalProps {
  account: Account;
  onClose: () => void;
}

const PERIODS = [
  { key: "today" as const,     label: "Today",       color: "#00fff9" },
  { key: "thisWeek" as const,  label: "This Week",   color: "#7c6aff" },
  { key: "thisMonth" as const, label: "This Month",  color: "#ff6a9b" },
  { key: "last30Days" as const,label: "Last 30 Days",color: "#ffaa4d" },
];

function fmtSpend(n: number, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtPct(n: number) { return `${n.toFixed(2)}%`; }
function fmtCPC(spend: number, clicks: number, currency: string) {
  if (!clicks) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, minimumFractionDigits: 2 }).format(spend / clicks);
}
function fmtCPA(spend: number, conversions: number, currency: string) {
  if (!conversions) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, minimumFractionDigits: 2 }).format(spend / conversions);
}
function fmtCTR(clicks: number, impressions: number) {
  if (!impressions) return "—";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#8b8b9a]">{format(parseISO(label), "dd MMM yyyy")}</p>
      <p className="text-sm font-semibold text-[#00fff9]">{payload[0].value} conversions</p>
    </div>
  );
}

export default function AccountModal({ account, onClose }: AccountModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const chartData = account.trend.map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), "dd MMM"),
  }));

  const totalTrendConversions = account.trend.reduce((s, d) => s + d.conversions, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#1e1e2e] bg-[#0d0d18] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1e1e2e] bg-[#0d0d18] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">{account.name}</h2>
            <p className="text-[11px] text-[#4e4e63]">
              ID: {account.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")} · {account.currency}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              account.isActive
                ? "border-[#00fff930] bg-[#00fff910] text-[#00fff9]"
                : "border-[#3a3a5030] bg-[#3a3a5010] text-[#3a3a50]"
            }`}>
              {account.isActive ? "Active" : "Inactive"}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-1.5 text-[#4e4e63] hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Period stat tables */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PERIODS.map(({ key, label, color }) => {
              const m = account.metrics[key];
              return (
                <div key={key} className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#1e1e2e]" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color }}>
                      {label}
                    </p>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <StatRow label="Spend"         value={fmtSpend(m.spend, account.currency)} bold />
                    <StatRow label="Clicks"         value={fmtNum(m.clicks)} />
                    <StatRow label="Impressions"    value={fmtNum(m.impressions)} />
                    <StatRow label="CTR"            value={fmtCTR(m.clicks, m.impressions)} />
                    <StatRow label="Avg. CPC"       value={fmtCPC(m.spend, m.clicks, account.currency)} />
                    <StatRow label="Conversions"    value={fmtNum(m.conversions)} accent />
                    <StatRow label="Conv. Rate"     value={fmtPct(m.conversionRate)} />
                    <StatRow label="Cost / Conv."   value={fmtCPA(m.spend, m.conversions, account.currency)} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-account trend */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Conversion Trend</h3>
                  <p className="text-[11px] text-[#4e4e63]">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#4e4e63]">Total</p>
                  <p className="text-lg font-bold text-[#00fff9]">{totalTrendConversions.toLocaleString()}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00fff9" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00fff9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: "#4e4e63" }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: "#4e4e63" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2e2e3e" }} />
                  <Area type="monotone" dataKey="conversions" stroke="#00fff9" strokeWidth={2}
                    fill="url(#modalGrad)" dot={false}
                    activeDot={{ r: 4, fill: "#00fff9", stroke: "#0d0d18", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length === 0 && (
            <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] px-6 py-10 text-center text-[#3a3a50] text-sm">
              No conversion data in the last 30 days
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#6b6b7e]">{label}</span>
      <span className={`text-[12px] tabular-nums ${bold ? "font-semibold text-white" : accent ? "font-semibold text-[#00fff9]" : "text-[#c8c8d8]"}`}>
        {value}
      </span>
    </div>
  );
}
