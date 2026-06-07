"use client";

import type { MatchParticipant } from "@lc/shared";
import { ddragonImg } from "@lc/shared";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getTimeline, type MatchTimelineResult } from "@/lib/api";
import { byokHeaders } from "@/lib/byok";
import { onIconError } from "@/lib/img";
import MatchAwards from "@/components/MatchAwards";
import ResultBanner from "@/components/ResultBanner";

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}

/** Minimal inline area chart of team gold/XP difference over time (blue lead = +). */
function DiffChart({
  values,
  height = 120,
}: {
  values: number[];
  height?: number;
}) {
  const width = 640;
  if (values.length < 2) return null;
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const stepX = width / (values.length - 1);
  const y = (v: number) => height / 2 - (v / max) * (height / 2 - 6);
  const pts = values.map((v, i) => `${i * stepX},${y(v)}`).join(" ");
  const area = `0,${height / 2} ${pts} ${width},${height / 2}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
    >
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="#26242b"
        strokeWidth="1"
      />
      <polygon points={area} fill="rgba(77,141,240,0.12)" />
      <polyline points={pts} fill="none" stroke="#4d8df0" strokeWidth="2" />
    </svg>
  );
}

export default function TimelineAnalytics({
  region,
  matchId,
  puuid,
}: {
  region: string;
  matchId: string;
  puuid?: string;
}) {
  const [data, setData] = useState<MatchTimelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTimeline(region, matchId, byokHeaders())
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load match timeline.",
        ),
      );
  }, [region, matchId]);

  const analysis = useMemo(() => {
    if (!data) return null;
    const { match, timeline } = data;
    const parts = match.info.participants;

    // map participantId -> teamId
    const idToTeam = new Map<number, number>();
    const idToPuuid = new Map<number, string>();
    for (const p of timeline.info.participants) {
      idToPuuid.set(p.participantId, p.puuid);
      const mp = parts.find((x) => x.puuid === p.puuid);
      if (mp) idToTeam.set(p.participantId, mp.teamId);
    }

    const me = puuid ? parts.find((p) => p.puuid === puuid) : undefined;
    const myTeam = me?.teamId ?? 100;

    // gold + xp diff per frame (my team - enemy)
    const goldDiff: number[] = [];
    const xpDiff: number[] = [];
    let csAt10: number | null = null;
    let csAt15: number | null = null;
    const myId = me
      ? [...idToPuuid.entries()].find(([, pu]) => pu === me.puuid)?.[0]
      : undefined;

    timeline.info.frames.forEach((frame, idx) => {
      let myGold = 0,
        enemyGold = 0,
        myXp = 0,
        enemyXp = 0;
      for (const [pid, pf] of Object.entries(frame.participantFrames)) {
        const id = Number(pid);
        const team = idToTeam.get(id);
        if (team === myTeam) {
          myGold += pf.totalGold;
          myXp += pf.xp;
        } else {
          enemyGold += pf.totalGold;
          enemyXp += pf.xp;
        }
        if (myId && id === myId) {
          const cs = pf.minionsKilled + pf.jungleMinionsKilled;
          if (idx === 10) csAt10 = cs;
          if (idx === 15) csAt15 = cs;
        }
      }
      goldDiff.push(myGold - enemyGold);
      xpDiff.push(myXp - enemyXp);
    });

    // damage share within my team (end of game)
    const myTeamParts = parts.filter((p) => p.teamId === myTeam);
    const teamDmg =
      myTeamParts.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) || 1;

    return {
      parts,
      me,
      goldDiff,
      xpDiff,
      csAt10,
      csAt15,
      myTeamParts,
      teamDmg,
    };
  }, [data, puuid]);

  if (error) {
    return (
      <div className="card p-8 text-center text-sm text-muted">{error}</div>
    );
  }
  if (!data || !analysis) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-28 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card space-y-2 p-4">
              <div className="skeleton h-2.5 w-16" />
              <div className="skeleton h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="card space-y-3 p-4">
          <div className="skeleton h-2.5 w-48" />
          <div className="skeleton h-24 w-full" />
        </div>
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-faint">
          Analyzing the timeline…
        </p>
      </div>
    );
  }

  const { me, goldDiff, xpDiff, csAt10, csAt15, myTeamParts, teamDmg } =
    analysis;
  const version = data.version;

  return (
    <div className="space-y-6">
      {/* big, unambiguous result headline */}
      <ResultBanner match={data.match} version={version} focusPuuid={puuid} />

      {/* post-game awards */}
      <MatchAwards match={data.match} version={version} focusPuuid={puuid} />

      {/* key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-faint">
            CS @10
          </div>
          <div className="stat mt-1 text-2xl text-bone">{csAt10 ?? "-"}</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-faint">
            CS @15
          </div>
          <div className="stat mt-1 text-2xl text-bone">{csAt15 ?? "-"}</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-faint">
            Final Gold Diff
          </div>
          <div
            className={`stat mt-1 text-2xl ${
              goldDiff[goldDiff.length - 1] >= 0 ? "text-win" : "text-loss"
            }`}
          >
            {goldDiff[goldDiff.length - 1] >= 0 ? "+" : ""}
            {fmtK(goldDiff[goldDiff.length - 1])}
          </div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-faint">
            Your Dmg Share
          </div>
          <div className="stat mt-1 text-2xl text-gold2">
            {me
              ? Math.round((me.totalDamageDealtToChampions / teamDmg) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* gold diff chart */}
      <div className="card p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">
          Team Gold Difference (your team − enemy)
        </div>
        <DiffChart values={goldDiff} />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-faint">
          <span>0:00</span>
          <span>{goldDiff.length - 1}:00</span>
        </div>
      </div>

      {/* xp diff chart */}
      <div className="card p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">
          Team XP Difference
        </div>
        <DiffChart values={xpDiff} />
      </div>

      {/* damage share by teammate */}
      <div className="card p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-faint">
          Damage Share · Your Team
        </div>
        <div className="space-y-2">
          {[...myTeamParts]
            .sort(
              (a, b) =>
                b.totalDamageDealtToChampions - a.totalDamageDealtToChampions,
            )
            .map((p: MatchParticipant) => {
              const share = p.totalDamageDealtToChampions / teamDmg;
              const isMe = me && p.puuid === me.puuid;
              return (
                <div key={p.puuid} className="flex items-center gap-2">
                  <img
                    src={ddragonImg.champion(version, `${p.championName}.png`)}
                    alt={p.championName}
                    width={24}
                    height={24}
                    onError={onIconError}
                    className={`border ${isMe ? "border-gold" : "border-line"}`}
                  />
                  <div className="h-3 flex-1 bg-surface2">
                    <div
                      className={`h-full ${isMe ? "bg-gold" : "bg-win/60"}`}
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </div>
                  <span className="stat w-20 text-right text-[11px] text-muted">
                    {fmtK(p.totalDamageDealtToChampions)} (
                    {Math.round(share * 100)}%)
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
