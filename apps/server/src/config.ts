import dotenv from "dotenv";
import { resolve } from "node:path";

// Load .env from the repo root (two levels up from apps/server) and local.
dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config();

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return ["1", "true", "yes"].includes(v.trim().toLowerCase());
}

export const config = {
  riotApiKey: process.env.RIOT_API_KEY ?? "",
  defaultRegion: process.env.DEFAULT_REGION ?? "na1",
  port: num("PORT", 4000),
  // Trust X-Forwarded-For only when explicitly enabled (i.e. you run behind a
  // trusted reverse proxy). Default off: the shipped compose exposes the API
  // directly, where trusting the header would let clients spoof their IP to
  // bypass (or fully exempt themselves from) the rate limiter.
  trustProxy: ["1", "true", "yes"].includes(
    (process.env.TRUST_PROXY ?? "").trim().toLowerCase(),
  ),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  cacheTtl: {
    summoner: num("CACHE_TTL_SUMMONER", 300),
    match: num("CACHE_TTL_MATCH", 86400),
    spectator: num("CACHE_TTL_SPECTATOR", 20),
    ddragon: num("CACHE_TTL_DDRAGON", 3600),
  },
  stats: {
    // Ryot's own build/meta engine: aggregates builds, tier lists, and matchups
    // from Riot's Match-V5 API instead of scraping a third party. Disabled until
    // a production Riot key is in place — while off, the crawler never runs and
    // build/meta endpoints report "coming soon".
    crawlEnabled: bool("STATS_CRAWL_ENABLED", false),
    // Platforms whose ladders seed the crawl (comma-separated).
    crawlPlatforms: (process.env.STATS_CRAWL_PLATFORMS ?? "na1,euw1,kr")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    // Seed depth: "apex" = challenger+grandmaster+master only; "all" also pages
    // league-exp for lower tiers (far more calls, enables rank buckets).
    crawlScope: (process.env.STATS_CRAWL_SCOPE ?? "apex").trim().toLowerCase(),
    // Recent ranked matches pulled per seeded player each cycle.
    matchesPerPlayer: num("STATS_MATCHES_PER_PLAYER", 15),
    // Minutes between crawl cycles. 0 disables the periodic loop (one-shot only).
    cycleIntervalMs: num("STATS_CYCLE_INTERVAL_MIN", 360) * 60_000,
    // Where the aggregated snapshot (gzipped JSON) is persisted, relative to cwd.
    snapshotPath:
      process.env.STATS_SNAPSHOT_PATH ?? "data/stats-snapshot.json.gz",
  },
};

export const hasApiKey = config.riotApiKey.length > 0;
