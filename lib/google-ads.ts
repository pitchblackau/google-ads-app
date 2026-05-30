import { GoogleAdsApi } from "google-ads-api";
import { Account, CampaignData, AdGroupData, DailyConversion } from "./types";

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

const METRICS_FIELDS = `
  metrics.cost_micros,
  metrics.clicks,
  metrics.impressions,
  metrics.conversions,
  metrics.conversions_from_interactions_rate
`;

async function fetchAccountData(customerId: string) {
  const customer = getCustomer(customerId);

  const now = new Date();
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const d90Str = d90.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [today, thisWeek, thisMonth, last30Days, spend90, trendRows] = await Promise.all([
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING TODAY`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING THIS_WEEK_SUN_TODAY`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING THIS_MONTH`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING LAST_30_DAYS`),
    customer.query(`SELECT metrics.cost_micros FROM customer WHERE segments.date >= '${d90Str}' AND segments.date <= '${todayStr}'`),
    customer.query(`SELECT segments.date, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS ORDER BY segments.date ASC`),
  ]);

  const totalSpend90 = spend90.reduce((sum: number, r: any) => sum + Number(r?.metrics?.cost_micros ?? 0), 0);

  const trendMap: Record<string, number> = {};
  for (const row of trendRows) {
    const date = row.segments!.date as string;
    trendMap[date] = (trendMap[date] ?? 0) + Number(row.metrics!.conversions ?? 0);
  }
  const trend: DailyConversion[] = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, conversions]) => ({ date, conversions }));

  return {
    isActive: totalSpend90 > 0,
    metrics: {
      today: parseMetrics(today[0]),
      thisWeek: parseMetrics(thisWeek[0]),
      thisMonth: parseMetrics(thisMonth[0]),
      last30Days: parseMetrics(last30Days[0]),
    },
    trend,
    trendMap,
  };
}

export interface DashboardPayload {
  accounts: Account[];
  conversionsTrend: DailyConversion[];
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const mcc = getCustomer(process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!);

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

  const dailyTotals: Record<string, number> = {};

  const accounts = await inBatches(ids, 3, async ({ id, name, currency }) => {
    const { isActive, metrics, trend, trendMap } = await fetchAccountData(id);
    for (const [date, val] of Object.entries(trendMap)) {
      dailyTotals[date] = (dailyTotals[date] ?? 0) + val;
    }
    return { id, name, currency, status: "ENABLED" as const, isActive, metrics, trend };
  });

  const conversionsTrend = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, conversions]) => ({ date, conversions }));

  // Sort: active accounts first
  accounts.sort((a, b) => Number(b.isActive) - Number(a.isActive));

  return { accounts, conversionsTrend };
}

// ── Account detail (single account) ─────────────────────────────

export async function fetchAccountDetail(customerId: string): Promise<Account> {
  const mcc = getCustomer(process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!);
  const infoRows = await mcc.query(`
    SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code
    FROM customer_client
    WHERE customer_client.id = ${customerId}
  `);
  const info = infoRows[0];
  const { isActive, metrics, trend } = await fetchAccountData(customerId);
  return {
    id: customerId,
    name: info?.customer_client?.descriptive_name ?? `Account ${customerId}`,
    currency: info?.customer_client?.currency_code ?? "AUD",
    status: "ENABLED",
    isActive,
    metrics,
    trend,
  };
}

// ── Campaign + ad group breakdown ────────────────────────────────

function parseCampaignMetrics(row: any) {
  const spend = Math.round((Number(row?.metrics?.cost_micros ?? 0) / 1_000_000) * 100) / 100;
  const conversionValue = Math.round(Number(row?.metrics?.conversions_value ?? 0) * 100) / 100;
  const clicks = Number(row?.metrics?.clicks ?? 0);
  const impressions = Number(row?.metrics?.impressions ?? 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    conversions: Math.round(Number(row?.metrics?.conversions ?? 0) * 100) / 100,
    spend,
    conversionValue,
    roas: conversionValue > 0 && spend > 0 ? Math.round((conversionValue / spend) * 100) / 100 : null,
  };
}

export async function fetchCampaigns(customerId: string, period: string): Promise<CampaignData[]> {
  const customer = getCustomer(customerId);

  const CAMP_FIELDS = `
    campaign.id, campaign.name, campaign.status,
    metrics.cost_micros, metrics.clicks, metrics.impressions,
    metrics.conversions, metrics.conversions_value
  `;
  const AG_FIELDS = `
    campaign.id, ad_group.id, ad_group.name, ad_group.status,
    metrics.cost_micros, metrics.clicks, metrics.impressions,
    metrics.conversions, metrics.conversions_value
  `;

  const [campaignRows, adGroupRows] = await Promise.all([
    customer.query(`SELECT ${CAMP_FIELDS} FROM campaign WHERE segments.date DURING ${period} AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`),
    customer.query(`SELECT ${AG_FIELDS} FROM ad_group WHERE segments.date DURING ${period} AND ad_group.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`),
  ]);

  const adGroupsByCampaign: Record<string, AdGroupData[]> = {};
  for (const row of adGroupRows) {
    const cid = String(row.campaign!.id);
    if (!adGroupsByCampaign[cid]) adGroupsByCampaign[cid] = [];
    adGroupsByCampaign[cid].push({
      id: String(row.ad_group!.id),
      name: row.ad_group!.name ?? "",
      ...parseCampaignMetrics(row),
    });
  }

  return campaignRows.map((row) => ({
    id: String(row.campaign!.id),
    name: row.campaign!.name ?? "",
    status: String(row.campaign!.status ?? ""),
    ...parseCampaignMetrics(row),
    adGroups: adGroupsByCampaign[String(row.campaign!.id)] ?? [],
  }));
}
