/**
 * Maps the region code the League Client reports (e.g. "NA", "EUW") to the
 * platform routing value Ryot uses in its summoner URLs (e.g. "na1", "euw1").
 */
const REGION_TO_PLATFORM: Record<string, string> = {
  NA: "na1",
  BR: "br1",
  EUNE: "eun1",
  EUW: "euw1",
  LAN: "la1",
  LAS: "la2",
  OCE: "oc1",
  RU: "ru",
  TR: "tr1",
  JP: "jp1",
  KR: "kr",
  PH: "ph2",
  SG: "sg2",
  TH: "th2",
  TW: "tw2",
  VN: "vn2",
};

export function regionToPlatform(region: string | undefined | null): string {
  if (!region) return "na1";
  const up = region.toUpperCase();
  // Already a platform value (e.g. "na1")?
  if (Object.values(REGION_TO_PLATFORM).includes(up.toLowerCase())) {
    return up.toLowerCase();
  }
  return REGION_TO_PLATFORM[up] ?? "na1";
}
