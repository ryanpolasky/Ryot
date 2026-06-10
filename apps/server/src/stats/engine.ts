/**
 * Public facade for Ryot's build/meta engine.
 *
 * buildService / metaService import their data exclusively from here. The shape
 * returned matches what they already parse, so swapping the source (our Riot
 * crawl, formerly a third-party scrape) needed no rewrite of those parsers.
 *
 * Until a non-empty snapshot exists, every read throws a 503 so the API reports
 * a clean "coming soon" instead of empty/half-built results.
 */
import { config } from "../config.js";
import { ServiceError } from "../services/riotService.js";
import { startCrawler } from "./crawler.js";
import * as store from "./store.js";
import type { MatchupData, OverviewData } from "./types.js";

export type { MatchupData, OverviewData } from "./types.js";
export type { StatsInfo } from "./store.js";

export const COMING_SOON =
  "Ryot's build & meta engine is being rebuilt from scratch — proprietary data system coming soon.";

/** True once the engine has a non-empty snapshot to serve. */
export function statsReady(): boolean {
  return store.ready();
}

/** Throw a clean 503 when there's nothing to serve yet. */
export function assertStatsReady(): void {
  if (!store.ready()) throw new ServiceError(503, COMING_SOON);
}

export async function fetchOverview(champId: string): Promise<OverviewData> {
  assertStatsReady();
  return store.getOverview(champId) ?? {};
}

export async function fetchAramOverview(champId: string): Promise<OverviewData> {
  assertStatsReady();
  return store.getAram(champId) ?? {};
}

export async function fetchMatchups(champId: string): Promise<MatchupData> {
  assertStatsReady();
  return store.getMatchups(champId) ?? {};
}

export function getStatsInfo() {
  return store.getInfo();
}

/** Load any persisted snapshot and, if enabled, start the background crawler. */
export async function startStatsEngine(): Promise<void> {
  await store.loadSnapshot();
  if (config.stats.crawlEnabled) {
    console.info("[stats] crawl enabled; starting engine");
    startCrawler();
  } else {
    console.info(
      "[stats] crawl disabled — set STATS_CRAWL_ENABLED=true once a production Riot key is in place",
    );
  }
}
