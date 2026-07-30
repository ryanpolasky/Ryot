import { describe, expect, it } from "vitest";
import { computeMatchAwards } from "../packages/shared/src/awards";
import type { MatchParticipant } from "../packages/shared/src/riot/types";
import { match, participant } from "./helpers/match";

/** Two full teams; index 0 is the standout carry on the winning side. */
function lobby(over: Partial<MatchParticipant>[] = []) {
  const parts = Array.from({ length: 10 }, (_, i) =>
    participant({
      puuid: `p${i}`,
      championId: 1 + i,
      championName: `Champ${i}`,
      teamId: i < 5 ? 100 : 200,
      teamPosition: ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"][i % 5]!,
      win: i < 5,
      ...(over[i] ?? {}),
    }),
  );
  return match({ participants: parts });
}

describe("computeMatchAwards", () => {
  it("gives MVP to the top carry on the winning team", () => {
    const m = lobby([
      { totalDamageDealtToChampions: 60000, kills: 20, deaths: 1 },
    ]);
    const { all } = computeMatchAwards(m);
    const mvp = all.find((a) => a.id === "mvp");
    expect(mvp?.puuid).toBe("p0");
  });

  it("labels a hard-carrying loser as uncarriable", () => {
    const m = lobby([
      {},
      {},
      {},
      {},
      {},
      // p5 is on the losing team and massively outperforms his teammates.
      {
        totalDamageDealtToChampions: 90000,
        kills: 22,
        assists: 10,
        deaths: 2,
        goldEarned: 25000,
        visionScore: 40,
      },
      { totalDamageDealtToChampions: 1000, kills: 0, deaths: 10 },
      { totalDamageDealtToChampions: 1000, kills: 0, deaths: 10 },
      { totalDamageDealtToChampions: 1000, kills: 0, deaths: 10 },
      { totalDamageDealtToChampions: 1000, kills: 0, deaths: 10 },
    ]);
    const { all } = computeMatchAwards(m);
    const badge = all.find(
      (a) => a.id === "uncarriable" || a.id === "ace-loss",
    );
    expect(badge?.id).toBe("uncarriable");
    expect(badge?.puuid).toBe("p5");
  });

  it("normalises CS/min against a pre-11.20 millisecond duration", () => {
    // 300 CS over 30 minutes is 10 cs/min and clears the Farm Lord floor. With
    // the raw millisecond value the rate collapsed to ~0.01 and no award fired.
    const parts = Array.from({ length: 10 }, (_, i) =>
      participant({
        puuid: `p${i}`,
        teamId: i < 5 ? 100 : 200,
        teamPosition: "MIDDLE",
        win: i < 5,
        totalMinionsKilled: i === 0 ? 300 : 50,
      }),
    );
    const legacy = match({
      participants: parts,
      gameDuration: 1_800_000,
      gameEndTimestamp: undefined,
    });
    const farm = computeMatchAwards(legacy).all.find(
      (a) => a.id === "farm-lord",
    );
    expect(farm?.puuid).toBe("p0");
    expect(farm?.value).toBe("10.0 cs/m");
  });

  it("skips Farm Lord for supports", () => {
    const parts = Array.from({ length: 10 }, (_, i) =>
      participant({
        puuid: `p${i}`,
        teamId: i < 5 ? 100 : 200,
        teamPosition: i === 0 ? "UTILITY" : "MIDDLE",
        win: i < 5,
        totalMinionsKilled: i === 0 ? 400 : 10,
      }),
    );
    const awards = computeMatchAwards(match({ participants: parts }));
    expect(awards.all.find((a) => a.id === "farm-lord")).toBeUndefined();
  });

  it("indexes every badge by its recipient", () => {
    const m = lobby([{ totalDamageDealtToChampions: 60000, kills: 20 }]);
    const { all, byPuuid } = computeMatchAwards(m);
    for (const a of all) {
      expect(byPuuid[a.puuid]?.some((b) => b.id === a.id)).toBe(true);
    }
  });

  it("survives a zeroed-out lobby without dividing by zero", () => {
    const parts = Array.from({ length: 10 }, (_, i) =>
      participant({
        puuid: `p${i}`,
        teamId: i < 5 ? 100 : 200,
        win: i < 5,
        kills: 0,
        deaths: 0,
        assists: 0,
        goldEarned: 0,
        visionScore: 0,
        totalMinionsKilled: 0,
        neutralMinionsKilled: 0,
        totalDamageDealtToChampions: 0,
      }),
    );
    const { scores } = computeMatchAwards(match({ participants: parts }));
    for (const v of Object.values(scores)) expect(Number.isFinite(v)).toBe(true);
  });
});
