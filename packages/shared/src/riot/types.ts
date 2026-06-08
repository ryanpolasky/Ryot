/** Subset of Riot API DTOs that this app actually uses. */

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDTO {
  /** Encrypted summoner id. No longer returned by recent API versions. */
  id?: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
  /** Present on some responses; not guaranteed. */
  name?: string;
}

export interface LeagueEntryDTO {
  leagueId: string;
  queueType: string; // RANKED_SOLO_5x5 | RANKED_FLEX_SR | ...
  tier: string; // IRON..CHALLENGER
  rank: string; // I..IV
  summonerId?: string;
  puuid?: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface MatchMetadata {
  matchId: string;
  participants: string[]; // puuids
}

export interface MatchParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamId: number; // 100 | 200
  teamPosition: string; // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  visionScore: number;
  totalDamageDealtToChampions: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks: ParticipantPerks;
}

export interface ParticipantPerks {
  styles: Array<{
    description: string; // "primaryStyle" | "subStyle"
    style: number;
    selections: Array<{
      perk: number;
      var1: number;
      var2: number;
      var3: number;
    }>;
  }>;
  statPerks: { defense: number; flex: number; offense: number };
}

export interface MatchInfo {
  gameCreation: number;
  gameDuration: number; // seconds
  gameEndTimestamp?: number;
  gameMode: string;
  gameType: string;
  gameVersion?: string;
  queueId: number;
  mapId: number;
  platformId: string;
  participants: MatchParticipant[];
}

export interface MatchDTO {
  metadata: MatchMetadata;
  info: MatchInfo;
}

// ── match-v5 timeline ──────────────────────────────────────────────
export interface TimelineParticipantFrame {
  participantId: number;
  currentGold: number;
  totalGold: number;
  level: number;
  xp: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  position?: { x: number; y: number };
}

export interface TimelineEvent {
  type: string; // CHAMPION_KILL, ITEM_PURCHASED, SKILL_LEVEL_UP, BUILDING_KILL, ELITE_MONSTER_KILL, ...
  timestamp: number;
  participantId?: number;
  killerId?: number;
  victimId?: number;
  itemId?: number;
  skillSlot?: number;
  monsterType?: string;
  monsterSubType?: string;
  buildingType?: string;
  laneType?: string;
}

export interface TimelineFrame {
  timestamp: number; // ms since game start
  participantFrames: Record<string, TimelineParticipantFrame>;
  events: TimelineEvent[];
}

export interface MatchTimelineInfo {
  frameInterval: number;
  participants: Array<{ participantId: number; puuid: string }>;
  frames: TimelineFrame[];
}

export interface MatchTimelineDTO {
  metadata: MatchMetadata;
  info: MatchTimelineInfo;
}

// ── champion-mastery-v4 ────────────────────────────────────────────
export interface ChampionMasteryDTO {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  chestGranted?: boolean;
  tokensEarned?: number;
}

export interface CurrentGameParticipant {
  puuid: string;
  championId: number;
  teamId: number;
  spell1Id: number;
  spell2Id: number;
  riotId?: string;
  summonerName?: string;
  perks?: {
    perkIds: number[];
    perkStyle: number;
    perkSubStyle: number;
  };
}

export interface CurrentGameInfo {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number; // seconds
  gameMode: string;
  gameQueueConfigId: number;
  platformId: string;
  participants: CurrentGameParticipant[];
}
