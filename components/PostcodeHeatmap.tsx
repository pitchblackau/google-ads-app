"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PostcodePerformance } from "@/lib/types";
import {
  loadLeaflet,
  type GeoJsonCollection,
  type LatLngTuple,
  type Leaflet,
  type LeafletBounds,
  type LeafletMap,
} from "@/lib/leaflet";
import {
  CITY_MAPS,
  MAP_COLORS,
  createColorScale,
  escapeHtml,
  fetchPostcodeBoundaries,
  fetchSuburbs,
  type CityKey,
  type CityMap,
} from "@/lib/postcode-map";

export interface PostcodeHeatmapProps {
  city: CityKey;
  data: PostcodePerformance[];
  title?: string;
  subtitle?: string;
  periodLabel?: string;
  /** Rendered at the right of the header, e.g. a period picker. */
  actions?: ReactNode;
  /** Extra sentence appended to the footer, e.g. how many postcodes were excluded. */
  footnote?: string;
  /** Map + sidebar height on tablet and desktop. On mobile they stack. */
  height?: number | string;
}

type Row = PostcodePerformance & { convRate: number };
type ColorFor = (row: PostcodePerformance) => string;

interface MapResult {
  rows: Row[];
  error: string | null;
  markerFallbacks: number;
  notShown: number;
}

const HEATMAP_CSS = `
.pch-root .leaflet-container { font-family: var(--font-geist-sans), sans-serif; }
.pch-root .leaflet-popup-content-wrapper { background: #111118; color: #fff; border: 1px solid #1e1e2e; border-radius: 6px; }
.pch-root .leaflet-popup-tip { background: #111118; }
.pch-root .leaflet-popup-close-button { color: #6b7280; }
.pch-root .pch-popup-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.pch-root .pch-popup-row { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; font-family: var(--font-geist-mono), monospace; padding: 2px 0; }
.pch-root .pch-cell { display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; line-height: 1.05; pointer-events: none; }
.pch-root .pch-chip { background: rgba(8,12,20,0.82); border-radius: 4px; padding: 2px 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.pch-root .pch-chip .n { font-family: var(--font-geist-mono), monospace; font-weight: 700; font-size: 12.5px; display: block; }
.pch-root .pch-chip .pc { font-family: var(--font-geist-mono), monospace; font-weight: 500; font-size: 8.5px; opacity: 0.9; display: block; }
.pch-root .pch-cell.g .n, .pch-root .pch-cell.g .pc { color: #8bf3ae; }
.pch-root .pch-cell.r .n, .pch-root .pch-cell.r .pc { color: #ffb3b3; }
.pch-root .pch-ref { font-family: var(--font-geist-mono), monospace; font-size: 10px; color: #5a6270; letter-spacing: 0.5px; white-space: nowrap; }
.pch-root .pch-suburb { font-family: var(--font-geist-mono), monospace; font-size: 8.5px; font-weight: 500; color: #6b7280; letter-spacing: 0.3px; text-transform: uppercase; white-space: nowrap; text-shadow: 0 1px 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(255,255,255,0.8), 1px 0 0 rgba(255,255,255,0.8), -1px 0 0 rgba(255,255,255,0.8); }
.pch-root .pch-declutter .pch-suburb { display: none; }
.pch-root .leaflet-control-scale-line { background: rgba(255,255,255,0.6) !important; color: #333 !important; border-color: #333 !important; font-size: 9px !important; }
`;

const POSTCODE_STYLE = { color: "#1a1a1a", weight: 1, opacity: 0.7, fillOpacity: 0.62 };
const POSTCODE_HOVER_STYLE = { fillOpacity: 0.85, weight: 2, color: "#000" };
const FIT_PADDING = { padding: [20, 20] };
const NARROW_MAP_WIDTH = 640;
const SUBURB_LABEL_MIN_ZOOM_WHEN_NARROW = 11;
const LAND_PANE = "pchLand";
const BORDER_PANE = "pchBorders";

function hasCoords(row: Row): row is Row & { lat: number; lon: number } {
  return typeof row.lat === "number" && typeof row.lon === "number";
}

function popupHtml(row: Row): string {
  const heading = row.suburb ? `${escapeHtml(row.postcode)} &mdash; ${escapeHtml(row.suburb)}` : escapeHtml(row.postcode);
  return `
    <div class="pch-popup-title">${heading}</div>
    <div class="pch-popup-row"><span>Clicks</span><span>${row.clicks.toLocaleString("en-AU")}</span></div>
    <div class="pch-popup-row"><span>Conversions</span><span>${Math.round(row.conversions)}</span></div>
    <div class="pch-popup-row"><span>Conv. rate</span><span>${row.convRate.toFixed(2)}%</span></div>`;
}

function addChip(L: Leaflet, map: LeafletMap, position: LatLngTuple | { lat: number; lng: number }, row: Row) {
  const converting = row.conversions > 0;
  const value = converting ? Math.round(row.conversions) : row.clicks;
  L.marker(position, {
    icon: L.divIcon({
      className: "",
      html: `<div class="pch-cell ${converting ? "g" : "r"}"><div class="pch-chip"><span class="n">${value}</span><span class="pc">${escapeHtml(row.postcode)}</span></div></div>`,
      iconSize: [56, 30],
      iconAnchor: [28, 15],
    }),
    interactive: false,
  }).addTo(map);
}

function drawCentroid(L: Leaflet, map: LeafletMap, row: Row & { lat: number; lon: number }, colorFor: ColorFor) {
  const point: LatLngTuple = [row.lat, row.lon];
  L.circleMarker(point, { radius: 14, color: "#1a1a1a", weight: 1, fillColor: colorFor(row), fillOpacity: 0.85 })
    .addTo(map)
    .bindPopup(popupHtml(row));
  addChip(L, map, point, row);
}

function drawBasemap(L: Leaflet, map: LeafletMap, cityMap: CityMap) {
  if (cityMap.land) {
    L.polygon(cityMap.land, { pane: LAND_PANE, color: MAP_COLORS.coast, weight: 1, fillColor: MAP_COLORS.land, fillOpacity: 1 }).addTo(map);
  }
  if (cityMap.river) {
    L.polyline(cityMap.river, { color: MAP_COLORS.ocean, weight: 9, opacity: 1, lineJoin: "round" }).addTo(map);
  }
  for (const { position, text } of cityMap.referenceLabels) {
    L.marker(position, {
      icon: L.divIcon({ className: "", html: `<div class="pch-ref">${text}</div>`, iconSize: [120, 14], iconAnchor: [0, 0] }),
      interactive: false,
    }).addTo(map);
  }
  L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);
}

function drawSuburbs(L: Leaflet, map: LeafletMap, geo: GeoJsonCollection, asLand: boolean) {
  if (!geo.features?.length) return;
  L.geoJSON(geo, {
    interactive: false,
    pane: asLand ? LAND_PANE : BORDER_PANE,
    style: {
      color: "#8b9099",
      weight: 0.8,
      opacity: 0.55,
      dashArray: "3,3",
      fill: asLand,
      fillColor: MAP_COLORS.land,
      fillOpacity: 1,
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties.sal_name_2021;
      if (!name) return;
      L.marker(layer.getBounds().getCenter(), {
        icon: L.divIcon({
          className: "",
          html: `<div class="pch-suburb">${escapeHtml(String(name))}</div>`,
          iconSize: [100, 12],
          iconAnchor: [50, 6],
        }),
        interactive: false,
      }).addTo(map);
    },
  }).addTo(map);
}

function drawPostcodes(L: Leaflet, map: LeafletMap, geo: GeoJsonCollection, rows: Row[], colorFor: ColorFor) {
  const byCode = new Map(rows.map((row) => [row.postcode, row]));
  const matched = new Set<string>();

  const layer = L.geoJSON(geo, {
    style: (feature) => {
      const row = byCode.get(String(feature.properties.POA_CODE21));
      return { ...POSTCODE_STYLE, fillColor: row ? colorFor(row) : "#555" };
    },
    onEachFeature: (feature, polygon) => {
      const code = String(feature.properties.POA_CODE21);
      const row = byCode.get(code);
      if (!row) return;
      matched.add(code);
      polygon.bindPopup(popupHtml(row));
      polygon.on("mouseover", () => polygon.setStyle(POSTCODE_HOVER_STYLE));
      polygon.on("mouseout", () => polygon.setStyle(POSTCODE_STYLE));
      addChip(L, map, polygon.getBounds().getCenter(), row);
    },
  }).addTo(map);

  const bounds: LeafletBounds = layer.getBounds();
  const unmatched = rows.filter((row) => !matched.has(row.postcode));
  const fallbacks = unmatched.filter(hasCoords);
  for (const row of fallbacks) {
    drawCentroid(L, map, row, colorFor);
    bounds.extend([row.lat, row.lon]);
  }
  return { bounds, markerFallbacks: fallbacks.length, notShown: unmatched.length - fallbacks.length };
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-[#1e1e2e] bg-[#08080f] px-3 py-2.5">
      <p className="font-mono text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.6px] text-[#8b8b9a]">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="border-b border-[#1e1e2e] pb-1.5 text-[11px] uppercase tracking-[0.8px] text-[#8b8b9a]">{children}</p>
  );
}

function PostcodeList({ rows, render }: { rows: Row[]; render: (row: Row) => { value: string; className: string } }) {
  return (
    <div>
      {rows.map((row) => {
        const { value, className } = render(row);
        return (
          <div key={row.postcode} className="flex items-center justify-between border-b border-[#16161f] py-[7px] text-[12.5px] last:border-b-0">
            <div>
              <span className="font-mono font-semibold">{row.postcode}</span>
              {row.suburb && <span className="block text-[11px] text-[#8b8b9a]">{row.suburb}</span>}
            </div>
            <div className={`font-mono font-semibold ${className}`}>{value}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function PostcodeHeatmap({
  city,
  data,
  title,
  subtitle = "by postcode boundary",
  periodLabel,
  actions,
  footnote,
  height = 640,
}: PostcodeHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<MapResult | null>(null);

  // Keyed on content so a parent passing a fresh-but-equal array doesn't rebuild the map.
  const dataKey = JSON.stringify(data);
  const rows = useMemo<Row[]>(
    () =>
      (JSON.parse(dataKey) as PostcodePerformance[])
        .filter((d) => d.clicks > 0 || d.conversions > 0)
        .map((d) => ({ ...d, convRate: d.convRate ?? (d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0) })),
    [dataKey],
  );
  const scale = useMemo(() => createColorScale(rows), [rows]);

  const stats = useMemo(() => {
    const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
    const conversions = rows.reduce((sum, r) => sum + r.conversions, 0);
    const converting = rows.filter((r) => r.conversions > 0);
    return {
      clicks,
      conversions,
      rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      convertingCount: converting.length,
      top: [...converting].sort((a, b) => b.conversions - a.conversions).slice(0, 8),
      waste: rows.filter((r) => r.conversions === 0).sort((a, b) => b.clicks - a.clicks).slice(0, 8),
    };
  }, [rows]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;
    const cityMap = CITY_MAPS[city];
    const abort = new AbortController();
    let cancelled = false;
    let map: LeafletMap | null = null;
    let fitTarget: LeafletBounds | LatLngTuple[] | null = null;

    const hasSize = () => container.clientWidth > 0 && container.clientHeight > 0;
    const fit = () => {
      if (map && fitTarget && hasSize()) map.fitBounds(fitTarget, FIT_PADDING);
    };
    const updateDeclutter = () => {
      if (!map) return;
      const narrow = container.clientWidth < NARROW_MAP_WIDTH;
      const minZoom = narrow
        ? Math.max(cityMap.suburbLabelMinZoom, SUBURB_LABEL_MIN_ZOOM_WHEN_NARROW)
        : cityMap.suburbLabelMinZoom;
      container.classList.toggle("pch-declutter", map.getZoom() < minZoom);
    };
    let hadSize = hasSize();
    const resizeObserver = new ResizeObserver(() => {
      if (!map) return;
      map.invalidateSize();
      // A map built inside a hidden tab has nothing to fit to, so fit it the first time it becomes visible.
      const visible = hasSize();
      if (visible && !hadSize) fit();
      hadSize = visible;
      updateDeclutter();
    });

    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled) return;
        const leafletMap = L.map(container, { zoomControl: true, attributionControl: false }).setView(
          cityMap.view.center,
          cityMap.view.zoom,
        );
        map = leafletMap;
        // Land sits under the postcode shapes; suburb borders sit above them without swallowing clicks.
        leafletMap.createPane(LAND_PANE).style.zIndex = "350";
        const borderPane = leafletMap.createPane(BORDER_PANE);
        borderPane.style.zIndex = "450";
        borderPane.style.pointerEvents = "none";
        leafletMap.on("zoomend", updateDeclutter);
        updateDeclutter();
        resizeObserver.observe(container);
        drawBasemap(L, leafletMap, cityMap);

        // Suburb shapes are orientation (and land, for cities without a hand-drawn coastline) — never block the heatmap on them.
        fetchSuburbs(city)
          .then((geo) => {
            if (!cancelled) drawSuburbs(L, leafletMap, geo, !cityMap.land);
          })
          .catch(() => {});

        try {
          const geo = await fetchPostcodeBoundaries(rows.map((r) => r.postcode), abort.signal);
          if (cancelled) return;
          if (!geo.features?.length) throw new Error("No boundary features returned");
          const { bounds, markerFallbacks, notShown } = drawPostcodes(L, leafletMap, geo, rows, scale.colorFor);
          fitTarget = bounds.isValid() ? bounds : null;
          fit();
          setResult({ rows, error: null, markerFallbacks, notShown });
        } catch (err) {
          if (cancelled) return;
          const points = rows.filter(hasCoords);
          for (const row of points) drawCentroid(L, leafletMap, row, scale.colorFor);
          fitTarget = points.length ? points.map((r): LatLngTuple => [r.lat, r.lon]) : null;
          fit();
          setResult({
            rows,
            error: `Could not load official postcode boundaries (${err instanceof Error ? err.message : String(err)}). Showing centroid markers instead.`,
            markerFallbacks: points.length,
            notShown: rows.length - points.length,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({ rows, error: err instanceof Error ? err.message : String(err), markerFallbacks: 0, notShown: 0 });
        }
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      resizeObserver.disconnect();
      map?.remove();
    };
  }, [city, rows, scale]);

  const current = result?.rows === rows ? result : null;
  const heightValue = typeof height === "number" ? `${height}px` : height;

  const footer = [
    "Boundaries: ABS Postal Areas (POA) 2021 and Suburbs & Localities (SAL) 2021, ASGS Edition 3 — official statistical approximations of Australia Post postcodes and suburb names.",
    `${rows.length} postcode${rows.length === 1 ? "" : "s"} with click activity.`,
    footnote,
    current?.markerFallbacks && !current.error
      ? `${current.markerFallbacks} postcode(s) without an ABS boundary polygon (e.g. PO-box-only codes) are shown as circle markers at their centroid instead.`
      : null,
    current?.notShown ? `${current.notShown} postcode(s) have no boundary or coordinates and are not shown on the map.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="pch-root flex flex-col overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#111118] text-white">
      <style dangerouslySetInnerHTML={{ __html: HEATMAP_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e1e2e] px-4 py-3 md:px-5">
        <h3 className="text-[15px] font-semibold">
          {title ?? `${CITY_MAPS[city].name} — Conversion Heatmap`}{" "}
          {subtitle && <span className="font-normal text-[#8b8b9a]">{subtitle}</span>}
        </h3>
        {(periodLabel || actions) && (
          <div className="flex items-center gap-3">
            {periodLabel && <p className="font-mono text-[11px] text-[#8b8b9a]">{periodLabel}</p>}
            {actions}
          </div>
        )}
      </div>

      <div
        className="flex min-h-0 flex-col md:h-[var(--pch-height)] md:flex-row"
        style={{ "--pch-height": heightValue } as CSSProperties}
      >
        <div className="relative h-[50vh] min-h-[320px] min-w-0 md:h-auto md:flex-1">
          <div ref={mapRef} className="isolate absolute inset-0" style={{ background: MAP_COLORS.ocean }} />
          {!current && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(10,15,25,0.55)] font-mono text-[13px] text-white">
              Loading postcode boundaries…
            </div>
          )}
          {current?.error && (
            <div className="absolute left-1/2 top-3 z-10 w-[calc(100%-24px)] max-w-[520px] -translate-x-1/2 rounded border border-[#7a1010] bg-[#3a1414] px-3.5 py-2 text-xs text-[#ffcaca]">
              {current.error}
            </div>
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-[18px] overflow-y-auto border-t border-[#1e1e2e] bg-[#0d0d18] p-[18px] md:w-[340px] md:border-l md:border-t-0">
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile value={stats.clicks.toLocaleString("en-AU")} label="Total clicks" />
            <StatTile value={String(Math.round(stats.conversions))} label="Total conversions" />
            <StatTile value={`${stats.rate.toFixed(1)}%`} label="Blended conv. rate" />
            <StatTile value={`${stats.convertingCount}/${rows.length}`} label="Postcodes converting" />
          </div>

          <div>
            <SectionTitle>Legend</SectionTitle>
            <div className="mt-2.5">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-[70px] text-[#8b8b9a]">Converting</span>
                <div className="h-2.5 flex-1 rounded-sm" style={{ background: `linear-gradient(90deg, ${MAP_COLORS.greenLo}, ${MAP_COLORS.greenHi})` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#8b8b9a]">
                <span>1 conv.</span>
                {scale.maxConversions > 1 && <span>{Math.round(scale.maxConversions)} conv.</span>}
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-[70px] text-[#8b8b9a]">0 conv.</span>
                <div className="h-2.5 flex-1 rounded-sm" style={{ background: `linear-gradient(90deg, ${MAP_COLORS.redLo}, ${MAP_COLORS.redHi})` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#8b8b9a]">
                <span>Few clicks</span>
                <span>Most clicks, no conv.</span>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] text-[#8b8b9a]">
              Shaded shapes are official ABS postal-area (POA) boundaries. Dashed grey lines and small grey labels are
              suburb (SAL) borders for orientation. Green = conversions happened (label = conversions). Red = 0%
              conversion rate (label = clicks). Click any postcode area for full stats.
            </p>
          </div>

          <div>
            <SectionTitle>Top converting postcodes</SectionTitle>
            <PostcodeList
              rows={stats.top}
              render={(r) => ({ value: `${Math.round(r.conversions)} conv.`, className: "text-[#4ade80]" })}
            />
          </div>

          <div>
            <SectionTitle>Highest wasted spend (clicks, 0 conversions)</SectionTitle>
            <PostcodeList rows={stats.waste} render={(r) => ({ value: `${r.clicks} clicks`, className: "text-[#ff8a8a]" })} />
          </div>
        </aside>
      </div>

      <p className="border-t border-[#1e1e2e] px-4 py-2 text-[10.5px] text-[#8b8b9a] md:px-5">{footer}</p>
    </div>
  );
}
