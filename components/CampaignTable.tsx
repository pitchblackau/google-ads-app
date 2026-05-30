"use client";

import React, { useState } from "react";
import { CampaignData, PERIOD_OPTIONS, PeriodValue } from "@/lib/types";
import { clsx } from "clsx";

interface CampaignTableProps {
  campaigns: CampaignData[];
  period: PeriodValue;
  onPeriodChange: (p: PeriodValue) => void;
  loading: boolean;
  currency: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtSpend(n: number, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function CampaignTable({ campaigns, period, onPeriodChange, loading, currency }: CampaignTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Only show enabled campaigns (safety net — API already filters, but guard here too)
  const activeCampaigns = campaigns.filter((c) => c.status === "ENABLED");
  const hasRoas = activeCampaigns.some((c) => c.roas !== null);
  const currentLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "Last 30 Days";

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const COL = "px-4 py-2.5 text-right text-[12px] tabular-nums";
  const HEAD = "px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]";

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
      {/* Table header row */}
      <div className="flex items-center justify-between border-b border-[#1e1e2e] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-white">Campaign Performance</h2>

        {/* Period dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-1.5 text-[12px] text-white hover:border-[#00fff9]/40 transition-colors"
          >
            {currentLabel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={clsx("transition-transform", dropdownOpen && "rotate-180")}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] shadow-xl overflow-hidden min-w-[140px]">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onPeriodChange(opt.value); setDropdownOpen(false); }}
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

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#4e4e63] text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin mr-2">
            <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
          </svg>
          Loading campaigns…
        </div>
      ) : activeCampaigns.length === 0 ? (
        <div className="py-16 text-center text-[#4e4e63] text-sm">No active campaign data for this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63] w-[30%]">
                  Campaign
                </th>
                <th className={HEAD}>Spend</th>
                <th className={HEAD}>Clicks</th>
                <th className={HEAD}>Impressions</th>
                <th className={HEAD}>CTR</th>
                <th className={HEAD}>Conv. Rate</th>
                <th className={HEAD}>Conversions</th>
                {hasRoas && <th className={HEAD}>ROAS</th>}
              </tr>
            </thead>
            <tbody>
              {activeCampaigns.map((camp) => {
                const isOpen = expanded.has(camp.id);
                return (
                  <React.Fragment key={camp.id}>
                    {/* Campaign row */}
                    <tr
                      onClick={() => toggle(camp.id)}
                      className="border-b border-[#1e1e2e] hover:bg-[#ffffff05] cursor-pointer group"
                    >
                      <td className="px-5 py-3 text-[12px] font-medium text-white">
                        <span className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            className={clsx("shrink-0 text-[#4e4e63] transition-transform", isOpen && "rotate-90")}>
                            <path d="M9 18l6-6-6-6" strokeLinecap="round"/>
                          </svg>
                          {camp.name}
                          {camp.adGroups.length > 0 && (
                            <span className="text-[10px] text-[#4e4e63]">({camp.adGroups.length} ad groups)</span>
                          )}
                        </span>
                      </td>
                      <td className={clsx(COL, "font-semibold text-white")}>{fmtSpend(camp.spend, currency)}</td>
                      <td className={COL}>{fmt(camp.clicks)}</td>
                      <td className={COL}>{fmt(camp.impressions)}</td>
                      <td className={COL}>{camp.ctr.toFixed(2)}%</td>
                      <td className={COL}>{camp.conversionRate.toFixed(2)}%</td>
                      <td className={clsx(COL, "font-semibold text-[#00fff9]")}>{camp.conversions.toFixed(1)}</td>
                      {hasRoas && <td className={clsx(COL, camp.roas ? "text-[#7c6aff]" : "text-[#3a3a50]")}>
                        {camp.roas ? `${camp.roas.toFixed(2)}x` : "—"}
                      </td>}
                    </tr>

                    {/* Ad group rows (expanded) */}
                    {isOpen && camp.adGroups.map((ag) => (
                      <tr key={ag.id} className="border-b border-[#1a1a26] bg-[#0a0a12] hover:bg-[#0d0d18]">
                        <td className="pl-12 pr-5 py-2.5 text-[11px] text-[#8b8b9a]">
                          <span className="flex items-center gap-2">
                            <span className="text-[#2e2e42]">↳</span>
                            {ag.name}
                          </span>
                        </td>
                        <td className={clsx(COL, "text-[11px] text-[#8b8b9a]")}>{fmtSpend(ag.spend, currency)}</td>
                        <td className={clsx(COL, "text-[11px] text-[#8b8b9a]")}>{fmt(ag.clicks)}</td>
                        <td className={clsx(COL, "text-[11px] text-[#8b8b9a]")}>{fmt(ag.impressions)}</td>
                        <td className={clsx(COL, "text-[11px] text-[#8b8b9a]")}>{ag.ctr.toFixed(2)}%</td>
                        <td className={clsx(COL, "text-[11px] text-[#8b8b9a]")}>{ag.conversionRate.toFixed(2)}%</td>
                        <td className={clsx(COL, "text-[11px] text-[#8b8b9a]")}>{ag.conversions.toFixed(1)}</td>
                        {hasRoas && <td className={clsx(COL, "text-[11px]", ag.roas ? "text-[#7c6aff]" : "text-[#3a3a50]")}>
                          {ag.roas ? `${ag.roas.toFixed(2)}x` : "—"}
                        </td>}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
