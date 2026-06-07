/**
 * Riot routing helpers.
 *
 * Riot's API uses two kinds of routing:
 *  - "platform" routing (na1, euw1, kr, ...) for summoner / league / spectator
 *  - "regional" routing (americas, asia, europe, sea) for match-v5 and account-v1
 */

export const PLATFORMS = [
  "na1",
  "br1",
  "la1",
  "la2",
  "oc1",
  "euw1",
  "eun1",
  "tr1",
  "ru",
  "kr",
  "jp1",
  "me1",
  "sg2",
  "tw2",
  "vn2",
  "ph2",
  "th2",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export type Regional = "americas" | "asia" | "europe" | "sea";

/** Human-friendly labels for the region selector in the UI. */
export const PLATFORM_LABELS: Record<Platform, string> = {
  na1: "NA",
  br1: "BR",
  la1: "LAN",
  la2: "LAS",
  oc1: "OCE",
  euw1: "EUW",
  eun1: "EUNE",
  tr1: "TR",
  ru: "RU",
  kr: "KR",
  jp1: "JP",
  me1: "ME",
  sg2: "SG",
  tw2: "TW",
  vn2: "VN",
  ph2: "PH",
  th2: "TH",
};

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

/** Cluster used by match-v5 (supports the SEA cluster). */
export function regionalForMatch(platform: Platform): Regional {
  switch (platform) {
    case "na1":
    case "br1":
    case "la1":
    case "la2":
      return "americas";
    case "kr":
    case "jp1":
      return "asia";
    case "euw1":
    case "eun1":
    case "tr1":
    case "ru":
    case "me1":
      return "europe";
    case "oc1":
    case "sg2":
    case "tw2":
    case "vn2":
    case "ph2":
    case "th2":
      return "sea";
  }
}

/**
 * Cluster used by account-v1 (Riot ID lookups).
 * account-v1 only routes through americas / asia / europe, so SEA platforms
 * are mapped to asia.
 */
export function regionalForAccount(
  platform: Platform,
): Exclude<Regional, "sea"> {
  const m = regionalForMatch(platform);
  return m === "sea" ? "asia" : m;
}
