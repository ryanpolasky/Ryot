import type { MatchDTO, MatchParticipant } from "@lc/shared";
import SessionTracker from "@/components/SessionTracker";
import ScoutPreview from "@/components/ScoutPreview";
import MatchAwards from "@/components/MatchAwards";
import ResultBanner from "@/components/ResultBanner";

const CHAMPS = ["Ahri", "Akali", "Sylas", "Viktor", "Orianna", "Zed", "Yasuo"];
let t = Date.now() - 7 * 3600 * 1000;

const BASE_P: Omit<
  MatchParticipant,
  | "puuid"
  | "championName"
  | "championId"
  | "teamId"
  | "teamPosition"
  | "win"
  | "kills"
  | "deaths"
  | "assists"
  | "totalMinionsKilled"
  | "neutralMinionsKilled"
  | "goldEarned"
  | "visionScore"
  | "totalDamageDealtToChampions"
  | "champLevel"
> = {
  item0: 0,
  item1: 0,
  item2: 0,
  item3: 0,
  item4: 0,
  item5: 0,
  item6: 0,
  summoner1Id: 4,
  summoner2Id: 14,
  perks: { styles: [], statPerks: { defense: 0, flex: 0, offense: 0 } },
};

function p(
  puuid: string,
  champ: string,
  id: number,
  team: 100 | 200,
  pos: string,
  win: boolean,
  k: number,
  d: number,
  a: number,
  cs: number,
  ncs: number,
  gold: number,
  vis: number,
  dmg: number,
): MatchParticipant {
  return {
    ...BASE_P,
    puuid,
    championName: champ,
    championId: id,
    champLevel: 16,
    teamId: team,
    teamPosition: pos,
    win,
    kills: k,
    deaths: d,
    assists: a,
    totalMinionsKilled: cs,
    neutralMinionsKilled: ncs,
    goldEarned: gold,
    visionScore: vis,
    totalDamageDealtToChampions: dmg,
  };
}

function mk(win: boolean, champ: string, i: number): MatchDTO {
  const gameCreation = t;
  t += (1800 + 25 * 60) * 1000;
  return {
    metadata: { matchId: `PRE_${i}`, participants: ["me"] },
    info: {
      gameCreation,
      gameDuration: 1800,
      gameEndTimestamp: gameCreation + 1800 * 1000,
      gameMode: "CLASSIC",
      gameType: "MATCHED",
      queueId: 420,
      mapId: 11,
      platformId: "NA1",
      participants: [
        p(
          "me",
          champ,
          1,
          100,
          "MIDDLE",
          win,
          win ? 9 : 4,
          win ? 3 : 8,
          7,
          190,
          8,
          13000,
          22,
          26000,
        ),
      ],
    },
  };
}

// L, W, W, W, W  -> Heater (newest is the last pushed; component reverses for display)
const results = [false, true, true, true, true];
const matches = results.map((w, i) => mk(w, CHAMPS[i % CHAMPS.length]!, i));

// Full 10-player match that triggers all award types for preview
const awardsMatch: MatchDTO = {
  metadata: { matchId: "AWARDS_PREVIEW", participants: ["me"] },
  info: {
    gameCreation: Date.now() - 3600_000,
    gameDuration: 1800,
    gameEndTimestamp: Date.now() - 1800_000,
    gameMode: "CLASSIC",
    gameType: "MATCHED",
    queueId: 420,
    mapId: 11,
    platformId: "NA1",
    participants: [
      // Team 100 (winners): Jinx MVP+Sharpshooter+Farm Lord, Ahri KDA King, Lee Unkillable, Thresh Playmaker+Vision God
      p(
        "p1",
        "Aatrox",
        266,
        100,
        "TOP",
        true,
        6,
        4,
        5,
        190,
        10,
        14000,
        16,
        20000,
      ),
      p(
        "p2",
        "LeeSin",
        64,
        100,
        "JUNGLE",
        true,
        5,
        1,
        7,
        55,
        5,
        12000,
        15,
        15000,
      ),
      p(
        "p3",
        "Ahri",
        103,
        100,
        "MIDDLE",
        true,
        8,
        0,
        10,
        175,
        5,
        15000,
        20,
        25000,
      ),
      p(
        "p4",
        "Jinx",
        222,
        100,
        "BOTTOM",
        true,
        14,
        2,
        8,
        220,
        10,
        17000,
        18,
        40000,
      ),
      p(
        "p5",
        "Thresh",
        412,
        100,
        "UTILITY",
        true,
        1,
        3,
        18,
        25,
        5,
        9000,
        42,
        8000,
      ),
      // Team 200 (losers): "me" (Zed) = Uncarriable, Caitlyn = Punching Bag
      p(
        "me",
        "Zed",
        238,
        200,
        "MIDDLE",
        false,
        12,
        3,
        6,
        160,
        10,
        14000,
        15,
        35000,
      ),
      p(
        "p7",
        "Darius",
        122,
        200,
        "TOP",
        false,
        3,
        7,
        2,
        160,
        10,
        11000,
        8,
        12000,
      ),
      p(
        "p8",
        "Nidalee",
        76,
        200,
        "JUNGLE",
        false,
        2,
        6,
        3,
        70,
        10,
        9000,
        12,
        10000,
      ),
      p(
        "p9",
        "Caitlyn",
        51,
        200,
        "BOTTOM",
        false,
        4,
        9,
        3,
        170,
        10,
        12000,
        14,
        18000,
      ),
      p(
        "p10",
        "Lulu",
        117,
        200,
        "UTILITY",
        false,
        0,
        5,
        8,
        20,
        0,
        7000,
        28,
        5000,
      ),
    ],
  },
};

export default function Preview() {
  return (
    <div className="space-y-6">
      <h1 className="kicker">Post-Game: Defeat (mock data)</h1>
      <ResultBanner match={awardsMatch} version="16.11.1" focusPuuid="me" />
      <MatchAwards match={awardsMatch} version="16.11.1" focusPuuid="me" />

      <h1 className="kicker">Post-Game: Victory (mock data)</h1>
      <ResultBanner match={awardsMatch} version="16.11.1" focusPuuid="p4" />
      <MatchAwards match={awardsMatch} version="16.11.1" focusPuuid="p4" />

      <h1 className="kicker">Live Scout preview (mock data)</h1>
      <ScoutPreview />

      <h1 className="kicker">Session Tracker preview (mock data)</h1>
      <SessionTracker matches={matches} focusPuuid="me" version="15.13.1" />
    </div>
  );
}
