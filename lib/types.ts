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
  yesterday: AccountMetrics;
  thisMonth: AccountMetrics;
  last30Days: AccountMetrics;
  last3Months: AccountMetrics;
  thisYear: AccountMetrics;
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
  status: string;
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

export interface SuggestionDetail {
  label: string;   // keyword text, search term, campaign name, etc.
  meta?: string;   // QS score, spend, status, etc.
  value?: string;  // conversions, ROAS, etc.
}

export interface Suggestion {
  id: string;
  type: "warning" | "opportunity" | "info";
  category: "keywords" | "search_terms" | "ads" | "campaigns" | "general";
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  details?: SuggestionDetail[];
}

export const PERIOD_OPTIONS = [
  { label: "Last 30 Days",  value: "LAST_30_DAYS"       },
  { label: "This Month",    value: "THIS_MONTH"          },
  { label: "Last 7 Days",   value: "LAST_7_DAYS" },
  { label: "Today",         value: "TODAY"               },
] as const;

export type PeriodValue = typeof PERIOD_OPTIONS[number]["value"];

// ── Report data types ─────────────────────────────────────────────

export interface DailyReportMetrics {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  convRate: number;
  cost: number;
  avgCpc: number;
}

export interface ReportCampaign {
  name: string;
  avgCpc: number;
  costPerConv: number | null;
  cost: number;
  allConvValue: number;
  conversions: number;
}

export interface ReportDevice {
  device: string;
  clicks: number;
  conversions: number;
  cost: number;
}

export interface ReportMetrics {
  clicks: number;
  ctr: number;
  impressions: number;
  conversions: number;
  convRate: number;
  costPerConv: number | null;
  allConvValue: number;
  cost: number;
  avgCpc: number;
  clicksChange: number | null;
  ctrChange: number | null;
  impressionsChange: number | null;
  conversionsChange: number | null;
  convRateChange: number | null;
  costPerConvChange: number | null;
  allConvValueChange: number | null;
  costChange: number | null;
  avgCpcChange: number | null;
}

export interface MonthlyConversions {
  month: string;   // "YYYY-MM" e.g. "2025-08"
  conversions: number;
}

export interface AccountReport {
  periodStart: string;
  periodEnd: string;
  metrics: ReportMetrics;
  dailyData: DailyReportMetrics[];
  campaigns: ReportCampaign[];
  devices: ReportDevice[];
  monthlyConversions: MonthlyConversions[];
}

// ── Postcode heatmap ──────────────────────────────────────────────

export interface PostcodePerformance {
  postcode: string;
  clicks: number;
  conversions: number;
  /** Percentage, e.g. 6.06 for 6.06%. Derived from clicks and conversions when omitted. */
  convRate?: number;
  suburb?: string;
  /** Centroid, used for a circle marker when ABS has no boundary polygon for the postcode. */
  lat?: number;
  lon?: number;
}
