export interface AccountMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionRate: number;
}

export interface TimePeriodMetrics {
  today: AccountMetrics;
  thisWeek: AccountMetrics;
  thisMonth: AccountMetrics;
  last30Days: AccountMetrics;
}

export interface Account {
  id: string;
  name: string;
  currency: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  isActive: boolean;
  metrics: TimePeriodMetrics;
  trend: DailyConversion[];
}

export interface DailyConversion {
  date: string;
  conversions: number;
}

export interface DashboardData {
  accounts: Account[];
  conversionsTrend: DailyConversion[];
  lastUpdated: string;
}

export interface AdGroupData {
  id: string;
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  spend: number;
  conversionValue: number;
  roas: number | null;
}

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  spend: number;
  conversionValue: number;
  roas: number | null;
  adGroups: AdGroupData[];
}

export const TREND_PERIOD_OPTIONS = [
  { label: "Last 30 days",  value: "LAST_30_DAYS"  },
  { label: "Last 3 months", value: "LAST_3_MONTHS" },
  { label: "Last 6 months", value: "LAST_6_MONTHS" },
  { label: "This year",     value: "THIS_YEAR"      },
] as const;

export type TrendPeriodValue = typeof TREND_PERIOD_OPTIONS[number]["value"];

export const PERIOD_OPTIONS = [
  { label: "Last 30 Days",  value: "LAST_30_DAYS"       },
  { label: "This Month",    value: "THIS_MONTH"          },
  { label: "This Week",     value: "THIS_WEEK_SUN_TODAY" },
  { label: "Today",         value: "TODAY"               },
] as const;

export type PeriodValue = typeof PERIOD_OPTIONS[number]["value"];
