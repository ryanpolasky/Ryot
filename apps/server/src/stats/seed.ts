/**
 * Ladder seeding: turn a platform's ranked ladder into a pool of puuids to crawl.
 *
 * Match-V5 doesn't expose each participant's rank, so we bucket a match by the
 * rank of the seed player it came from. Apex players seed the high-elo buckets
 * plus the always-present "overall" ("8"). Lower tiers (league-exp) are a TODO
 * gated behind crawlScope === "all".
 */
import type { ApexTier, Platform, RiotClient } from "@lc/shared";
import { limiter } from "../ratelimit.js";
import { RANK_BUCKET_FROM_TIER, OVERALL_RANK } from "./types.js";

export interface SeedPlayer {
  puuid: string;
  /** Rank buckets this player's matches contribute to. */
  rankBuckets: string[];
}

const APEX: Array<{ tier: ApexTier; key: keyof typeof RANK_BUCKET_FROM_TIER }> = [
  { tier: "challenger", key: "CHALLENGER" },
  { tier: "grandmaster", key: "GRANDMASTER" },
  { tier: "master", key: "MASTER" },
];

/** Master+ bucket aggregates challenger + grandmaster + master. */
const MASTER_PLUS = RANK_BUCKET_FROM_TIER.MASTER ?? "14";

export async function seedPlayers(
  client: RiotClient,
  platform: Platform,
): Promise<SeedPlayer[]> {
  const buckets = new Map<string, Set<string>>(); // puuid -> rank buckets

  for (const { tier, key } of APEX) {
    const bucket = RANK_BUCKET_FROM_TIER[key];
    if (!bucket) continue;
    try {
      const list = await limiter.schedule(() =>
        client.getApexLeague(platform, tier),
      );
      for (const e of list.entries) {
        if (!e.puuid) continue;
        const set = buckets.get(e.puuid) ?? new Set<string>();
        set.add(OVERALL_RANK); // everyone counts toward "overall"
        set.add(bucket); // tier-specific bucket
        set.add(MASTER_PLUS); // apex ⊂ master+
        buckets.set(e.puuid, set);
      }
    } catch (err) {
      console.warn(
        `[stats] seed ${platform} ${tier} failed: ${(err as Error).message}`,
      );
    }
  }

  // TODO(crawlScope === "all"): page league-exp-v4 for EMERALD..DIAMOND etc. to
  // populate the "17"/"11"/"10" rank buckets once a production key can afford it.

  return [...buckets.entries()].map(([puuid, set]) => ({
    puuid,
    rankBuckets: [...set],
  }));
}
