import { accentFromSplash, splashArtUrl, splashUrl } from "@/lib/accent";
import { OG_CONTENT_TYPE, OG_SIZE, RyotOgCard, loadOgFonts } from "@/lib/og";
import { SITE_CHAMPION, SITE_NAME } from "@/lib/site";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Cache for 7 days; the art + accent only change when SITE_CHAMPION changes.
export const revalidate = 604800;

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${SITE_NAME}: no-ads League of Legends companion`;

// Default/site-wide Open Graph image (homepage + any route that doesn't set its
// own). Reuses the shared champion card with a homepage tagline; swap the
// featured champion via SITE_CHAMPION in lib/site.ts.
export default async function OpenGraphImage() {
  const [fonts, accent] = await Promise.all([
    loadOgFonts(),
    accentFromSplash(splashUrl(SITE_CHAMPION)),
  ]);

  return new ImageResponse(
    RyotOgCard({
      eyebrow: "League of Legends Companion",
      tagline:
        "Match history, ranked stats, a live-game scout & champion builds.",
      splash: splashArtUrl(SITE_CHAMPION),
      accent,
    }),
    { ...size, fonts },
  );
}
