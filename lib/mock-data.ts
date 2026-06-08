import { Account, DailyConversion, Suggestion } from "./types";
import { format, subDays } from "date-fns";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

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
    today: a.isActive ? mockMetrics(1) : { spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionRate: 0 },
    thisWeek: a.isActive ? mockMetrics(5) : { spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionRate: 0 },
    thisMonth: a.isActive ? mockMetrics(18) : { spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionRate: 0 },
    last30Days: a.isActive ? mockMetrics(20) : { spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionRate: 0 },
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
    },
    {
      id: "m2", type: "warning", category: "keywords", impact: "high",
      title: "3 keywords spent $340 with zero conversions",
      description: "These keywords are consuming budget without results. Consider pausing them, reducing bids, or fixing the landing page experience.",
    },
    {
      id: "m3", type: "opportunity", category: "search_terms", impact: "high",
      title: '7 search terms spent $210 with no conversions',
      description: 'Terms like "free quote online", "compare prices" are burning budget. Add irrelevant ones as negative keywords to redirect spend toward converting queries.',
    },
    {
      id: "m4", type: "opportunity", category: "search_terms", impact: "medium",
      title: "2 high-converting search terms not yet added as keywords",
      description: '"affordable dental" (4 conv.), "dentist near me" (3 conv.) are converting well but triggered broadly. Add as exact match keywords to control bids.',
    },
    {
      id: "m5", type: "opportunity", category: "ads", impact: "medium",
      title: "3 ad groups running only one active ad",
      description: 'Without ad variations there is nothing to test. Add 2–3 Responsive Search Ads to "Brand Keywords", "Core Services" and 1 more.',
    },
    {
      id: "m6", type: "opportunity", category: "campaigns", impact: "medium",
      title: "1 campaign delivering strong ROAS — consider scaling budget",
      description: '"Brand Keywords" is generating 6.2x ROAS. Increasing the budget on high-performing campaigns is the fastest way to grow conversions profitably.',
    },
  ];
}

export function generateMockAccountTrend(days = 30): DailyConversion[] {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd"),
    conversions: Math.round(rand(2, 40)),
  }));
}
