import { html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { Map as MapLibreGl, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LitElementNoShadow } from "./base";
import colors from "tailwindcss/colors";

export type MapLoadEvent = { map: MapLibreGl };

let colorToHexCtx = document.createElement("canvas").getContext("2d")!;

export function colorToHex(color: string): string {
  colorToHexCtx.fillStyle = color;
  colorToHexCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, _] = Array.from(
    colorToHexCtx.getImageData(0, 0, 1, 1).data,
  ).map((component) => component.toString(16).padStart(2, "0"));
  return `#${r}${g}${b}`;
}

const style = {
  version: 8,
  metadata: {},
  sources: {
    ne2_shaded: {
      maxzoom: 6,
      tileSize: 256,
      tiles: [
        "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png",
      ],
      type: "raster",
    },
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  sprite: "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background",
      layout: { visibility: "visible" },
      paint: { "background-color": colorToHex(colors.stone[500]) },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: [
        "all",
        ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false],
        ["!=", ["get", "brunnel"], "tunnel"],
      ],
      layout: { visibility: "visible" },
      paint: {
        "fill-antialias": true,
        "fill-color": colorToHex(colors.stone[50]),
      },
    },
  ],
} satisfies StyleSpecification;

@customElement("x-map")
export class MapElement extends LitElementNoShadow {
  @query(".map")
  map!: HTMLElement;

  mapInstance: MapLibreGl | undefined;

  disconnectedCallback() {
    this.mapInstance?.remove();
  }

  async firstUpdated() {
    const map = new MapLibreGl({
      container: this.map,
      style,
      center: [0, 0],
      zoom: 0,
      attributionControl: false,
      doubleClickZoom: false,
    });

    this.mapInstance = map;

    map.on("load", () => {
      this.dispatchEvent(
        new CustomEvent<MapLoadEvent>("map-load", { detail: { map } }),
      );
    });
  }

  render() {
    return html`<div class="map inset-0 w-full h-full"></div>`;
  }
}
