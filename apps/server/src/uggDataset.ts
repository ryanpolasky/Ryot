/**
 * Pre-crawled u.gg dataset.
 *
 * A weekly GitHub Action (see .github/workflows/crawl.yml) scrapes u.gg from a
 * clean IP and publishes a single gzipped JSON of per-champion overview / ARAM /
 * matchup data. This module downloads that artifact (or reads a local file),
 * holds it in memory, and serves the per-champion buckets to uggSource.ts.
 *
 * The point: u.gg blocks some self-hosting IPs, but it only needs to be reached
 * once a week from the Action — never from this server. The server reads the
 * dataset, so builds/tier/meta keep working regardless of this host's IP.
 */
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { config } from "./config.js";

/** Region-"12" (world) overview bucket: rank -> role -> [blocks, timestamp]. */
export type OverviewData = Record<string, Record<string, [unknown[], string]>>;
/** Region-"12" matchup bucket: rank -> role -> rows of [oppId, wins, games, ...]. */
export type MatchupData = Record<string, Record<string, number[][]>>;

interface DatasetFile {
  version: string;
  /** Patch in u.gg form, e.g. "16_11". */
  patch: string;
  /** ISO timestamp the crawl finished. */
  crawledAt: string;
  counts?: { overview: number; aram: number; matchups: number };
  overview: Record<string, OverviewData>;
  aram: Record<string, OverviewData>;
  matchups: Record<string, MatchupData>;
}

let current: DatasetFile | null = null;
let loadedAt = 0;
let lastError: string | null = null;
let lastTriedAt = 0;
let inflight: Promise<void> | null = null;

/** Don't re-attempt a failed load on every request; wait this long between tries. */
const RETRY_COOLDOWN_MS = 60_000;

async function readSource(): Promise<Buffer> {
  if (config.ugg.datasetPath) {
    return readFile(config.ugg.datasetPath);
  }
  const url = config.ugg.datasetUrl;
  if (!url) throw new Error("no dataset source configured");
  const res = await fetch(url, {
    headers: { Accept: "application/octet-stream, application/json" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`dataset fetch returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function parse(buf: Buffer): DatasetFile {
  // Detect gzip by magic bytes (0x1f 0x8b); accept plain JSON too.
  const isGzip = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const json = (isGzip ? gunzipSync(buf) : buf).toString("utf8");
  const ds = JSON.parse(json) as DatasetFile;
  if (!ds || typeof ds !== "object" || typeof ds.overview !== "object") {
    throw new Error("invalid dataset shape (missing overview)");
  }
  return ds;
}

async function doLoad(): Promise<void> {
  lastTriedAt = Date.now();
  try {
    const ds = parse(await readSource());
    current = ds;
    loadedAt = Date.now();
    lastError = null;
    console.info(
      `[dataset] loaded patch ${ds.patch} crawled ${ds.crawledAt} ` +
        `(${Object.keys(ds.overview).length} champions) from ` +
        `${config.ugg.datasetPath || config.ugg.datasetUrl}`,
    );
  } catch (err) {
    // Never throw to callers: a missing/stale dataset should degrade to the live
    // fallback, not crash a request.
    lastError = (err as Error).message;
    console.warn(`[dataset] load failed: ${lastError}`);
  }
}

/** Load once on demand, with a cooldown between failed attempts. */
export function ensureLoaded(): Promise<void> {
  if (current) return Promise.resolve();
  if (inflight) return inflight;
  if (lastTriedAt && Date.now() - lastTriedAt < RETRY_COOLDOWN_MS) {
    return Promise.resolve();
  }
  inflight = doLoad().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function getOverview(
  champId: string,
): Promise<OverviewData | null> {
  await ensureLoaded();
  return current?.overview?.[champId] ?? null;
}

export async function getAram(champId: string): Promise<OverviewData | null> {
  await ensureLoaded();
  return current?.aram?.[champId] ?? null;
}

export async function getMatchups(champId: string): Promise<MatchupData | null> {
  await ensureLoaded();
  return current?.matchups?.[champId] ?? null;
}

/** Kick off the initial load and schedule periodic refreshes. Call once at boot. */
export function startDatasetRefresh(): void {
  void ensureLoaded();
  const ms = config.ugg.datasetRefreshMs;
  if (ms > 0) {
    const timer = setInterval(() => void doLoad(), ms);
    // Don't keep the event loop alive just for the refresh timer.
    timer.unref?.();
  }
}

export interface DatasetInfo {
  loaded: boolean;
  patch: string | null;
  crawledAt: string | null;
  /** Age since crawl in ms (Infinity if not loaded). */
  ageMs: number;
  champions: number;
  source: string;
  loadedAt: number | null;
  lastError: string | null;
}

export function getDatasetInfo(): DatasetInfo {
  return {
    loaded: current !== null,
    patch: current?.patch ?? null,
    crawledAt: current?.crawledAt ?? null,
    ageMs: current ? Date.now() - Date.parse(current.crawledAt) : Infinity,
    champions: current ? Object.keys(current.overview).length : 0,
    source: config.ugg.datasetPath || config.ugg.datasetUrl || "(none)",
    loadedAt: current ? loadedAt : null,
    lastError,
  };
}
