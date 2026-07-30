import { describe, expect, it } from "vitest";
import {
  currentSession,
  splitSessions,
} from "../packages/shared/src/session";
import { match, participant } from "./helpers/match";

const ME = "me-puuid";
const MIN = 60_000;
const HOUR = 60 * MIN;

/** A ranked game for ME, `startedMinAgo` minutes ago, lasting 30 minutes. */
function game(
  id: string,
  startedMinAgo: number,
  win: boolean,
  over: Parameters<typeof match>[0] = {},
) {
  const gameCreation = Date.now() - startedMinAgo * MIN;
  return match({
    matchId: id,
    gameCreation,
    gameDuration: 1800,
    participants: [
      participant({ puuid: ME, win }),
      participant({ puuid: "other", teamId: 200, win: !win }),
    ],
    ...over,
  });
}

describe("splitSessions", () => {
  it("keeps back-to-back games in one session", () => {
    // Started 90 / 50 / 10 minutes ago, each 30 min long: ~20 min between games.
    const sessions = splitSessions(
      [game("a", 10, true), game("b", 50, false), game("c", 90, true)],
      ME,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.games.map((g) => g.matchId)).toEqual(["a", "b", "c"]);
    expect(sessions[0]!.wins).toBe(2);
    expect(sessions[0]!.losses).toBe(1);
  });

  it("splits on a gap longer than gapMinutes", () => {
    const sessions = splitSessions(
      [game("today", 10, true), game("yesterday", 60 * 24, false)],
      ME,
      { gapMinutes: 180 },
    );
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.games.map((g) => g.matchId)).toEqual(["today"]);
  });

  it("does not merge distant sessions from a pre-11.20 (ms) duration", () => {
    // Regression: gameDuration was multiplied by 1000 even when it was already
    // milliseconds, pushing the computed end ~16h into the future and swallowing
    // the real gap between two separate sittings.
    const now = Date.now();
    const legacy = match({
      matchId: "legacy",
      gameCreation: now - 20 * HOUR, // yesterday's sitting
      gameDuration: 1_800_000, // 30 min expressed in ms
      gameEndTimestamp: undefined,
      participants: [participant({ puuid: ME, win: true })],
    });
    // Old behaviour: 1_800_000 * 1000 put the "end" ~20 days in the future, so
    // the gap went negative and both games landed in one session.
    const sessions = splitSessions([game("recent", 10, true), legacy], ME, {
      gapMinutes: 180,
    });
    expect(sessions).toHaveLength(2);
  });

  it("ignores non-ranked queues unless rankedOnly is off", () => {
    const aram = game("aram", 10, true, { queueId: 450 });
    expect(splitSessions([aram], ME)).toHaveLength(0);
    expect(splitSessions([aram], ME, { rankedOnly: false })).toHaveLength(1);
  });

  it("ignores matches the focus player wasn't in", () => {
    const notMine = match({
      matchId: "someone-else",
      participants: [participant({ puuid: "stranger" })],
    });
    expect(splitSessions([notMine], ME)).toHaveLength(0);
  });
});

describe("currentSession", () => {
  it("returns null when there is nothing to summarise", () => {
    expect(currentSession([], ME)).toBeNull();
  });

  it("counts the streak from the newest game backwards", () => {
    const s = currentSession(
      [
        game("a", 10, true),
        game("b", 50, true),
        game("c", 90, true),
        game("d", 130, false),
      ],
      ME,
    );
    expect(s?.streakType).toBe("W");
    expect(s?.streakLen).toBe(3);
    expect(s?.tags.map((t) => t.id)).toContain("win-streak");
  });

  it("estimates net LP and always flags it as an estimate", () => {
    const s = currentSession([game("a", 10, true), game("b", 50, false)], ME, {
      lpPerWin: 20,
      lpPerLoss: 15,
    });
    expect(s?.netLpEst).toBe(5);
    expect(s?.lpEstimated).toBe(true);
  });
});
