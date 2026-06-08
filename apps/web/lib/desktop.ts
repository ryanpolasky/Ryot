// Type of the desktop bridge the Ryot Electron app injects as `window.ryot`
// (see apps/desktop/src/main-preload.ts). Present only inside the desktop app;
// `undefined` in a normal browser, which is how the web detects desktop mode.

export interface RyotCurrentSummoner {
  gameName: string;
  tagLine: string;
  /** Riot platform id, e.g. "na1". */
  platform: string;
  puuid?: string;
}

// ── Raw League Client (LCU) match history ────────────────────────────────────
// The client returns the legacy match-v4 shape (participants + separate
// participantIdentities, stats nested). All fields optional/defensive since the
// payload varies by client version and game mode. The web normalizes this into
// the match-v5 MatchDTO it renders (see lib/lcuMatches.ts).

export interface LcuGamePlayer {
  puuid?: string;
  gameName?: string;
  tagLine?: string;
  summonerName?: string;
}

export interface LcuGameParticipantIdentity {
  participantId: number;
  player: LcuGamePlayer;
}

export interface LcuGameParticipantStats {
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  champLevel?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  goldEarned?: number;
  visionScore?: number;
  totalDamageDealtToChampions?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
  perk0?: number;
  perk1?: number;
  perk2?: number;
  perk3?: number;
  perk4?: number;
  perk5?: number;
  statPerk0?: number;
  statPerk1?: number;
  statPerk2?: number;
}

export interface LcuGameParticipant {
  participantId: number;
  championId: number;
  spell1Id?: number;
  spell2Id?: number;
  teamId: number;
  stats: LcuGameParticipantStats;
  timeline?: { lane?: string; role?: string };
}

export interface LcuGame {
  gameId: number;
  gameCreation: number;
  gameDuration: number;
  gameMode?: string;
  gameType?: string;
  gameVersion?: string;
  mapId?: number;
  queueId: number;
  platformId?: string;
  participants: LcuGameParticipant[];
  participantIdentities: LcuGameParticipantIdentity[];
}

export interface RyotBridge {
  isDesktop: boolean;
  isClientRunning?: () => Promise<boolean>;
  getCurrentSummoner?: () => Promise<RyotCurrentSummoner | null>;
  /** Recent games from the local League Client (event/RGM modes included). */
  getLcuMatches?: (count?: number) => Promise<LcuGame[]>;
  importRunes: (p: {
    name: string;
    primaryStyleId: number;
    subStyleId: number;
    selectedPerkIds: number[];
  }) => Promise<{ ok: true }>;
  importSpells: (p: {
    spell1Id: number;
    spell2Id: number;
  }) => Promise<{ ok: true }>;
}

declare global {
  interface Window {
    ryot?: RyotBridge;
  }
}
