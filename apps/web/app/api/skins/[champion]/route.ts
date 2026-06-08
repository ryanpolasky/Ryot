import { fetchChampionSkins, getLatestVersion, type DDragonSkin } from "@lc/shared";
import { resolveChampionId, splashUrl } from "@/lib/accent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Skin splashes rarely change; cache the validated list for 7 days.
export const revalidate = 604800;

// HEAD-check a skin's Data Dragon splash. Some legacy "chroma"-style entries are
// listed as skins but have no real splash (404); those can't back a theme, so we
// drop them. Base (0) always exists; transient errors keep the skin so we never
// over-filter on a network hiccup.
async function hasSplash(id: string, num: number): Promise<boolean> {
  if (num === 0) return true;
  try {
    const res = await fetch(splashUrl(id, num), {
      method: "HEAD",
      next: { revalidate },
    });
    return res.status !== 404;
  } catch {
    return true;
  }
}

// Returns a champion's themeable skins (base + named skins with real splash art),
// with splash-less legacy/chroma entries filtered out.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ champion: string }> },
) {
  const { champion } = await params;
  const id = await resolveChampionId(decodeURIComponent(champion));

  let skins: DDragonSkin[] = [];
  try {
    const version = await getLatestVersion();
    skins = await fetchChampionSkins(version, id);
  } catch {
    return NextResponse.json({ skins: [] });
  }

  const checked = await Promise.all(
    skins.map(async (s) => ((await hasSplash(id, s.num)) ? s : null)),
  );
  return NextResponse.json({
    skins: checked.filter((s): s is DDragonSkin => s !== null),
  });
}
