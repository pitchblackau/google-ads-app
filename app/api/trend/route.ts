import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchDashboardTrend } from "@/lib/google-ads";
import { generateMockTrend } from "@/lib/mock-data";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const VALID_PERIODS = ["LAST_30_DAYS", "LAST_3_MONTHS", "LAST_6_MONTHS", "THIS_YEAR"];

const getCachedDashboardTrend = unstable_cache(
  async (period: string) => fetchDashboardTrend(period),
  ["dashboard-trend"],
  { revalidate: 300 }
);

function periodToDays(period: string): number {
  if (period === "LAST_30_DAYS") return 30;
  if (period === "LAST_3_MONTHS") return 90;
  if (period === "THIS_YEAR") return Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86_400_000);
  return 180; // LAST_6_MONTHS
}

export async function GET(req: Request) {
  const period = new URL(req.url).searchParams.get("period") ?? "LAST_6_MONTHS";
  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  try {
    if (USE_MOCK) return NextResponse.json(generateMockTrend(periodToDays(period)));
    const data = await getCachedDashboardTrend(period);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Dashboard trend error:", err);
    return NextResponse.json({ error: "Failed to fetch trend" }, { status: 500 });
  }
}
