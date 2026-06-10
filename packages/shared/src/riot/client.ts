import {
  Platform,
  Regional,
  regionalForAccount,
  regionalForMatch,
} from "./regions.js";
import {
  ChampionMasteryDTO,
  CurrentGameInfo,
  LeagueEntryDTO,
  LeagueListDTO,
  MatchDTO,
  MatchTimelineDTO,
  RiotAccount,
  SummonerDTO,
} from "./types.js";

/** Apex tiers, routed under league-v4's per-tier endpoints. */
export type ApexTier = "challenger" | "grandmaster" | "master";

export class RiotApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public retryAfter?: number,
  ) {
    super(`Riot API ${status} ${statusText} for ${url}`);
    this.name = "RiotApiError";
  }

  get isNotFound() {
    return this.status === 404;
  }
  get isRateLimited() {
    return this.status === 429;
  }
}

export interface RiotClientOptions {
  apiKey: string;
  /** Override for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Thin, typed wrapper around the Riot Games REST API.
 * Handles routing (platform vs regional), auth header, and error shaping.
 */
export class RiotClient {
  private apiKey: string;
  private fetchImpl: typeof fetch;

  constructor(opts: RiotClientOptions) {
    if (!opts.apiKey) {
      throw new Error("RiotClient requires an apiKey (set RIOT_API_KEY).");
    }
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async get<T>(
    host: string,
    path: string,
    query?: Record<string, string | number>,
  ): Promise<T> {
    const url = new URL(`https://${host}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query))
        url.searchParams.set(k, String(v));
    }
    const res = await this.fetchImpl(url.toString(), {
      headers: { "X-Riot-Token": this.apiKey },
    });
    if (!res.ok) {
      const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
      throw new RiotApiError(
        res.status,
        res.statusText,
        url.toString(),
        retryAfter,
      );
    }
    return (await res.json()) as T;
  }

  private platformHost(platform: Platform): string {
    return `${platform}.api.riotgames.com`;
  }
  private regionalHost(regional: Regional): string {
    return `${regional}.api.riotgames.com`;
  }

  // ── account-v1 ───────────────────────────────────────────────
  /** Resolve a Riot ID (gameName#tagLine) to an account/puuid. */
  async getAccountByRiotId(
    platform: Platform,
    gameName: string,
    tagLine: string,
  ): Promise<RiotAccount> {
    const host = this.regionalHost(regionalForAccount(platform));
    return this.get<RiotAccount>(
      host,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    );
  }

  async getAccountByPuuid(
    platform: Platform,
    puuid: string,
  ): Promise<RiotAccount> {
    const host = this.regionalHost(regionalForAccount(platform));
    return this.get<RiotAccount>(
      host,
      `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  // ── summoner-v4 ──────────────────────────────────────────────
  async getSummonerByPuuid(
    platform: Platform,
    puuid: string,
  ): Promise<SummonerDTO> {
    return this.get<SummonerDTO>(
      this.platformHost(platform),
      `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  // ── league-v4 ────────────────────────────────────────────────
  /**
   * Ranked entries by puuid. Riot removed the encrypted summonerId from
   * summoner-v4 responses, so by-puuid is the supported path now.
   */
  async getLeagueEntriesByPuuid(
    platform: Platform,
    puuid: string,
  ): Promise<LeagueEntryDTO[]> {
    return this.get<LeagueEntryDTO[]>(
      this.platformHost(platform),
      `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  /**
   * Apex league ladder (challenger / grandmaster / master) for a queue. Used to
   * seed the stats crawler with a pool of high-elo players. Entries now include
   * `puuid` directly, so no summoner lookup is needed.
   */
  async getApexLeague(
    platform: Platform,
    tier: ApexTier,
    queue = "RANKED_SOLO_5x5",
  ): Promise<LeagueListDTO> {
    return this.get<LeagueListDTO>(
      this.platformHost(platform),
      `/lol/league/v4/${tier}leagues/by-queue/${queue}`,
    );
  }

  /**
   * Paginated ranked entries for an exact tier + division (league-exp-v4), e.g.
   * EMERALD I page 1. Lets the crawler sample non-apex ranks for rank-bucketed
   * builds. Returns [] past the last page.
   */
  async getLeagueEntries(
    platform: Platform,
    tier: string,
    division: string,
    opts: { queue?: string; page?: number } = {},
  ): Promise<LeagueEntryDTO[]> {
    const queue = opts.queue ?? "RANKED_SOLO_5x5";
    return this.get<LeagueEntryDTO[]>(
      this.platformHost(platform),
      `/lol/league-exp/v4/entries/${queue}/${tier}/${division}`,
      { page: opts.page ?? 1 },
    );
  }

  // ── match-v5 ─────────────────────────────────────────────────
  async getMatchIdsByPuuid(
    platform: Platform,
    puuid: string,
    opts: {
      start?: number;
      count?: number;
      queue?: number;
      type?: string;
    } = {},
  ): Promise<string[]> {
    const host = this.regionalHost(regionalForMatch(platform));
    const query: Record<string, string | number> = {
      start: opts.start ?? 0,
      count: opts.count ?? 20,
    };
    if (opts.queue !== undefined) query.queue = opts.queue;
    if (opts.type !== undefined) query.type = opts.type;
    return this.get<string[]>(
      host,
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
      query,
    );
  }

  async getMatch(platform: Platform, matchId: string): Promise<MatchDTO> {
    const host = this.regionalHost(regionalForMatch(platform));
    return this.get<MatchDTO>(
      host,
      `/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
    );
  }

  async getMatchTimeline(
    platform: Platform,
    matchId: string,
  ): Promise<MatchTimelineDTO> {
    const host = this.regionalHost(regionalForMatch(platform));
    return this.get<MatchTimelineDTO>(
      host,
      `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`,
    );
  }

  // ── champion-mastery-v4 ──────────────────────────────────────
  async getChampionMasteries(
    platform: Platform,
    puuid: string,
  ): Promise<ChampionMasteryDTO[]> {
    return this.get<ChampionMasteryDTO[]>(
      this.platformHost(platform),
      `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  // ── spectator-v5 (live game) ─────────────────────────────────
  async getActiveGameByPuuid(
    platform: Platform,
    puuid: string,
  ): Promise<CurrentGameInfo> {
    return this.get<CurrentGameInfo>(
      this.platformHost(platform),
      `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`,
    );
  }
}
