"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

import type { DeliveryDashboardItem } from "../../types";
import styles from "./DeliveryMap.module.css";

const CASABLANCA: L.LatLngExpression = [33.5731, -7.5898];

function markerIcon(item: DeliveryDashboardItem, selected: boolean) {
  const tone = item.category === "delivered"
    ? styles.delivered
    : item.category === "needs_attention"
      ? styles.attention
      : styles.pending;
  return L.divIcon({
    className: "",
    html: `<div class="${styles.marker} ${tone} ${selected ? styles.selected : ""}"><span>${item.category === "delivered" ? "✓" : item.category === "needs_attention" ? "!" : "•"}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

export function DeliveryMap({ items, selectedId, onSelect }: Readonly<{
  items: DeliveryDashboardItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!elementRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: true }).setView(CASABLANCA, 12);
    L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
        maxZoom: 19,
      },
    ).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    const markers = items.flatMap((item) => {
      if (!item.coordinates) return [];
      const position: L.LatLngExpression = [item.coordinates.latitude, item.coordinates.longitude];
      const marker = L.marker(position, {
        icon: markerIcon(item, item.attemptId === selectedId),
        keyboard: true,
        title: `${item.familyName} — ${item.address}`,
        alt: item.familyName,
        zIndexOffset: item.attemptId === selectedId ? 1000 : 0,
      }).addTo(map);
      marker.on("click", () => onSelect(item.attemptId));
      return [marker];
    });
    markersRef.current = markers;
    const points = items.flatMap((item) => item.coordinates
      ? [[item.coordinates.latitude, item.coordinates.longitude] as L.LatLngTuple]
      : []);
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
  }, [items, onSelect, selectedId]);

  return <div ref={elementRef} className={styles.map} aria-label="Delivery map" />;
}
