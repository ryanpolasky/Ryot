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
  // the cleaner centered Community Dragon art.
  const accent = await accentFromSplash(splashUrl(id, skin));

  return NextResponse.json({
    id,
    skin,
    splash: splashArtUrl(id, skin),
    hex: accent,
    accent: hexToRgbChannels(accent),
    // Lighter variant for the gold2 hover token, mixed toward bone (same as builds).
    accent2: hexToRgbChannels(mixHex(accent, BONE, 0.35)),
  });
}
