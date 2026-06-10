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
  ugg: {
    // Pre-crawled u.gg dataset (builds/tier/meta/matchups), refreshed weekly by
    // a GitHub Action running from a clean IP. The server reads this instead of
    // hitting u.gg directly, so it works even when this host's IP is blocked.
    // A local file path (UGG_DATASET_PATH) takes precedence over the URL.
    datasetUrl:
      process.env.UGG_DATASET_URL ??
      "https://github.com/ryanpolasky/Ryot/releases/download/dataset/ugg-dataset.json.gz",
    datasetPath: process.env.UGG_DATASET_PATH ?? "",
    // How often to re-download the dataset (minutes). 0 disables auto-refresh.
    datasetRefreshMs: num("UGG_DATASET_REFRESH_MIN", 360) * 60_000,
    // Fall back to scraping u.gg live when the dataset lacks a champion or fails
    // to load. Keep on for hosts with a clean IP; harmless (just 403s) otherwise.
    liveFallback: bool("UGG_LIVE_FALLBACK", true),
  },
};

export const hasApiKey = config.riotApiKey.length > 0;
