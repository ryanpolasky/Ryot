/**
 * In-memory hold + disk persistence for the aggregated dataset snapshot.
 *
 * The snapshot is small (a few MB gzipped), so we keep the whole thing in memory
 * for O(1) per-champion serving and flush a gzipped copy to disk so it survives
 * restarts. A JSON snapshot is intentionally dependency-free; if per-match
 * incremental durability is ever needed at high volume, swap this for SQLite
 * behind the same interface.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { config } from "../config.js";
import type { DatasetSnapshot, MatchupData, OverviewData } from "./types.js";

let current: DatasetSnapshot | null = null;
let loadedAt = 0;
let lastError: string | null = null;

function snapshotPath(): string {
  return resolve(process.cwd(), config.stats.snapshotPath);
}

/** True once a non-empty snapshot is available to serve. */
export function ready(): boolean {
  return current !== null && current.matches > 0;
}

export function getOverview(champId: string): OverviewData | null {
  return current?.overview?.[champId] ?? null;
}

export function getAram(champId: string): OverviewData | null {
  return current?.aram?.[champId] ?? null;
}

export function getMatchups(champId: string): MatchupData | null {
  return current?.matchups?.[champId] ?? null;
}

/** Load the persisted snapshot from disk into memory. No-op if none exists. */
export async function loadSnapshot(): Promise<void> {
  const path = snapshotPath();
  try {
    const buf = await readFile(path);
    const isGz = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
    const json = (isGz ? gunzipSync(buf) : buf).toString("utf8");
    const ds = JSON.parse(json) as DatasetSnapshot;
    if (!ds || typeof ds !== "object" || typeof ds.overview !== "object") {
      throw new Error("invalid snapshot shape");
    }
    current = ds;
    loadedAt = Date.now();
    lastError = null;
    console.info(
      `[stats] loaded snapshot patch ${ds.patch} built ${ds.builtAt} ` +
        `(${Object.keys(ds.overview).length} champions, ${ds.matches} matches)`,
    );
  } catch (err) {
    // A missing file is the normal cold-start case, not an error to shout about.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      lastError = (err as Error).message;
      console.warn(`[stats] snapshot load failed: ${lastError}`);
    }
  }
}

/** Persist a freshly-built snapshot and swap it in as the served data. */
export async function saveSnapshot(snapshot: DatasetSnapshot): Promise<void> {
  const path = snapshotPath();
  await mkdir(dirname(path), { recursive: true });
  const gz = gzipSync(Buffer.from(JSON.stringify(snapshot)), { level: 9 });
  await writeFile(path, gz);
  current = snapshot;
  loadedAt = Date.now();
  lastError = null;
  console.info(
    `[stats] saved snapshot patch ${snapshot.patch} ` +
      `(${gz.length} bytes gzip, ${snapshot.matches} matches)`,
  );
}

export interface StatsInfo {
  ready: boolean;
  patch: string | null;
  builtAt: string | null;
  matches: number;
  champions: number;
  /** Age since the snapshot was built, ms (Infinity if none). */
  ageMs: number;
  source: string;
  loadedAt: number | null;
  lastError: string | null;
}

export function getInfo(): StatsInfo {
  return {
    ready: ready(),
    patch: current?.patch ?? null,
    builtAt: current?.builtAt ?? null,
    matches: current?.matches ?? 0,
    champions: current ? Object.keys(current.overview).length : 0,
    ageMs: current ? Date.now() - Date.parse(current.builtAt) : Infinity,
    source: config.stats.snapshotPath,
    loadedAt: current ? loadedAt : null,
    lastError,
  };
}
