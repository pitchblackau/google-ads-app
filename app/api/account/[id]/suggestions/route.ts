import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchSuggestionsData } from "@/lib/google-ads";
import { generateSuggestions } from "@/lib/suggestions";
import { generateMockSuggestions } from "@/lib/mock-data";

export const maxDuration = 60;
const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

// Cache for 1 hour — suggestions don't need real-time freshness
const getCachedSuggestions = unstable_cache(
  async (id: string) => {
    const raw = await fetchSuggestionsData(id);
    return generateSuggestions(raw);
  },
  ["account-suggestions"],
  { revalidate: 3600 }
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (USE_MOCK) return NextResponse.json(generateMockSuggestions());
    const suggestions = await getCachedSuggestions(id);
    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("Suggestions error:", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
