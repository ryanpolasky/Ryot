/**
 * Single source of truth for u.gg data, shared by buildService and metaService.
 *
 * Each fetch is cache-first, then dataset-first, then (optionally) live u.gg:
 *   1. in-memory TTL cache (warm path)
 *   2. the weekly pre-crawled dataset (uggDataset.ts) — works on blocked IPs
 *   3. live scrape of u.gg's CDN (only if enabled and the dataset lacks it)
 *
 * Keeping the cache keys identical to the old call sites means every consumer
 * (builds, tier list, meta board, matchups, role distribution, ARAM) is served
 * from the dataset transparently.
 */
import { cache } from "./cache.js";
import { config } from "./config.js";
import { getVersion } from "./ddragonStore.js";
import * as dataset from "./uggDataset.js";
import { UggFetchError, fetchUgg } from "./uggFetch.js";

export type OverviewData = dataset.OverviewData;
export type MatchupData = dataset.MatchupData;

const UGG_BASE = "https://stats2.u.gg/lol/1.5";
const UGG_API_VERSION = "1.5.0";
const UGG_REGION_WORLD = "12";

async function patchString(): Promise<string> {
  const v = await getVersion();
  return v.split(".").slice(0, 2).join("_"); // "16.11.1" -> "16_11"
}

function liveDisabled(label: string): never {
  throw new UggFetchError(
    `u.gg ${label}: not in dataset and live fallback is disabled`,
  );
}

/** SR ranked solo/duo overview (per rank, per role). */
export async function fetchOverview(champId: string): Promise<OverviewData> {
  const patch = await patchString();
  return cache.wrap(`ugg:overview:${patch}:${champId}`, 1800, async () => {
    const ds = await dataset.getOverview(champId);
    if (ds) return ds;
    if (!config.ugg.liveFallback) return liveDisabled(`overview ${champId}`);
    const url = `${UGG_BASE}/overview/${patch}/ranked_solo_5x5/${champId}/${UGG_API_VERSION}.json`;
    return fetchUgg<OverviewData>(url, UGG_REGION_WORLD, `overview ${champId}`);
  });
}

/**
 * ARAM overview (Howling Abyss, queue 450). u.gg serves it under `normal_aram`
 * with a single rank bucket ("8" = overall) and a single "role" key ("6").
 */
export async function fetchAramOverview(
  champId: string,
): Promise<OverviewData> {
  const patch = await patchString();
  return cache.wrap(`ugg:aram:${patch}:${champId}`, 1800, async () => {
    const ds = await dataset.getAram(champId);
    if (ds) return ds;
    if (!config.ugg.liveFallback) return liveDisabled(`aram ${champId}`);
    const url = `${UGG_BASE}/overview/${patch}/normal_aram/${champId}/${UGG_API_VERSION}.json`;
    // u.gg rate-limits bursts (429); retry a few times with backoff so a full
    // tier-list pass still completes.
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await fetchUgg<OverviewData>(
          url,
          UGG_REGION_WORLD,
          `aram ${champId}`,
        );
      } catch (err) {
        lastErr = err as Error;
        if (!lastErr.message.includes("429")) break;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    throw lastErr ?? new Error(`u.gg aram failed`);
  });
}

/** Per-champion lane matchups (per rank, per role). */
export async function fetchMatchups(champId: string): Promise<MatchupData> {
  const patch = await patchString();
  return cache.wrap(`ugg:matchups:${patch}:${champId}`, 1800, async () => {
    const ds = await dataset.getMatchups(champId);
    if (ds) return ds;
    if (!config.ugg.liveFallback) return liveDisabled(`matchups ${champId}`);
    const url = `${UGG_BASE}/matchups/${patch}/ranked_solo_5x5/${champId}/${UGG_API_VERSION}.json`;
    return fetchUgg<MatchupData>(url, UGG_REGION_WORLD, `matchups ${champId}`);
  });
}
