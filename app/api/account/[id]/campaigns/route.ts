import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchCampaigns } from "@/lib/google-ads";
import { generateMockCampaigns } from "@/lib/mock-campaigns";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const VALID_PERIODS = ["TODAY", "THIS_WEEK_SUN_TODAY", "THIS_MONTH", "LAST_30_DAYS"];

function getCachedCampaigns(id: string, period: string) {
  return unstable_cache(
    () => fetchCampaigns(id, period),
    [`campaigns-${id}-${period}`],
    { revalidate: 300 }
  )();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const period = new URL(req.url).searchParams.get("period") ?? "LAST_30_DAYS";
  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  try {
    const campaigns = USE_MOCK
      ? generateMockCampaigns()
      : await getCachedCampaigns(id, period);
    return NextResponse.json({ campaigns, period });
  } catch (err) {
    console.error("Campaigns error:", err);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
