import ChampionSearch from "@/components/ChampionSearch";
import ImportToLeague from "@/components/ImportToLeague";
import ItemTooltip from "@/components/ItemTooltip";
import ThemeWithChampion from "@/components/ThemeWithChampion";
import {
  accentFromSplash,
  BONE,
  hexToRgbChannels,
  mixHex,
  resolveChampionId,
  splashArtUrl,
  splashUrl,
} from "@/lib/accent";
import { ApiError, getBuild, type RecommendedBuildResult } from "@/lib/api";
import type { Metadata, Viewport } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";
import BuildClient from "./BuildClient";

interface Props {
  params: Promise<{ champion: string }>;
  searchParams: Promise<{ role?: string; rank?: string }>;
}

// canonical champion id from a build's square-icon url
function championIdFromIcon(iconUrl: string): string {
  return iconUrl.split("/").pop()?.replace(/\.png$/, "") ?? "Aatrox";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { champion } = await params;
  const name = decodeURIComponent(champion);
  const ogUrl = `/api/og/${encodeURIComponent(name)}`;
  return {
    title: `${name} Build · Ryot`,
    description: `Best ${name} runes, items, skill order & counters. Updated every patch.`,
    openGraph: {
      title: `${name} Build · Ryot`,
      description: `Best ${name} runes, items, skill order & counters.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${name} build on Ryot` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} Build · Ryot`,
      images: [ogUrl],
    },
  };
}

// Tint the mobile browser chrome (iOS/Android URL bar) to the champion's accent.
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { champion } = await params;
  const id = await resolveChampionId(decodeURIComponent(champion));
  const accent = await accentFromSplash(splashUrl(id));
  return { themeColor: accent };
}

export default async function BuildPage({ params, searchParams }: Props) {
  const { champion } = await params;
  const { role, rank } = await searchParams;

  let build: RecommendedBuildResult;
  try {
    build = await getBuild(decodeURIComponent(champion), role, rank);
  } catch (err) {
    const name = decodeURIComponent(champion);
    const notFound = err instanceof ApiError && err.status === 404;
    const comingSoon = err instanceof ApiError && err.status === 503;
    return (
      <div className="animate-riseIn space-y-6">
        <ChampionSearch />
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <p
            className={`font-display text-2xl uppercase tracking-tightest ${
              comingSoon ? "text-gold" : "text-loss"
            }`}
          >
            {comingSoon ? (
              "Builds — coming soon"
            ) : (
              <>
                {notFound ? "No champion called" : "Couldn't load"} &ldquo;{name}
                &rdquo;
              </>
            )}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted">
            {comingSoon
              ? "Ryot is building its own proprietary build engine from Riot match data. Champion builds will be back shortly."
              : notFound
                ? "Check the spelling, or search for a champion above. Try names like Jinx, Lee Sin, or Aatrox."
                : "A data source may be rate-limiting us right now. Try again in a moment."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/build" className="btn-outline">
              Browse builds
            </Link>
            <Link href="/tier-list" className="btn-outline">
              Tier list
            </Link>
            <Link href="/" className="btn-ghost">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const champId = championIdFromIcon(build.championIcon);
  // Hi-res centered art for display (hero + site theme); accent decodes the
  // smaller Data Dragon splash to keep it cheap.
  const splash = splashArtUrl(champId);
  const accent = await accentFromSplash(splashUrl(champId));
  const accentCh = hexToRgbChannels(accent);
  // Lighter variant for the gold2 hover token, mixed toward bone.
  const accent2Ch = hexToRgbChannels(mixHex(accent, BONE, 0.35));
  // retint gold accents for this subtree to the champ color
  const themeVars = {
    "--gold-rgb": accentCh,
    "--gold-2-rgb": accent2Ch,
  } as CSSProperties;

  return (
    <div className="animate-riseIn space-y-6" style={themeVars}>
      {/* Champion search */}
      <ChampionSearch current={build.champion} />

      {/* Header: champion splash hero, accent-washed to match the share card */}
      <div className="card card-hover relative isolate flex flex-wrap items-center gap-4 overflow-hidden p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={splash}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-top opacity-30"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(90deg, var(--surface) 12%, rgba(16,15,18,0.72) 45%, rgba(16,15,18,0.30) 100%), radial-gradient(60% 120% at 0% 50%, rgb(${accentCh} / 0.16), transparent 60%)`,
          }}
        />
        <Image
          src={build.championIcon}
          alt={build.champion}
          width={72}
          height={72}
          className="border border-gold/60"
          unoptimized
        />
        <div>
          <h1 className="font-display text-4xl uppercase leading-none tracking-tightest">{build.champion}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="chip">{build.role}</span>
            <span className="chip">{build.rank}</span>
            <span className="chip">Patch {build.patch}</span>
            <span
              className="chip border-transparent font-bold text-ink"
              style={{ background: build.winRate >= 50 ? "#4d8df0" : "#ff4d4d" }}
            >
              {build.winRate}% WR
            </span>
            <span className="stat text-[11px] text-faint">{build.games.toLocaleString()} games</span>
          </p>
        </div>
        <ThemeWithChampion
          id={champId}
          name={build.champion}
          accent={accentCh}
          accent2={accent2Ch}
          splash={splash}
        />
      </div>

      {/* Role + rank selector (client component) */}
      <BuildClient
        champion={decodeURIComponent(champion)}
        currentRole={build.role}
        currentRank={build.rank}
        availableRoles={build.availableRoles}
      />

      {/* Desktop-only: import the build's runes/spells into the League client */}
      <ImportToLeague
        champion={build.champion}
        role={build.role}
        primaryStyleId={build.runes.primaryStyle.id}
        subStyleId={build.runes.secondaryStyle.id}
        perkIds={build.runes.perkIds}
        spell1Id={build.summoners[0]?.id}
        spell2Id={build.summoners[1]?.id}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Runes */}
        <section className="card p-4">
          <h2 className="kicker mb-3">Runes</h2>
          <div className="flex gap-6">
            {/* Primary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <img src={build.runes.primaryStyle.icon} alt="" className="h-5 w-5" />
                {build.runes.primaryStyle.name}
              </div>
              <div className="flex items-center gap-2">
                <img src={build.runes.keystone.icon} alt="" className="h-8 w-8" />
                <span className="text-sm font-medium">{build.runes.keystone.name}</span>
              </div>
              {build.runes.primaryPerks.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <img src={p.icon} alt="" className="h-6 w-6" />
                  <span className="text-xs text-muted">{p.name}</span>
                </div>
              ))}
            </div>
            {/* Secondary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <img src={build.runes.secondaryStyle.icon} alt="" className="h-5 w-5" />
                {build.runes.secondaryStyle.name}
              </div>
              {build.runes.secondaryPerks.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <img src={p.icon} alt="" className="h-6 w-6" />
                  <span className="text-xs text-muted">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Shards */}
          <div className="mt-3 flex flex-wrap gap-2">
            {build.runes.shards.map((s, i) => (
              <span key={i} className="chip">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Summoner Spells + Skill Order */}
        <section className="card p-4">
          <h2 className="kicker mb-3">Spells &amp; Skills</h2>
          <div className="mb-4 flex gap-3">
            {build.summoners.map((sp) => (
              <div key={sp.id} className="flex items-center gap-2">
                {sp.icon && (
                  <img src={sp.icon} alt="" className="h-8 w-8 border border-line" />
                )}
                <span className="text-sm">{sp.name}</span>
              </div>
            ))}
          </div>
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            Skill Priority:{" "}
            <span className="font-bold text-gold">
              {build.skillPriority.split("").join(" → ")}
            </span>
          </h3>
          <div className="flex flex-wrap gap-1">
            {build.skillOrder.map((s, i) => (
              <span
                key={i}
                className={`flex h-6 w-6 items-center justify-center text-xs font-bold ${
                  s === "R"
                    ? "bg-gold/25 text-gold"
                    : s === "Q"
                      ? "bg-blue-900/50 text-blue-300"
                      : s === "W"
                        ? "bg-green-900/50 text-green-300"
                        : "bg-purple-900/50 text-purple-300"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">Levels 1-18</p>
        </section>
      </div>

      {/* Items */}
      <section className="card p-4">
        <h2 className="kicker mb-3">Recommended Build</h2>

        <div className="space-y-4">
          {/* Starting */}
          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">Starting Items</h3>
            <div className="flex gap-2">
              {build.startingItems.map((it, i) => (
                <ItemSlot key={`start-${i}-${it.id}`} item={it} />
              ))}
            </div>
          </div>

          {/* Core */}
          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">Core Build</h3>
            <div className="flex items-center gap-1">
              {build.coreItems.map((it, i) => (
                <span key={`core-${i}-${it.id}`} className="flex items-center gap-1">
                  {i > 0 && <span className="text-faint">→</span>}
                  <ItemSlot item={it} />
                </span>
              ))}
            </div>
          </div>

          {/* Options */}
          {build.itemOptions.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                Situational Items
              </h3>
              <div className="flex flex-wrap gap-4">
                {build.itemOptions.map((group, gi) => (
                  <div key={gi} className="flex gap-2">
                    {group.slice(0, 4).map((opt, oi) => (
                      <div key={`opt-${gi}-${oi}-${opt.item.id}`} className="text-center">
                        <ItemSlot item={opt.item} winRate={opt.winRate} />
                        <p className="stat mt-1 text-[10px] text-faint">
                          {opt.winRate}% <span className="text-faint/70">WR</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-faint">
        Build data aggregated from Riot match data. Not endorsed by Riot Games.
      </p>
    </div>
  );
}

function ItemSlot({
  item,
  winRate,
}: {
  item: { id: number; name: string; description?: string; gold?: number | null; icon: string | null };
  winRate?: number;
}) {
  const inner = item.icon ? (
    <img
      src={item.icon}
      alt={item.name}
      className="h-10 w-10 border border-line transition group-hover:border-gold"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center border border-line bg-surface2 text-[8px] text-faint">
      {item.id}
    </div>
  );

  return (
    <div className="group relative">
      <ItemTooltip name={item.name} description={item.description} gold={item.gold} winRate={winRate}>
        {inner}
      </ItemTooltip>
    </div>
  );
}
