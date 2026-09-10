"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, DashboardData, TimePeriodMetrics } from "@/lib/types";
import AccountCard from "./AccountCard";
import ConversionsTrend from "./ConversionsTrend";
import Sidebar from "./Sidebar";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

type ChipPeriodKey = keyof Pick<TimePeriodMetrics,
  "today" | "thisWeek" | "thisMonth" | "last3Months" | "thisYear">;

const CHIP_PERIODS: Array<{ key: ChipPeriodKey; label: string }> = [
  { key: "today",       label: "Today"          },
  { key: "thisWeek",    label: "Last 7 Days"     },
  { key: "thisMonth",   label: "This Month"      },
  { key: "last3Months", label: "Last 3 Months"   },
  { key: "thisYear",    label: "This Year"        },
];

const STORAGE_KEY = "account-active-overrides";
const ORDER_KEY   = "account-order";

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chipPeriod, setChipPeriod]   = useState<ChipPeriodKey>("today");
  const [overrides, setOverrides]       = useState<Record<string, boolean>>({});
  const [accountOrder, setAccountOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId]     = useState<string | null>(null);
  const [dragOverId, setDragOverId]     = useState<string | null>(null);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setOverrides(JSON.parse(stored));
    } catch {}
    try {
      const order = localStorage.getItem(ORDER_KEY);
      if (order) setAccountOrder(JSON.parse(order));
    } catch {}
  }, []);

  // Persist overrides
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch {}
  }, [overrides]);

  // Persist order
  useEffect(() => {
    if (accountOrder.length === 0) return;
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(accountOrder)); } catch {}
  }, [accountOrder]);

  /** True if account is considered active (manual override wins over API value) */
  const isEffectivelyActive = useCallback(
    (account: Account) =>
      account.id in overrides ? overrides[account.id] : account.isActive,
    [overrides]
  );

  const toggleActive = useCallback((id: string, currentEffective: boolean) => {
    setOverrides((prev) => ({ ...prev, [id]: !currentEffective }));
  }, []);

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

  // Only accounts the user has marked active
  const activeAccounts = (data?.accounts ?? []).filter(isEffectivelyActive);

  // Apply saved drag-drop order
  const orderedActiveAccounts = useMemo(() => {
    if (accountOrder.length === 0) return activeAccounts;
    return [...activeAccounts].sort((a, b) => {
      const ai = accountOrder.indexOf(a.id);
      const bi = accountOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [activeAccounts, accountOrder]);

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(id: string) {
    if (id !== draggingId) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const ids = orderedActiveAccounts.map((a) => a.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx   = ids.indexOf(targetId);
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingId);
    setAccountOrder(next);
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  return (
    <div className="flex min-h-screen bg-[#08080f] text-white">
      <Sidebar
        accounts={data?.accounts ?? []}
        activeOverrides={overrides}
        onToggleActive={toggleActive}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-[#1e1e2e] bg-[#08080f]/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 md:px-6 py-3.5 md:py-4">
            <div className="flex items-center gap-3">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-[#1e1e2e] bg-[#111118] text-[#8b8b9a] hover:text-white transition-colors"
                aria-label="Open menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="h-7 w-7 rounded-md bg-[#00fff9] hidden md:flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" fill="#08080f"/>
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white">Google Ads Dashboard</h1>
                <p className="text-[10px] text-[#4e4e63] hidden sm:block">MCC Overview</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {data && (
                <p className="text-[11px] text-[#4e4e63] hidden sm:block">
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
                <span className="hidden sm:inline">{loading ? "Loading…" : "Refresh"}</span>
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                }}
                title="Sign out"
                className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-1.5 text-[12px] font-medium text-[#6b7280] transition hover:border-red-500/30 hover:text-red-400"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-4 md:gap-6">
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
              {/* Period selector — scrollable on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {CHIP_PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setChipPeriod(p.key)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-[11px] font-medium transition-all border whitespace-nowrap shrink-0",
                      chipPeriod === p.key
                        ? "bg-[#00fff9]/10 border-[#00fff9]/30 text-[#00fff9]"
                        : "border-[#1e1e2e] bg-[#111118] text-[#6b6b7e] hover:text-[#a0a0b8] hover:border-[#2a2a3a]"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Stats chips — scrollable on mobile */}
              {(() => {
                const pl = CHIP_PERIODS.find((p) => p.key === chipPeriod)!.label;
                const m  = (fn: (m: TimePeriodMetrics) => number) =>
                  activeAccounts.reduce((s, a) => s + fn(a.metrics), 0);
                return (
                  <div className="flex gap-2 md:gap-3 overflow-x-auto pb-0.5 scrollbar-none">
                    <Chip label="Active" value={String(activeAccounts.length)} />
                    <Chip label="Inactive" value={String(data.accounts.length - activeAccounts.length)} dim />
                    <Chip
                      label={`Conversions`}
                      value={m((x) => x[chipPeriod].conversions).toLocaleString()}
                      accent
                    />
                    <Chip
                      label={`Spend`}
                      value={`$${m((x) => x[chipPeriod].spend).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    />
                    <Chip
                      label={`Clicks`}
                      value={m((x) => x[chipPeriod].clicks).toLocaleString()}
                    />
                  </div>
                );
              })()}


              {activeAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                  <p className="text-[#4e4e63] text-sm">All accounts are marked inactive.</p>
                  <p className="text-[#3a3a50] text-[12px]">Use the sidebar to restore accounts.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2">
                  {orderedActiveAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onToggleActive={() => toggleActive(account.id, true)}
                      isDragging={draggingId === account.id}
                      isDragOver={dragOverId === account.id}
                      onDragStart={() => handleDragStart(account.id)}
                      onDragOver={() => handleDragOver(account.id)}
                      onDrop={() => handleDrop(account.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              )}

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
    <div className="shrink-0 rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 md:px-4 py-2 md:py-2.5 flex items-center gap-2 md:gap-3">
      <p className="text-[10px] md:text-[11px] text-[#8b8b9a] font-medium whitespace-nowrap">{label}</p>
      <p className={`text-sm font-bold whitespace-nowrap ${accent ? "text-[#00fff9]" : dim ? "text-[#4e4e63]" : "text-white"}`}>{value}</p>
    </div>
  );
}
