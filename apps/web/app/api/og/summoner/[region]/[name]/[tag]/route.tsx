import { getMatches, getProfile } from "@/lib/api";
import { findQueue } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { ddragonImg } from "@lc/shared";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

// Summoner data changes far more often than splash art, so cache for 1 hour.
export const revalidate = 3600;

const siteHost = SITE_URL.replace(/^https?:\/\//, "");
const GOLD = "#c8aa6e";

// Per-tier accent colors, used for the eyebrow, rank text, and top glow.
const TIER_COLOR: Record<string, string> = {
  IRON: "#8a7f73",
  BRONZE: "#b06a3b",
  SILVER: "#9fb3c8",
  GOLD: "#e2b84a",
  PLATINUM: "#3fcaa8",
  EMERALD: "#2fae5a",
  DIAMOND: "#5a8de2",
  MASTER: "#b25fd6",
  GRANDMASTER: "#d6463f",
  CHALLENGER: "#f0d27a",
};

function tierColor(tier?: string): string {
  return (tier && TIER_COLOR[tier]) || GOLD;
}

// Community Dragon ranked emblems (same art Riot's client uses).
function emblemUrl(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`;
}

const TITLE = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export async function GET(
  _req: Request,
  {
    params,
  }: { params: Promise<{ region: string; name: string; tag: string }> },
) {
  const { region, name, tag } = await params;
  const gameName = decodeURIComponent(name);
  const tagLine = decodeURIComponent(tag);

  const fontsDir = join(process.cwd(), "app/api/og/fonts");
  const [anton, spaceMono, spaceGrotesk] = await Promise.all([
    readFile(join(fontsDir, "Anton-Regular.ttf")),
    readFile(join(fontsDir, "SpaceMono-Regular.ttf")),
    readFile(join(fontsDir, "SpaceGrotesk-Medium.ttf")),
  ]);

  // Fetch profile (rank, level, icon). If the shared key is down or the name is
  // bad, render a clean generic card instead of a broken image.
  const profile = await getProfile(region, gameName, tagLine).catch(() => null);

  const version = profile?.version ?? "";
  const solo = profile
    ? findQueue(profile.ranked, "RANKED_SOLO_5x5")
    : undefined;
  const iconUrl =
    profile && version
      ? ddragonImg.profileIcon(version, profile.summoner.profileIconId)
      : null;

  // Top champions from recent matches (by games played).
  let topChamps: { champ: string; games: number; wr: number }[] = [];
  if (profile) {
    const matches = await getMatches(region, profile.account.puuid, 20)
      .then((r) => r.matches)
      .catch(() => []);
    const counts = new Map<string, { games: number; wins: number }>();
    for (const m of matches) {
      const p = m.info.participants.find(
        (pp) => pp.puuid === profile.account.puuid,
      );
      if (!p) continue;
      const e = counts.get(p.championName) ?? { games: 0, wins: 0 };
      e.games += 1;
      if (p.win) e.wins += 1;
      counts.set(p.championName, e);
    }
    topChamps = [...counts.entries()]
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 3)
      .map(([champ, s]) => ({
        champ,
        games: s.games,
        wr: Math.round((s.wins / s.games) * 100),
      }));
  }

  const tier = solo?.tier;
  const accent = tierColor(tier);
  const rankLabel = solo
    ? `${TITLE(solo.tier)} ${solo.rank}`
    : profile
      ? "Unranked"
      : "Summoner";
  const lp = solo ? `${solo.leaguePoints} LP` : "";
  const soloWr =
    solo && solo.wins + solo.losses > 0
      ? Math.round((solo.wins / (solo.wins + solo.losses)) * 100)
      : null;

  return new ImageResponse(
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
      {/* Faded profile icon as a soft hero on the right */}
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl}
          alt=""
          width={760}
          height={760}
          style={{
            position: "absolute",
            top: -70,
            right: -150,
            opacity: 0.16,
            filter: "saturate(0.9)",
          }}
        />
      ) : null}

      {/* Tier-accent radial glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(120% 90% at 85% -10%, ${accent}33, transparent 55%)`,
        }}
      />
      {/* Left scrim keeps the text crisp over the icon */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "linear-gradient(90deg, #0a0a0b 0%, rgba(10,10,11,0.86) 42%, rgba(10,10,11,0.45) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "76px 80px 120px",
          position: "relative",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "SpaceMono",
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase" as const,
            color: accent,
            marginBottom: 18,
          }}
        >
          {`Summoner · ${region.toUpperCase()}`}
        </div>

        {/* Name + tag */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "Anton",
            fontSize: 104,
            lineHeight: 0.9,
            letterSpacing: -1,
            color: "#f4f1e8",
            maxWidth: 1000,
          }}
        >
          <span>{gameName}</span>
          <span style={{ color: "#857f74", fontSize: 56, marginLeft: 14 }}>
            {`#${tagLine}`}
          </span>
        </div>

        {/* Rank row: emblem + tier/LP + win rate */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 30,
          }}
        >
          {tier ? (
            // The Community Dragon emblem PNG has the crest centered in a
            // 1280x720 frame with huge transparent padding, so it renders
            // tiny at face size. Crop to the crest via an overflow window
            // holding an oversized, centered image.
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 150,
                height: 124,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={emblemUrl(tier)} alt="" width={744} height={419} />
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: "Anton",
                fontSize: 64,
                lineHeight: 1,
                letterSpacing: -0.5,
                color: accent,
              }}
            >
              <span style={{ lineHeight: 1 }}>{rankLabel}</span>
              {lp ? (
                <span
                  style={{
                    color: "#f4f1e8",
                    fontSize: 38,
                    lineHeight: 1,
                    marginLeft: 18,
                    marginTop: 22,
                  }}
                >
                  {lp}
                </span>
              ) : null}
            </div>
            {soloWr !== null ? (
              <div
                style={{
                  fontFamily: "SpaceGrotesk",
                  fontSize: 28,
                  color: "#cfc8b8",
                  marginTop: 6,
                }}
              >
                {`${soloWr}% win rate · ${solo!.wins}W ${solo!.losses}L`}
              </div>
            ) : null}
          </div>
        </div>

        {/* Top champions */}
        {topChamps.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", marginTop: 30 }}>
            {topChamps.map((c) => (
              <div
                key={c.champ}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 30,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ddragonImg.champion(version, `${c.champ}.png`)}
                  alt=""
                  width={64}
                  height={64}
                  style={{ border: "1px solid #3a3640" }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "SpaceGrotesk",
                      fontSize: 24,
                      color: "#f4f1e8",
                    }}
                  >
                    {`${c.wr}% WR`}
                  </span>
                  <span
                    style={{
                      fontFamily: "SpaceMono",
                      fontSize: 16,
                      letterSpacing: 1,
                      textTransform: "uppercase" as const,
                      color: "#857f74",
                    }}
                  >
                    {`${c.games} games`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* RYOT wordmark (brand anchor, top-right) */}
      <div
        style={{
          position: "absolute",
          top: 52,
          right: 80,
          display: "flex",
          fontFamily: "Anton",
          fontSize: 44,
          letterSpacing: -1,
        }}
      >
        <span style={{ color: "#c8aa6e" }}>RY</span>
        <span style={{ color: "#f4f1e8" }}>OT</span>
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
      {/* Tier-accent bar */}
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
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
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
      ],
    },
  );
}
