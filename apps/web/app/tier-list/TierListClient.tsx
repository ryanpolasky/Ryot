"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiError,
  getAramTierList,
  getTierList,
  type AramTierListResult,
  type TierEntry,
  type TierListResult,
} from "@/lib/api";
import { onIconError } from "@/lib/img";

const ROLES = ["Top", "Jungle", "Mid", "Bottom", "Support"] as const;

const RANKS: { value: string; label: string }[] = [
  { value: "challenger", label: "Challenger" },
  { value: "master_plus", label: "Master+" },
  { value: "diamond_plus", label: "Diamond+" },
  { value: "emerald_plus", label: "Emerald+" },
  { value: "platinum_plus", label: "Platinum+" },
  { value: "overall", label: "All Ranks" },
];

const TIER_COLOR: Record<string, string> = {
  "S+": "text-gold2 border-gold2",
  S: "text-gold border-gold",
  A: "text-win border-win",
  B: "text-bone border-line",
  C: "text-muted border-line",
  D: "text-loss border-loss",
};

function wrColor(wr: number): string {
  if (wr >= 51.5) return "text-win";
  if (wr < 49) return "text-loss";
  return "text-bone";
}

type Queue = "rift" | "aram";

export default function TierListClient() {
  const [queue, setQueue] = useState<Queue>("rift");
  const [role, setRole] = useState<(typeof ROLES)[number]>("Mid");
  const [rank, setRank] = useState("emerald_plus");
  const [data, setData] = useState<TierListResult | null>(null);
  const [aram, setAram] = useState<AramTierListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const run =
      queue === "aram"
        ? getAramTierList().then((d) => active && setAram(d))
        : getTierList(rank).then((d) => active && setData(d));
    run
      .catch((err) => {
        if (active)
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load the tier list.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queue, rank]);

  const list: TierEntry[] =
    queue === "aram" ? (aram?.entries ?? []) : (data?.roles[role] ?? []);
  const patch = queue === "aram" ? aram?.patch : data?.patch;

  return (
    <div className="animate-riseIn space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="eyebrow mb-3">// Champion meta</p>
          <h1 className="font-display text-6xl uppercase tracking-tightest text-bone">
            Tier List
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {patch && (
            <span className="font-mono text-[11px] uppercase tracking-widest text-faint">
              patch {patch}
            </span>
          )}
          {queue === "rift" && (
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="field py-2 text-sm"
              aria-label="Rank filter"
            >
              {RANKS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Queue">
        {(["rift", "aram"] as Queue[]).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQueue(q)}
            aria-pressed={queue === q}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              queue === q ? "btn-primary" : "text-muted hover:text-bone"
            }`}
          >
            {q === "rift" ? "Summoner's Rift" : "ARAM"}
          </button>
        ))}
      </div>

      {queue === "rift" && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Role">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                role === r ? "btn-primary" : "text-muted hover:text-bone"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="card p-8 text-center text-sm text-muted">{error}</div>
      )}
      {loading && !error && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1.75rem_1.75rem_1fr_auto] items-center gap-2 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-faint sm:grid-cols-[2.5rem_2.5rem_1fr_auto_auto] sm:gap-3 sm:px-4">
            <span>#</span>
            <span>Tier</span>
            <span>Champion</span>
            <span className="w-16 text-right">Win %</span>
            <span className="hidden w-16 text-right sm:block">Pick %</span>
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.75rem_1.75rem_1fr_auto] items-center gap-2 border-b border-line/30 px-3 py-2 last:border-0 sm:grid-cols-[2.5rem_2.5rem_1fr_auto_auto] sm:gap-3 sm:px-4"
            >
              <div className="skeleton h-3 w-4" />
              <div className="skeleton h-6 w-6" />
              <div className="flex items-center gap-2">
                <div className="skeleton h-7 w-7" />
                <div className="skeleton h-3 w-28" />
              </div>
              <div className="skeleton h-3 w-12 justify-self-end" />
              <div className="skeleton hidden h-3 w-12 justify-self-end sm:block" />
            </div>
          ))}
          <div className="px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-faint">
            Building the tier list… first load aggregates every champion, then
            it&apos;s cached
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1.75rem_1.75rem_1fr_auto] items-center gap-2 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-faint sm:grid-cols-[2.5rem_2.5rem_1fr_auto_auto] sm:gap-3 sm:px-4">
            <span>#</span>
            <span>Tier</span>
            <span>Champion</span>
            <span className="w-16 text-right">Win %</span>
            <span className="hidden w-16 text-right sm:block">Pick %</span>
          </div>
          {list.map((c, i) => (
            <Link
              key={c.championId}
              href={
                queue === "aram"
                  ? `/build/${encodeURIComponent(c.champion)}`
                  : `/build/${encodeURIComponent(c.champion)}?role=${role.toLowerCase()}`
              }
              className="grid grid-cols-[1.75rem_1.75rem_1fr_auto] items-center gap-2 border-b border-line/30 px-3 py-2 text-sm transition-colors last:border-0 hover:bg-surface2 sm:grid-cols-[2.5rem_2.5rem_1fr_auto_auto] sm:gap-3 sm:px-4"
            >
              <span className="stat text-faint">{i + 1}</span>
              <span
                className={`flex h-6 w-6 items-center justify-center border font-display text-xs ${
                  TIER_COLOR[c.tier] ?? "text-muted border-line"
                }`}
              >
                {c.tier}
              </span>
              <span className="flex items-center gap-2">
                <img
                  src={c.championIcon}
                  alt={c.champion}
                  width={28}
                  height={28}
                  onError={onIconError}
                  className="border border-line"
                />
                <span className="truncate text-bone">{c.champion}</span>
              </span>
              <span className={`stat w-16 text-right ${wrColor(c.winRate)}`}>
                {c.winRate.toFixed(1)}%
              </span>
              <span className="stat hidden w-16 text-right text-muted sm:block">
                {c.pickShare.toFixed(1)}%
              </span>
            </Link>
          ))}
          {list.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">
              No data for this role yet.
            </div>
          )}
        </div>
      )}

      <p className="font-sans text-xs leading-relaxed text-faint">
        Win rate is exact from community data (u.gg), updated each patch.
        &quot;Pick %&quot; is a champion&apos;s share of games within its{" "}
        {queue === "aram" ? "queue" : "role"}. Click any champion for its full
        build.
      </p>
    </div>
  );
}
