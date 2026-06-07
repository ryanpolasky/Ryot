import {
  accentFromSplash,
  BONE,
  hexToRgbChannels,
  mixHex,
  resolveChampionId,
  splashUrl,
} from "@/lib/accent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// The accent for a champion is deterministic; cache it for 7 days.
export const revalidate = 604800;

// resolve a champion to its theme data: gold channel overrides + splash url
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ champion: string }> },
) {
  const { champion } = await params;
  const id = await resolveChampionId(decodeURIComponent(champion));
  const splash = splashUrl(id);
  const accent = await accentFromSplash(splash);

  return NextResponse.json({
    id,
    splash,
    hex: accent,
    accent: hexToRgbChannels(accent),
    // Lighter variant for the gold2 hover token, mixed toward bone (same as builds).
    accent2: hexToRgbChannels(mixHex(accent, BONE, 0.35)),
  });
}
