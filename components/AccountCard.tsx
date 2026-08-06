"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Account } from "@/lib/types";
import MetricBox from "./MetricBox";
import ReportingPanel from "./ReportingPanel";
import { clsx } from "clsx";

interface AccountCardProps {
  account: Account;
  onToggleActive?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}

const PERIODS = [
  { key: "today" as const,      label: "Today" },
  { key: "thisWeek" as const,   label: "Last 7 Days" },
  { key: "thisMonth" as const,  label: "This Month" },
  { key: "last30Days" as const, label: "Last 30 Days" },
] as const;

export default function AccountCard({
  account,
  onToggleActive,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver: onDragOverProp,
  onDrop,
  onDragEnd,
}: AccountCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"overview" | "reporting">("overview");

  return (
    <div
      ref={cardRef}
      id={`account-${account.id}`}
      className={clsx(
        "rounded-xl border bg-[#111118] p-4 flex flex-col gap-3 scroll-mt-20 group/card transition-all duration-150",
        isDragging  ? "opacity-40 border-[#1e1e2e]" : "border-[#1e1e2e]",
        isDragOver  && "border-[#00fff9]/40 shadow-lg shadow-[#00fff9]/5"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOverProp?.();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-2">

        {/* Drag handle — always visible, brightens on hover */}
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", account.id);
            if (cardRef.current) {
              e.dataTransfer.setDragImage(cardRef.current, 20, 20);
            }
            onDragStart?.();
          }}
          role="button"
          aria-label="Drag to reorder"
          className="shrink-0 mt-0.5 p-1.5 rounded cursor-grab active:cursor-grabbing text-[#2e2e42] hover:text-[#6b6b7e] group-hover/card:text-[#3a3a50] transition-colors select-none"
        >
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <circle cx="3.5" cy="2"  r="1.5"/>
            <circle cx="8.5" cy="2"  r="1.5"/>
            <circle cx="3.5" cy="7"  r="1.5"/>
            <circle cx="8.5" cy="7"  r="1.5"/>
            <circle cx="3.5" cy="12" r="1.5"/>
            <circle cx="8.5" cy="12" r="1.5"/>
          </svg>
        </div>

        {/* Account name — navigates to account detail on click */}
        <button
          onClick={() => router.push(`/account/${account.id}`)}
          className="group/name flex-1 text-left min-w-0 cursor-pointer"
        >
          <h2 className="text-sm font-semibold text-[#00fff9] group-hover/name:underline leading-tight flex items-center gap-1.5">
            {account.name}
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              className="shrink-0 opacity-50 group-hover/name:opacity-100 transition-opacity"
            >
              <path d="M15 3h6v6M10 14L21 3M21 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </h2>
          <p className="mt-0.5 text-[11px] text-[#4e4e63]">
            ID: {account.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}
          </p>
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

      {/* Tab switcher */}
      <div className="flex items-center gap-0.5 rounded-lg bg-[#0d0d14] p-0.5 self-start">
        <button
          onClick={() => setTab("overview")}
          className={clsx(
            "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150",
            tab === "overview"
              ? "bg-[#1e1e2e] text-white shadow"
              : "text-[#6b7280] hover:text-[#a0a8c0]"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("reporting")}
          className={clsx(
            "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150",
            tab === "reporting"
              ? "bg-[#1e1e2e] text-white shadow"
              : "text-[#6b7280] hover:text-[#a0a8c0]"
          )}
        >
          Reporting
        </button>
      </div>

      {tab === "overview" ? (
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
      ) : (
        <ReportingPanel
          accountId={account.id}
          accountName={account.name}
          currency={account.currency}
        />
      )}
    </div>
  );
}
