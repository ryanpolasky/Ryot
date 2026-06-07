import { describe, expect, it } from "vitest";
import {
  type AllGameData,
  computeObjectiveTimers,
  detectMapMode,
  formatClock,
} from "../apps/overlay/src/liveclient";

function makeGame(over: Partial<AllGameData> = {}): AllGameData {
  return {
    allPlayers: [],
    events: { Events: [] },
    gameData: {
      gameMode: "CLASSIC",
      gameTime: 0,
      mapName: "Map11",
      mapNumber: 11,
    },
    ...over,
  };
}

describe("formatClock", () => {
  it("formats seconds as m:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
  });
});

describe("detectMapMode", () => {
  it("detects ARAM by map number 12", () => {
    const aram = makeGame({
      gameData: {
        gameMode: "ARAM",
        gameTime: 0,
        mapName: "Map12",
        mapNumber: 12,
      },
    });
    expect(detectMapMode(aram)).toBe("aram");
  });

  it("defaults to Summoner's Rift", () => {
    expect(detectMapMode(makeGame())).toBe("rift");
  });
});

describe("computeObjectiveTimers", () => {
  it("counts down to the first dragon at 5:00 before any kill", () => {
    const timers = computeObjectiveTimers(
      makeGame({
        gameData: {
          gameMode: "CLASSIC",
          gameTime: 60,
          mapName: "Map11",
          mapNumber: 11,
        },
      }),
    );
    const dragon = timers.find((t) => t.label === "Dragon");
    expect(dragon?.secondsUntil).toBe(240); // 300 - 60
  });

  it("schedules the next dragon 5:00 after the last kill", () => {
    const timers = computeObjectiveTimers(
      makeGame({
        gameData: {
          gameMode: "CLASSIC",
          gameTime: 700,
          mapName: "Map11",
          mapNumber: 11,
        },
        events: {
          Events: [{ EventID: 1, EventName: "DragonKill", EventTime: 600 }],
        },
      }),
    );
    const dragon = timers.find((t) => t.label === "Dragon");
    expect(dragon?.secondsUntil).toBe(200); // 600 + 300 - 700
  });
});
