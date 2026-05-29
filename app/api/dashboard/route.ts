import { NextResponse } from "next/server";
import { getActiveAccounts, getConversionsTrend } from "@/lib/google-ads";
import { MOCK_ACCOUNTS, generateMockTrend } from "@/lib/mock-data";
import { DashboardData } from "@/lib/types";

const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

export async function GET() {
  try {
    let data: DashboardData;

    if (USE_MOCK) {
      data = {
        accounts: MOCK_ACCOUNTS,
        conversionsTrend: generateMockTrend(),
        lastUpdated: new Date().toISOString(),
      };
    } else {
      const [accounts, conversionsTrend] = await Promise.all([
        getActiveAccounts(),
        getConversionsTrend(),
      ]);
      data = { accounts, conversionsTrend, lastUpdated: new Date().toISOString() };
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
