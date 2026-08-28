"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  ts: string;
  label?: string;
}

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function MapView({
  points,
  selectedId,
  onSelect,
  className,
}: {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE as any,
        center: [78.9629, 20.5937], // India
        zoom: 3,
        attributionControl: { compact: true },
      });
      mapRef.current.addControl(new maplibregl.NavigationControl({}), "top-right");
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // render points
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      const map = mapRef.current;
      if (!map || cancelled) return;

      const draw = () => {
        // clear old markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        // path line
        const coords = points.map((p) => [p.longitude, p.latitude]);
        const lineData = {
          type: "FeatureCollection",
          features:
            coords.length > 1
              ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }]
              : [],
        };
        const src = map.getSource("path");
        if (src) {
          (src as any).setData(lineData);
        } else {
          map.addSource("path", { type: "geojson", data: lineData });
          map.addLayer({
            id: "path-line",
            type: "line",
            source: "path",
            paint: { "line-color": "#3b82f6", "line-width": 3, "line-opacity": 0.7 },
          });
        }

        points.forEach((p, i) => {
          const el = document.createElement("div");
          const selected = p.id === selectedId;
          el.style.cssText = `width:${selected ? 22 : 16}px;height:${
            selected ? 22 : 16
          }px;border-radius:50%;border:2px solid #fff;cursor:pointer;background:${
            selected ? "#f59e0b" : "#3b82f6"
          };box-shadow:0 0 0 2px rgba(0,0,0,.3)`;
          el.title = `${i + 1}. ${new Date(p.ts).toLocaleString()}${
            p.accuracy ? ` (±${Math.round(p.accuracy)} m)` : ""
          }`;
          el.addEventListener("click", () => onSelectRef.current?.(p.id));
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([p.longitude, p.latitude])
            .addTo(map);
          markersRef.current.push(marker);
        });

        if (points.length === 1) {
          map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 15 });
        } else if (points.length > 1) {
          const b = new maplibregl.LngLatBounds();
          points.forEach((p) => b.extend([p.longitude, p.latitude]));
          map.fitBounds(b, { padding: 60, maxZoom: 16, duration: 500 });
        }
      };

      if (map.isStyleLoaded()) draw();
      else map.once("load", draw);
    })();
    return () => {
      cancelled = true;
    };
  }, [points, selectedId]);

  return <div ref={containerRef} className={className ?? "h-[420px] w-full rounded-xl"} />;
}
