"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DeliveryDashboardItem } from "../../types";
import styles from "./DeliveryMap.module.css";

const CASABLANCA: L.LatLngExpression = [33.5731, -7.5898];

function markerIcon(item: DeliveryDashboardItem, selected: boolean) {
  const tone = item.category === "delivered"
    ? styles.delivered
    : item.category === "needs_attention"
      ? styles.attention
      : styles.pending;
  const symbol = item.category === "delivered" ? "✓" : item.category === "needs_attention" ? "!" : "•";

  return L.divIcon({
    className: "",
    html: `<div class="${styles.marker} ${tone} ${selected ? styles.selected : ""}"><span>${symbol}</span></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });
}

export function DeliveryMap({ items, selectedId, onSelect, ariaLabel, errorTitle }: Readonly<{
  items: DeliveryDashboardItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  ariaLabel: string;
  errorTitle: string;
}>) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [tileError, setTileError] = useState(false);
  const mappedItems = useMemo(() => items.filter((item) => item.coordinates), [items]);

  useEffect(() => {
    if (!elementRef.current) return;

    const map = L.map(elementRef.current, { zoomControl: true }).setView(CASABLANCA, 12);
    const tiles = L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
        maxZoom: 19,
      },
    );
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("tileload", () => setTileError(false));
    tiles.addTo(map);
    mapRef.current = map;
    const frame = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    const markers = mappedItems.map((item) => {
      const coordinates = item.coordinates!;
      const position: L.LatLngExpression = [coordinates.latitude, coordinates.longitude];
      const marker = L.marker(position, {
        icon: markerIcon(item, item.attemptId === selectedId),
        keyboard: true,
        title: `${item.familyName} — ${item.address}`,
        alt: item.familyName,
        zIndexOffset: item.attemptId === selectedId ? 1000 : 0,
      }).addTo(map);
      marker.on("click", () => onSelect(item.attemptId));
      return marker;
    });
    markersRef.current = markers;

    const points = mappedItems.map((item) => [item.coordinates!.latitude, item.coordinates!.longitude] as L.LatLngTuple);
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    } else {
      map.setView(CASABLANCA, 12);
    }
  }, [mappedItems, onSelect, selectedId]);

  return (
    <div className={styles.root}>
      <div ref={elementRef} className={styles.map} aria-label={ariaLabel} />
      {tileError ? <div className={styles.message} role="alert"><strong>{errorTitle}</strong></div> : null}
    </div>
  );
}
