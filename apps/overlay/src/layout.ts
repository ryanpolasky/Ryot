/**
 * Overlay layout engine.
 *
 * Computes pixel positions for each overlay zone from the user's screen
 * resolution and League's in-game HUD settings (MinimapScale, HudScale,
 * FlipMiniMap). The HUD config is read from the League Client (LCU) by the
 * desktop app's main process and forwarded to the overlay renderer.
 *
 * Locked zones (auto-placed from League config, not user-movable):
 *   - minimap timers  (placed over the real minimap)
 *   - scoreboard gold diffs  (placed at the Tab scoreboard)
 *
 * Free zones (auto-placed with smart defaults, user-draggable):
 *   - stat panel  (top-right by default)
 *   - next-buy / recommended build  (between minimap and HUD bar)
 */

/**
 * Which map the overlay is rendering for. The in-game HUD chrome (corner
 * minimap, centered ability bar + HUD, Tab scoreboard) is the same widget set
 * on Howling Abyss as on Summoner's Rift, but ARAM is kept as its own profile
 * so its layout can be calibrated and shipped independently (and so the minimap
 * shows only ARAM-relevant timers).
 */
export type MapMode = "rift" | "aram";

export interface HudConfig {
  minimapScale: number; // 0.5-2.0, default 1.0
  hudScale: number; // 0.5-2.0, default 1.0
  flipMiniMap: boolean; // true = minimap on left
}

export const DEFAULT_HUD: HudConfig = {
  minimapScale: 1.0,
  hudScale: 1.0,
  flipMiniMap: false,
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OverlayLayout {
  minimap: Rect; // the minimap box (timer dots positioned as fractions of this)
  scoreboard: Rect; // gold-diff scoreboard (shown on Tab)
  statpanel: Rect; // stat panel (top-right, draggable)
  nextbuy: Rect; // next-buy panel (draggable)
  hudBar: Rect; // the bottom HUD bar (reference, not rendered)
}

// Base pixel values measured at 1920x1080, MinimapScale=1.0, HudScale=1.0.
// Measured from native 1920x1080 Summoner's Rift frames (default HUD); all
// other resolutions/scales derive from these via linear scaling.
/** Base pixel measurements at 1920x1080, default HUD scale (1.0). */
export interface LayoutBase {
  mmSize: number;
  mmMarginRight: number;
  mmMarginBottom: number;
  hudH: number;
  hudW: number;
  sbW: number;
  sbY: number;
  spW: number;
  spMargin: number;
  nbW: number;
  nbGapFromMM: number;
}

const B_RIFT: LayoutBase = {
  mmSize: 300,
  mmMarginRight: 2,
  mmMarginBottom: 11,
  hudH: 90,
  hudW: 600,
  sbW: 425,
  sbY: 56,
  spW: 188,
  spMargin: 12,
  nbW: 200,
  nbGapFromMM: 10,
};

// Howling Abyss (ARAM) shares the same HUD chrome as Summoner's Rift, so its
// base geometry starts identical to Rift. It is a distinct profile so it can be
// hand-tuned and shipped on its own via the debug editor's ARAM tab.
const B_ARAM: LayoutBase = { ...B_RIFT };

const BASES: Record<MapMode, LayoutBase> = { rift: B_RIFT, aram: B_ARAM };

/** The (mutable) base constants used by computeLayout for a given map. */
export function baseFor(map: MapMode = "rift"): LayoutBase {
  return BASES[map];
}

/** A copy of the shipped default base constants for a given map. */
export function defaultBaseFor(map: MapMode = "rift"): Readonly<LayoutBase> {
  return { ...BASES[map] };
}

/** @deprecated prefer defaultBaseFor(map). Retained for existing callers. */
export const DEFAULT_BASE: Readonly<LayoutBase> = { ...B_RIFT };

export function computeLayout(
  screenW: number,
  screenH: number,
  hud: HudConfig = DEFAULT_HUD,
  champion?: string,
  map: MapMode = "rift",
): OverlayLayout {
  const B = baseFor(map);
  const s = screenH / 1080; // resolution scale
  const ms = hud.minimapScale;
  const hs = hud.hudScale;
  const flip = hud.flipMiniMap;

  // -- Minimap --
  const mmSize = Math.round(B.mmSize * s * ms);
  const hudH = Math.round(B.hudH * s * hs);
  const mmMR = Math.round(B.mmMarginRight * s);
  const mmMB = Math.round(B.mmMarginBottom * s);

  // The minimap is anchored to the bottom screen corner, independent of the
  // HUD bar height (the bar and the minimap coexist along the bottom edge).
  const mmX = flip ? mmMR : screenW - mmSize - mmMR;
  const mmY = screenH - mmSize - mmMB;

  // -- Bottom HUD bar --
  const hudW = Math.round(B.hudW * s * hs);
  const hudX = Math.round((screenW - hudW) / 2);
  const hudY = screenH - hudH;

  // -- Tab scoreboard (gold diffs, centered) --
  const sbW = Math.round(B.sbW * s);
  const sbX = Math.round((screenW - sbW) / 2);
  const sbY = Math.round(B.sbY * s);

  // -- Stat panel (top-right, draggable) --
  const spW = Math.round(B.spW * s);
  const spM = Math.round(B.spMargin * s);
  const spX = screenW - spW - spM;
  const spY = spM;

  // -- Next-buy (near minimap, draggable) --
  const nbW = Math.round(B.nbW * s);
  const nbGap = Math.round(B.nbGapFromMM * s);
  const nbX = flip ? mmMR + mmSize + nbGap : mmX - nbW - nbGap;
  const nbH = Math.round(140 * s);
  // Sit in the bottom-right gap between the HUD bar and the minimap.
  const nbY = screenH - nbH - Math.round(20 * s);

  return {
    minimap: { x: mmX, y: mmY, w: mmSize, h: mmSize },
    scoreboard: { x: sbX, y: sbY, w: sbW, h: 0 }, // h auto
    statpanel: { x: spX, y: spY, w: spW, h: 0 },
    nextbuy: { x: nbX, y: nbY, w: nbW, h: 0 },
    hudBar: { x: hudX, y: hudY, w: hudW, h: hudH },
  };
}

/** Serialize layout to a storable JSON object (only the two draggable zones). */
export interface SavedLayout {
  /** Fractions of viewport for resolution independence. */
  statpanel: { xFrac: number; yFrac: number };
  nextbuy: { xFrac: number; yFrac: number };
}

/** Per-map saved layouts. Persisted shape for the draggable-zone overrides. */
export type SavedLayouts = Partial<Record<MapMode, SavedLayout>>;

/**
 * Normalize a persisted layout value into the per-map shape. Accepts the legacy
 * single-map shape (`{ statpanel, nextbuy }`, treated as Rift) for back-compat.
 */
export function normalizeSavedLayouts(raw: unknown): SavedLayouts {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  if ("statpanel" in obj && "nextbuy" in obj) {
    return { rift: obj as unknown as SavedLayout };
  }
  const out: SavedLayouts = {};
  for (const m of ["rift", "aram"] as const) {
    const v = obj[m];
    if (v && typeof v === "object" && "statpanel" in v && "nextbuy" in v) {
      out[m] = v as SavedLayout;
    }
  }
  return out;
}

export function layoutToSaved(
  layout: OverlayLayout,
  screenW: number,
  screenH: number,
): SavedLayout {
  return {
    statpanel: {
      xFrac: layout.statpanel.x / screenW,
      yFrac: layout.statpanel.y / screenH,
    },
    nextbuy: {
      xFrac: layout.nextbuy.x / screenW,
      yFrac: layout.nextbuy.y / screenH,
    },
  };
}

/**
 * Back-compute the resolution-independent base constants from pixel rects that
 * the user dragged/resized in the calibration editor. This is the inverse of
 * computeLayout: given a user-adjusted OverlayLayout + screen + HUD config,
 * produce the LayoutBase that would reproduce those positions.
 */
export function deriveBase(
  L: OverlayLayout,
  screenW: number,
  screenH: number,
  hud: HudConfig = DEFAULT_HUD,
  _map: MapMode = "rift",
): LayoutBase {
  const s = screenH / 1080;
  const ms = hud.minimapScale;
  const hs = hud.hudScale;
  const flip = hud.flipMiniMap;

  const mmSize = L.minimap.w / (s * ms);
  const mmMR = flip
    ? L.minimap.x / s
    : (screenW - L.minimap.x - L.minimap.w) / s;
  const mmMB = (screenH - L.minimap.y - L.minimap.h) / s;

  const hudH = L.hudBar.h / (s * hs);
  const hudW = L.hudBar.w / (s * hs);

  const sbW = L.scoreboard.w / s;
  const sbY = L.scoreboard.y / s;

  const spW = L.statpanel.w / s;
  const spM = (screenW - L.statpanel.x - L.statpanel.w) / s;

  const nbW = L.nextbuy.w / s;
  const nbGap = flip
    ? (L.nextbuy.x - L.minimap.x - L.minimap.w) / s
    : (L.minimap.x - L.nextbuy.x - L.nextbuy.w) / s;

  const r = Math.round;
  return {
    mmSize: r(mmSize),
    mmMarginRight: r(mmMR),
    mmMarginBottom: r(mmMB),
    hudH: r(hudH),
    hudW: r(hudW),
    sbW: r(sbW),
    sbY: r(sbY),
    spW: r(spW),
    spMargin: Math.max(0, r(spM)),
    nbW: r(nbW),
    nbGapFromMM: Math.max(0, r(nbGap)),
  };
}

export function applySavedLayout(
  layout: OverlayLayout,
  saved: SavedLayout,
  screenW: number,
  screenH: number,
): OverlayLayout {
  return {
    ...layout,
    statpanel: {
      ...layout.statpanel,
      x: Math.round(saved.statpanel.xFrac * screenW),
      y: Math.round(saved.statpanel.yFrac * screenH),
    },
    nextbuy: {
      ...layout.nextbuy,
      x: Math.round(saved.nextbuy.xFrac * screenW),
      y: Math.round(saved.nextbuy.yFrac * screenH),
    },
  };
}
