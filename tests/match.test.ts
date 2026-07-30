import { describe, expect, it } from "vitest";
import {
  matchDurationMinutes,
  matchDurationSeconds,
  matchEndTimestamp,
} from "../packages/shared/src/match";
import { match } from "./helpers/match";

describe("matchDurationSeconds", () => {
  it("passes through seconds on modern matches", () => {
    expect(matchDurationSeconds(match({ gameDuration: 1830 }).info)).toBe(1830);
  });

  it("converts milliseconds on pre-11.20 matches (no gameEndTimestamp)", () => {
    // Riot reported gameDuration in ms before patch 11.20; those payloads are
    // identified by the missing gameEndTimestamp.
    const legacy = match({
      gameDuration: 1_830_000,
      gameEndTimestamp: undefined,
    });
    expect(matchDurationSeconds(legacy.info)).toBe(1830);
  });

  it("treats missing or nonsensical durations as zero", () => {
    expect(matchDurationSeconds(match({ gameDuration: 0 }).info)).toBe(0);
    expect(matchDurationSeconds(match({ gameDuration: -5 }).info)).toBe(0);
    expect(matchDurationSeconds(match({ gameDuration: NaN }).info)).toBe(0);
  });
});

describe("matchDurationMinutes", () => {
  it("never returns less than one minute so per-minute rates stay finite", () => {
    expect(matchDurationMinutes(match({ gameDuration: 1800 }).info)).toBe(30);
    expect(matchDurationMinutes(match({ gameDuration: 0 }).info)).toBe(1);
  });
});

describe("matchEndTimestamp", () => {
  it("uses the reported end timestamp when present", () => {
    const m = match({ gameCreation: 1000, gameDuration: 60 });
    expect(matchEndTimestamp(m.info)).toBe(1000 + 60_000);
  });

  it("derives the end from a normalised duration when absent", () => {
    const legacy = match({
      gameCreation: 1000,
      gameDuration: 60_000,
      gameEndTimestamp: undefined,
    });
    // 60_000 is milliseconds here, so the game ended 60s after creation - not
    // 60_000s (~16.7h) later, which is what naive `duration * 1000` produced.
    expect(matchEndTimestamp(legacy.info)).toBe(1000 + 60_000);
  });
});
