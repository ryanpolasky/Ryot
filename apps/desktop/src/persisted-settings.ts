/**
 * Reads League's in-game HUD settings so the overlay can auto-place its locked
 * zones (minimap timers, scoreboard, skill bar) with zero user calibration.
 *
 * League persists the in-game options to `Config/PersistedSettings.json` inside
 * its install directory. The relevant values live in the HUD section:
 *   - MinimapScale  (0.0-1.0 slider, surfaced as ~0.5-2.0 effective scale)
 *   - FlipMinimap   (bool: minimap on the left)
 *   - a HUD scale value (key name varies by patch: "HUDScale" / "GlobalScale")
 *
 * The exact key names and file location differ across platforms and patches, so
 * this reader is deliberately defensive: it scans every install candidate, then
 * every section/setting case-insensitively, and falls back to sane defaults when
 * anything is missing. Final pixel alignment is still adjustable via edit mode.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface HudConfig {
  minimapScale: number; // effective 0.5-2.0, default 1.0
  hudScale: number; // effective 0.5-2.0, default 1.0
  flipMiniMap: boolean;
}

export const DEFAULT_HUD: HudConfig = {
  minimapScale: 1.0,
  hudScale: 1.0,
  flipMiniMap: false,
};

/** Candidate paths to League's PersistedSettings.json across platforms. */
function configCandidates(): string[] {
  const home = homedir();
  const rel = join("Config", "PersistedSettings.json");
  if (process.platform === "win32") {
    return [
      join("C:", "Riot Games", "League of Legends", rel),
      join("D:", "Riot Games", "League of Legends", rel),
      join(home, "Riot Games", "League of Legends", rel),
    ];
  }
  if (process.platform === "darwin") {
    return [
      join(
        "/",
        "Applications",
        "League of Legends.app",
        "Contents",
        "LoL",
        rel,
      ),
      join(
        home,
        "Applications",
        "League of Legends.app",
        "Contents",
        "LoL",
        rel,
      ),
    ];
  }
  // Linux / other (e.g. Lutris/Wine prefixes), best-effort.
  return [
    join(home, ".wine", "drive_c", "Riot Games", "League of Legends", rel),
  ];
}

interface PersistedSetting {
  name?: string;
  value?: unknown;
}
interface PersistedSection {
  name?: string;
  settings?: PersistedSetting[];
}
interface PersistedFile {
  name?: string;
  sections?: PersistedSection[];
}
interface PersistedSettings {
  files?: PersistedFile[];
}

/** Flatten every setting in the file into a case-insensitive name→value map. */
function flatten(json: PersistedSettings): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const file of json.files ?? []) {
    for (const section of file.sections ?? []) {
      for (const s of section.settings ?? []) {
        if (s.name) map.set(s.name.toLowerCase(), s.value);
      }
    }
  }
  return map;
}

function toNum(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

/**
 * League stores minimap/HUD scale as a 0..1 slider fraction. In-game that maps
 * to roughly 0.5x..2.0x of the base size. Convert a slider fraction to the
 * effective multiplier used by the layout engine.
 */
function sliderToScale(frac: number): number {
  // 0 -> 0.5x, 0.5 -> 1.0x (default), 1 -> ~1.7x. Clamp defensively.
  const f = Math.max(0, Math.min(1, frac));
  return 0.5 + f * 1.2;
}

export function readHudConfig(): HudConfig {
  for (const path of configCandidates()) {
    if (!existsSync(path)) continue;
    try {
      const json = JSON.parse(readFileSync(path, "utf8")) as PersistedSettings;
      const m = flatten(json);

      const mmRaw = toNum(m.get("minimapscale"));
      const hudRaw =
        toNum(m.get("hudscale")) ??
        toNum(m.get("globalscale")) ??
        toNum(m.get("globalscaleadjustment"));
      const flip = toBool(
        m.get("flipminimap") ?? m.get("flipminimapwithoutlocking"),
      );

      return {
        minimapScale: mmRaw == null ? 1.0 : sliderToScale(mmRaw),
        hudScale: hudRaw == null ? 1.0 : sliderToScale(hudRaw),
        flipMiniMap: flip,
      };
    } catch {
      // Corrupt/locked file, try the next candidate.
    }
  }
  return { ...DEFAULT_HUD };
}
