"use client";

import { AccountMetrics } from "@/lib/types";
import { clsx } from "clsx";

interface MetricBoxProps {
  label: string;
  metrics: AccountMetrics;
  currency: string;
  highlight?: boolean;
}

function fmt(n: number, currency: string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtSpend(n: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCpc(spend: number, clicks: number, currency: string) {
  if (clicks === 0) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(spend / clicks);
}

const PERIOD_COLORS: Record<string, string> = {
  Today: "border-t-[#00fff9]",
  Yesterday: "border-t-[#7c6aff]",
  "Last 7 Days": "border-t-[#ff6a9b]",
  "Last 30 Days": "border-t-[#ffaa4d]",
};

export default function MetricBox({ label, metrics, currency }: MetricBoxProps) {
  const accentBorder = PERIOD_COLORS[label] ?? "border-t-[#00fff9]";

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-lg border border-[#1e1e2e] border-t-2 bg-[#0d0d18] p-3",
        accentBorder
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b8b9a]">
        {label}
      </p>

      <Row label="Spend" value={fmtSpend(metrics.spend, currency)} bold />
      <Row label="Clicks" value={fmt(metrics.clicks, currency)} />
      <Row label="Avg. CPC" value={fmtCpc(metrics.spend, metrics.clicks, currency)} />
      <Row label="Impress." value={fmt(metrics.impressions, currency)} />
      <Row label="Conv. Rate" value={`${metrics.conversionRate.toFixed(2)}%`} />
      <Row label="Conversions" value={fmt(metrics.conversions, currency)} accent />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#6b6b7e]">{label}</span>
      <span
        className={clsx(
          "text-[12px] tabular-nums",
          bold && "font-semibold text-white",
          accent && "font-semibold text-[#00fff9]",
          !bold && !accent && "text-[#c8c8d8]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
