import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAccountDetail } from "@/lib/google-ads";
import { MOCK_ACCOUNTS } from "@/lib/mock-data";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

// Module-level cached function — key is ["account-detail", id]
const getCachedAccountDetail = unstable_cache(
  async (id: string) => fetchAccountDetail(id),
  ["account-detail"],
  { revalidate: 300 }
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (USE_MOCK) {
      const account = MOCK_ACCOUNTS.find((a) => a.id === id);
      if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(account);
    }
    const account = await getCachedAccountDetail(id);
    return NextResponse.json(account);
  } catch (err) {
    console.error("Account detail error:", err);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}
