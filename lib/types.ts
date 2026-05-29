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
  metrics: TimePeriodMetrics;
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
