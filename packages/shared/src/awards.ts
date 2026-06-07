/**
 * Post-game "awards": Porofessor-style superlatives computed purely from a
 * finished match (match-v5). No timeline or extra API calls needed: everything
 * is derived from the per-participant end-of-game stats.
 *
 * Two kinds of awards:
 * - Team MVP / "Uncarriable": the single best performer on each team, ranked by
 *   a blended carry score (damage, kill participation, gold, vision, deaths).
 * - Stat superlatives: lighthearted, individual bests across the whole lobby
 *   (Vision God, Sharpshooter, KDA King, Unkillable, Farm Lord, etc.).
 */
import type { MatchDTO, MatchParticipant } from "./riot/types.js";

export type AwardTone = "mvp" | "good" | "bad" | "neutral";

export interface Award {
  id: string;
  label: string;
  icon: string;
  tone: AwardTone;
  /** Short, human description of why this was earned. */
  description: string;
}

export interface AwardWinner extends Award {
  puuid: string;
  championName: string;
  /** Display value for the stat that won it (e.g. "32.4% dmg"). */
  value: string;
}

export interface MatchAwards {
  /** Every awarded badge with its recipient, ordered most → least prestigious. */
  all: AwardWinner[];
  /** Badges grouped by player for inline display next to each participant. */
  byPuuid: Record<string, Award[]>;
  /** Carry score per player (0-100-ish), exposed for sorting/debugging. */
  scores: Record<string, number>;
}

interface Derived {
  p: MatchParticipant;
  cs: number;
  csPerMin: number;
  kda: number;
  killParticipation: number; // (k+a) / team kills
  damageShare: number; // dmg / team dmg
  goldShare: number; // gold / team gold
  visionShare: number; // vision / team vision
  deathShare: number; // deaths / team deaths
  carry: number; // blended score
}

function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

function kdaValue(k: number, d: number, a: number): number {
  return d === 0 ? k + a : (k + a) / d;
}

function fmtPct(x: number): string {
  return `${Math.round(x * 1000) / 10}%`;
}

/** Build per-player derived metrics, normalised within each team. */
function derive(match: MatchDTO): Derived[] {
  const mins = Math.max(1, match.info.gameDuration / 60);
  const teamTotals = new Map<
    number,
    { kills: number; dmg: number; gold: number; vision: number; deaths: number }
  >();
  for (const p of match.info.participants) {
    const t = teamTotals.get(p.teamId) ?? {
      kills: 0,
      dmg: 0,
      gold: 0,
      vision: 0,
      deaths: 0,
    };
    t.kills += p.kills;
    t.dmg += p.totalDamageDealtToChampions;
    t.gold += p.goldEarned;
    t.vision += p.visionScore;
    t.deaths += p.deaths;
    teamTotals.set(p.teamId, t);
  }

  return match.info.participants.map((p) => {
    const t = teamTotals.get(p.teamId)!;
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
    const killParticipation = safeDiv(p.kills + p.assists, t.kills);
    const damageShare = safeDiv(p.totalDamageDealtToChampions, t.dmg);
    const goldShare = safeDiv(p.goldEarned, t.gold);
    const visionShare = safeDiv(p.visionScore, t.vision);
    const deathShare = safeDiv(p.deaths, t.deaths);
    // blended carry score scaled to ~0-100; damage + kill participation dominate
    const carry =
      100 *
      (0.34 * damageShare +
        0.26 * killParticipation +
        0.18 * goldShare +
        0.12 * visionShare -
        0.16 * deathShare);
    return {
      p,
      cs,
      csPerMin: cs / mins,
      kda: kdaValue(p.kills, p.deaths, p.assists),
      killParticipation,
      damageShare,
      goldShare,
      visionShare,
      deathShare,
      carry,
    };
  });
}

const SUPPORT = "UTILITY";

/**
 * Compute post-game awards for a finished match. Pure function, safe to run on
 * client or server. Arena / non-Summoner's-Rift modes still work but role-based
 * heuristics (Farm Lord) are skipped when positions are absent.
 */
export function computeMatchAwards(match: MatchDTO): MatchAwards {
  const d = derive(match);
  const scores: Record<string, number> = {};
  for (const x of d) scores[x.p.puuid] = Math.round(x.carry * 10) / 10;

  const all: AwardWinner[] = [];
  const byPuuid: Record<string, Award[]> = {};
  const add = (x: Derived, a: Award, value: string) => {
    const winner: AwardWinner = {
      ...a,
      puuid: x.p.puuid,
      championName: x.p.championName,
      value,
    };
    all.push(winner);
    (byPuuid[x.p.puuid] ??= []).push(a);
  };

  // ── Team MVP / Uncarriable ────────────────────────────────────────────────
  const teams = [...new Set(d.map((x) => x.p.teamId))];
  for (const teamId of teams) {
    const members = d.filter((x) => x.p.teamId === teamId);
    if (members.length === 0) continue;
    const best = members.reduce((a, b) => (b.carry > a.carry ? b : a));
    const won = best.p.win;
    if (won) {
      add(
        best,
        {
          id: "mvp",
          label: "MVP",
          icon: "★",
          tone: "mvp",
          description: "Best performance on the winning team.",
        },
        fmtPct(best.damageShare) + " dmg",
      );
    } else {
      // Did they clearly outperform their team? Then they were "uncarriable".
      const teamAvg =
        members.reduce((s, m) => s + m.carry, 0) / Math.max(1, members.length);
      const uncarriable = best.carry >= teamAvg * 1.35;
      add(
        best,
        uncarriable
          ? {
              id: "uncarriable",
              label: "Uncarriable Team",
              icon: "⚰",
              tone: "good",
              description: "Hard-carried, but the team lost anyway.",
            }
          : {
              id: "ace-loss",
              label: "Team Ace",
              icon: "✦",
              tone: "neutral",
              description: "Best performance on the losing team.",
            },
        fmtPct(best.damageShare) + " dmg",
      );
    }
  }

  // ── Individual superlatives (lobby-wide) ──────────────────────────────────
  const maxBy = <T>(arr: T[], f: (t: T) => number): T | undefined =>
    arr.length ? arr.reduce((a, b) => (f(b) > f(a) ? b : a)) : undefined;

  // Vision God: highest vision score (needs a real game length + threshold).
  const vision = maxBy(d, (x) => x.p.visionScore);
  if (vision && vision.p.visionScore >= 25) {
    add(
      vision,
      {
        id: "vision-god",
        label: "Vision God",
        icon: "👁",
        tone: "good",
        description: "Controlled the map. Highest vision score.",
      },
      `${vision.p.visionScore} vis`,
    );
  }

  // Sharpshooter: most damage to champions.
  const dmg = maxBy(d, (x) => x.p.totalDamageDealtToChampions);
  if (dmg && dmg.p.totalDamageDealtToChampions > 0) {
    add(
      dmg,
      {
        id: "sharpshooter",
        label: "Sharpshooter",
        icon: "🎯",
        tone: "good",
        description: "Dealt the most damage to champions.",
      },
      `${Math.round(dmg.p.totalDamageDealtToChampions / 1000)}k dmg`,
    );
  }

  // KDA King: best KDA, needs some involvement.
  const kdaKing = maxBy(
    d.filter((x) => x.p.kills + x.p.assists >= 5),
    (x) => x.kda,
  );
  if (kdaKing) {
    const k = kdaKing.p;
    add(
      kdaKing,
      {
        id: "kda-king",
        label: "KDA King",
        icon: "♔",
        tone: "good",
        description: "Highest kill/death/assist ratio.",
      },
      k.deaths === 0
        ? `${k.kills}/${k.deaths}/${k.assists} perfect`
        : `${kdaKing.kda.toFixed(1)} KDA`,
    );
  }

  // Unkillable: at most one death with real playtime.
  const unkillable = d
    .filter((x) => x.p.deaths <= 1 && x.p.kills + x.p.assists >= 5)
    .sort((a, b) => a.p.deaths - b.p.deaths || b.kda - a.kda)[0];
  if (unkillable && unkillable.p.puuid !== kdaKing?.p.puuid) {
    add(
      unkillable,
      {
        id: "unkillable",
        label: "Unkillable",
        icon: "🛡",
        tone: "good",
        description: "Barely died all game.",
      },
      `${unkillable.p.deaths} death${unkillable.p.deaths === 1 ? "" : "s"}`,
    );
  }

  // Farm Lord: highest CS/min among non-supports, with a real-farming floor.
  const farm = maxBy(
    d.filter((x) => x.p.teamPosition !== SUPPORT),
    (x) => x.csPerMin,
  );
  if (farm && farm.csPerMin >= 7) {
    add(
      farm,
      {
        id: "farm-lord",
        label: "Farm Lord",
        icon: "🌾",
        tone: "good",
        description: "Out-farmed the lobby.",
      },
      `${farm.csPerMin.toFixed(1)} cs/m`,
    );
  }

  // Playmaker: most assists (and notably more than the runner-up feel).
  const playmaker = maxBy(d, (x) => x.p.assists);
  if (
    playmaker &&
    playmaker.p.assists >= 12 &&
    playmaker.p.puuid !== kdaKing?.p.puuid
  ) {
    add(
      playmaker,
      {
        id: "playmaker",
        label: "Playmaker",
        icon: "🤝",
        tone: "good",
        description: "Always there for the team. Most assists.",
      },
      `${playmaker.p.assists} assists`,
    );
  }

  // Punching Bag: most deaths (only when it's egregious). Porofessor floats it.
  const deaths = maxBy(d, (x) => x.p.deaths);
  if (deaths && deaths.p.deaths >= 8) {
    add(
      deaths,
      {
        id: "punching-bag",
        label: "Punching Bag",
        icon: "💀",
        tone: "bad",
        description: "Fed a little too generously.",
      },
      `${deaths.p.deaths} deaths`,
    );
  }

  // Order: MVP/uncarriable first, then good, then neutral, then bad.
  const toneRank: Record<AwardTone, number> = {
    mvp: 0,
    good: 1,
    neutral: 2,
    bad: 3,
  };
  all.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]);

  return { all, byPuuid, scores };
}
