import { Account, DailyConversion } from "./types";
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

export function generateMockTrend(): DailyConversion[] {
  return Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
    const conversions = MOCK_ACCOUNTS.filter(a => a.isActive).reduce((sum) => {
      return sum + Math.round(rand(5, 80));
    }, 0);
    return { date, conversions };
  });
}
