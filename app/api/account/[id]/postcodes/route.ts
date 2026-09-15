import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchPostcodePerformance } from "@/lib/google-ads";
import { generateMockPostcodePerformance } from "@/lib/mock-data";
import { TREND_PERIOD_OPTIONS } from "@/lib/types";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const getCachedPostcodes = unstable_cache(
  async (id: string, period: string) => fetchPostcodePerformance(id, period),
  ["postcode-performance"],
  { revalidate: 300 },
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });

  const requested = new URL(req.url).searchParams.get("period");
  const period = TREND_PERIOD_OPTIONS.find((o) => o.value === requested)?.value ?? "LAST_30_DAYS";

  try {
    const postcodes = USE_MOCK ? generateMockPostcodePerformance() : await getCachedPostcodes(id, period);
    return NextResponse.json({ postcodes });
  } catch (err) {
    console.error("Postcode performance error:", err);
    return NextResponse.json({ error: "Failed to fetch postcode data" }, { status: 500 });
  }
}
