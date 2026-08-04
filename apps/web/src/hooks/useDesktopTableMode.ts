"use client";

import { useEffect, useState } from "react";

const DESKTOP_TABLE_QUERY = "(min-width: 1024px)";
const CARD_VIEWPORT_QUERY = "(max-width: 1023px)";

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

export function useCardViewport() {
  const [isCardViewport, setIsCardViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(CARD_VIEWPORT_QUERY);
    const update = () => setIsCardViewport(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isCardViewport;
}
