import { describe, expect, it } from "vitest";
import { isLoopbackOrPrivate } from "../apps/server/src/net";

describe("isLoopbackOrPrivate", () => {
  it("treats loopback and RFC1918 / unique-local ranges as internal", () => {
    const internal = [
      "127.0.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "::ffff:192.168.1.10",
      "10.0.0.5",
      "192.168.1.10",
      "172.16.0.1",
      "172.31.255.255",
      "fd00::1",
    ];
    for (const ip of internal) {
      expect(isLoopbackOrPrivate(ip), ip).toBe(true);
    }
  });

  it("treats public addresses as external (rate-limited)", () => {
    const external = [
      "8.8.8.8",
      "1.1.1.1",
      "172.15.0.1", // just below the private 172.16-31 block
      "172.32.0.1", // just above it
      "203.0.113.7",
      "2606:4700:4700::1111",
    ];
    for (const ip of external) {
      expect(isLoopbackOrPrivate(ip), ip).toBe(false);
    }
  });
});
