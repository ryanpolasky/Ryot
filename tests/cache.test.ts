import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "../apps/server/src/cache";

describe("TtlCache", () => {
  it("returns fresh values and undefined once the TTL has passed", () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache();
      cache.set("k", 42, 10); // 10s TTL
      expect(cache.get<number>("k")).toBe(42);
      vi.advanceTimersByTime(11_000);
      expect(cache.get<number>("k")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("serves a stale value when the compute fn throws within the grace window", async () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache();
      await cache.wrap("k", 1, async () => "first");
      vi.advanceTimersByTime(2_000); // expired, still inside the 24h stale grace
      const v = await cache.wrap("k", 1, async () => {
        throw new Error("upstream down");
      });
      expect(v).toBe("first");
    } finally {
      vi.useRealTimers();
    }
  });

  it("evicts the least-recently-used entry once the cap is exceeded", () => {
    const cache = new TtlCache(2);
    cache.set("a", 1, 60);
    cache.set("b", 2, 60);
    // Touch "a" so "b" is now the least-recently-used.
    expect(cache.get<number>("a")).toBe(1);
    cache.set("c", 3, 60); // size would be 3 > cap 2 -> evict "b"
    expect(cache.get<number>("b")).toBeUndefined();
    expect(cache.get<number>("a")).toBe(1);
    expect(cache.get<number>("c")).toBe(3);
  });
});
