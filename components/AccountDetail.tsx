"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Account, AdGroupData, CampaignData, PERIOD_OPTIONS, PeriodValue } from "@/lib/types";
import MetricBox from "./MetricBox";
import CampaignTable from "./CampaignTable";
import ConversionsTrend from "./ConversionsTrend";
import OptimisationSuggestions from "./OptimisationSuggestions";
import ReportingPanel from "./ReportingPanel";
import AccountChat from "./AccountChat";
import { clsx } from "clsx";

const PERIODS = ["today", "yesterday", "thisWeek", "last30Days"] as const;
const PERIOD_LABELS = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "Last 7 Days",
  last30Days: "Last 30 Days",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "reporting", label: "Reporting" },
  { key: "ask", label: "Ask" },
] as const;

type Tab = (typeof TABS)[number]["key"];

interface AccountDetailProps {
  accountId: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtSpend(n: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

interface FlatAdGroup extends AdGroupData {
  campaignName: string;
}

export default function AccountDetail({ accountId }: AccountDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  // Account header state
  const [account, setAccount] = useState<Account | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign Performance state (own period)
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [campaignPeriod, setCampaignPeriod] = useState<PeriodValue>("LAST_30_DAYS");
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Ad Group Performance state (own period)
  const [adGroupCampaigns, setAdGroupCampaigns] = useState<CampaignData[]>([]);
  const [adGroupPeriod, setAdGroupPeriod] = useState<PeriodValue>("LAST_30_DAYS");
  const [adGroupsLoading, setAdGroupsLoading] = useState(true);
  const [adGroupDropdownOpen, setAdGroupDropdownOpen] = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/account/${accountId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setAccount(d); setAccountLoading(false); })
      .catch((e) => { setError(`Failed to load account: ${e.message}`); setAccountLoading(false); });
  }, [accountId]);

  const fetchCampaigns = useCallback(async (p: PeriodValue) => {
    setCampaignsLoading(true);
    try {
      const res = await fetch(`/api/account/${accountId}/campaigns?period=${p}`);
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch { setCampaigns([]); }
    finally { setCampaignsLoading(false); }
  }, [accountId]);

  const fetchAdGroups = useCallback(async (p: PeriodValue) => {
    setAdGroupsLoading(true);
    try {
      const res = await fetch(`/api/account/${accountId}/campaigns?period=${p}`);
      const data = await res.json();
      setAdGroupCampaigns(data.campaigns ?? []);
    } catch { setAdGroupCampaigns([]); }
    finally { setAdGroupsLoading(false); }
  }, [accountId]);

  useEffect(() => { fetchCampaigns(campaignPeriod); }, [fetchCampaigns, campaignPeriod]);
  useEffect(() => { fetchAdGroups(adGroupPeriod); }, [fetchAdGroups, adGroupPeriod]);

  // ── Derived data ──────────────────────────────────────────────────

  const allAdGroups: FlatAdGroup[] = adGroupCampaigns
    .filter((c) => c.status === "ENABLED" || Number(c.status) === 2)
    .flatMap((c) =>
      c.adGroups
        .filter((ag) => ag.status === "ENABLED" || Number(ag.status) === 2)
        .map((ag) => ({ ...ag, campaignName: c.name }))
    )
    .sort((a, b) => b.spend - a.spend);

  const hasRoas = allAdGroups.some((ag) => ag.roas !== null);
  const currency = account?.currency ?? "AUD";
  const adGroupPeriodLabel = PERIOD_OPTIONS.find((p) => p.value === adGroupPeriod)?.label ?? "Last 30 Days";

  return (
    <div className="min-h-screen bg-[#08080f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#1e1e2e] bg-[#08080f]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-4 md:px-6 py-3.5 md:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-[#4e4e63] hover:text-white transition-colors text-[12px] shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">All Accounts</span>
            </button>
            <span className="text-[#1e1e2e] hidden sm:inline">|</span>
            {accountLoading ? (
              <div className="h-4 w-32 sm:w-48 animate-pulse rounded bg-[#1e1e2e]" />
            ) : (
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">{account?.name}</h1>
                <p className="text-[10px] text-[#4e4e63] hidden sm:block">
                  ID: {accountId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")} · {account?.currency}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex items-center gap-0.5 rounded-lg bg-[#0d0d14] p-0.5">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={clsx(
                    "px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150",
                    tab === key ? "bg-[#1e1e2e] text-white shadow" : "text-[#6b7280] hover:text-[#a0a8c0]"
                  )}
                >
                  {label}
                </button>
              ))}
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
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-4 md:py-6 flex flex-col gap-4 md:gap-6">
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Ask tab — kept mounted so the conversation survives tab switches */}
        <div className={tab === "ask" ? undefined : "hidden"}>
          <AccountChat accountId={accountId} accountName={account?.name ?? ""} />
        </div>

        {/* Reporting tab */}
        {tab === "reporting" && (
          <ReportingPanel
            accountId={accountId}
            accountName={account?.name ?? ""}
            currency={account?.currency ?? "AUD"}
          />
        )}

        {/* Overview tab — hidden (not unmounted) when reporting is active so data stays cached */}
        <div className={tab === "overview" ? "contents" : "hidden"}>

        {/* 4 period metric boxes */}
        {accountLoading ? (
          <div className="grid grid-cols-2 gap-3 md:gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 md:h-40 animate-pulse rounded-lg bg-[#111118] border border-[#1e1e2e]" />
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

        {/* Campaign Performance */}
        <CampaignTable
          campaigns={campaigns}
          period={campaignPeriod}
          onPeriodChange={setCampaignPeriod}
          loading={campaignsLoading}
          currency={currency}
        />

        {/* Ad Group Performance — independent period */}
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1e1e2e] px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white">Ad Group Performance</h2>
              {!adGroupsLoading && (
                <p className="text-[11px] text-[#4e4e63] mt-0.5">
                  {allAdGroups.length} active ad groups
                </p>
              )}
            </div>

            {/* Period dropdown — same style as Campaign Performance */}
            <div className="relative">
              <button
                onClick={() => setAdGroupDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-1.5 text-[12px] text-white hover:border-[#00fff9]/40 transition-colors"
              >
                {adGroupPeriodLabel}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={clsx("transition-transform", adGroupDropdownOpen && "rotate-180")}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {adGroupDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] shadow-xl overflow-hidden min-w-[140px]">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setAdGroupPeriod(opt.value); setAdGroupDropdownOpen(false); }}
                      className={clsx(
                        "w-full px-4 py-2 text-left text-[12px] hover:bg-[#ffffff08] transition-colors",
                        opt.value === adGroupPeriod ? "text-[#00fff9]" : "text-[#c8c8d8]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {adGroupsLoading ? (
            <div className="flex items-center justify-center py-16 text-[#4e4e63] text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="animate-spin mr-2">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
              Loading ad groups…
            </div>
          ) : allAdGroups.length === 0 ? (
            <div className="py-16 text-center text-[#4e4e63] text-sm">
              No active ad group data for this period
            </div>
          ) : (
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
                      <td className="px-5 py-3 text-[12px] font-medium text-white">
                        <span className="block truncate">{ag.name}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#8b8b9a]">
                        <span className="block truncate">{ag.campaignName}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums font-semibold text-white">
                        {fmtSpend(ag.spend, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{fmt(ag.clicks)}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{fmt(ag.impressions)}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{ag.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-[#c8c8d8]">{ag.conversionRate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums font-semibold text-[#00fff9]">
                        {ag.conversions.toFixed(1)}
                      </td>
                      {hasRoas && (
                        <td className={clsx(
                          "px-4 py-3 text-right text-[12px] tabular-nums",
                          ag.roas ? "text-[#7c6aff]" : "text-[#3a3a50]"
                        )}>
                          {ag.roas ? `${ag.roas.toFixed(2)}x` : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conversions Trend — self-fetching, account-specific, with period selector */}
        <ConversionsTrend accountId={accountId} />

        {/* Optimisation Suggestions */}
        <OptimisationSuggestions accountId={accountId} />

        </div>{/* end overview */}
      </main>
    </div>
  );
}
