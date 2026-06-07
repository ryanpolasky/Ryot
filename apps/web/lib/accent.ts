import "server-only";
import { fetchChampions, getLatestVersion } from "@lc/shared";
import jpeg from "jpeg-js";

// brand gold: anchor + fallback when a splash has no vibrant hue
export const GOLD = "#c8aa6e";
// brand bone, base for body text
export const BONE = "#f4f1e8";

// Linear-blend two hex colors. pct=0 -> a, pct=1 -> b.
export function mixHex(a: string, b: string, pct: number): string {
  const ch = (h: string, k: number) => parseInt(h.slice(k, k + 2), 16);
  const c = [1, 3, 5].map((k) =>
    Math.round(ch(a, k) + (ch(b, k) - ch(a, k)) * pct),
  );
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// "#c8aa6e" -> "200 170 110" (space-separated channels for CSS rgb() vars).
export function hexToRgbChannels(hex: string): string {
  const n = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  return n.join(" ");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// pull a dominant vibrant accent from a champion splash; returns brand gold if none
export async function accentFromSplash(splashUrl: string): Promise<string> {
  try {
    const res = await fetch(splashUrl, { next: { revalidate: 604800 } });
    if (!res.ok) return GOLD;
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, width, height } = jpeg.decode(buf, { useTArray: true });
    const bins = 24;
    const count = new Array(bins).fill(0);
    const step = 5; // sample every 5th pixel in each axis
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const [h, s, l] = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!);
        if (s < 0.32 || l < 0.22 || l > 0.9) continue;
        const b = Math.min(bins - 1, Math.floor(h * bins));
        count[b] += 1;
      }
    }
    let best = -1;
    let bestCount = 0;
    for (let b = 0; b < bins; b++) {
      if (count[b] > bestCount) {
        bestCount = count[b];
        best = b;
      }
    }
    if (best < 0 || bestCount < 40) return GOLD;
    const hue = (best + 0.5) / bins;
    // Bright + saturated so it reads clearly against #0a0a0b.
    return hslToHex(hue, 0.7, 0.62);
  } catch {
    return GOLD;
  }
}

// Canonical Data Dragon splash URL for a champion id (e.g. "Aatrox", "MonkeyKing").
export function splashUrl(championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_0.jpg`;
}

// resolve a champion id/name/key to its canonical data dragon id; falls back to "Aatrox"
export async function resolveChampionId(input: string): Promise<string> {
  try {
    const version = await getLatestVersion();
    const champions = await fetchChampions(version);
    const q = input.trim().toLowerCase();
    const match = champions.find(
      (c) =>
        c.id.toLowerCase() === q ||
        c.name.toLowerCase() === q ||
        c.key === input.trim(),
    );
    return match?.id ?? "Aatrox";
  } catch {
    return "Aatrox";
  }
}
