import { Account, DailyConversion, Suggestion } from "./types";
import { format, subDays } from "date-fns";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const ZERO_METRICS = { spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionRate: 0 };

function mockMetrics(scale: number) {
  const clicks = Math.round(rand(80, 600) * scale);
  const impressions = Math.round(rand(2000, 20000) * scale);
  const conversions = Math.round(rand(2, 30) * scale);
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  return {
    spend: Math.round(rand(100, 1200) * scale * 100) / 100,
    clicks,
    impressions,
    conversions,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

function mockTrend(): DailyConversion[] {
  return Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
    conversions: Math.round(rand(2, 40)),
  }));
}

const BASE_ACCOUNTS = [
  { id: "1234567890", name: "Acme Corp", currency: "AUD", isActive: true },
  { id: "2345678901", name: "Blue Horizon Dental", currency: "AUD", isActive: true },
  { id: "3456789012", name: "Summit Legal Group", currency: "AUD", isActive: true },
  { id: "4567890123", name: "Coastal Real Estate", currency: "AUD", isActive: true },
  { id: "5678901234", name: "FitLife Studios", currency: "AUD", isActive: false },
  { id: "6789012345", name: "TechFlow Solutions", currency: "AUD", isActive: false },
];

export const MOCK_ACCOUNTS: Account[] = BASE_ACCOUNTS.map((a) => ({
  ...a,
  status: "ENABLED" as const,
  metrics: {
    today:       a.isActive ? mockMetrics(1)   : ZERO_METRICS,
    thisWeek:    a.isActive ? mockMetrics(5)   : ZERO_METRICS,
    thisMonth:   a.isActive ? mockMetrics(18)  : ZERO_METRICS,
    last30Days:  a.isActive ? mockMetrics(20)  : ZERO_METRICS,
    last3Months: a.isActive ? mockMetrics(55)  : ZERO_METRICS,
    thisYear:    a.isActive ? mockMetrics(240) : ZERO_METRICS,
  },
  trend: a.isActive ? mockTrend() : [],
}));

export function generateMockTrend(days = 30): DailyConversion[] {
  return Array.from({ length: days }, (_, i) => {
    const date = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    const conversions = MOCK_ACCOUNTS.filter(a => a.isActive).reduce((sum) => {
      return sum + Math.round(rand(5, 80));
    }, 0);
    return { date, conversions };
  });
}

export function generateMockSuggestions(): Suggestion[] {
  return [
    {
      id: "m1", type: "warning", category: "keywords", impact: "high",
      title: "4 keywords with Quality Score ≤ 4",
      description: 'Low QS means higher CPCs and lost impression share. Improve ad copy and landing pages for: "cheap insurance" (QS 3), "buy car online" (QS 4), "fast loans" (QS 3) and 1 more.',
      details: [
        { label: '"cheap insurance"',   meta: "QS 3", value: "$45 spent" },
        { label: '"buy car online"',    meta: "QS 4", value: "$28 spent" },
        { label: '"fast loans"',        meta: "QS 3", value: "$67 spent" },
        { label: '"urgent credit now"', meta: "QS 2", value: "$19 spent" },
      ],
    },
    {
      id: "m2", type: "warning", category: "keywords", impact: "high",
      title: "3 keywords spent $340 with zero conversions",
      description: "These keywords are consuming budget without results. Consider pausing them, reducing bids, or fixing the landing page experience.",
      details: [
        { label: '"cheap insurance quotes"', meta: "0 conversions", value: "$142 spent" },
        { label: '"free loan approval"',     meta: "0 conversions", value: "$118 spent" },
        { label: '"quick cash advance"',     meta: "0 conversions", value: "$80 spent" },
      ],
    },
    {
      id: "m3", type: "opportunity", category: "search_terms", impact: "high",
      title: '7 search terms spent $210 with no conversions',
      description: 'Terms like "free quote online", "compare prices" are burning budget. Add irrelevant ones as negative keywords to redirect spend toward converting queries.',
      details: [
        { label: '"free quote online"',            meta: "0 conversions", value: "$48 spent" },
        { label: '"compare prices"',               meta: "0 conversions", value: "$39 spent" },
        { label: '"cheap insurance comparison"',   meta: "0 conversions", value: "$31 spent" },
        { label: '"no deposit loans"',             meta: "0 conversions", value: "$27 spent" },
        { label: '"instant approval credit"',      meta: "0 conversions", value: "$24 spent" },
        { label: '"best rate mortgage"',           meta: "0 conversions", value: "$22 spent" },
        { label: '"free financial advice"',        meta: "0 conversions", value: "$19 spent" },
      ],
    },
    {
      id: "m4", type: "opportunity", category: "search_terms", impact: "medium",
      title: "2 high-converting search terms not yet added as keywords",
      description: '"affordable dental" (4 conv.), "dentist near me" (3 conv.) are converting well but triggered broadly. Add as exact match keywords to control bids.',
      details: [
        { label: '"affordable dental"', meta: "4 conversions", value: undefined },
        { label: '"dentist near me"',   meta: "3 conversions", value: undefined },
      ],
    },
    {
      id: "m5", type: "opportunity", category: "ads", impact: "medium",
      title: "3 ad groups running only one active ad",
      description: 'Without ad variations there is nothing to test. Add 2–3 Responsive Search Ads to "Brand Keywords", "Core Services" and 1 more.',
      details: [
        { label: "Brand Keywords",    meta: "Core Brand campaign",     value: "1 ad" },
        { label: "Core Services",     meta: "Generic Services campaign", value: "1 ad" },
        { label: "Location Targeting", meta: "Local Push campaign",    value: "1 ad" },
      ],
    },
    {
      id: "m6", type: "opportunity", category: "campaigns", impact: "medium",
      title: "1 campaign delivering strong ROAS — consider scaling budget",
      description: '"Brand Keywords" is generating 6.2x ROAS. Increasing the budget on high-performing campaigns is the fastest way to grow conversions profitably.',
      details: [
        { label: '"Brand Keywords"', meta: "6.2x ROAS", value: "$340 spent" },
      ],
    },
  ];
}

export function generateMockAccountTrend(days = 30): DailyConversion[] {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd"),
    conversions: Math.round(rand(2, 40)),
  }));
}
