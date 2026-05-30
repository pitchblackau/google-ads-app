"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Account, AdGroupData, CampaignData, PeriodValue } from "@/lib/types";
import MetricBox from "./MetricBox";
import CampaignTable from "./CampaignTable";
import ConversionsTrend from "./ConversionsTrend";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

const PERIODS = ["today", "thisWeek", "thisMonth", "last30Days"] as const;
const PERIOD_LABELS = {
  today: "Today",
  thisWeek: "This Week",
  thisMonth: "This Month",
  last30Days: "Last 30 Days",
};

interface AccountDetailProps {
  accountId: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtSpend(n: number, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

// Flat ad group entry with the parent campaign name
interface FlatAdGroup extends AdGroupData {
  campaignName: string;
}

export default function AccountDetail({ accountId }: AccountDetailProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [period, setPeriod] = useState<PeriodValue>("LAST_30_DAYS");
  const [accountLoading, setAccountLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch account header data once
  useEffect(() => {
    fetch(`/api/account/${accountId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { setAccount(data); setAccountLoading(false); })
      .catch((e) => { setError(`Failed to load account: ${e.message}`); setAccountLoading(false); });
  }, [accountId]);

  // Fetch campaigns when period changes
  const fetchCampaigns = useCallback(async (p: PeriodValue) => {
    setCampaignsLoading(true);
    try {
      const res = await fetch(`/api/account/${accountId}/campaigns?period=${p}`);
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchCampaigns(period); }, [fetchCampaigns, period]);

  // Flatten all ad groups from active campaigns for the Ad Group Performance table
  const allAdGroups: FlatAdGroup[] = campaigns
    .filter((c) => c.status === "ENABLED" || Number(c.status) === 2)
    .flatMap((c) =>
      c.adGroups.map((ag) => ({ ...ag, campaignName: c.name }))
    )
    .sort((a, b) => b.spend - a.spend);

  const hasRoas = allAdGroups.some((ag) => ag.roas !== null);
  const currency = account?.currency ?? "AUD";

  return (
    <div className="min-h-screen bg-[#08080f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#1e1e2e] bg-[#08080f]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-[#4e4e63] hover:text-white transition-colors text-[12px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All Accounts
            </button>

            <span className="text-[#1e1e2e]">|</span>

            {accountLoading ? (
              <div className="h-4 w-48 animate-pulse rounded bg-[#1e1e2e]" />
            ) : (
              <div>
                <h1 className="text-sm font-bold text-white">{account?.name}</h1>
                <p className="text-[10px] text-[#4e4e63]">
                  ID: {accountId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")} · {account?.currency}
                </p>
              </div>
            )}
          </div>

          {account && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              account.isActive
                ? "border-[#00fff930] bg-[#00fff910] text-[#00fff9]"
                : "border-[#3a3a5030] bg-[#3a3a5010] text-[#3a3a50]"
            }`}>
              {account.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 flex flex-col gap-6">
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {/* 4 Period metric boxes */}
        {accountLoading ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-[#111118] border border-[#1e1e2e]" />
            ))}
          </div>
        ) : account && (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {PERIODS.map((key) => (
              <MetricBox
                key={key}
                label={PERIOD_LABELS[key]}
                metrics={account.metrics[key]}
                currency={account.currency}
              />
            ))}
          </div>
        )}

        {/* Campaign breakdown */}
        <CampaignTable
          campaigns={campaigns}
          period={period}
          onPeriodChange={(p) => setPeriod(p)}
          loading={campaignsLoading}
          currency={currency}
        />

        {/* Ad Group Performance — flat list of all active ad groups */}
        {!campaignsLoading && allAdGroups.length > 0 && (
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
            <div className="border-b border-[#1e1e2e] px-5 py-3.5">
              <h2 className="text-sm font-semibold text-white">Ad Group Performance</h2>
              <p className="text-[11px] text-[#4e4e63] mt-0.5">All active ad groups · {allAdGroups.length} total</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#1e1e2e]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63] w-[22%]">Ad Group</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63] w-[20%]">Campaign</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">Spend</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">Clicks</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">Impressions</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">CTR</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">Conv. Rate</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">Conversions</th>
                    {hasRoas && <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4e4e63]">ROAS</th>}
                  </tr>
                </thead>
                <tbody>
                  {allAdGroups.map((ag) => (
                    <tr key={ag.id} className="border-b border-[#1e1e2e] hover:bg-[#ffffff05]">
                      <td className="px-5 py-3 text-[12px] font-medium text-white truncate max-w-0">
                        <span className="truncate block">{ag.name}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#8b8b9a] truncate max-w-0">
                        <span className="truncate block">{ag.campaignName}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums font-semibold text-white">{fmtSpend(ag.spend, currency)}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{fmt(ag.clicks)}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{fmt(ag.impressions)}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{ag.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{ag.conversionRate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums font-semibold text-[#00fff9]">{ag.conversions.toFixed(1)}</td>
                      {hasRoas && (
                        <td className={clsx("px-4 py-3 text-right text-[12px] tabular-nums", ag.roas ? "text-[#7c6aff]" : "text-[#3a3a50]")}>
                          {ag.roas ? `${ag.roas.toFixed(2)}x` : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conversion trend — this account only */}
        {account && account.trend.length > 0 && (
          <ConversionsTrend
            data={account.trend}
            title="Conversions Trend"
            subtitle="This account · Last 30 days"
          />
        )}
      </main>
    </div>
  );
}
