import { Suggestion, SuggestionDetail } from "./types";
import { SuggestionsRawData } from "./google-ads";

let _id = 0;
const nextId = () => `s-${_id++}`;

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

// search_term_view.status numeric codes
const ST_EXCLUDED = 3;
const ST_ADDED_EXCLUDED = 4;
// 5 = NONE (triggered ad but not yet added as keyword or negative)

export function generateSuggestions(data: SuggestionsRawData): Suggestion[] {
  _id = 0;
  const out: Suggestion[] = [];

  // ── Keywords: Quality Score ≤ 4 ──────────────────────────────────
  const kwWithQs = data.keywords.filter((k) => k.qualityScore !== null);

  const lowQs = kwWithQs.filter((k) => k.qualityScore! <= 4);
  if (lowQs.length > 0) {
    const examples = lowQs
      .slice(0, 3)
      .map((k) => `"${k.text}" (QS ${k.qualityScore})`)
      .join(", ");
    const details: SuggestionDetail[] = lowQs.map((k) => ({
      label: `"${k.text}"`,
      meta:  `QS ${k.qualityScore}`,
      value: k.spend > 0 ? money(k.spend) + " spent" : undefined,
    }));
    out.push({
      id: nextId(),
      type: "warning",
      category: "keywords",
      impact: "high",
      title: `${lowQs.length} keyword${lowQs.length > 1 ? "s" : ""} with Quality Score ≤ 4`,
      description: `Low QS means higher CPCs and lost impression share. Improve ad copy relevance and landing page quality for: ${examples}${lowQs.length > 3 ? ` and ${lowQs.length - 3} more` : ""}.`,
      details,
    });
  }

  // ── Keywords: Below-average QS (5–6) ─────────────────────────────
  const belowAvgQs = kwWithQs.filter((k) => k.qualityScore! >= 5 && k.qualityScore! <= 6);
  if (belowAvgQs.length >= 5) {
    const details: SuggestionDetail[] = belowAvgQs.slice(0, 20).map((k) => ({
      label: `"${k.text}"`,
      meta:  `QS ${k.qualityScore}`,
      value: k.spend > 0 ? money(k.spend) + " spent" : undefined,
    }));
    out.push({
      id: nextId(),
      type: "warning",
      category: "keywords",
      impact: "medium",
      title: `${belowAvgQs.length} keywords with below-average Quality Score (5–6)`,
      description: `Tightening ad copy relevance and ensuring landing pages closely match keyword intent can push these into the 7–10 range and reduce CPCs.`,
      details,
    });
  }

  // ── Keywords: Wasted spend ────────────────────────────────────────
  const wastingKw = data.keywords.filter((k) => k.spend > 50 && k.conversions === 0);
  if (wastingKw.length > 0) {
    const total = wastingKw.reduce((s, k) => s + k.spend, 0);
    const details: SuggestionDetail[] = wastingKw.map((k) => ({
      label: `"${k.text}"`,
      meta:  "0 conversions",
      value: money(k.spend) + " spent",
    }));
    out.push({
      id: nextId(),
      type: "warning",
      category: "keywords",
      impact: "high",
      title: `${wastingKw.length} keyword${wastingKw.length > 1 ? "s" : ""} spent ${money(total)} with zero conversions`,
      description: `These keywords are consuming budget without results. Consider pausing them, reducing bids, or fixing the landing page experience.`,
      details,
    });
  }

  // ── Search terms: Negative keyword opportunities ──────────────────
  const wastedTerms = data.searchTerms.filter(
    (st) =>
      st.spend > 20 &&
      st.conversions === 0 &&
      st.statusCode !== ST_EXCLUDED &&
      st.statusCode !== ST_ADDED_EXCLUDED
  );
  if (wastedTerms.length > 0) {
    const total = wastedTerms.reduce((s, st) => s + st.spend, 0);
    const examples = wastedTerms.slice(0, 2).map((st) => `"${st.term}"`).join(", ");
    const details: SuggestionDetail[] = wastedTerms.map((st) => ({
      label: `"${st.term}"`,
      meta:  "0 conversions",
      value: money(st.spend) + " spent",
    }));
    out.push({
      id: nextId(),
      type: "opportunity",
      category: "search_terms",
      impact: "high",
      title: `${wastedTerms.length} search term${wastedTerms.length > 1 ? "s" : ""} spent ${money(total)} with no conversions`,
      description: `Terms like ${examples} are burning budget. Add irrelevant ones as negative keywords to redirect spend toward converting queries.`,
      details,
    });
  }

  // ── Search terms: Add as keywords ────────────────────────────────
  const addableTerms = data.searchTerms.filter(
    (st) => st.conversions >= 2 && st.statusCode === 5
  );
  if (addableTerms.length > 0) {
    const examples = addableTerms
      .slice(0, 2)
      .map((st) => `"${st.term}" (${st.conversions} conv.)`)
      .join(", ");
    const details: SuggestionDetail[] = addableTerms.map((st) => ({
      label: `"${st.term}"`,
      meta:  `${st.conversions} conversion${st.conversions !== 1 ? "s" : ""}`,
      value: st.spend > 0 ? money(st.spend) + " spent" : undefined,
    }));
    out.push({
      id: nextId(),
      type: "opportunity",
      category: "search_terms",
      impact: "medium",
      title: `${addableTerms.length} high-converting search term${addableTerms.length > 1 ? "s" : ""} not yet added as keywords`,
      description: `${examples} are converting well but are triggered broadly. Add them as exact match keywords to control bids and maximise their performance.`,
      details,
    });
  }

  // ── Ads: Single ad per ad group ──────────────────────────────────
  const singleAdGroups = data.adGroupAdCounts.filter((ag) => ag.adCount === 1);
  if (singleAdGroups.length > 0) {
    const examples = singleAdGroups.slice(0, 2).map((ag) => `"${ag.adGroupName}"`).join(", ");
    const details: SuggestionDetail[] = singleAdGroups.map((ag) => ({
      label: ag.adGroupName,
      meta:  ag.campaignName,
      value: "1 ad",
    }));
    out.push({
      id: nextId(),
      type: "opportunity",
      category: "ads",
      impact: "medium",
      title: `${singleAdGroups.length} ad group${singleAdGroups.length > 1 ? "s" : ""} running only one active ad`,
      description: `Without ad variations there is nothing to test. Add at least 2–3 Responsive Search Ads per ad group (e.g. ${examples}) so Google can optimise toward the best performer.`,
      details,
    });
  }

  // ── Campaigns: No conversions despite spend ───────────────────────
  const deadCampaigns = data.campaigns.filter(
    (c) => c.spend > 100 && c.conversions === 0
  );
  if (deadCampaigns.length > 0) {
    const total = deadCampaigns.reduce((s, c) => s + c.spend, 0);
    const names = deadCampaigns.slice(0, 2).map((c) => `"${c.name}"`).join(", ");
    const details: SuggestionDetail[] = deadCampaigns.map((c) => ({
      label: c.name,
      meta:  "0 conversions",
      value: money(c.spend) + " spent",
    }));
    out.push({
      id: nextId(),
      type: "warning",
      category: "campaigns",
      impact: "high",
      title: `${deadCampaigns.length} campaign${deadCampaigns.length > 1 ? "s" : ""} spent ${money(total)} with zero conversions`,
      description: `${names}${deadCampaigns.length > 2 ? ` and ${deadCampaigns.length - 2} more` : ""} show no conversion activity. Audit targeting settings, conversion tracking, and landing page relevance.`,
      details,
    });
  }

  // ── Campaigns: High ROAS → scale budget ──────────────────────────
  const scalable = data.campaigns.filter(
    (c) => c.roas !== null && c.roas > 5 && c.spend > 50
  );
  if (scalable.length > 0) {
    const best = scalable[0];
    const details: SuggestionDetail[] = scalable.map((c) => ({
      label: c.name,
      meta:  `${c.roas!.toFixed(1)}x ROAS`,
      value: money(c.spend) + " spent",
    }));
    out.push({
      id: nextId(),
      type: "opportunity",
      category: "campaigns",
      impact: "medium",
      title: `${scalable.length} campaign${scalable.length > 1 ? "s" : ""} delivering strong ROAS — consider scaling budget`,
      description: `"${best.name}" is generating ${best.roas!.toFixed(1)}x ROAS. Increasing the budget on high-performing campaigns is the fastest way to grow conversions profitably.`,
      details,
    });
  }

  // ── All clear ─────────────────────────────────────────────────────
  if (out.length === 0) {
    out.push({
      id: nextId(),
      type: "info",
      category: "general",
      impact: "low",
      title: "No major issues detected",
      description:
        "The account looks healthy based on last 30 days of data. Keep monitoring Quality Scores and search term reports regularly to stay ahead of wasted spend.",
    });
  }

  // Sort: high impact first, warnings before opportunities
  const impactRank = { high: 0, medium: 1, low: 2 };
  const typeRank   = { warning: 0, opportunity: 1, info: 2 };
  out.sort((a, b) => {
    const imp = impactRank[a.impact] - impactRank[b.impact];
    return imp !== 0 ? imp : typeRank[a.type] - typeRank[b.type];
  });

  return out;
}
