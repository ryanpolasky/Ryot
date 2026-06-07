"use client";

import type { DDragonChampion } from "@lc/shared";
import { ddragonImg, queueName } from "@lc/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  championMaps,
  getChampions,
  getLive,
  type LiveGameResult,
  type ScoutParticipant,
} from "@/lib/api";
import { findQueue, rankLabel, tierColor, winrate } from "@/lib/format";
import { onIconError } from "@/lib/img";

const REFRESH_MS = 30_000;

export default function LiveScout({
  region,
  name,
  tag,
}: {
  region: string;
  name: string;
  tag: string;
}) {
  const [data, setData] = useState<LiveGameResult | null>(null);
  const [byKey, setByKey] = useState<Map<string, DDragonChampion>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const champLoaded = useRef(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) setLoading(true);
      try {
        const live = await getLive(region, name, tag);
        if (!champLoaded.current) {
          const champs = await getChampions();
          if (active) {
            setByKey(championMaps(champs.champions).byKey);
            champLoaded.current = true;
          }
        }
        if (active) {
          setData(live);
          setError(null);
          setUpdatedAt(Date.now());
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Failed to load live game.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    const t = setInterval(run, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [region, name, tag, tick]);

  const blue = data?.participants.filter((p) => p.teamId === 100) ?? [];
  const red = data?.participants.filter((p) => p.teamId === 200) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/summoner/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`}
          className="font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-bone"
        >
          ◂ {name}#{tag}
        </Link>
        <button
          onClick={() => setTick((t) => t + 1)}
          className="btn-ghost ml-auto"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {updatedAt && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            updated {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="card p-6 text-center text-sm text-loss">{error}</div>
      )}

      {!error && data && !data.found && (
        <div className="card flex flex-col items-center p-8 text-center">
          <div className="font-display text-xl uppercase tracking-tightest text-bone">
            Not in a game
          </div>
          <p className="mt-2 max-w-md text-sm text-muted">
            {name}#{tag} isn&apos;t in a live game right now. This page
            auto-refreshes every 30s, so leave it open and the scout will pop in
            the moment a game loads.
          </p>
        </div>
      )}

      {!error && data?.found && (
        <>
          <div className="kicker">
            {queueName(data.gameQueueConfigId ?? 0)} · {data.gameMode}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamColumn
              title="Blue Team"
              tone="win"
              players={blue}
              byKey={byKey}
              version={data.version}
              region={region}
            />
            <TeamColumn
              title="Red Team"
              tone="loss"
              players={red}
              byKey={byKey}
              version={data.version}
              region={region}
            />
          </div>
        </>
      )}

      {!data && !error && loading && (
        <>
          <div className="skeleton h-4 w-48" />
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((col) => (
              <div key={col} className="card overflow-hidden">
                <div className="border-b border-line px-4 py-2.5">
                  <div className="skeleton h-5 w-28" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-line/30 px-4 py-3 last:border-0"
                  >
                    <div className="skeleton h-9 w-9" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-32" />
                      <div className="skeleton h-2.5 w-20" />
                    </div>
                    <div className="skeleton h-3 w-10" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Distinct hues for premade groups within a team (Porofessor-style links).
const PREMADE_COLORS = ["#e8b558", "#5bc8a0", "#c77dff", "#ff8c69", "#6cb6ff"];
const STACK_LABEL: Record<number, string> = {
  2: "Duo",
  3: "Trio",
  4: "4-Stack",
  5: "5-Stack",
};

export function TeamColumn({
  title,
  tone,
  players,
  byKey,
  version,
  region,
}: {
  title: string;
  tone: "win" | "loss";
  players: ScoutParticipant[];
  byKey: Map<string, DDragonChampion>;
  version: string;
  region: string;
}) {
  const hasPremades = players.some((p) => p.premade);
  return (
    <div className="card overflow-hidden">
      <div
        className={`flex items-center border-b border-line px-4 py-2.5 font-display text-lg uppercase tracking-wide ${
          tone === "win" ? "text-win" : "text-loss"
        }`}
      >
        {title}
        {hasPremades && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-faint">
            premades detected
          </span>
        )}
      </div>
      <div className="divide-y divide-line">
        {players.map((p) => (
          <PlayerRow
            key={p.puuid}
            p={p}
            byKey={byKey}
            version={version}
            region={region}
            premadeColor={
              p.premade
                ? PREMADE_COLORS[(p.premade.group - 1) % PREMADE_COLORS.length]
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  byKey,
  version,
  region,
  premadeColor,
}: {
  p: ScoutParticipant;
  byKey: Map<string, DDragonChampion>;
  version: string;
  region: string;
  premadeColor?: string;
}) {
  const champ = byKey.get(String(p.championId));
  const solo = findQueue(p.ranked, "RANKED_SOLO_5x5");
  const wr = solo ? winrate(solo.wins, solo.losses) : null;
  const display = p.gameName
    ? `${p.gameName}#${p.tagLine}`
    : (p.summonerName ?? "Unknown");

  const recent = p.recent;
  const mainChamp = recent?.mainChamp
    ? byKey.get(String(recent.mainChamp.championId))
    : undefined;
  const onPick = recent?.onPick;
  const onPickWr =
    onPick && onPick.games > 0
      ? Math.round((onPick.wins / onPick.games) * 100)
      : null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={
        premadeColor
          ? { boxShadow: `inset 3px 0 0 ${premadeColor}` }
          : undefined
      }
    >
      <img
        src={ddragonImg.champion(version, champ?.image.full ?? "")}
        alt={champ?.name ?? "champ"}
        width={36}
        height={36}
        onError={onIconError}
        className="border border-line bg-surface2"
      />
      <div className="flex flex-1 flex-col">
        {p.gameName ? (
          <Link
            href={`/summoner/${region}/${encodeURIComponent(p.gameName)}/${encodeURIComponent(p.tagLine ?? "")}`}
            className="max-w-[200px] truncate text-sm font-medium hover:text-gold"
          >
            {display}
          </Link>
        ) : (
          <span className="max-w-[200px] truncate text-sm font-medium">
            {display}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: tierColor(solo?.tier) }}>
            {rankLabel(solo)}
          </span>
          {p.premade && premadeColor && (
            <span
              title={`Premade with ${p.premade.size - 1} teammate${p.premade.size - 1 === 1 ? "" : "s"} · ${p.premade.sharedGames} recent games together`}
              className="inline-flex items-center gap-1 border px-1.5 font-mono text-[9px] uppercase tracking-wider"
              style={{ color: premadeColor, borderColor: premadeColor }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: premadeColor }}
              />
              {STACK_LABEL[p.premade.size] ?? "Premade"}
            </span>
          )}
        </div>
        {recent && (recent.form.length > 0 || recent.mainChamp || onPick) && (
          <div className="mt-1 flex items-center gap-2">
            {recent.form.length > 0 && (
              <span
                className="flex items-center gap-0.5"
                title={`Recent form: ${recent.form.filter(Boolean).length}W ${recent.form.filter((w) => !w).length}L (last ${recent.form.length})`}
              >
                {recent.form.slice(0, 8).map((w, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${w ? "bg-win" : "bg-loss"}`}
                  />
                ))}
              </span>
            )}
            {recent.mainChamp && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[10px] text-faint"
                title={`Main this stretch: ${recent.mainChamp.championName} (${recent.mainChamp.games} of last ${recent.form.length})`}
              >
                {mainChamp && (
                  <img
                    src={ddragonImg.champion(
                      version,
                      mainChamp.image.full ?? "",
                    )}
                    alt={mainChamp.name}
                    width={14}
                    height={14}
                    onError={onIconError}
                    className="border border-line"
                  />
                )}
                {recent.mainChamp.championName}
              </span>
            )}
            {onPick && onPickWr !== null && (
              <span
                className={`font-mono text-[10px] ${onPickWr >= 50 ? "text-win" : "text-loss"}`}
                title={`${onPick.wins}W ${onPick.games - onPick.wins}L on this champion recently`}
              >
                {onPickWr}% on pick
              </span>
            )}
          </div>
        )}
      </div>
      {wr !== null && solo && (
        <div className="text-right">
          <div
            className={`stat text-sm font-bold ${wr >= 50 ? "text-win" : "text-loss"}`}
          >
            {wr}%
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {solo.wins + solo.losses} games
          </div>
        </div>
      )}
    </div>
  );
}
