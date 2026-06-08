import cors from "@fastify/cors";
import etag from "@fastify/etag";
import rateLimit from "@fastify/rate-limit";
import { fetchItems, isPlatform } from "@lc/shared";
import Fastify from "fastify";
import { cache } from "./cache.js";
import { config, hasApiKey } from "./config.js";
import { isLoopbackOrPrivate } from "./net.js";
import { getChampionMap, getVersion } from "./ddragonStore.js";
import { getRecommendedBuild } from "./services/buildService.js";
import { getUggHealth } from "./uggHealth.js";
import {
  getChampionMatchups,
  getMetaBoard,
  getTierList,
  getAramTierList,
  predictLanes,
  getRoleDistribution,
} from "./services/metaService.js";
import {
  getAccountStats,
  getLiveGame,
  getMatches,
  getMatchTimeline,
  getProfile,
  probeSharedKey,
  ServiceError,
} from "./services/riotService.js";

const app = Fastify({
  logger: { level: "info" },
  trustProxy: config.trustProxy,
});

await app.register(cors, {
  // Allow the configured web origins, plus the Electron overlay which loads
  // from a file:// page and therefore sends `Origin: null` (or no Origin at
  // all for non-CORS requests like curl). All endpoints are read-only proxies.
  origin: (origin, cb) => {
    if (!origin || origin === "null") return cb(null, true);
    if (!config.corsOrigins.length) return cb(null, true);
    return cb(null, config.corsOrigins.includes(origin));
  },
  // Allow the optional BYOK header from the browser.
  allowedHeaders: ["Content-Type", "X-Riot-Key"],
});

// Per-IP rate limit: an abuse ceiling for the public API, whose heaviest
// endpoints fan out to many Riot calls on the shared key. Private/loopback IPs
// (Docker SSR, localhost overlay) are exempt so normal traffic is never limited.
await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
  allowList: (req: import("fastify").FastifyRequest) =>
    isLoopbackOrPrivate(req.ip),
  errorResponseBuilder: (_req, ctx) => ({
    error: `Rate limit exceeded. Try again in ${Math.ceil(ctx.ttl / 1000)}s.`,
  }),
});

// ETag + conditional requests: reply 304 Not Modified when the client already
// holds the current body, saving bandwidth on the polling/static endpoints.
await app.register(etag);

/**
 * Per-route Cache-Control. This API is a read-only proxy, so browsers (and a CDN,
 * for non-user data) can safely reuse responses. Rules match the route pattern in
 * order; first match wins. User-specific data is `private` so it never lands in a
 * shared cache; global data is `public` with stale-while-revalidate.
 */
const CACHE_RULES: Array<{ test: RegExp; value: string }> = [
  { test: /^\/api\/health$/, value: "no-store" },
  // A finished match's timeline never changes.
  {
    test: /^\/api\/timeline\//,
    value: "public, max-age=86400, stale-while-revalidate=604800",
  },
  // Patch-scoped Data Dragon mirrors.
  {
    test: /^\/api\/static\//,
    value: "public, max-age=3600, stale-while-revalidate=86400",
  },
  // Slowly-shifting community aggregates (u.gg-derived).
  {
    test: /^\/api\/(build|matchups|roles|predict-lanes|meta|tier-list|aram\/tier-list)\b/,
    value: "public, max-age=600, stale-while-revalidate=3600",
  },
  // Global status dashboard (already cached 60s server-side).
  { test: /^\/api\/status$/, value: "public, max-age=60" },
  // Live game: very fresh, browser-only.
  { test: /^\/api\/live\//, value: "private, max-age=10" },
  // Per-user data: brief browser cache, never shared caches.
  {
    test: /^\/api\/(profile|matches|account-stats)\//,
    value: "private, max-age=30, stale-while-revalidate=60",
  },
];

app.addHook("onSend", async (req, reply, payload) => {
  if (
    req.method === "GET" &&
    reply.statusCode < 400 &&
    !reply.getHeader("cache-control")
  ) {
    const path = req.routeOptions?.url ?? req.url;
    for (const rule of CACHE_RULES) {
      if (rule.test.test(path)) {
        reply.header("Cache-Control", rule.value);
        break;
      }
    }
  }
  return payload;
});

function badRegion(reply: import("fastify").FastifyReply) {
  return reply
    .code(400)
    .send({ error: "Invalid region. Use a platform like na1, euw1, kr." });
}

/**
 * Pulls an optional Bring-Your-Own-Key from the request header. The key is used
 * for that single request only and never stored or logged.
 */
function byok(req: import("fastify").FastifyRequest): string | undefined {
  const h = req.headers["x-riot-key"];
  const key = (Array.isArray(h) ? h[0] : h)?.trim();
  return key || undefined;
}

function handle(reply: import("fastify").FastifyReply, err: unknown) {
  if (err instanceof ServiceError) {
    return reply.code(err.status).send({ error: err.message });
  }
  app.log.error(err);
  return reply.code(500).send({ error: "Internal error." });
}

app.get("/api/health", async () => ({
  ok: true,
  hasApiKey,
  defaultRegion: config.defaultRegion,
}));

// Public health dashboard data: per-dependency up/down so users can self-diagnose
// (e.g. the shared Riot key dying, or u.gg blocking the scrape). Cached so the
// status page itself never hammers the upstreams.
interface StatusComponent {
  id: string;
  label: string;
  status: "operational" | "degraded" | "down";
  detail: string;
}

app.get("/api/status", async () => {
  return cache.wrap("status:dashboard", 60, async () => {
    const components: StatusComponent[] = [];

    // Data Dragon: the public static CDN that every page depends on for art.
    let ddVersion: string | null = null;
    try {
      ddVersion = await getVersion();
      components.push({
        id: "ddragon",
        label: "Data Dragon (static assets)",
        status: "operational",
        detail: `Patch ${ddVersion}`,
      });
    } catch {
      components.push({
        id: "ddragon",
        label: "Data Dragon (static assets)",
        status: "down",
        detail: "Could not reach Riot's static CDN.",
      });
    }

    const riotHealth = await probeSharedKey();
    components.push({
      id: "riot",
      label: "Riot API (accounts, live game)",
      status: riotHealth.status,
      detail: riotHealth.detail,
    });

    // u.gg health: prefer observed state from real traffic (recorded by
    // uggFetch.ts), fall back to a live probe on cold start.
    const ugg = getUggHealth();
    if (ugg.lastOk !== null || ugg.lastErrorAt !== null) {
      const detail =
        ugg.status === "operational"
          ? "Builds and tier data flowing."
          : ugg.servingStale
            ? `Serving cached data. Last error: ${ugg.lastError}`
            : ugg.status === "degraded"
              ? "u.gg is rate-limiting us; serving cached builds and tier data."
              : `Down: ${ugg.lastError}`;
      components.push({
        id: "ugg",
        label: "u.gg data (builds, tier list)",
        status: ugg.status,
        detail,
      });
    } else {
      // Cold start: no traffic yet, do a cheap probe.
      try {
        const probe = await getRecommendedBuild("Aatrox");
        const ok = (probe.games ?? 0) > 0;
        components.push({
          id: "ugg",
          label: "u.gg data (builds, tier list)",
          status: ok ? "operational" : "degraded",
          detail: ok ? "Builds and tier data flowing." : "Returned no data.",
        });
      } catch {
        components.push({
          id: "ugg",
          label: "u.gg data (builds, tier list)",
          status: "down",
          detail: "Scrape failed or is being rate-limited. Try again shortly.",
        });
      }
    }

    // Severity is honest about what's actually broken. A "major outage" means
    // the app is broadly unusable: Data Dragon down (no champion art anywhere)
    // or every dependency down. A single non-critical dependency down (e.g. the
    // shared Riot key expired, but builds/tier-lists still work and BYOK is a
    // workaround) is a partial outage, not a major one.
    const ddDown =
      components.find((c) => c.id === "ddragon")?.status === "down";
    const allDown = components.every((c) => c.status === "down");
    const anyDown = components.some((c) => c.status === "down");
    const anyDegraded = components.some((c) => c.status === "degraded");
    const overall: StatusComponent["status"] =
      ddDown || allDown
        ? "down"
        : anyDown || anyDegraded
          ? "degraded"
          : "operational";

    return { overall, checkedAt: new Date().toISOString(), components };
  });
});

app.get("/api/static/version", async () => ({ version: await getVersion() }));

app.get("/api/static/champions", async () => {
  const [version, map] = await Promise.all([getVersion(), getChampionMap()]);
  return { version, champions: Object.values(map) };
});

// Compact itemID -> total gold map (used by the overlay to value bought items).
app.get("/api/static/item-costs", async () => {
  const version = await getVersion();
  const items = await fetchItems(version);
  const costs: Record<string, number> = {};
  for (const [id, it] of Object.entries(items)) {
    if (it.gold?.total) costs[id] = it.gold.total;
  }
  return { version, costs };
});

app.get<{ Params: { region: string; name: string; tag: string } }>(
  "/api/profile/:region/:name/:tag",
  async (req, reply) => {
    const { region, name, tag } = req.params;
    if (!isPlatform(region)) return badRegion(reply);
    try {
      return await getProfile(
        region,
        decodeURIComponent(name),
        decodeURIComponent(tag),
        byok(req),
      );
    } catch (err) {
      return handle(reply, err);
    }
  },
);

app.get<{
  Params: { region: string; puuid: string };
  Querystring: {
    start?: string;
    count?: string;
    queue?: string;
    type?: string;
  };
}>("/api/matches/:region/:puuid", async (req, reply) => {
  const { region, puuid } = req.params;
  if (!isPlatform(region)) return badRegion(reply);
  const key = byok(req);
  // BYOK users can page deeper; shared key is capped to protect the quota.
  const maxCount = key ? 100 : 20;
  const start = Math.max(0, Number(req.query.start ?? 0) || 0);
  const count = Math.min(
    maxCount,
    Math.max(1, Number(req.query.count ?? 10) || 10),
  );
  // Optional server-side queue/type filter (match-v5), so deep-history queues
  // like ARAM can be pulled directly. `type` is allow-listed to Riot's values.
  const queueId = Number(req.query.queue);
  const allowedTypes = new Set(["ranked", "normal", "tourney", "tutorial"]);
  const filter = {
    queue: Number.isFinite(queueId) && queueId > 0 ? queueId : undefined,
    type:
      req.query.type && allowedTypes.has(req.query.type)
        ? req.query.type
        : undefined,
  };
  try {
    return await getMatches(region, puuid, start, count, key, filter);
  } catch (err) {
    return handle(reply, err);
  }
});

// Deep post-game timeline analytics (BYOK-gated; heavy on the API).
app.get<{ Params: { region: string; matchId: string } }>(
  "/api/timeline/:region/:matchId",
  async (req, reply) => {
    const { region, matchId } = req.params;
    if (!isPlatform(region)) return badRegion(reply);
    try {
      return await getMatchTimeline(
        region,
        decodeURIComponent(matchId),
        byok(req),
      );
    } catch (err) {
      return handle(reply, err);
    }
  },
);

// Account aggregate stats: per-champ WR/KDA, role distribution, mastery (BYOK-gated).
app.get<{
  Params: { region: string; name: string; tag: string };
  Querystring: { sample?: string };
}>("/api/account-stats/:region/:name/:tag", async (req, reply) => {
  const { region, name, tag } = req.params;
  if (!isPlatform(region)) return badRegion(reply);
  const key = byok(req);
  // Each match is a separate API call, so cap the sample harder without a key.
  const maxSample = key ? 50 : 20;
  const sample = Math.min(
    maxSample,
    Math.max(5, Number(req.query.sample ?? 20) || 20),
  );
  try {
    return await getAccountStats(
      region,
      decodeURIComponent(name),
      decodeURIComponent(tag),
      sample,
      key,
    );
  } catch (err) {
    return handle(reply, err);
  }
});

app.get<{
  Params: { region: string; name: string; tag: string };
  Querystring: { premades?: string };
}>("/api/live/:region/:name/:tag", async (req, reply) => {
  const { region, name, tag } = req.params;
  if (!isPlatform(region)) return badRegion(reply);
  const key = byok(req);
  // Premade detection is API-heavy (a match-list call per player), so only run
  // it when the caller brings their own key or explicitly opts in.
  const detectPremades = req.query.premades === "1" || Boolean(key);
  try {
    return await getLiveGame(
      region,
      decodeURIComponent(name),
      decodeURIComponent(tag),
      key,
      detectPremades,
    );
  } catch (err) {
    return handle(reply, err);
  }
});

// ── recommended build (community data from u.gg) ────────────────────────────

app.get<{
  Params: { champion: string };
  Querystring: { role?: string; rank?: string };
}>("/api/build/:champion", async (req, reply) => {
  try {
    return await getRecommendedBuild(
      decodeURIComponent(req.params.champion),
      req.query.role,
      req.query.rank,
    );
  } catch (err) {
    return handle(reply, err);
  }
});

// ── meta / champ-select intelligence ──────────────────────────────────────────

app.get<{
  Params: { champion: string };
  Querystring: { role?: string; rank?: string };
}>("/api/matchups/:champion", async (req, reply) => {
  try {
    return await getChampionMatchups(
      decodeURIComponent(req.params.champion),
      req.query.role,
      req.query.rank,
    );
  } catch (err) {
    return handle(reply, err);
  }
});

app.get<{ Params: { champion: string } }>(
  "/api/roles/:champion",
  async (req, reply) => {
    try {
      return await getRoleDistribution(decodeURIComponent(req.params.champion));
    } catch (err) {
      return handle(reply, err);
    }
  },
);

app.get<{ Querystring: { champions: string } }>(
  "/api/predict-lanes",
  async (req, reply) => {
    try {
      const keys = (req.query.champions ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (keys.length !== 5)
        return reply.code(400).send({
          error: "Provide exactly 5 champion keys (comma-separated).",
        });
      return await predictLanes(keys);
    } catch (err) {
      return handle(reply, err);
    }
  },
);

app.get<{ Querystring: { rank?: string } }>("/api/meta", async (req, reply) => {
  try {
    return await getMetaBoard(req.query.rank);
  } catch (err) {
    return handle(reply, err);
  }
});

app.get<{ Querystring: { rank?: string } }>(
  "/api/tier-list",
  async (req, reply) => {
    try {
      return await getTierList(req.query.rank);
    } catch (err) {
      return handle(reply, err);
    }
  },
);

app.get("/api/aram/tier-list", async (_req, reply) => {
  try {
    return await getAramTierList();
  } catch (err) {
    return handle(reply, err);
  }
});

app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`League Companion API listening on :${config.port}`);
    if (!hasApiKey) {
      app.log.warn(
        "RIOT_API_KEY is not set; Riot endpoints will return 503 until you add one.",
      );
    }
    if (!config.corsOrigins.length) {
      app.log.warn(
        "CORS_ORIGINS is empty; the API will accept requests from ANY browser origin. " +
          "Set CORS_ORIGINS (comma-separated) to restrict it.",
      );
    }
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
