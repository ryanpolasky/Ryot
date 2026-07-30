import type {
  MatchDTO,
  MatchInfo,
  MatchParticipant,
} from "../../packages/shared/src/riot/types";

/** A fully-populated match-v5 participant, overridable field by field. */
export function participant(
  over: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    puuid: "p1",
    championId: 266,
    championName: "Aatrox",
    champLevel: 18,
    teamId: 100,
    teamPosition: "TOP",
    win: true,
    kills: 5,
    deaths: 5,
    assists: 5,
    totalMinionsKilled: 150,
    neutralMinionsKilled: 0,
    goldEarned: 12000,
    visionScore: 20,
    totalDamageDealtToChampions: 20000,
    item0: 0,
    item1: 0,
    item2: 0,
    item3: 0,
    item4: 0,
    item5: 0,
    item6: 0,
    summoner1Id: 4,
    summoner2Id: 12,
    perks: {
      styles: [
        { description: "primaryStyle", style: 8000, selections: [] },
        { description: "subStyle", style: 8100, selections: [] },
      ],
      statPerks: { defense: 5001, flex: 5008, offense: 5005 },
    },
    ...over,
  };
}

/** A match-v5 payload with sane defaults (post-11.20: duration in seconds). */
export function match(
  over: Partial<MatchInfo> & { matchId?: string } = {},
): MatchDTO {
  const { matchId = "NA1_1", ...info } = over;
  const gameCreation = info.gameCreation ?? 1_700_000_000_000;
  const gameDuration = info.gameDuration ?? 1800;
  const participants = info.participants ?? [participant()];
  return {
    metadata: { matchId, participants: participants.map((p) => p.puuid) },
    info: {
      gameCreation,
      gameDuration,
      gameEndTimestamp: gameCreation + gameDuration * 1000,
      gameMode: "CLASSIC",
      gameType: "MATCHED",
      gameVersion: "14.10.1",
      queueId: 420,
      mapId: 11,
      platformId: "NA1",
      ...info,
      participants,
    },
  };
}
