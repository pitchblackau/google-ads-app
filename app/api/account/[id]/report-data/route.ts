import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAccountReport } from "@/lib/google-ads";
import { generateMockAccountReport } from "@/lib/mock-data";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const getCachedReport = unstable_cache(
  async (id: string) => fetchAccountReport(id),
  ["account-report"],
  { revalidate: 300 }
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = USE_MOCK ? generateMockAccountReport() : await getCachedReport(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("report-data error", err);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}
