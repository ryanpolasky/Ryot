/**
 * u.gg dataset crawler.
 *
 * Run weekly by .github/workflows/crawl.yml from GitHub's clean IP. It scrapes
 * u.gg's stats CDN for every champion's SR overview, ARAM overview, and lane
 * matchups (region "12" = world bucket, mirroring src/uggFetch.ts), and writes a
 * single gzipped JSON that the server consumes via src/uggDataset.ts.
 *
 * Why: u.gg blocks some self-hosting IPs. With this, u.gg only needs to be
 * reached once a week from CI — never from the server — so builds/tier/meta keep
 * working on any host.
 *
 * Standalone on purpose: it depends only on Node built-ins, so CI can run it with
 * `tsx scripts/crawl.ts` without building any workspace package.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const DDRAGON = "https://ddragon.leagueoflegends.com";
const UGG_BASE = "https://stats2.u.gg/lol/1.5";
const UGG_API_VERSION = "1.5.0";
const REGION_WORLD = "12";

/** Rank buckets the server actually serves (see RANK_MAP in the services). */
const SERVED_RANKS = new Set(["1", "8", "10", "11", "13", "14", "17"]);

const CONCURRENCY = 5;
const MAX_RETRIES = 4;
const POLITE_DELAY_MS = 120;
/** Refuse to publish a clearly-broken sparse crawl (e.g. u.gg blocked CI). */
const MIN_CHAMPIONS = 100;

// Browser-like headers: u.gg's CDN rejects header-less requests with 403.
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://u.gg/",
  Origin: "https://u.gg",
};

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../data");
const OUT_FILE = resolve(OUT_DIR, "ugg-dataset.json.gz");
const META_FILE = resolve(OUT_DIR, "ugg-dataset.meta.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Champion {
  key: string;
  id: string;
  name: string;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function getLatestVersion(): Promise<string> {
  const versions = (await getJson(`${DDRAGON}/api/versions.json`)) as string[];
  const v = versions[0];
  if (!v) throw new Error("Data Dragon returned no versions");
  return v;
}

async function getChampions(version: string): Promise<Champion[]> {
  const json = (await getJson(
    `${DDRAGON}/cdn/${version}/data/en_US/champion.json`,
  )) as { data: Record<string, { key: string; id: string; name: string }> };
  return Object.values(json.data).map((c) => ({
    key: c.key,
    id: c.id,
    name: c.name,
  }));
}

/**
 * Fetch a u.gg JSON endpoint and return its region-"12" (world) bucket. Retries
 * transient failures (network errors, 429); other statuses (404/5xx) throw
 * immediately so missing champions are skipped fast.
 */
async function fetchRegion12(
  url: string,
  label: string,
): Promise<Record<string, unknown>> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: HEADERS });
    } catch (err) {
      lastErr = err as Error;
      await sleep(300 * (attempt + 1));
      continue;
    }
    if (res.status === 429) {
      lastErr = new Error(`${label} -> 429 (rate limited)`);
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${label} -> ${res.status}`);

    const body = (await res.json()) as Record<string, unknown>;
    const bucket = body?.[REGION_WORLD];
    if (bucket == null || typeof bucket !== "object") {
      throw new Error(`${label}: region "${REGION_WORLD}" missing`);
    }
    return bucket as Record<string, unknown>;
  }
  throw lastErr ?? new Error(`${label} failed`);
}

/** Keep only the rank buckets the server serves, to shrink the artifact. */
function trimRanks(
  bucket: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rank, val] of Object.entries(bucket)) {
    if (SERVED_RANKS.has(rank)) out[rank] = val;
  }
  return out;
}

/** Run `fn` over `items` with a fixed number of concurrent workers. */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const version = await getLatestVersion();
  const patch = version.split(".").slice(0, 2).join("_"); // "16.11.1" -> "16_11"
  const champions = await getChampions(version);
  console.log(
    `Crawling u.gg for patch ${patch} (${champions.length} champions)...`,
  );

  const overview: Record<string, unknown> = {};
  const aram: Record<string, unknown> = {};
  const matchups: Record<string, unknown> = {};
  let okOverview = 0;
  let okAram = 0;
  let okMatchups = 0;
  let failures = 0;

  await mapLimit(champions, CONCURRENCY, async (c) => {
    const id = c.key;

    try {
      const b = await fetchRegion12(
        `${UGG_BASE}/overview/${patch}/ranked_solo_5x5/${id}/${UGG_API_VERSION}.json`,
        `overview ${c.id}`,
      );
      overview[id] = trimRanks(b);
      okOverview++;
    } catch (err) {
      failures++;
      console.warn(`  ! ${(err as Error).message}`);
    }

    try {
      const b = await fetchRegion12(
        `${UGG_BASE}/matchups/${patch}/ranked_solo_5x5/${id}/${UGG_API_VERSION}.json`,
        `matchups ${c.id}`,
      );
      matchups[id] = trimRanks(b);
      okMatchups++;
    } catch (err) {
      failures++;
      console.warn(`  ! ${(err as Error).message}`);
    }

    try {
      // ARAM is a single rank ("8") / role ("6") bucket; keep it as-is.
      const b = await fetchRegion12(
        `${UGG_BASE}/overview/${patch}/normal_aram/${id}/${UGG_API_VERSION}.json`,
        `aram ${c.id}`,
      );
      aram[id] = b;
      okAram++;
    } catch (err) {
      failures++;
      console.warn(`  ! ${(err as Error).message}`);
    }

    await sleep(POLITE_DELAY_MS);
  });

  if (okOverview < MIN_CHAMPIONS) {
    throw new Error(
      `Only ${okOverview} champion overviews crawled (< ${MIN_CHAMPIONS}); ` +
        `refusing to publish a sparse dataset (is CI being blocked?).`,
    );
  }

  const crawledAt = new Date().toISOString();
  const counts = { overview: okOverview, aram: okAram, matchups: okMatchups };
  const dataset = { version, patch, crawledAt, counts, overview, aram, matchups };

  mkdirSync(OUT_DIR, { recursive: true });
  const json = JSON.stringify(dataset);
  const gz = gzipSync(Buffer.from(json), { level: 9 });
  writeFileSync(OUT_FILE, gz);
  writeFileSync(
    META_FILE,
    JSON.stringify(
      {
        version,
        patch,
        crawledAt,
        counts,
        gzipBytes: gz.length,
        rawBytes: json.length,
      },
      null,
      2,
    ),
  );

  const secs = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(
    `Done in ${secs}s — overview=${okOverview} matchups=${okMatchups} ` +
      `aram=${okAram} failures=${failures}`,
  );
  console.log(
    `Wrote ${OUT_FILE} (${(gz.length / 1e6).toFixed(2)} MB gzip, ` +
      `${(json.length / 1e6).toFixed(1)} MB raw)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
