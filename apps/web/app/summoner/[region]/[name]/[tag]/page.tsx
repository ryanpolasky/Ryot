import { Suspense } from "react";
import { ddragonImg } from "@lc/shared";
import { ApiError, getChampions, getMatches, getProfile } from "@/lib/api";
import { findQueue } from "@/lib/format";
import RankCard from "@/components/RankCard";
import MatchHistory from "@/components/MatchHistory";
import SearchBar from "@/components/SearchBar";
import AccountStats from "@/components/AccountStats";
import SessionTracker from "@/components/SessionTracker";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = { region: string; name: string; tag: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region, name, tag } = await params;
  const gameName = decodeURIComponent(name);
  const tagLine = decodeURIComponent(tag);
  const riotId = `${gameName}#${tagLine}`;
  const ogUrl = `/api/og/summoner/${region}/${encodeURIComponent(
    gameName,
  )}/${encodeURIComponent(tagLine)}`;
  const title = `${riotId} · Ryot`;
  const description = `Rank, win rate, top champions & recent matches for ${riotId} (${region.toUpperCase()}).`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        { url: ogUrl, width: 1200, height: 630, alt: `${riotId} on Ryot` },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [ogUrl],
    },
  };
}

export default async function SummonerPage({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  const { region, name, tag } = await params;
  const gameName = decodeURIComponent(name);
  const tagLine = decodeURIComponent(tag);

  let profile;
  try {
    profile = await getProfile(region, gameName, tagLine);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const notFound = status === 404;
    const rateLimited = status === 429;
    const message = notFound
      ? "Double-check the name and #tag, and the region you searched. Riot IDs are case-insensitive but the tag matters."
      : rateLimited
        ? "We're being rate-limited right now. Try again in a moment, or add your own key in Settings to skip the shared limit."
        : err instanceof ApiError
          ? err.message
          : "Something went wrong on our end. Try again in a moment.";
    return (
      <div>
        <SearchBar
          defaultRegion={region}
          initialQuery={`${gameName}#${tagLine}`}
        />
        <div className="card mt-6 flex flex-col items-center p-8 text-center">
          <div className="font-display text-2xl uppercase tracking-tightest text-loss">
            {notFound ? "No summoner" : "Couldn't load"} &ldquo;{gameName}#
            {tagLine}&rdquo;
          </div>
          <p className="mt-2 max-w-md text-sm text-muted">{message}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="btn-outline">
              ← New search
            </Link>
            <Link href="/settings" className="btn-ghost">
              Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const version = profile.version;

  const solo = findQueue(profile.ranked, "RANKED_SOLO_5x5");
  const flex = findQueue(profile.ranked, "RANKED_FLEX_SR");

  return (
    <div className="animate-riseIn space-y-6">
      <SearchBar
        defaultRegion={region}
        initialQuery={`${gameName}#${tagLine}`}
      />

      <div className="card card-hover flex flex-wrap items-center gap-4 p-4">
        <img
          src={ddragonImg.profileIcon(version, profile.summoner.profileIconId)}
          alt={`${gameName} profile icon`}
          width={72}
          height={72}
          className="shrink-0 border border-gold/40"
        />
        <div className="min-w-0">
          <div className="font-display text-3xl uppercase leading-none tracking-tightest break-words sm:text-4xl">
            {profile.account.gameName}
            <span className="text-faint"> #{profile.account.tagLine}</span>
          </div>
          <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Level{" "}
            <span className="stat text-bone">
              {profile.summoner.summonerLevel}
            </span>{" "}
            · {region.toUpperCase()}
          </div>
        </div>
        <Link
          href={`/live/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`}
          className="btn-outline ml-auto"
        >
          Live Game ▸
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <RankCard entry={solo} queueType="RANKED_SOLO_5x5" />
        <RankCard entry={flex} queueType="RANKED_FLEX_SR" />
      </div>

      <AccountStats
        region={region}
        name={gameName}
        tag={tagLine}
        version={version}
      />

      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesSection
          region={region}
          name={gameName}
          tag={tagLine}
          puuid={profile.account.puuid}
          version={version}
        />
      </Suspense>
    </div>
  );
}

async function MatchesSection({
  region,
  name,
  tag,
  puuid,
  version,
}: {
  region: string;
  name: string;
  tag: string;
  puuid: string;
  version: string;
}) {
  const [matchesResult, championsResult] = await Promise.all([
    getMatches(region, puuid, 20).catch(() => ({ version, matches: [] })),
    getChampions().catch(() => ({ version, champions: [] })),
  ]);
  return (
    <>
      <MatchHistory
        region={region}
        name={name}
        tag={tag}
        puuid={puuid}
        version={version}
        champions={championsResult.champions}
        initial={matchesResult.matches}
      />
      <SessionTracker
        matches={matchesResult.matches}
        focusPuuid={puuid}
        version={version}
      />
    </>
  );
}

function MatchesSkeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton mb-3 h-2.5 w-36" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-[84px] w-full" />
      ))}
    </div>
  );
}
