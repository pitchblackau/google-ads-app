"use client";

import { useEffect, useState } from "react";
import { Suggestion } from "@/lib/types";
import { clsx } from "clsx";

interface Props {
  accountId: string;
}

const TYPE_CONFIG = {
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    dot: "bg-amber-400",
  },
  opportunity: {
    bg: "bg-[#00fff9]/5",
    border: "border-[#00fff9]/20",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00fff9" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    dot: "bg-[#00fff9]",
  },
  info: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4m0-4h.01" strokeLinecap="round" />
      </svg>
    ),
    dot: "bg-blue-400",
  },
} as const;

const IMPACT_CONFIG = {
  high:   { label: "High impact",   cls: "bg-red-500/20 text-red-400" },
  medium: { label: "Medium impact", cls: "bg-amber-500/20 text-amber-400" },
  low:    { label: "Low impact",    cls: "bg-[#3a3a50]/40 text-[#6b6b7e]" },
} as const;

const CATEGORY_LABELS: Record<Suggestion["category"], string> = {
  keywords:     "Keywords",
  search_terms: "Search Terms",
  ads:          "Ads",
  campaigns:    "Campaigns",
  general:      "General",
};

export default function OptimisationSuggestions({ accountId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/account/${accountId}/suggestions`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [accountId]);

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00fff9" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" strokeLinecap="round" />
          </svg>
          <h2 className="text-sm font-semibold text-white">Optimisation Suggestions</h2>
        </div>
        <p className="text-[11px] text-[#4e4e63] mt-0.5">
          Based on last 30 days · keywords, search terms, ads &amp; campaign performance
        </p>
      </div>

      {/* Body */}
      {loading ? (
        <div className="px-5 py-8 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-[#1e1e2e] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-[#1e1e2e]" />
                <div className="h-2.5 w-full rounded bg-[#1a1a28]" />
                <div className="h-2.5 w-4/5 rounded bg-[#1a1a28]" />
              </div>
            </div>
          ))}
          <p className="text-center text-[11px] text-[#4e4e63] mt-2">
            Analysing account data… this may take a moment on first load
          </p>
        </div>
      ) : error ? (
        <div className="px-5 py-8 text-center text-[#4e4e63] text-sm">
          Unable to load suggestions — check back shortly
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a26]">
          {suggestions.map((s) => {
            const tc = TYPE_CONFIG[s.type];
            const ic = IMPACT_CONFIG[s.impact];
            return (
              <div key={s.id} className={clsx("flex gap-4 px-5 py-4", tc.bg, "border-l-2", tc.border)}>
                {/* Icon */}
                <div className="shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-[#0b0b14] border border-[#1e1e2e] flex items-center justify-center">
                  {tc.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-white leading-snug flex-1">{s.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold", ic.cls)}>
                        {ic.label}
                      </span>
                      <span className="rounded-full border border-[#2a2a3a] bg-[#0d0d18] px-2 py-0.5 text-[10px] text-[#6b6b7e]">
                        {CATEGORY_LABELS[s.category]}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] sm:text-[12px] text-[#8b8b9a] leading-relaxed">{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
