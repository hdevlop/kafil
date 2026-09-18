"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import type { DeliveryDashboardItem } from "../../types";
import styles from "./DeliveryMap.module.css";

const CASABLANCA: L.LatLngExpression = [33.5731, -7.5898];

export type MarkerFocusHandle = { focusMarker: (attemptId: string) => void };

function markerIcon(item: DeliveryDashboardItem) {
  const tone = item.category === "delivered"
    ? styles.delivered
    : item.category === "needs_attention"
      ? styles.attention
      : styles.pending;
  const symbol = item.category === "delivered" ? "✓" : item.category === "needs_attention" ? "!" : "•";

  return L.divIcon({
    className: "",
    html: `<div class="${styles.marker} ${tone}"><span>${symbol}</span></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });
}

export function DeliveryMap({ items, selectedId, onSelect, ariaLabel, errorTitle, markerLabel, handleRef }: Readonly<{
  items: DeliveryDashboardItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  ariaLabel: string;
  errorTitle: string;
  /** Family, order number, and workflow/warning state — never the address. */
  markerLabel: (item: DeliveryDashboardItem) => string;
  /** Lets the closing sheet hand focus back to the marker that opened it. */
  handleRef?: RefObject<MarkerFocusHandle | null>;
}>) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
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
    if (!handleRef) return;
    handleRef.current = {
      focusMarker: (attemptId) =>
        markersRef.current.get(attemptId)?.getElement()?.focus(),
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  // Markers are rebuilt only when the plotted deliveries change. Selection is
  // deliberately absent here: recreating a marker would destroy the element a
  // closing sheet needs to return focus to.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = new Map<string, L.Marker>();
    for (const item of mappedItems) {
      const coordinates = item.coordinates!;
      const position: L.LatLngExpression = [coordinates.latitude, coordinates.longitude];
      const label = markerLabel(item);
      const marker = L.marker(position, {
        icon: markerIcon(item),
        keyboard: true,
        title: label,
        alt: label,
      }).addTo(map);
      marker.on("click", () => onSelect(item.attemptId));
      marker.on("keypress", (event) => {
        const key = (event as unknown as { originalEvent?: KeyboardEvent })
          .originalEvent?.key;
        if (key === "Enter" || key === " ") onSelect(item.attemptId);
      });
      markers.set(item.attemptId, marker);
    }
    markersRef.current = markers;

    const points = mappedItems.map((item) => [item.coordinates!.latitude, item.coordinates!.longitude] as L.LatLngTuple);
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    } else {
      map.setView(CASABLANCA, 12);
    }

    return () => {
      for (const marker of markers.values()) marker.remove();
      markersRef.current = new Map();
    };
  }, [mappedItems, markerLabel, onSelect]);

  // Selection restyles the live marker elements instead of replacing them.
  useEffect(() => {
    for (const [attemptId, marker] of markersRef.current) {
      const selected = attemptId === selectedId;
      marker.getElement()?.firstElementChild?.classList.toggle(styles.selected, selected);
      marker.setZIndexOffset(selected ? 1000 : 0);
    }
  }, [mappedItems, selectedId]);

  return (
    <div className={styles.root}>
      <div ref={elementRef} className={styles.map} aria-label={ariaLabel} />
      {tileError ? <div className={styles.message} role="alert"><strong>{errorTitle}</strong></div> : null}
    </div>
  );
}
