import { GoogleAdsApi } from "google-ads-api";
import { Account, CampaignData, AdGroupData, DailyConversion } from "./types";

// ── Suggestion data types ─────────────────────────────────────────
export interface KeywordRow {
  text: string;
  qualityScore: number | null;
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  campaignName: string;
  adGroupName: string;
}
export interface SearchTermRow {
  term: string;
  statusCode: number; // 2=ADDED 3=EXCLUDED 4=ADDED_EXCLUDED 5=NONE
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
}
export interface AdGroupAdCount {
  adGroupId: string;
  adGroupName: string;
  campaignName: string;
  adCount: number;
}
export interface SuggestionsRawData {
  keywords: KeywordRow[];
  searchTerms: SearchTermRow[];
  adGroupAdCounts: AdGroupAdCount[];
  campaigns: Array<{ name: string; spend: number; conversions: number; roas: number | null }>;
}

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

  const [today, thisWeek, thisMonth, last30Days, spend90, trendRows, last3Months, thisYear] = await Promise.all([
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING TODAY`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING LAST_7_DAYS`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING THIS_MONTH`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING LAST_30_DAYS`),
    customer.query(`SELECT metrics.cost_micros FROM customer WHERE segments.date >= '${d90Str}' AND segments.date <= '${todayStr}'`),
    customer.query(`SELECT segments.date, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS ORDER BY segments.date ASC`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING LAST_90_DAYS`),
    customer.query(`SELECT ${METRICS_FIELDS} FROM customer WHERE segments.date DURING THIS_YEAR`),
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
      last3Months: parseMetrics(last3Months[0]),
      thisYear: parseMetrics(thisYear[0]),
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

// ── Standalone trend queries (support multiple periods) ──────────

function buildTrendDateFilter(period: string): string {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (period === "LAST_30_DAYS") return "segments.date DURING LAST_30_DAYS";
  if (period === "THIS_YEAR") {
    return `segments.date >= '${now.getFullYear()}-01-01' AND segments.date <= '${todayStr}'`;
  }
  const days = period === "LAST_3_MONTHS" ? 90 : 180; // default → LAST_6_MONTHS
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return `segments.date >= '${start.toISOString().slice(0, 10)}' AND segments.date <= '${todayStr}'`;
}

export async function fetchAccountTrend(customerId: string, period: string): Promise<DailyConversion[]> {
  const customer = getCustomer(customerId);
  const rows = await customer.query(
    `SELECT segments.date, metrics.conversions FROM customer WHERE ${buildTrendDateFilter(period)} ORDER BY segments.date ASC`
  );
  const trendMap: Record<string, number> = {};
  for (const row of rows) {
    const date = row.segments!.date as string;
    if (date) trendMap[date] = (trendMap[date] ?? 0) + Number(row.metrics!.conversions ?? 0);
  }
  return Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, conversions]) => ({ date, conversions }));
}

export async function fetchDashboardTrend(period: string): Promise<DailyConversion[]> {
  const mcc = getCustomer(process.env.GOOGLE_ADS_MCC_CUSTOMER_ID!);
  const clientRows = await mcc.query(`
    SELECT customer_client.id FROM customer_client
    WHERE customer_client.status = 'ENABLED' AND customer_client.manager = false
  `);
  const ids = clientRows.map((r) => String(r.customer_client!.id));
  const dailyTotals: Record<string, number> = {};
  await inBatches(ids, 3, async (id) => {
    const trend = await fetchAccountTrend(id, period);
    for (const { date, conversions } of trend) {
      dailyTotals[date] = (dailyTotals[date] ?? 0) + conversions;
    }
  });
  return Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, conversions]) => ({ date, conversions }));
}

// ── Campaign + ad group breakdown ────────────────────────────────

function parseCampaignMetrics(row: any) {
  const spend = Math.round((Number(row?.metrics?.cost_micros ?? 0) / 1_000_000) * 100) / 100;
  const conversionValue = Math.round(Number(row?.metrics?.conversions_value ?? 0) * 100) / 100;
  const clicks = Number(row?.metrics?.clicks ?? 0);
  const impressions = Number(row?.metrics?.impressions ?? 0);
  const conversions = Math.round(Number(row?.metrics?.conversions ?? 0) * 100) / 100;
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    conversions,
    conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
    spend,
    conversionValue,
    roas: conversionValue > 0 && spend > 0 ? Math.round((conversionValue / spend) * 100) / 100 : null,
  };
}

// Google Ads API returns status as a numeric enum — map to readable strings
const CAMPAIGN_STATUS:  Record<number, string> = { 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };
const AD_GROUP_STATUS:  Record<number, string> = { 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };

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

  // Use != 'REMOVED' so campaigns that ran in the period but are now paused
  // still appear — the UI layer handles hiding currently-paused campaigns.
  const [campaignRows, adGroupRows] = await Promise.all([
    customer.query(`SELECT ${CAMP_FIELDS} FROM campaign WHERE segments.date DURING ${period} AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`),
    customer.query(`SELECT ${AG_FIELDS} FROM ad_group WHERE segments.date DURING ${period} AND campaign.status != 'REMOVED' AND ad_group.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`),
  ]);

  const adGroupsByCampaign: Record<string, AdGroupData[]> = {};
  for (const row of adGroupRows) {
    const cid = String(row.campaign!.id);
    if (!adGroupsByCampaign[cid]) adGroupsByCampaign[cid] = [];
    const rawAgStatus = Number(row.ad_group!.status);
    const agStatus = AD_GROUP_STATUS[rawAgStatus] ?? String(row.ad_group!.status ?? "UNKNOWN");
    adGroupsByCampaign[cid].push({
      id: String(row.ad_group!.id),
      name: row.ad_group!.name ?? "",
      status: agStatus,
      ...parseCampaignMetrics(row),
    });
  }

  return campaignRows.map((row) => {
    // Normalise numeric enum → string so UI comparisons ("ENABLED") work
    const rawStatus = Number(row.campaign!.status);
    const status = CAMPAIGN_STATUS[rawStatus] ?? String(row.campaign!.status ?? "UNKNOWN");
    return {
      id: String(row.campaign!.id),
      name: row.campaign!.name ?? "",
      status,
      ...parseCampaignMetrics(row),
      adGroups: adGroupsByCampaign[String(row.campaign!.id)] ?? [],
    };
  });
}

// ── Optimisation suggestions data ────────────────────────────────

export async function fetchSuggestionsData(customerId: string): Promise<SuggestionsRawData> {
  const customer = getCustomer(customerId);

  // Run all queries in parallel; each is wrapped so one failure won't kill the rest
  const [kwRows, stRows, adRows, campRows] = await Promise.all([
    customer.query(`
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.quality_info.quality_score,
        metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_micros,
        campaign.name, ad_group.name
      FROM keyword_view
      WHERE segments.date DURING LAST_30_DAYS
        AND ad_group_criterion.status != 'REMOVED'
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 300
    `).catch(() => []),

    customer.query(`
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_micros
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 300
    `).catch(() => []),

    // Ad count per ad group — no date filter (counts currently enabled ads)
    customer.query(`
      SELECT ad_group.id, ad_group.name, campaign.name, ad_group_ad.ad.id
      FROM ad_group_ad
      WHERE ad_group_ad.status = 'ENABLED'
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
      LIMIT 500
    `).catch(() => []),

    customer.query(`
      SELECT campaign.name,
        metrics.cost_micros, metrics.conversions, metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status = 'ENABLED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `).catch(() => []),
  ]);

  const keywords: KeywordRow[] = kwRows.map((r: any) => {
    const qs = Number(r?.ad_group_criterion?.quality_info?.quality_score ?? 0);
    return {
      text: r?.ad_group_criterion?.keyword?.text ?? "",
      qualityScore: qs > 0 ? qs : null,
      clicks: Number(r?.metrics?.clicks ?? 0),
      impressions: Number(r?.metrics?.impressions ?? 0),
      conversions: Number(r?.metrics?.conversions ?? 0),
      spend: Number(r?.metrics?.cost_micros ?? 0) / 1_000_000,
      campaignName: r?.campaign?.name ?? "",
      adGroupName: r?.ad_group?.name ?? "",
    };
  });

  const searchTerms: SearchTermRow[] = stRows.map((r: any) => ({
    term: r?.search_term_view?.search_term ?? "",
    statusCode: Number(r?.search_term_view?.status ?? 0),
    clicks: Number(r?.metrics?.clicks ?? 0),
    impressions: Number(r?.metrics?.impressions ?? 0),
    conversions: Number(r?.metrics?.conversions ?? 0),
    spend: Number(r?.metrics?.cost_micros ?? 0) / 1_000_000,
  }));

  // Count ads per ad group
  const agMap: Record<string, AdGroupAdCount> = {};
  for (const r of adRows as any[]) {
    const agId = String(r?.ad_group?.id ?? "");
    if (!agId) continue;
    if (!agMap[agId]) {
      agMap[agId] = {
        adGroupId: agId,
        adGroupName: r?.ad_group?.name ?? "",
        campaignName: r?.campaign?.name ?? "",
        adCount: 0,
      };
    }
    agMap[agId].adCount++;
  }

  const campaigns = campRows.map((r: any) => {
    const spend = Number(r?.metrics?.cost_micros ?? 0) / 1_000_000;
    const conversions = Number(r?.metrics?.conversions ?? 0);
    const conversionValue = Number(r?.metrics?.conversions_value ?? 0);
    return {
      name: r?.campaign?.name ?? "",
      spend,
      conversions,
      roas: conversionValue > 0 && spend > 0 ? Math.round((conversionValue / spend) * 100) / 100 : null,
    };
  });

  return { keywords, searchTerms, adGroupAdCounts: Object.values(agMap), campaigns };
}
