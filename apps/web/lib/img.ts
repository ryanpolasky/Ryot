import type { SyntheticEvent } from "react";

// neutral dark square shown when a data dragon icon 404s, instead of a broken-image glyph
export const ICON_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%2317161a'/%3E%3C/svg%3E";

// onerror handler for img icons; swaps to fallback once
export function onIconError(e: SyntheticEvent<HTMLImageElement>): void {
  const el = e.currentTarget;
  if (el.dataset.fallback) return;
  el.dataset.fallback = "1";
  el.src = ICON_FALLBACK;
}
