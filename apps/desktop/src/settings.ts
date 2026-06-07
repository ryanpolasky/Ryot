/**
 * Local desktop settings, persisted as JSON in Electron's userData dir.
 * No Riot API key here by design: the key lives only on the shared backend.
 * We only store where to find that backend + an optional fallback Riot ID.
 */
import { app } from "electron";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Settings {
  /** Base URL of the hosted Ryot site (web). */
  ryotUrl: string;
  /** Base URL of the Ryot backend API (used by the pre-game window). */
  apiUrl: string;
  /** Optional "Name#TAG" used when the League client isn't running. */
  defaultRiotId: string;
  /** Platform routing id for the default Riot ID (e.g. "na1"). */
  defaultRegion: string;
  /** Electron display id the pre-game popup should open on (0 = primary). */
  pregameDisplayId: number;
  /** Whether the champ-select pre-game screen auto-opens. */
  pregameEnabled: boolean;
  /** Whether the live lobby auto-reveals (scout opens) when a game starts. */
  autoReveal: boolean;
  /** Whether the (possibly edited) rune page imports automatically on lock-in. */
  autoImportRunes: boolean;
  /**
   * Saved positions for the two draggable overlay zones (stat panel + next-buy),
   * stored as viewport fractions for resolution independence. null = use the
   * auto-computed defaults.
   */
  overlayLayout: OverlayLayout | null;
}

/** Positions of the two draggable overlay zones (fractions of viewport). */
export interface OverlayZones {
  statpanel: { xFrac: number; yFrac: number };
  nextbuy: { xFrac: number; yFrac: number };
}

/**
 * Persisted draggable-zone positions, stored per map ("rift" / "aram") so the
 * Summoner's Rift and ARAM overlays can be calibrated independently. Older
 * single-map saves (a bare OverlayZones object) are still accepted on read.
 */
export type OverlayLayout = Partial<Record<"rift" | "aram", OverlayZones>>;

const DEFAULTS: Settings = {
  ryotUrl: process.env.RYOT_URL ?? "https://ryot.lol",
  apiUrl: process.env.RYOT_API_URL ?? "https://api.ryot.lol",
  defaultRiotId: "",
  defaultRegion: "na1",
  pregameDisplayId: 0,
  pregameEnabled: true,
  autoReveal: true,
  autoImportRunes: false,
  overlayLayout: null,
};

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function loadSettings(): Settings {
  try {
    const path = settingsPath();
    if (!existsSync(path)) return { ...DEFAULTS };
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next: Partial<Settings>): Settings {
  const merged = { ...loadSettings(), ...next };
  // Normalize: strip any trailing slash on the URLs.
  merged.ryotUrl = merged.ryotUrl.replace(/\/+$/, "");
  merged.apiUrl = merged.apiUrl.replace(/\/+$/, "");
  writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}
