import type { LeagueEntryDTO } from "@lc/shared";

export function kda(k: number, d: number, a: number): string {
  const ratio = d === 0 ? k + a : (k + a) / d;
  return `${ratio.toFixed(2)}`;
}

export function winrate(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  return `${mo}mo ago`;
}

export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const TIER_COLORS: Record<string, string> = {
  IRON: "#6b6b6b",
  BRONZE: "#a05a2c",
  SILVER: "#9faecf",
  GOLD: "#e6c14b",
  PLATINUM: "#3fd0c9",
  EMERALD: "#33c267",
  DIAMOND: "#6f8bff",
  MASTER: "#c64bff",
  GRANDMASTER: "#e84057",
  CHALLENGER: "#f1d77a",
};

export function tierColor(tier?: string): string {
  return tier ? (TIER_COLORS[tier.toUpperCase()] ?? "#888") : "#888";
}

export function rankLabel(entry?: LeagueEntryDTO): string {
  if (!entry) return "Unranked";
  const apex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(entry.tier);
  const tier = entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase();
  return apex
    ? `${tier} ${entry.leaguePoints} LP`
    : `${tier} ${entry.rank} ${entry.leaguePoints} LP`;
}

export function findQueue(
  entries: LeagueEntryDTO[],
  queueType: string,
): LeagueEntryDTO | undefined {
  return entries.find((e) => e.queueType === queueType);
}
