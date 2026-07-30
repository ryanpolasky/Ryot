import { describe, expect, it } from "vitest";
import type { DDragonChampion } from "../packages/shared/src/ddragon/ddragon";
import type { LcuGame } from "../apps/web/lib/desktop";
import {
  lcuGameToMatch,
  lcuGamesToMatches,
  mergeRecentMatches,
} from "../apps/web/lib/lcuMatches";
import { match } from "./helpers/match";

const byKey = new Map<string, DDragonChampion>([
  [
    "266",
    {
      id: "Aatrox",
      key: "266",
      name: "Aatrox",
      title: "the Darkin Blade",
      image: { full: "Aatrox.png" },
      tags: ["Fighter"],
    } as DDragonChampion,
  ],
]);

function lcuGame(over: Partial<LcuGame> = {}): LcuGame {
  return {
    gameId: 123,
    gameCreation: 1_700_000_000_000,
    gameDuration: 1800,
    gameMode: "ARAM",
    queueId: 450,
    platformId: "NA1",
    participants: [
      {
        participantId: 1,
        teamId: 100,
        championId: 266,
        spell1Id: 4,
        spell2Id: 32,
        stats: { win: true, kills: 7, deaths: 2, assists: 9 },
      },
    ],
    participantIdentities: [
      {
        participantId: 1,
        player: { puuid: "me", gameName: "Ryan", tagLine: "NA1" },
      },
    ],
    ...over,
  } as LcuGame;
}

describe("lcuGameToMatch", () => {
  it("builds a match-v5 id from platform and game id", () => {
    expect(lcuGameToMatch(lcuGame(), byKey).metadata.matchId).toBe("NA1_123");
  });

  it("resolves the champion display name from Data Dragon", () => {
    const m = lcuGameToMatch(lcuGame(), byKey);
    expect(m.info.participants[0]!.championName).toBe("Aatrox");
  });

  it("leaves the name blank for an unknown champion id", () => {
    const m = lcuGameToMatch(
      lcuGame({
        participants: [
          { participantId: 1, teamId: 100, championId: 9999, stats: {} },
        ],
      } as Partial<LcuGame>),
      byKey,
    );
    expect(m.info.participants[0]!.championName).toBe("");
  });

  it("normalises a millisecond gameDuration to seconds", () => {
    const m = lcuGameToMatch(lcuGame({ gameDuration: 1_800_000 }), byKey);
    expect(m.info.gameDuration).toBe(1800);
    expect(m.info.gameEndTimestamp).toBe(m.info.gameCreation + 1_800_000);
  });

  it("defaults missing stats to zero instead of undefined", () => {
    const m = lcuGameToMatch(
      lcuGame({
        participants: [
          { participantId: 1, teamId: 100, championId: 266, stats: {} },
        ],
      } as Partial<LcuGame>),
      byKey,
    );
    const p = m.info.participants[0]!;
    expect(p.kills).toBe(0);
    expect(p.goldEarned).toBe(0);
    expect(p.win).toBe(false);
  });
});

describe("lcuGamesToMatches", () => {
  it("skips malformed games rather than dropping the whole list", () => {
    const games = [
      lcuGame({ gameId: 1 }),
      { nonsense: true } as unknown as LcuGame,
      lcuGame({ gameId: 2 }),
    ];
    expect(lcuGamesToMatches(games, byKey).map((m) => m.metadata.matchId)).toEqual(
      ["NA1_1", "NA1_2"],
    );
  });
});

describe("mergeRecentMatches", () => {
  it("prefers the server row when both sources have a match", () => {
    const server = match({ matchId: "NA1_1", gameCreation: 2000 });
    const client = lcuGameToMatch(
      lcuGame({ gameId: 1, gameCreation: 2000 }),
      byKey,
    );
    const merged = mergeRecentMatches([client], [server]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(server);
  });

  it("fills gaps with client-only games, newest first", () => {
    const server = match({ matchId: "NA1_9", gameCreation: 1000 });
    const clientOnly = lcuGameToMatch(
      lcuGame({ gameId: 5, gameCreation: 5000 }),
      byKey,
    );
    const merged = mergeRecentMatches([clientOnly], [server]);
    expect(merged.map((m) => m.metadata.matchId)).toEqual(["NA1_5", "NA1_9"]);
  });
});
