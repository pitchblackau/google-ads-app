"use client";

import { useRouter } from "next/navigation";
import { Account } from "@/lib/types";
import MetricBox from "./MetricBox";
import { clsx } from "clsx";

interface AccountCardProps {
  account: Account;
  /** Called when user clicks the Active badge to deactivate this account */
  onToggleActive?: () => void;
}

const PERIODS = [
  { key: "today" as const,      label: "Today" },
  { key: "thisWeek" as const,   label: "Last 7 Days" },
  { key: "thisMonth" as const,  label: "This Month" },
  { key: "last30Days" as const, label: "Last 30 Days" },
] as const;

export default function AccountCard({ account, onToggleActive }: AccountCardProps) {
  const router = useRouter();

  return (
    <div
      id={`account-${account.id}`}
      className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 flex flex-col gap-3 scroll-mt-20"
    >
      <div className="flex items-start justify-between">
        <button
          onClick={() => router.push(`/account/${account.id}`)}
          className="group flex items-center gap-2 text-left"
        >
          <div>
            <h2 className="text-sm font-semibold text-white group-hover:text-[#00fff9] transition-colors leading-tight flex items-center gap-1.5">
              {account.name}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00fff9]">
                <path d="M15 3h6v6M10 14L21 3M21 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </h2>
            <p className="mt-0.5 text-[11px] text-[#4e4e63]">
              ID: {account.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}
            </p>
          </div>
        </button>

        {/* Toggle button — shows "Active" normally, "Set Inactive" on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive?.(); }}
          title="Click to move to inactive"
          className={clsx(
            "group/toggle rounded-full border px-2.5 py-0.5 text-[10px] font-medium shrink-0 transition-all duration-150",
            "bg-[#00fff910] border-[#00fff930] text-[#00fff9]",
            "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          )}
        >
          <span className="group-hover/toggle:hidden">Active</span>
          <span className="hidden group-hover/toggle:inline whitespace-nowrap">Set Inactive</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {PERIODS.map(({ key, label }) => (
          <MetricBox
            key={key}
            label={label}
            metrics={account.metrics[key]}
            currency={account.currency}
          />
        ))}
      </div>
    </div>
  );
}
