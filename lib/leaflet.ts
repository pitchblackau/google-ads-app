const CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4";
const LEAFLET_CSS = {
  href: `${CDN}/leaflet.min.css`,
  integrity: "sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==",
};
const LEAFLET_JS = {
  href: `${CDN}/leaflet.min.js`,
  integrity: "sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==",
};

export type LatLngTuple = [number, number];
type Options = Record<string, unknown>;

export interface LeafletBounds {
  getCenter(): { lat: number; lng: number };
  extend(point: LatLngTuple): LeafletBounds;
  isValid(): boolean;
}

export interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
  bindPopup(html: string): LeafletLayer;
  on(event: string, handler: () => void): LeafletLayer;
  setStyle(style: Options): LeafletLayer;
  getBounds(): LeafletBounds;
}

export interface LeafletMap {
  setView(center: LatLngTuple, zoom: number): LeafletMap;
  getZoom(): number;
  on(event: string, handler: () => void): LeafletMap;
  createPane(name: string): HTMLElement;
  fitBounds(bounds: LeafletBounds | LatLngTuple[], options?: Options): LeafletMap;
  invalidateSize(): LeafletMap;
  remove(): void;
}

export interface GeoJsonFeature {
  properties: Record<string, string | number | null>;
}

export interface GeoJsonCollection {
  features?: GeoJsonFeature[];
  error?: { message?: string };
}

export interface Leaflet {
  map(element: HTMLElement, options: Options): LeafletMap;
  polygon(points: LatLngTuple[], options: Options): LeafletLayer;
  polyline(points: LatLngTuple[], options: Options): LeafletLayer;
  marker(point: LatLngTuple | { lat: number; lng: number }, options: Options): LeafletLayer;
  circleMarker(point: LatLngTuple, options: Options): LeafletLayer;
  divIcon(options: Options): unknown;
  geoJSON(
    data: GeoJsonCollection,
    options: {
      style?: Options | ((feature: GeoJsonFeature) => Options);
      onEachFeature?: (feature: GeoJsonFeature, layer: LeafletLayer) => void;
      interactive?: boolean;
      pane?: string;
    },
  ): LeafletLayer;
  control: { scale(options: Options): { addTo(map: LeafletMap): unknown } };
}

declare global {
  interface Window {
    L?: Leaflet;
  }
}

let leafletPromise: Promise<Leaflet> | null = null;

function inject(element: HTMLLinkElement | HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    element.onload = () => resolve();
    element.onerror = () => {
      element.remove();
      reject(new Error("Could not load the map library"));
    };
    document.head.appendChild(element);
  });
}

// Loaded from cdnjs at runtime (pinned + SRI) rather than bundled, so no npm dependency is needed.
export function loadLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ??= Promise.all([
    inject(
      Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: LEAFLET_CSS.href,
        integrity: LEAFLET_CSS.integrity,
        crossOrigin: "anonymous",
      }),
    ),
    inject(
      Object.assign(document.createElement("script"), {
        src: LEAFLET_JS.href,
        integrity: LEAFLET_JS.integrity,
        crossOrigin: "anonymous",
        async: true,
      }),
    ),
  ])
    .then(() => {
      if (!window.L) throw new Error("Map library did not initialise");
      return window.L;
    })
    .catch((err) => {
      leafletPromise = null;
      throw err;
    });
  return leafletPromise;
}
