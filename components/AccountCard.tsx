"use client";

import { Account } from "@/lib/types";
import MetricBox from "./MetricBox";
import { clsx } from "clsx";

interface AccountCardProps {
  account: Account;
  onOpenDetail: (account: Account) => void;
}

const PERIODS = [
  { key: "today" as const,      label: "Today" },
  { key: "thisWeek" as const,   label: "This Week" },
  { key: "thisMonth" as const,  label: "This Month" },
  { key: "last30Days" as const, label: "Last 30 Days" },
] as const;

export default function AccountCard({ account, onOpenDetail }: AccountCardProps) {
  return (
    <div
      id={`account-${account.id}`}
      className={clsx(
        "rounded-xl border bg-[#111118] p-4 flex flex-col gap-3 scroll-mt-20",
        account.isActive ? "border-[#1e1e2e]" : "border-[#161620] opacity-60"
      )}
    >
      <div className="flex items-start justify-between">
        <button
          onClick={() => onOpenDetail(account)}
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

        <span className={clsx(
          "rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
          account.isActive
            ? "bg-[#00fff910] border-[#00fff930] text-[#00fff9]"
            : "bg-[#3a3a5010] border-[#3a3a5030] text-[#3a3a50]"
        )}>
          {account.isActive ? "Active" : "Inactive"}
        </span>
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
