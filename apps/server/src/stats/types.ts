/**
 * Shared types + constants for Ryot's self-aggregated build/meta engine.
 *
 * The engine crawls Riot Match-V5, rolls matches up into per-(rank, role, champ)
 * counters, and exports a snapshot in the SAME block shape the build/meta
 * services already parse. Keeping that shape means buildService / metaService
 * need no rewrite — only their data *source* changes (our crawl, not a scrape).
 */

/**
 * SR overview bucket, served per champion:
 *   rank -> role -> [blocks, timestamp]
 * where `blocks` is the positional array the build service reads:
 *   [0] runes   [matches, wins, primaryStyleId, secondaryStyleId, perkIds[]]
 *   [1] spells  [matches, wins, [s1, s2]]
 *   [2] start   [matches, wins, itemIds[]]
 *   [3] core    [matches, wins, [i1, i2, i3]]
 *   [4] skills  [matches, wins, levelSeq[], "QEW"]
 *   [5] items   groups of [itemId, wins, games]
 *   [6] record  [wins, games]
 *   [8] shards  [matches, wins, shardIds[]]
 */
export type OverviewData = Record<string, Record<string, [unknown[], string]>>;

/** Matchup bucket: rank -> role -> rows of [oppChampId, wins, games]. */
export type MatchupData = Record<string, Record<string, number[][]>>;

/** The persisted, served artifact. Small (a few MB gzipped) by design. */
export interface DatasetSnapshot {
  /** Data Dragon version the crawl ran against, e.g. "16.11.1". */
  version: string;
  /** Patch tag in compact form, e.g. "16_11". */
  patch: string;
  /** ISO timestamp the snapshot was built. */
  builtAt: string;
  /** Total matches aggregated into this snapshot. */
  matches: number;
  /** champId -> SR overview. */
  overview: Record<string, OverviewData>;
  /** champId -> ARAM overview (single rank "8", role "6"). */
  aram: Record<string, OverviewData>;
  /** champId -> matchups. */
  matchups: Record<string, MatchupData>;
}

/** Riot teamPosition -> the role ids the build/meta services expect. */
export const ROLE_FROM_POSITION: Record<string, string> = {
  TOP: "4",
  JUNGLE: "1",
  MIDDLE: "5",
  BOTTOM: "3",
  UTILITY: "2",
};

/** ARAM is served as a single rank "8" / role "6" bucket. */
export const ARAM_RANK = "8";
export const ARAM_ROLE = "6";

/** The "all ranks" overview bucket every snapshot always contains. */
export const OVERALL_RANK = "8";

/**
 * Apex Riot tiers -> the extra rank buckets we expose beyond "overall".
 * (Lower tiers via league-exp would add "17"/"11"/"10"; not seeded yet.)
 */
export const RANK_BUCKET_FROM_TIER: Record<string, string> = {
  CHALLENGER: "1",
  GRANDMASTER: "13",
  MASTER: "14",
};

/** Ranked Solo/Duo queue id (match-v5). */
export const QUEUE_RANKED_SOLO = 420;
/** ARAM queue id. */
export const QUEUE_ARAM = 450;
