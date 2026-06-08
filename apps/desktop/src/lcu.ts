/**
 * League Client (LCU) integration.
 *
 * The League client runs a local REST API authenticated via a "lockfile" it
 * writes to its install directory while running. The lockfile is colon
 * delimited: `LeagueClient:<pid>:<port>:<password>:<protocol>`.
 *
 * Auth is HTTP Basic with username `riot` and the lockfile password, over HTTPS
 * on 127.0.0.1:<port> using a self-signed Riot certificate (so we disable TLS
 * verification for that local host only).
 *
 * This is the same sanctioned local API Blitz/Porofessor use for client
 * features like importing rune pages and reading the signed-in summoner. It is
 * NOT memory reading and is ToS-compliant.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import https from "node:https";

export interface LcuCredentials {
  port: number;
  password: string;
  protocol: string;
}

export interface CurrentSummoner {
  gameName: string;
  tagLine: string;
  displayName?: string;
  summonerId?: number;
  puuid?: string;
}

export interface RuneImportPayload {
  name: string;
  primaryStyleId: number;
  subStyleId: number;
  /** Ordered: keystone + 3 primary + 2 secondary + 3 stat shards = 9 perk IDs. */
  selectedPerkIds: number[];
}

export interface SpellImportPayload {
  spell1Id: number;
  spell2Id: number;
}

/** Candidate lockfile locations across platforms; first existing wins. */
function lockfileCandidates(): string[] {
  const envPath = process.env.LCU_LOCKFILE;
  const candidates: string[] = [];
  if (envPath) candidates.push(envPath);

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Riot Games\\League of Legends\\lockfile",
      join(
        process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
        "Riot Games",
        "League of Legends",
        "lockfile",
      ),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/League of Legends.app/Contents/LoL/lockfile",
      join(
        homedir(),
        "Applications",
        "League of Legends.app",
        "Contents",
        "LoL",
        "lockfile",
      ),
    );
  }
  return candidates;
}

export function readCredentials(): LcuCredentials | null {
  for (const path of lockfileCandidates()) {
    try {
      if (!existsSync(path)) continue;
      const raw = readFileSync(path, "utf8").trim();
      const parts = raw.split(":");
      if (parts.length < 5) continue;
      const port = Number(parts[2]);
      const password = parts[3];
      const protocol = parts[4] ?? "https";
      if (!port || !password) continue;
      return { port, password, protocol };
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function isClientRunning(): boolean {
  return readCredentials() !== null;
}

/** Low-level request to the local LCU. Resolves parsed JSON (or null on 204). */
function lcuRequest<T>(
  creds: LcuCredentials,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | null }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const auth = Buffer.from(`riot:${creds.password}`).toString("base64");

    const req = https.request(
      {
        host: "127.0.0.1",
        port: creds.port,
        path,
        method,
        // The LCU uses a self-signed cert on localhost; trust it for this host only.
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (!chunks) return resolve({ status, data: null });
          try {
            resolve({ status, data: JSON.parse(chunks) as T });
          } catch {
            resolve({ status, data: null });
          }
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** The currently signed-in summoner (Riot ID), or null if unavailable. */
export async function getCurrentSummoner(): Promise<CurrentSummoner | null> {
  const creds = readCredentials();
  if (!creds) return null;
  try {
    const { status, data } = await lcuRequest<
      CurrentSummoner & { displayName?: string }
    >(creds, "GET", "/lol-summoner/v1/current-summoner");
    if (status !== 200 || !data) return null;
    // Older clients only populate displayName; fall back to splitting it.
    let gameName = data.gameName;
    let tagLine = data.tagLine;
    if ((!gameName || !tagLine) && data.displayName?.includes("#")) {
      const [n, t] = data.displayName.split("#");
      gameName = gameName || n || "";
      tagLine = tagLine || t || "";
    }
    if (!gameName) return null;
    return {
      gameName,
      tagLine: tagLine ?? "",
      puuid: data.puuid,
      summonerId: data.summonerId,
    };
  } catch {
    return null;
  }
}

/**
 * Recent games from the League Client's local match history. Unlike Riot's
 * public match-v5 API, the client's history includes event / RGM modes (ARAM
 * Mayhem, Brawl, ...) that match-v5 never exposes. Returns the raw LCU games
 * (legacy match-v4 shape); the web transforms them into the match-v5 shape it
 * renders. Empty array if the client is down or history is unavailable.
 */
export async function getRecentMatches(count = 20): Promise<unknown[]> {
  const creds = readCredentials();
  if (!creds) return [];
  try {
    const summoner = await getCurrentSummoner();
    const puuid = summoner?.puuid;
    if (!puuid) return [];
    // endIndex is inclusive; clients cap the window so we keep it modest.
    const endIndex = Math.max(0, Math.min(count, 50) - 1);
    const { status, data } = await lcuRequest<{
      games?: { games?: unknown[] };
    }>(
      creds,
      "GET",
      `/lol-match-history/v1/products/lol/${encodeURIComponent(
        puuid,
      )}/matches?begIndex=0&endIndex=${endIndex}`,
    );
    if (status !== 200) return [];
    const games = data?.games?.games;
    return Array.isArray(games) ? games : [];
  } catch {
    return [];
  }
}

/** The client's region code (e.g. "NA"), or null. */
export async function getRegion(): Promise<string | null> {
  const creds = readCredentials();
  if (!creds) return null;
  try {
    const { status, data } = await lcuRequest<{ region: string }>(
      creds,
      "GET",
      "/riotclient/region-locale",
    );
    if (status !== 200 || !data) return null;
    return data.region ?? null;
  } catch {
    return null;
  }
}

/**
 * Current gameflow phase: "None" | "Lobby" | "Matchmaking" | "ReadyCheck" |
 * "ChampSelect" | "GameStart" | "InProgress" | "WaitingForStats" | "EndOfGame".
 * Used to auto-trigger the lobby reveal when a game starts.
 */
export async function getGameflowPhase(): Promise<string | null> {
  const creds = readCredentials();
  if (!creds) return null;
  try {
    const { status, data } = await lcuRequest<string>(
      creds,
      "GET",
      "/lol-gameflow/v1/gameflow-phase",
    );
    if (status !== 200 || !data) return null;
    // The endpoint returns a bare JSON string, e.g. "InProgress".
    return typeof data === "string" ? data : null;
  } catch {
    return null;
  }
}

interface RunePage {
  id: number;
  name: string;
  isDeletable: boolean;
  isEditable: boolean;
}

/**
 * Create (and select) a rune page in the client. If the client is at its page
 * limit, we delete a previously imported Ryot page (or any deletable page) and
 * retry once.
 */
export async function importRunes(payload: RuneImportPayload): Promise<void> {
  const creds = readCredentials();
  if (!creds) throw new Error("League client is not running.");

  const body = {
    name: payload.name,
    primaryStyleId: payload.primaryStyleId,
    subStyleId: payload.subStyleId,
    selectedPerkIds: payload.selectedPerkIds,
    current: true,
  };

  const attempt = () =>
    lcuRequest<unknown>(creds, "POST", "/lol-perks/v1/pages", body);

  let res = await attempt();
  if (res.status === 200 || res.status === 201) return;

  // Likely hit the rune-page limit; free one up and retry.
  const pages = await lcuRequest<RunePage[]>(
    creds,
    "GET",
    "/lol-perks/v1/pages",
  );
  if (pages.status === 200 && Array.isArray(pages.data)) {
    const ryotPage = pages.data.find(
      (p) => p.isDeletable && p.name.startsWith("Ryot"),
    );
    const victim = ryotPage ?? pages.data.find((p) => p.isDeletable);
    if (victim) {
      await lcuRequest(creds, "DELETE", `/lol-perks/v1/pages/${victim.id}`);
      res = await attempt();
      if (res.status === 200 || res.status === 201) return;
    }
  }
  throw new Error(`Failed to import runes (status ${res.status}).`);
}

/**
 * Set summoner spells. Only valid during champ select; surfaces a clear error
 * otherwise so the UI can tell the user to import while picking.
 */
export async function importSpells(payload: SpellImportPayload): Promise<void> {
  const creds = readCredentials();
  if (!creds) throw new Error("League client is not running.");

  const inChampSelect = await lcuRequest<unknown>(
    creds,
    "GET",
    "/lol-champ-select/v1/session",
  );
  if (inChampSelect.status !== 200) {
    throw new Error(
      "Summoner spells can only be imported during champ select.",
    );
  }

  const res = await lcuRequest(
    creds,
    "PATCH",
    "/lol-champ-select/v1/session/my-selection",
    {
      spell1Id: payload.spell1Id,
      spell2Id: payload.spell2Id,
    },
  );
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(`Failed to import spells (status ${res.status}).`);
  }
}

// ── champ-select session ─────────────────────────────────────────────────────

export interface ChampSelectPlayer {
  cellId: number;
  championId: number;
  summonerId: number;
  spell1Id: number;
  spell2Id: number;
  assignedPosition: string; // "top","jungle","middle","bottom","utility",""
}

export interface ChampSelectSession {
  myTeam: ChampSelectPlayer[];
  theirTeam: ChampSelectPlayer[];
  bans: { myTeamBans: number[]; theirTeamBans: number[] };
  localPlayerCellId: number;
  timer: { phase: string; adjustedTimeLeftInPhase: number };
}

/**
 * Returns the current champ-select session, or null if not in champ select.
 */
export async function getChampSelectSession(): Promise<ChampSelectSession | null> {
  const creds = readCredentials();
  if (!creds) return null;
  try {
    const { status, data } = await lcuRequest<ChampSelectSession>(
      creds,
      "GET",
      "/lol-champ-select/v1/session",
    );
    if (status !== 200 || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/** Import an item set into the client (shows up in the in-game shop). */
export async function importItemSet(payload: {
  title: string;
  championKey: number;
  blocks: { type: string; items: { id: string; count: number }[] }[];
}): Promise<void> {
  const creds = readCredentials();
  if (!creds) throw new Error("League client is not running.");

  const body = {
    title: payload.title,
    type: "custom",
    map: "any",
    mode: "any",
    priority: false,
    sortrank: 0,
    champion: payload.championKey,
    blocks: payload.blocks,
  };
  const res = await lcuRequest(
    creds,
    "POST",
    "/lol-item-sets/v1/item-sets",
    body,
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Failed to import item set (status ${res.status}).`);
  }
}
