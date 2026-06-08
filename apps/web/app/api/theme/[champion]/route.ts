import {
  accentFromSplash,
  BONE,
  hexToRgbChannels,
  mixHex,
  resolveChampionId,
  splashArtUrl,
  splashUrl,
} from "@/lib/accent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// The accent for a champion is deterministic; cache it for 7 days.
export const revalidate = 604800;

// The centered Community Dragon splash is a nicer crop, but it 404s for some
// skins (and chromas). Verify it exists and fall back to Data Dragon's splash,
// which is present for every real skin, so the backdrop is never blank.
async function resolveSplash(id: string, skin: number): Promise<string> {
  const centered = splashArtUrl(id, skin);
  if (skin === 0) return centered; // base centered art always exists
  try {
    const res = await fetch(centered, { method: "HEAD", next: { revalidate } });
    if (res.status === 404) return splashUrl(id, skin);
  } catch {
    /* network hiccup: keep the centered art */
  }
  return centered;
}

// resolve a champion to its theme data: gold channel overrides + splash url
export async function GET(
  req: Request,
  { params }: { params: Promise<{ champion: string }> },
) {
  const { champion } = await params;
  // Optional skin number (0 = base) so a theme can target a specific skin.
  const skin = Math.max(
    0,
    Math.trunc(Number(new URL(req.url).searchParams.get("skin")) || 0),
  );
  const id = await resolveChampionId(decodeURIComponent(champion));
  // Accent decodes the small Data Dragon splash (cheap); the page backdrop uses
  // the cleaner centered Community Dragon art (with a Data Dragon fallback).
  const [accent, splash] = await Promise.all([
    accentFromSplash(splashUrl(id, skin)),
    resolveSplash(id, skin),
  ]);

  return NextResponse.json({
    id,
    skin,
    splash,
    hex: accent,
    accent: hexToRgbChannels(accent),
    // Lighter variant for the gold2 hover token, mixed toward bone (same as builds).
    accent2: hexToRgbChannels(mixHex(accent, BONE, 0.35)),
  });
}
