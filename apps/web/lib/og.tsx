import "server-only";
import { BONE, mixHex } from "@/lib/accent";
import { SITE_URL } from "@/lib/site";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared dimensions / content-type for every RYOT Open Graph card.
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

// Host shown in the card footer, derived from the configured site URL.
const siteHost = SITE_URL.replace(/^https?:\/\//, "");

// load the brand fonts shared by all og cards
export async function loadOgFonts() {
  const fontsDir = join(process.cwd(), "app/api/og/fonts");
  const [anton, spaceMono, spaceGrotesk] = await Promise.all([
    readFile(join(fontsDir, "Anton-Regular.ttf")),
    readFile(join(fontsDir, "SpaceMono-Regular.ttf")),
    readFile(join(fontsDir, "SpaceGrotesk-Medium.ttf")),
  ]);
  return [
    {
      name: "Anton",
      data: anton,
      style: "normal" as const,
      weight: 400 as const,
    },
    {
      name: "SpaceMono",
      data: spaceMono,
      style: "normal" as const,
      weight: 400 as const,
    },
    {
      name: "SpaceGrotesk",
      data: spaceGrotesk,
      style: "normal" as const,
      weight: 500 as const,
    },
  ];
}

// shared ryot share card used by the home + per-champion og routes
export function RyotOgCard({
  eyebrow,
  tagline,
  splash,
  accent,
}: {
  eyebrow: string;
  tagline: string;
  splash: string;
  accent: string;
}) {
  // fake object-fit:cover for the 1215x717 splash at 1200x630
  const imgW = 1200;
  const imgH = Math.round((717 / 1215) * 1200); // 708

  // tagline gets a soft hint of the champ accent
  const taglineColor = mixHex(accent, BONE, 0.55);

  return (
    <div
      style={{
        display: "flex",
        width: 1200,
        height: 630,
        position: "relative",
        background: "#0a0a0b",
        overflow: "hidden",
      }}
    >
      {/* Champion splash art */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={splash}
        alt=""
        width={imgW}
        height={imgH}
        style={{
          position: "absolute",
          top: -Math.round((imgH - 630) / 2),
          left: 0,
          opacity: 0.5,
        }}
      />

      {/* Left-to-right scrim: solid dark behind text, opens over art */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "linear-gradient(90deg, #0a0a0b 0%, rgba(10,10,11,0.88) 32%, rgba(10,10,11,0.35) 65%, rgba(10,10,11,0.5) 100%)",
        }}
      />
      {/* Bottom gradient for footer legibility */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 160,
          backgroundImage:
            "linear-gradient(0deg, #0a0a0b 0%, rgba(10,10,11,0) 100%)",
        }}
      />
      {/* Gold radial top glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "radial-gradient(120% 80% at 50% -20%, rgba(200,170,110,0.14), transparent 55%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 80px 120px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "SpaceMono",
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase" as const,
            color: accent,
            marginBottom: 22,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Anton",
            fontSize: 172,
            lineHeight: 0.86,
            letterSpacing: -2,
          }}
        >
          <span style={{ color: "#c8aa6e" }}>RY</span>
          <span style={{ color: "#f4f1e8" }}>OT</span>
        </div>
        <div
          style={{
            fontFamily: "SpaceGrotesk",
            fontSize: 36,
            fontWeight: 500,
            color: taglineColor,
            marginTop: 22,
            maxWidth: 700,
            lineHeight: 1.2,
          }}
        >
          {tagline}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 48,
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #26242b",
          paddingTop: 18,
          fontFamily: "SpaceMono",
          fontSize: 17,
          letterSpacing: 3,
          textTransform: "uppercase" as const,
          color: "#857f74",
        }}
      >
        <span style={{ color: accent }}>{siteHost}</span>
        <span>open source · privacy-first</span>
      </div>

      {/* Frame border */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 28,
          right: 28,
          bottom: 28,
          border: "1px solid #26242b",
        }}
      />
      {/* Champion-accent bar */}
      <div
        style={{
          position: "absolute",
          top: 27,
          left: 27,
          width: 220,
          height: 4,
          backgroundImage: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
      />
    </div>
  );
}
