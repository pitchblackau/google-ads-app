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

export const MOCK_ACCOUNTS: Account[] = [
  { id: "1234567890", name: "Acme Corp", currency: "AUD" },
  { id: "2345678901", name: "Blue Horizon Dental", currency: "AUD" },
  { id: "3456789012", name: "Summit Legal Group", currency: "AUD" },
  { id: "4567890123", name: "Coastal Real Estate", currency: "AUD" },
  { id: "5678901234", name: "FitLife Studios", currency: "AUD" },
  { id: "6789012345", name: "TechFlow Solutions", currency: "AUD" },
].map((a) => ({
  ...a,
  status: "ENABLED" as const,
  metrics: {
    today: mockMetrics(1),
    thisWeek: mockMetrics(5),
    thisMonth: mockMetrics(18),
    last30Days: mockMetrics(20),
  },
}));

export function generateMockTrend(): DailyConversion[] {
  return Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
    const conversions = MOCK_ACCOUNTS.reduce((sum) => {
      return sum + Math.round(rand(5, 80));
    }, 0);
    return { date, conversions };
  });
}
