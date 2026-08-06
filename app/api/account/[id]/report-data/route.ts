import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAccountReport } from "@/lib/google-ads";
import { generateMockAccountReport } from "@/lib/mock-data";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const VALID_PERIODS = ["LAST_7_DAYS", "LAST_14_DAYS", "LAST_MONTH", "LAST_30_DAYS"];

const getCachedReport = unstable_cache(
  async (id: string, period: string) => fetchAccountReport(id, period),
  ["account-report"],
  { revalidate: 300 }
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const period = new URL(req.url).searchParams.get("period") ?? "LAST_30_DAYS";
  const safePeriod = VALID_PERIODS.includes(period) ? period : "LAST_30_DAYS";
  try {
    const data = USE_MOCK ? generateMockAccountReport() : await getCachedReport(id, safePeriod);
    return NextResponse.json(data);
  } catch (err) {
    console.error("report-data error", err);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}
