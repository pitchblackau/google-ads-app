"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import AccountCard from "./AccountCard";
import ConversionsTrend from "./ConversionsTrend";
import Sidebar from "./Sidebar";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (manual = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(manual ? "/api/dashboard?refresh=1" : "/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      setData(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex min-h-screen bg-[#08080f] text-white">
      <Sidebar accounts={data?.accounts ?? []} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-[#1e1e2e] bg-[#08080f]/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-[#00fff9] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" fill="#08080f"/>
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white">Google Ads Dashboard</h1>
                <p className="text-[10px] text-[#4e4e63]">MCC Overview</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {data && (
                <p className="text-[11px] text-[#4e4e63]">
                  Updated {format(parseISO(data.lastUpdated), "h:mm a")}
                </p>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-1.5 text-[12px] font-medium text-white transition hover:border-[#00fff9]/40 hover:text-[#00fff9] disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={loading ? "animate-spin" : ""}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
                </svg>
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="px-6 py-6 flex flex-col gap-6">
          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          {loading && !data && (
            <div className="flex items-center justify-center py-32 text-[#4e4e63]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin mr-2">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
              </svg>
              Loading accounts…
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap gap-3">
                <Chip label="Active Accounts"        value={String(data.accounts.filter(a => a.isActive).length)} />
                <Chip label="Inactive Accounts"       value={String(data.accounts.filter(a => !a.isActive).length)} dim />
                <Chip label="Total Conversions Today"
                  value={data.accounts.filter(a => a.isActive).reduce((s, a) => s + a.metrics.today.conversions, 0).toLocaleString()}
                  accent />
                <Chip label="Total Spend Today"
                  value={`$${data.accounts.filter(a => a.isActive).reduce((s, a) => s + a.metrics.today.spend, 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <Chip label="Total Clicks Today"
                  value={data.accounts.filter(a => a.isActive).reduce((s, a) => s + a.metrics.today.clicks, 0).toLocaleString()} />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {data.accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>

              <ConversionsTrend />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Chip({ label, value, accent, dim }: { label: string; value: string; accent?: boolean; dim?: boolean }) {
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] px-4 py-2.5 flex items-center gap-3">
      <p className="text-[11px] text-[#4e4e63]">{label}</p>
      <p className={`text-sm font-bold ${accent ? "text-[#00fff9]" : dim ? "text-[#3a3a50]" : "text-white"}`}>{value}</p>
    </div>
  );
}
