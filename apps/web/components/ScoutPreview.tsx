"use client";

import type { DDragonChampion } from "@lc/shared";
import { useEffect, useState } from "react";
import { championMaps, getChampions, type ScoutParticipant } from "@/lib/api";
import { TeamColumn } from "@/components/LiveScout";

function entry(tier: string, rank: string, wins: number, losses: number) {
  return {
    leagueId: "x",
    queueType: "RANKED_SOLO_5x5",
    tier,
    rank,
    leaguePoints: 50,
    wins,
    losses,
    hotStreak: false,
    veteran: false,
    freshBlood: false,
    inactive: false,
  };
}

function f(s: string): boolean[] {
  return s.split("").map((c) => c === "w");
}

// Mock current-game lobby with lane-opponent deep compare data (#8).
const BLUE: ScoutParticipant[] = [
  {
    puuid: "b1",
    championId: 122,
    teamId: 100,
    spell1Id: 4,
    spell2Id: 12,
    gameName: "Lethal Tempo",
    tagLine: "NA1",
    ranked: [entry("EMERALD", "II", 142, 121)],
    recent: {
      form: f("wwlwwwlw"),
      mainChamp: { championId: 122, championName: "Darius", games: 6 },
      onPick: { championId: 122, games: 9, wins: 6 },
    },
  },
  {
    puuid: "b2",
    championId: 64,
    teamId: 100,
    spell1Id: 4,
    spell2Id: 11,
    gameName: "middiff enjoyer",
    tagLine: "NA1",
    premade: { group: 1, size: 2, sharedGames: 14 },
    ranked: [entry("DIAMOND", "IV", 88, 73)],
    recent: {
      form: f("wwwwlw"),
      mainChamp: { championId: 64, championName: "Lee Sin", games: 5 },
      onPick: { championId: 64, games: 11, wins: 7 },
    },
  },
  {
    puuid: "b3",
    championId: 103,
    teamId: 100,
    spell1Id: 4,
    spell2Id: 14,
    gameName: "nine tails",
    tagLine: "EUW",
    premade: { group: 1, size: 2, sharedGames: 14 },
    ranked: [entry("DIAMOND", "III", 210, 188)],
    recent: {
      form: f("lwlwl"),
      mainChamp: { championId: 103, championName: "Ahri", games: 4 },
      onPick: { championId: 103, games: 13, wins: 5 },
    },
  },
  {
    puuid: "b4",
    championId: 222,
    teamId: 100,
    spell1Id: 4,
    spell2Id: 7,
    gameName: "rocket jumper",
    tagLine: "NA1",
    ranked: [entry("PLATINUM", "I", 64, 59)],
    recent: {
      form: f("wwwl"),
      mainChamp: { championId: 222, championName: "Jinx", games: 3 },
      onPick: { championId: 222, games: 8, wins: 5 },
    },
  },
  {
    puuid: "b5",
    championId: 412,
    teamId: 100,
    spell1Id: 4,
    spell2Id: 14,
    gameName: "hook or feed",
    tagLine: "NA1",
    ranked: [entry("EMERALD", "IV", 51, 44)],
    recent: {
      form: f("lwwwww"),
      mainChamp: { championId: 412, championName: "Thresh", games: 6 },
      onPick: { championId: 412, games: 12, wins: 8 },
    },
  },
];

const RED: ScoutParticipant[] = [
  {
    puuid: "r1",
    championId: 86,
    teamId: 200,
    spell1Id: 4,
    spell2Id: 12,
    gameName: "demacia",
    tagLine: "NA1",
    ranked: [entry("EMERALD", "III", 99, 101)],
    recent: {
      form: f("llwll"),
      mainChamp: { championId: 86, championName: "Garen", games: 4 },
      onPick: { championId: 86, games: 7, wins: 2 },
    },
  },
  {
    puuid: "r2",
    championId: 121,
    teamId: 200,
    spell1Id: 4,
    spell2Id: 11,
    gameName: "evolve now",
    tagLine: "NA1",
    premade: { group: 1, size: 3, sharedGames: 27 },
    ranked: [entry("DIAMOND", "II", 176, 150)],
    recent: {
      form: f("wwwwwl"),
      mainChamp: { championId: 121, championName: "Kha'Zix", games: 6 },
      onPick: { championId: 121, games: 14, wins: 9 },
    },
  },
  {
    puuid: "r3",
    championId: 238,
    teamId: 200,
    spell1Id: 4,
    spell2Id: 14,
    gameName: "shadow step",
    tagLine: "NA1",
    premade: { group: 1, size: 3, sharedGames: 27 },
    ranked: [entry("DIAMOND", "I", 240, 205)],
    recent: {
      form: f("wlwwwl"),
      mainChamp: { championId: 238, championName: "Zed", games: 5 },
      onPick: { championId: 238, games: 15, wins: 10 },
    },
  },
  {
    puuid: "r4",
    championId: 51,
    teamId: 200,
    spell1Id: 4,
    spell2Id: 7,
    gameName: "96 percent",
    tagLine: "NA1",
    premade: { group: 1, size: 3, sharedGames: 27 },
    ranked: [entry("PLATINUM", "II", 70, 81)],
    recent: {
      form: f("llwlw"),
      mainChamp: { championId: 51, championName: "Caitlyn", games: 5 },
      onPick: { championId: 51, games: 9, wins: 3 },
    },
  },
  {
    puuid: "r5",
    championId: 555,
    teamId: 200,
    spell1Id: 4,
    spell2Id: 14,
    gameName: "blood price",
    tagLine: "NA1",
    ranked: [entry("EMERALD", "I", 58, 47)],
    recent: {
      form: f("wwlww"),
      mainChamp: { championId: 555, championName: "Pyke", games: 5 },
      onPick: { championId: 555, games: 10, wins: 6 },
    },
  },
];

export default function ScoutPreview() {
  const [byKey, setByKey] = useState<Map<string, DDragonChampion>>(new Map());
  const [version, setVersion] = useState("15.13.1");

  useEffect(() => {
    getChampions().then((c) => {
      setByKey(championMaps(c.champions).byKey);
      setVersion(c.version);
    });
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TeamColumn
        title="Blue Team"
        tone="win"
        players={BLUE}
        byKey={byKey}
        version={version}
        region="na1"
      />
      <TeamColumn
        title="Red Team"
        tone="loss"
        players={RED}
        byKey={byKey}
        version={version}
        region="na1"
      />
    </div>
  );
}
