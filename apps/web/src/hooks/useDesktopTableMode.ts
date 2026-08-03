"use client";

import { useEffect, useState } from "react";

const DESKTOP_TABLE_QUERY = "(min-width: 1024px)";

export function useDesktopTableMode(): "table" | "cards" {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_TABLE_QUERY);
    const update = () => setIsDesktop(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop ? "table" : "cards";
}
