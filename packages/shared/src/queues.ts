/** Common League queue ids -> readable names. */
export const QUEUE_NAMES: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  480: "Swiftplay",
  490: "Quickplay",
  700: "Clash",
  720: "ARAM Clash",
  830: "Co-op vs AI (Intro)",
  840: "Co-op vs AI (Beginner)",
  850: "Co-op vs AI (Intermediate)",
  900: "ARURF",
  1020: "One for All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
  1700: "Arena",
  1900: "URF",
  2300: "Brawl",
  2400: "ARAM: Mayhem",
};

export function queueName(queueId: number): string {
  return QUEUE_NAMES[queueId] ?? `Queue ${queueId}`;
}

/** Map match-v5 teamPosition -> short role label. */
export const POSITION_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
  "": "",
};
