"use client";

import { Account } from "@/lib/types";
import MetricBox from "./MetricBox";

interface AccountCardProps {
  account: Account;
}

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "last30Days", label: "Last 30 Days" },
] as const;

export default function AccountCard({ account }: AccountCardProps) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white leading-tight">
            {account.name}
          </h2>
          <p className="mt-0.5 text-[11px] text-[#4e4e63]">
            ID: {account.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}
          </p>
        </div>
        <span className="rounded-full bg-[#00fff910] border border-[#00fff930] px-2 py-0.5 text-[10px] font-medium text-[#00fff9]">
          Active
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
