import { CampaignData } from "./types";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function mockRow(scale = 1) {
  const clicks = Math.round(rand(50, 800) * scale);
  const impressions = Math.round(rand(2000, 40000) * scale);
  const conversions = Math.round(rand(1, 20) * scale * 10) / 10;
  const spend = Math.round(rand(80, 1200) * scale * 100) / 100;
  const conversionValue = Math.random() > 0.4 ? Math.round(spend * rand(1.5, 6) * 100) / 100 : 0;
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    conversions,
    conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
    spend,
    conversionValue,
    roas: conversionValue > 0 && spend > 0 ? Math.round((conversionValue / spend) * 100) / 100 : null,
  };
}

const CAMPAIGN_NAMES = [
  "Brand Keywords",
  "Generic - Services",
  "Competitor Conquesting",
  "Remarketing",
  "Display - Awareness",
  "Performance Max",
];

const AD_GROUP_NAMES = [
  ["Exact Match", "Phrase Match", "Broad Modifier"],
  ["Core Services", "Long Tail", "Location Based"],
  ["Competitor Brand", "Competitor Products"],
  ["All Visitors", "Cart Abandoners", "High Intent"],
  ["Prospecting", "Interest Based"],
  ["All Products", "High Value"],
];

export function generateMockCampaigns(): CampaignData[] {
  return CAMPAIGN_NAMES.map((name, i) => {
    const campScale = rand(0.5, 2);
    const adGroups = AD_GROUP_NAMES[i].map((agName, j) => ({
      id: `ag-${i}-${j}`,
      name: agName,
      ...mockRow(campScale * rand(0.3, 0.8)),
    }));
    return {
      id: `camp-${i}`,
      name,
      status: "ENABLED",
      ...mockRow(campScale),
      adGroups,
    };
  });
}
