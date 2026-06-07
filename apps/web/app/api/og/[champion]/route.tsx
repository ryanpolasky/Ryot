import { accentFromSplash, splashUrl } from "@/lib/accent";
import { OG_SIZE, RyotOgCard, loadOgFonts } from "@/lib/og";
import { fetchChampions, getLatestVersion } from "@lc/shared";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Cache for 7 days (splash art rarely changes mid-patch).
export const revalidate = 604800;

// Resolve a free-form champion string (id, display name, or numeric key) to its
// canonical Data Dragon id + display name. Users can type "lee sin", "Kai'Sa",
// etc.; the splash CDN only accepts the canonical id ("LeeSin", "Kaisa"). Falls
// back to Aatrox so the card always renders real art instead of a broken image.
async function resolveChampion(
  input: string,
): Promise<{ id: string; name: string }> {
  const fallback = { id: "Aatrox", name: "Aatrox" };
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
    return match ? { id: match.id, name: match.name } : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ champion: string }> },
) {
  const { champion } = await params;
  const { id, name } = await resolveChampion(decodeURIComponent(champion));
  const splash = splashUrl(id);

  const [fonts, accent] = await Promise.all([
    loadOgFonts(),
    accentFromSplash(splash),
  ]);

  return new ImageResponse(
    RyotOgCard({
      eyebrow: `${name} Build`,
      tagline: "Best runes, items & counters",
      splash,
      accent,
    }),
    { ...OG_SIZE, fonts },
  );
}
