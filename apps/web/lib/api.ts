import type {
  CurrentGameParticipant,
  DDragonChampion,
  LeagueEntryDTO,
  MatchDTO,
  MatchTimelineDTO,
  RiotAccount,
  SummonerDTO,
} from "@lc/shared";

/** Base URL for the backend API. Server components and the browser may differ. */
export function apiBase(): string {
  if (typeof window === "undefined") {
    return (
      process.env.API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE ||
      "http://localhost:4000"
    );
  }
  return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
}

export interface ProfileResult {
  version: string;
  account: RiotAccount;
  summoner: SummonerDTO;
  ranked: LeagueEntryDTO[];
}

export interface MatchesResult {
  version: string;
  matches: MatchDTO[];
}

export interface ScoutParticipant extends CurrentGameParticipant {
  gameName?: string;
  tagLine?: string;
  ranked: LeagueEntryDTO[];
  premade?: { group: number; size: number; sharedGames: number };
  recent?: {
    form: boolean[];
    mainChamp?: { championId: number; championName: string; games: number };
    onPick?: { championId: number; games: number; wins: number };
  };
}

export interface LiveGameResult {
  version: string;
  found: boolean;
  gameMode?: string;
  gameQueueConfigId?: number;
  gameLength?: number;
  gameStartTime?: number;
  participants: ScoutParticipant[];
}

export interface ChampionsResult {
  version: string;
  champions: DDragonChampion[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { ...init });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

export function getProfile(
  region: string,
  name: string,
  tag: string,
): Promise<ProfileResult> {
  return getJson<ProfileResult>(
    `/api/profile/${region}/${enc(name)}/${enc(tag)}`,
    {
      next: { revalidate: 120 },
    } as RequestInit,
  );
}

export function getMatches(
  region: string,
  puuid: string,
  count = 20,
  opts?: { start?: number; headers?: Record<string, string> },
): Promise<MatchesResult> {
  const start = opts?.start ?? 0;
  const path = `/api/matches/${region}/${enc(puuid)}?start=${start}&count=${count}`;
  // byok paging sends the key header and must not be cached
  const init: RequestInit = opts?.headers
    ? { headers: opts.headers, cache: "no-store" }
    : ({ next: { revalidate: 120 } } as RequestInit);
  return getJson<MatchesResult>(path, init);
}

export function getLive(
  region: string,
  name: string,
  tag: string,
): Promise<LiveGameResult> {
  return getJson<LiveGameResult>(
    `/api/live/${region}/${enc(name)}/${enc(tag)}`,
    {
      cache: "no-store",
    },
  );
}

export function getChampions(): Promise<ChampionsResult> {
  return getJson<ChampionsResult>(`/api/static/champions`, {
    next: { revalidate: 3600 },
  } as RequestInit);
}

// ── recommended build types ──────────────────────────────────────────────────

export interface BuildItemEntry {
  id: number;
  name: string;
  description: string;
  gold: number | null;
  icon: string | null;
}

export interface BuildRuneEntry {
  id: number;
  name: string;
  icon: string;
}

export interface BuildItemOption {
  item: BuildItemEntry;
  wins: number;
  games: number;
  winRate: number;
}

export interface RecommendedBuildResult {
  champion: string;
  championIcon: string;
  role: string;
  rank: string;
  patch: string;
  games: number;
  wins: number;
  winRate: number;
  runes: {
    primaryStyle: BuildRuneEntry;
    keystone: BuildRuneEntry;
    primaryPerks: BuildRuneEntry[];
    secondaryStyle: BuildRuneEntry;
    secondaryPerks: BuildRuneEntry[];
    shards: string[];
    perkIds: number[];
    shardIds: number[];
  };
  summoners: BuildItemEntry[];
  startingItems: BuildItemEntry[];
  coreItems: BuildItemEntry[];
  itemOptions: BuildItemOption[][];
  skillOrder: string[];
  skillPriority: string;
  availableRoles: string[];
}

export function getBuild(
  champion: string,
  role?: string,
  rank?: string,
): Promise<RecommendedBuildResult> {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (rank) params.set("rank", rank);
  const qs = params.toString();
  return getJson<RecommendedBuildResult>(
    `/api/build/${enc(champion)}${qs ? `?${qs}` : ""}`,
    { next: { revalidate: 1800 } } as RequestInit,
  );
}

// ── timeline analytics (Feature 1) ───────────────────────────────────────────

export interface MatchTimelineResult {
  version: string;
  match: MatchDTO;
  timeline: MatchTimelineDTO;
}

export function getTimeline(
  region: string,
  matchId: string,
  headers?: Record<string, string>,
): Promise<MatchTimelineResult> {
  return getJson<MatchTimelineResult>(
    `/api/timeline/${region}/${enc(matchId)}`,
    {
      cache: "no-store",
      headers,
    },
  );
}

// ── account aggregate stats (Feature 2) ───────────────────────────────────────

export interface ChampStat {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csPerMin: number;
}

export interface RoleStat {
  role: string;
  games: number;
  share: number;
}

export interface MasteryStat {
  championId: number;
  championName: string;
  level: number;
  points: number;
}

export interface AccountStatsResult {
  version: string;
  account: RiotAccount;
  sampleSize: number;
  champions: ChampStat[];
  roles: RoleStat[];
  mastery: MasteryStat[];
  overall: {
    games: number;
    wins: number;
    losses: number;
    winRate: number;
    kda: number;
  };
}

export function getAccountStats(
  region: string,
  name: string,
  tag: string,
  sample = 20,
  headers?: Record<string, string>,
): Promise<AccountStatsResult> {
  return getJson<AccountStatsResult>(
    `/api/account-stats/${region}/${enc(name)}/${enc(tag)}?sample=${sample}`,
    { cache: "no-store", headers },
  );
}

// ── tier list (Feature 5) ─────────────────────────────────────────────────────

export interface TierEntry {
  champion: string;
  championIcon: string;
  championId: string;
  role: string;
  tier: string;
  winRate: number;
  pickShare: number;
  games: number;
}

export interface TierListResult {
  patch: string;
  rank: string;
  roles: Record<string, TierEntry[]>;
}

export function getTierList(rank?: string): Promise<TierListResult> {
  const qs = rank ? `?rank=${encodeURIComponent(rank)}` : "";
  return getJson<TierListResult>(`/api/tier-list${qs}`, {
    next: { revalidate: 3600 },
  } as RequestInit);
}

export interface AramTierListResult {
  patch: string;
  entries: TierEntry[];
}

export function getAramTierList(): Promise<AramTierListResult> {
  return getJson<AramTierListResult>(`/api/aram/tier-list`, {
    next: { revalidate: 3600 },
  } as RequestInit);
}

// ── status dashboard ──────────────────────────────────────────────────────────

export type StatusLevel = "operational" | "degraded" | "down";

export interface StatusComponent {
  id: string;
  label: string;
  status: StatusLevel;
  detail: string;
}

export interface StatusResult {
  overall: StatusLevel;
  checkedAt: string;
  components: StatusComponent[];
}

export function getStatus(): Promise<StatusResult> {
  return getJson<StatusResult>(`/api/status`, { cache: "no-store" });
}

/** Build lookup maps from the champions list. */
export function championMaps(champs: DDragonChampion[]) {
  const byKey = new Map<string, DDragonChampion>();
  const byName = new Map<string, DDragonChampion>();
  for (const c of champs) {
    byKey.set(c.key, c);
    byName.set(c.id, c);
    byName.set(c.name, c);
  }
  return { byKey, byName };
}
