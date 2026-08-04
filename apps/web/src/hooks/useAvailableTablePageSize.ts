"use client";

import { useEffect, useEffectEvent, useRef } from "react";

const TABLE_CHROME_HEIGHT = 152;
const TABLE_ROW_HEIGHT = 56;

export function calculateAvailableTablePageSize(height: number) {
  return Math.min(
    100,
    Math.max(5, Math.floor((height - TABLE_CHROME_HEIGHT) / TABLE_ROW_HEIGHT)),
  );
}

export function useAvailableTablePageSize(onPageSizeChange: (pageSize: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const emitPageSizeChange = useEffectEvent(onPageSizeChange);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const nextPageSize = calculateAvailableTablePageSize(
        container.getBoundingClientRect().height,
      );
      emitPageSizeChange(nextPageSize);
    };

    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return containerRef;
}
