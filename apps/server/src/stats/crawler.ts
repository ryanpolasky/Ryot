/**
 * Crawl orchestrator: seed ladders -> discover recent matches -> dedupe -> fetch
 * -> aggregate -> persist a snapshot.
 *
 * Gated by config.stats.crawlEnabled (off until a production key is in place).
 * Uses the shared client-side limiter for now; a dedicated, higher-throughput
 * limiter on the production key is a TODO so the crawl doesn't compete with live
 * user traffic.
 */
import { RiotClient, isPlatform, type Platform } from "@lc/shared";
import { config } from "../config.js";
import { getVersion } from "../ddragonStore.js";
import { limiter } from "../ratelimit.js";
import { Aggregator } from "./aggregate.js";
import { seedPlayers } from "./seed.js";
import { saveSnapshot } from "./store.js";
import { QUEUE_ARAM, QUEUE_RANKED_SOLO } from "./types.js";

let client: RiotClient | null = null;
function riot(): RiotClient {
  if (!client) client = new RiotClient({ apiKey: config.riotApiKey });
  return client;
}

let running = false;

/** Run one full crawl + aggregate + persist pass. Safe to call concurrently
 * (later calls no-op while one is in flight). */
export async function runCrawlCycle(): Promise<void> {
  if (running) {
    console.warn("[stats] crawl already running; skipping this trigger");
    return;
  }
  if (!config.riotApiKey) {
    console.warn("[stats] no RIOT_API_KEY; crawl skipped");
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const version = await getVersion();
    const patch = version.split(".").slice(0, 2).join("_");
    const agg = new Aggregator();
    const seen = new Set<string>();

    const platforms = config.stats.crawlPlatforms.filter((p): p is Platform =>
      isPlatform(p),
    );

    for (const platform of platforms) {
      const players = await seedPlayers(riot(), platform);
      console.info(`[stats] ${platform}: ${players.length} seed players`);

      for (const player of players) {
        // Ranked solo matches -> SR overview + matchups, bucketed by seed rank.
        await ingestQueue(
          platform,
          player.puuid,
          QUEUE_RANKED_SOLO,
          config.stats.matchesPerPlayer,
          seen,
          (match) => agg.ingestSR(match, player.rankBuckets),
        );
        // A smaller ARAM sample -> ARAM tier list (no rank buckets).
        await ingestQueue(
          platform,
          player.puuid,
          QUEUE_ARAM,
          5,
          seen,
          (match) => agg.ingestAram(match),
        );
      }
    }

    const snapshot = agg.toSnapshot(version, patch);
    if (snapshot.matches > 0) {
      await saveSnapshot(snapshot);
    } else {
      console.warn("[stats] crawl produced 0 matches; keeping previous snapshot");
    }
    const secs = ((Date.now() - startedAt) / 1000).toFixed(0);
    console.info(
      `[stats] crawl cycle done in ${secs}s — ${snapshot.matches} matches, ` +
        `${Object.keys(snapshot.overview).length} champions`,
    );
  } catch (err) {
    console.error(`[stats] crawl cycle failed: ${(err as Error).message}`);
  } finally {
    running = false;
  }
}

async function ingestQueue(
  platform: Platform,
  puuid: string,
  queue: number,
  count: number,
  seen: Set<string>,
  ingest: (match: Awaited<ReturnType<RiotClient["getMatch"]>>) => void,
): Promise<void> {
  let ids: string[];
  try {
    ids = await limiter.schedule(() =>
      riot().getMatchIdsByPuuid(platform, puuid, { count, queue }),
    );
  } catch {
    return;
  }
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      const match = await limiter.schedule(() => riot().getMatch(platform, id));
      if (match.info.queueId === queue) ingest(match);
    } catch {
      // Skip a single unreadable match; the cycle continues.
    }
  }
}

/** Kick off an initial cycle and schedule periodic refreshes. */
export function startCrawler(): void {
  void runCrawlCycle();
  const ms = config.stats.cycleIntervalMs;
  if (ms > 0) {
    const timer = setInterval(() => void runCrawlCycle(), ms);
    timer.unref?.();
  }
}
