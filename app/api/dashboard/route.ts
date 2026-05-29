import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchDashboard } from "@/lib/google-ads";
import { MOCK_ACCOUNTS, generateMockTrend } from "@/lib/mock-data";
import { DashboardData } from "@/lib/types";

// Extend Vercel function timeout to 60s
export const maxDuration = 60;

const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

// Cache live data for 5 minutes so repeated page loads are instant
const getCachedDashboard = unstable_cache(
  async (): Promise<DashboardData> => {
    const { accounts, conversionsTrend } = await fetchDashboard();
    return { accounts, conversionsTrend, lastUpdated: new Date().toISOString() };
  },
  ["dashboard"],
  { revalidate: 300 }
);

export async function GET(request: Request) {
  // Allow manual refresh by busting cache via ?refresh=1
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    let data: DashboardData;

    if (USE_MOCK) {
      data = {
        accounts: MOCK_ACCOUNTS,
        conversionsTrend: generateMockTrend(),
        lastUpdated: new Date().toISOString(),
      };
    } else if (refresh) {
      // Bypass cache for manual refresh
      const { accounts, conversionsTrend } = await fetchDashboard();
      data = { accounts, conversionsTrend, lastUpdated: new Date().toISOString() };
    } else {
      data = await getCachedDashboard();
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
