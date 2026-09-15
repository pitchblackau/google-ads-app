"use client";

import { useEffect, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import PostcodeHeatmap from "./PostcodeHeatmap";
import { CITY_MAPS, cityForPostcode, type CityKey } from "@/lib/postcode-map";
import { PostcodePerformance, TREND_PERIOD_OPTIONS, TrendPeriodValue } from "@/lib/types";

const TITLE = "Conversion heatmap";

interface LoadResult {
  period: TrendPeriodValue;
  postcodes: PostcodePerformance[] | null;
  error: string | null;
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}

function MessageCard({ actions, children }: { actions: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e1e2e] px-4 py-3 md:px-5">
        <h3 className="text-[15px] font-semibold text-white">
          {TITLE} <span className="font-normal text-[#8b8b9a]">by postcode</span>
        </h3>
        {actions}
      </div>
      <div className="flex flex-col items-center gap-2 px-5 py-16 text-center text-sm text-[#8b8b9a]">{children}</div>
    </div>
  );
}

export default function AccountPostcodeMap({ accountId }: { accountId: string }) {
  const [period, setPeriod] = useState<TrendPeriodValue>("LAST_30_DAYS");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/account/${accountId}/postcodes?period=${period}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body.postcodes as PostcodePerformance[];
      })
      .then((postcodes) => setResult({ period, postcodes, error: null }))
      .catch((err) => {
        if (!controller.signal.aborted) setResult({ period, postcodes: null, error: err.message });
      });
    return () => controller.abort();
  }, [accountId, period]);

  const loading = result?.period !== period;
  const periodLabel = TREND_PERIOD_OPTIONS.find((o) => o.value === period)!.label;
  const all = result?.postcodes ?? [];

  // Show the city the account's clicks mostly come from.
  const clicksByCity = new Map<CityKey, number>();
  for (const p of all) {
    const c = cityForPostcode(p.postcode);
    if (c) clicksByCity.set(c, (clicksByCity.get(c) ?? 0) + p.clicks);
  }
  const city = [...clicksByCity.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const shown = city ? all.filter((p) => cityForPostcode(p.postcode) === city) : [];
  const elsewhere = all.filter((p) => !city || cityForPostcode(p.postcode) !== city);
  const elsewhereClicks = elsewhere.reduce((sum, p) => sum + p.clicks, 0);

  const periodPicker = (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen((open) => !open)}
        className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-1.5 text-[12px] text-white transition-colors hover:border-[#00fff9]/40"
      >
        {loading && result && <Spinner />}
        {periodLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={clsx("transition-transform", dropdownOpen && "rotate-180")}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[#1e1e2e] bg-[#0d0d18] shadow-xl">
          {TREND_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setPeriod(opt.value);
                setDropdownOpen(false);
              }}
              className={clsx(
                "w-full px-4 py-2 text-left text-[12px] transition-colors hover:bg-[#ffffff08]",
                opt.value === period ? "text-[#00fff9]" : "text-[#c8c8d8]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!result) {
    return (
      <MessageCard actions={periodPicker}>
        <span className="flex items-center gap-2"><Spinner /> Loading postcode data…</span>
      </MessageCard>
    );
  }

  if (result.error) {
    return <MessageCard actions={periodPicker}>Couldn&apos;t load postcode data ({result.error}).</MessageCard>;
  }

  if (all.length === 0) {
    return <MessageCard actions={periodPicker}>No clicks with a known postcode in this period.</MessageCard>;
  }

  if (!city) {
    return (
      <MessageCard actions={periodPicker}>
        <p className="font-medium text-white">No Perth, Melbourne or Sydney metro clicks in this period</p>
        <p className="max-w-md">
          The map covers those three metro areas. All {elsewhereClicks.toLocaleString("en-AU")} clicks came from
          elsewhere — top postcodes: {elsewhere.slice(0, 5).map((p) => p.postcode).join(", ")}.
        </p>
      </MessageCard>
    );
  }

  return (
    <PostcodeHeatmap
      city={city}
      data={shown}
      title={TITLE}
      subtitle={`${CITY_MAPS[city].name}, by postcode`}
      actions={periodPicker}
      footnote={
        elsewhere.length
          ? `${elsewhereClicks.toLocaleString("en-AU")} click(s) from ${elsewhere.length} postcode(s) outside ${CITY_MAPS[city].name} aren't shown.`
          : undefined
      }
    />
  );
}
