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
};

export const hasApiKey = config.riotApiKey.length > 0;
