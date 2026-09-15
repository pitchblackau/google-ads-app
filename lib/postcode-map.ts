import type { GeoJsonCollection, LatLngTuple } from "./leaflet";
import type { PostcodePerformance } from "./types";

export const MAP_COLORS = {
  ocean: "#bcd8e8",
  land: "#eef0e1",
  coast: "#c9c2ab",
  greenLo: "#a7e8bf",
  greenHi: "#0a5c33",
  redLo: "#f7b8b8",
  redHi: "#7a1010",
};

export type CityKey = "perth" | "melbourne" | "sydney";

export interface CityMap {
  name: string;
  view: { center: LatLngTuple; zoom: number };
  postcodeRanges: [number, number][];
  /** Area for the ABS suburb layer. Each stays under the service's 1,000-feature cap (Sydney ≈ 874), so no paging. */
  suburbBox: { xmin: number; ymin: number; xmax: number; ymax: number };
  referenceLabels: { position: LatLngTuple; text: string }[];
  /** Hand-drawn coastline. Without one, the ABS suburb shapes are filled as land instead. */
  land?: LatLngTuple[];
  river?: LatLngTuple[];
  /** Suburb names are hidden below this zoom — dense cities read as a wall of text when zoomed out. */
  suburbLabelMinZoom: number;
}

export const CITY_MAPS: Record<CityKey, CityMap> = {
  perth: {
    name: "Perth metro",
    view: { center: [-32.05, 115.86], zoom: 10 },
    postcodeRanges: [[6000, 6211]],
    suburbBox: { xmin: 115.5, ymin: -32.7, xmax: 116.4, ymax: -31.4 },
    referenceLabels: [
      { position: [-31.75, 115.64], text: "INDIAN OCEAN" },
      { position: [-31.952, 115.865], text: "PERTH CBD" },
      { position: [-32.06, 115.735], text: "FREMANTLE" },
      { position: [-31.748, 115.768], text: "JOONDALUP" },
      { position: [-32.283, 115.71], text: "ROCKINGHAM" },
      { position: [-32.535, 115.725], text: "MANDURAH" },
    ],
    land: [
      [-31.455, 115.583], [-31.5, 115.586], [-31.548, 115.615], [-31.607, 115.658], [-31.66, 115.687],
      [-31.7, 115.705], [-31.745, 115.723], [-31.807, 115.732], [-31.826, 115.739], [-31.836, 115.751],
      [-31.86, 115.755], [-31.895, 115.757], [-31.92, 115.76], [-31.96, 115.758], [-31.995, 115.756],
      [-32.017, 115.748], [-32.032, 115.752], [-32.05, 115.742], [-32.058, 115.748], [-32.052, 115.756],
      [-32.07, 115.753], [-32.095, 115.76], [-32.118, 115.762], [-32.132, 115.758], [-32.16, 115.745],
      [-32.195, 115.735], [-32.23, 115.725], [-32.26, 115.715], [-32.277, 115.702], [-32.3, 115.703],
      [-32.325, 115.712], [-32.352, 115.725], [-32.39, 115.735], [-32.43, 115.723], [-32.475, 115.715],
      [-32.52, 115.718], [-32.545, 115.7], [-32.585, 115.69], [-32.61, 115.685], [-32.61, 116.35],
      [-31.455, 116.35],
    ],
    river: [
      [-32.055, 115.746], [-32.045, 115.79], [-32.02, 115.845], [-31.98, 115.88], [-31.955, 115.9],
      [-31.93, 115.925], [-31.905, 115.955], [-31.895, 115.99], [-31.885, 116.02],
    ],
    suburbLabelMinZoom: 0,
  },
  melbourne: {
    name: "Melbourne metro",
    view: { center: [-37.85, 145.0], zoom: 10 },
    postcodeRanges: [[3000, 3211], [3335, 3341], [3427, 3429], [3750, 3810], [3910, 3944], [3975, 3978]],
    suburbBox: { xmin: 144.4, ymin: -38.55, xmax: 145.8, ymax: -37.45 },
    referenceLabels: [
      { position: [-38.08, 144.78], text: "PORT PHILLIP BAY" },
      { position: [-37.8136, 144.9631], text: "MELBOURNE CBD" },
      { position: [-37.899, 144.661], text: "WERRIBEE" },
      { position: [-37.987, 145.214], text: "DANDENONG" },
      { position: [-38.1446, 145.1234], text: "FRANKSTON" },
      { position: [-37.8156, 145.2294], text: "RINGWOOD" },
    ],
    suburbLabelMinZoom: 10,
  },
  sydney: {
    name: "Sydney metro",
    view: { center: [-33.87, 151.0], zoom: 10 },
    postcodeRanges: [[2000, 2263], [2555, 2574], [2740, 2786]],
    suburbBox: { xmin: 150.3, ymin: -34.25, xmax: 151.45, ymax: -33.25 },
    referenceLabels: [
      { position: [-33.95, 151.33], text: "TASMAN SEA" },
      { position: [-33.8688, 151.2093], text: "SYDNEY CBD" },
      { position: [-33.815, 151.0011], text: "PARRAMATTA" },
      { position: [-33.7507, 150.6877], text: "PENRITH" },
      { position: [-33.9207, 150.9237], text: "LIVERPOOL" },
      { position: [-33.7969, 151.284], text: "MANLY" },
      { position: [-34.0587, 151.1528], text: "CRONULLA" },
    ],
    suburbLabelMinZoom: 10,
  },
};

export function cityForPostcode(postcode: string): CityKey | null {
  if (!/^\d{4}$/.test(postcode)) return null;
  const n = Number(postcode);
  const keys = Object.keys(CITY_MAPS) as CityKey[];
  return keys.find((key) => CITY_MAPS[key].postcodeRanges.some(([from, to]) => n >= from && n <= to)) ?? null;
}

const POA_URL =
  "https://services-ap1.arcgis.com/BgWkWIVsdxENtz2G/ArcGIS/rest/services/POA_2021_AUST_GDA2020_SHP_(11)/FeatureServer/0/query";
const SAL_URL =
  "https://services-ap1.arcgis.com/ypkPEy1AmwPKGNNv/arcgis/rest/services/ABS_Socio_Economic_Indexes_for_Areas_SEIFA_by_2021_SAL/FeatureServer/0/query";

async function queryArcGis(url: string, params: Record<string, string>, signal?: AbortSignal): Promise<GeoJsonCollection> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const geo = (await res.json()) as GeoJsonCollection;
  if (geo.error) throw new Error(geo.error.message || "ArcGIS query error");
  return geo;
}

export function fetchPostcodeBoundaries(postcodes: string[], signal?: AbortSignal): Promise<GeoJsonCollection> {
  const codes = postcodes.filter((p) => /^\d{4}$/.test(p));
  if (codes.length === 0) return Promise.resolve({ features: [] });
  return queryArcGis(
    POA_URL,
    {
      where: `POA_CODE21 IN (${codes.map((c) => `'${c}'`).join(",")})`,
      outFields: "POA_CODE21,POA_NAME21",
      outSR: "4326",
      f: "geojson",
      maxAllowableOffset: "0.0008",
    },
    signal,
  );
}

const suburbRequests = new Map<CityKey, Promise<GeoJsonCollection>>();

export function fetchSuburbs(city: CityKey): Promise<GeoJsonCollection> {
  let request = suburbRequests.get(city);
  if (!request) {
    request = queryArcGis(SAL_URL, {
      f: "geojson",
      geometry: JSON.stringify({ ...CITY_MAPS[city].suburbBox, spatialReference: { wkid: 4326 } }),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "sal_name_2021",
      outSR: "4326",
      maxAllowableOffset: "0.0008",
      returnGeometry: "true",
    }).catch((err) => {
      suburbRequests.delete(city);
      throw err;
    });
    suburbRequests.set(city, request);
  }
  return request;
}

function mix(from: string, to: string, t: number): string {
  const amount = Math.min(1, Math.max(0, t));
  const a = from.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const b = to.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("")}`;
}

// Green scales with conversions; red (zero conversions) scales with wasted clicks.
export function createColorScale(rows: PostcodePerformance[]) {
  const maxConversions = Math.max(0, ...rows.filter((r) => r.conversions > 0).map((r) => r.conversions));
  const maxWastedClicks = Math.max(0, ...rows.filter((r) => r.conversions === 0).map((r) => r.clicks));
  return {
    maxConversions,
    colorFor(row: PostcodePerformance): string {
      if (row.conversions > 0) {
        return mix(MAP_COLORS.greenLo, MAP_COLORS.greenHi, maxConversions > 1 ? (row.conversions - 1) / (maxConversions - 1) : 1);
      }
      return mix(MAP_COLORS.redLo, MAP_COLORS.redHi, maxWastedClicks > 1 ? (row.clicks - 1) / (maxWastedClicks - 1) : 1);
    },
  };
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
