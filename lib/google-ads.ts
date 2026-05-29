import { GoogleAdsApi } from "google-ads-api";
import { Account, DailyConversion, TimePeriodMetrics } from "./types";

let _client: GoogleAdsApi | null = null;

function getClient(): GoogleAdsApi {
  if (!_client) {
    _client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });
  }
  return _client;
}

function getCustomer(customerId: string) {
  return getClient().Customer({
    customer_id: customerId,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!,
  });
}

const DATE_RANGES = {
  today: "TODAY",
  thisWeek: "THIS_WEEK_SUN_TODAY",
  thisMonth: "THIS_MONTH",
  last30Days: "LAST_30_DAYS",
} as const;

async function fetchPeriodMetrics(customerId: string, dateRange: string) {
  const customer = getCustomer(customerId);
  const rows = await customer.query(`
    SELECT
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_from_interactions_rate
    FROM customer
    WHERE segments.date DURING ${dateRange}
  `);

  const row = rows[0];
  const clicks = Number(row?.metrics?.clicks ?? 0);
  const conversions = Number(row?.metrics?.conversions ?? 0);

  return {
    spend: Math.round((Number(row?.metrics?.cost_micros ?? 0) / 1_000_000) * 100) / 100,
    clicks,
    impressions: Number(row?.metrics?.impressions ?? 0),
    conversions,
    conversionRate:
      clicks > 0
        ? Math.round((conversions / clicks) * 10000) / 100
        : 0,
  };
}

export async function getActiveAccounts(): Promise<Account[]> {
  const mcc = getCustomer(process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!);

  const rows = await mcc.query(`
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.status
    FROM customer_client
    WHERE customer_client.status = 'ENABLED'
      AND customer_client.manager = false
  `);

  const accounts: Account[] = await Promise.all(
    rows.map(async (row) => {
      const id = String(row.customer_client!.id);
      const [today, thisWeek, thisMonth, last30Days] = await Promise.all([
        fetchPeriodMetrics(id, DATE_RANGES.today),
        fetchPeriodMetrics(id, DATE_RANGES.thisWeek),
        fetchPeriodMetrics(id, DATE_RANGES.thisMonth),
        fetchPeriodMetrics(id, DATE_RANGES.last30Days),
      ]);

      return {
        id,
        name: row.customer_client!.descriptive_name ?? `Account ${id}`,
        currency: row.customer_client!.currency_code ?? "AUD",
        status: "ENABLED",
        metrics: { today, thisWeek, thisMonth, last30Days },
      };
    })
  );

  return accounts;
}

export async function getConversionsTrend(): Promise<DailyConversion[]> {
  const mcc = getCustomer(process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!);

  const accountRows = await mcc.query(`
    SELECT customer_client.id
    FROM customer_client
    WHERE customer_client.status = 'ENABLED'
      AND customer_client.manager = false
  `);

  const dailyTotals: Record<string, number> = {};

  await Promise.all(
    accountRows.map(async (ar) => {
      const id = String(ar.customer_client!.id);
      const customer = getCustomer(id);
      const rows = await customer.query(`
        SELECT segments.date, metrics.conversions
        FROM customer
        WHERE segments.date DURING LAST_30_DAYS
        ORDER BY segments.date ASC
      `);
      for (const row of rows) {
        const date = row.segments!.date as string;
        dailyTotals[date] = (dailyTotals[date] ?? 0) + Number(row.metrics!.conversions ?? 0);
      }
    })
  );

  return Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, conversions]) => ({ date, conversions }));
}
