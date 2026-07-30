import { afterEach, describe, expect, it, vi } from "vitest";
import {
  duration,
  kda,
  rankLabel,
  timeAgo,
  tierColor,
  winrate,
} from "../apps/web/lib/format";

afterEach(() => vi.useRealTimers());

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const freeze = () => vi.useFakeTimers().setSystemTime(NOW);

describe("kda", () => {
  it("treats a deathless game as kills + assists", () => {
    expect(kda(10, 0, 5)).toBe("15.00");
  });

  it("formats the ratio to two decimals", () => {
    expect(kda(3, 2, 4)).toBe("3.50");
  });
});

describe("winrate", () => {
  it("returns 0 rather than NaN with no games played", () => {
    expect(winrate(0, 0)).toBe(0);
  });

  it("rounds to whole percent", () => {
    expect(winrate(1, 2)).toBe(33);
  });
});

describe("timeAgo", () => {
  it("never renders a negative age from clock skew", () => {
    freeze();
    // A match timestamp slightly ahead of the local clock used to print
    // "-1m ago".
    expect(timeAgo(NOW + 30_000)).toBe("just now");
  });

  it("collapses sub-minute ages to 'just now'", () => {
    freeze();
    expect(timeAgo(NOW - 30_000)).toBe("just now");
  });

  it("steps through minutes, hours, days and months", () => {
    freeze();
    expect(timeAgo(NOW - 5 * 60_000)).toBe("5m ago");
    expect(timeAgo(NOW - 3 * 3_600_000)).toBe("3h ago");
    expect(timeAgo(NOW - 2 * 86_400_000)).toBe("2d ago");
    expect(timeAgo(NOW - 65 * 86_400_000)).toBe("2mo ago");
  });
});

describe("duration", () => {
  it("formats seconds as m:ss", () => {
    expect(duration(0)).toBe("0:00");
    expect(duration(1830)).toBe("30:30");
  });

  it("clamps junk input instead of printing NaN", () => {
    expect(duration(-10)).toBe("0:00");
    expect(duration(NaN)).toBe("0:00");
  });
});

describe("tierColor", () => {
  it("is case-insensitive and falls back for unknown tiers", () => {
    expect(tierColor("gold")).toBe(tierColor("GOLD"));
    expect(tierColor("SOMETHING_NEW")).toBe("#888");
    expect(tierColor(undefined)).toBe("#888");
  });
});

describe("rankLabel", () => {
  const entry = (over: Record<string, unknown>) =>
    ({
      queueType: "RANKED_SOLO_5x5",
      tier: "GOLD",
      rank: "II",
      leaguePoints: 42,
      wins: 10,
      losses: 5,
      ...over,
    }) as Parameters<typeof rankLabel>[0];

  it("reads Unranked with no entry", () => {
    expect(rankLabel(undefined)).toBe("Unranked");
  });

  it("includes the division below Master", () => {
    expect(rankLabel(entry({}))).toBe("Gold II 42 LP");
  });

  it("omits the meaningless division in apex tiers", () => {
    expect(rankLabel(entry({ tier: "CHALLENGER", rank: "I" }))).toBe(
      "Challenger 42 LP",
    );
  });
});
