import { GoogleAdsApi } from "google-ads-api";
import { Account, DailyConversion } from "./types";

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

// Process items in sequential batches to avoid rate limits
async function inBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

function parseMetrics(row: any) {
  const clicks = Number(row?.metrics?.clicks ?? 0);
  const conversions = Number(row?.metrics?.conversions ?? 0);
  return {
    spend: Math.round((Number(row?.metrics?.cost_micros ?? 0) / 1_000_000) * 100) / 100,
    clicks,
    impressions: Number(row?.metrics?.impressions ?? 0),
    conversions,
    conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
  };
}

const METRICS_QUERY = `
  SELECT
    metrics.cost_micros,
    metrics.clicks,
    metrics.impressions,
    metrics.conversions,
    metrics.conversions_from_interactions_rate
  FROM customer
  WHERE segments.date DURING `;

async function fetchAllPeriods(customerId: string) {
  const customer = getCustomer(customerId);
  const [today, thisWeek, thisMonth, last30Days] = await Promise.all([
    customer.query(METRICS_QUERY + "TODAY"),
    customer.query(METRICS_QUERY + "THIS_WEEK_SUN_TODAY"),
    customer.query(METRICS_QUERY + "THIS_MONTH"),
    customer.query(METRICS_QUERY + "LAST_30_DAYS"),
  ]);
  return {
    today: parseMetrics(today[0]),
    thisWeek: parseMetrics(thisWeek[0]),
    thisMonth: parseMetrics(thisMonth[0]),
    last30Days: parseMetrics(last30Days[0]),
  };
}

async function fetchTrend(customerId: string): Promise<Record<string, number>> {
  const customer = getCustomer(customerId);
  const rows = await customer.query(`
    SELECT segments.date, metrics.conversions
    FROM customer
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY segments.date ASC
  `);
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const date = row.segments!.date as string;
    totals[date] = (totals[date] ?? 0) + Number(row.metrics!.conversions ?? 0);
  }
  return totals;
}

export interface DashboardPayload {
  accounts: Account[];
  conversionsTrend: DailyConversion[];
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const mcc = getCustomer(process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!);

  // Single query to list all active sub-accounts
  const clientRows = await mcc.query(`
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code
    FROM customer_client
    WHERE customer_client.status = 'ENABLED'
      AND customer_client.manager = false
  `);

  const ids = clientRows.map((r) => ({
    id: String(r.customer_client!.id),
    name: r.customer_client!.descriptive_name ?? `Account ${r.customer_client!.id}`,
    currency: r.customer_client!.currency_code ?? "AUD",
  }));

  // Process in batches of 3 — metrics + trend per account together
  const dailyTotals: Record<string, number> = {};

  const accounts = await inBatches(ids, 3, async ({ id, name, currency }) => {
    const [metrics, trend] = await Promise.all([
      fetchAllPeriods(id),
      fetchTrend(id),
    ]);
    for (const [date, val] of Object.entries(trend)) {
      dailyTotals[date] = (dailyTotals[date] ?? 0) + val;
    }
    return { id, name, currency, status: "ENABLED" as const, metrics };
  });

  const conversionsTrend = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, conversions]) => ({ date, conversions }));

  return { accounts, conversionsTrend };
}
