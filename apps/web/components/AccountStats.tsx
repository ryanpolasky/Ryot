"use client";

import { ddragonImg } from "@lc/shared";
import { useEffect, useState } from "react";
import { ApiError, getAccountStats, type AccountStatsResult } from "@/lib/api";
import { byokHeaders, hasByokKey } from "@/lib/byok";
import { onIconError } from "@/lib/img";

const ROLE_LABEL: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

function wrColor(wr: number): string {
  if (wr >= 0.55) return "text-win";
  if (wr < 0.5) return "text-loss";
  return "text-gold2";
}

export default function AccountStats({
  region,
  name,
  tag,
  version,
}: {
  region: string;
  name: string;
  tag: string;
  version: string;
}) {
  const [data, setData] = useState<AccountStatsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load(sample: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await getAccountStats(
        region,
        name,
        tag,
        sample,
        byokHeaders(),
      );
      setData(res);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load stats.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-load a small sample on mount; BYOK users can expand it.
  useEffect(() => {
    load(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, name, tag]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="kicker">Champion Stats</h2>
        {data && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
            last {data.sampleSize} games
          </span>
        )}
        {hasByokKey() && (
          <button
            onClick={() => load(50)}
            disabled={loading}
            className="btn-ghost ml-auto px-3 py-1 text-[10px]"
          >
            {loading ? "Loading…" : "Analyze 50 games"}
          </button>
        )}
      </div>

      {error && (
        <div className="card p-6 text-center text-sm text-muted">{error}</div>
      )}

      {!error && loading && !loaded && (
        <div className="card p-6 text-center text-sm text-muted">
          Crunching recent games…
        </div>
      )}

      {data && !error && data.champions.length === 0 && (
        <div className="card flex flex-col items-center p-8 text-center">
          <div className="font-display text-xl uppercase tracking-tightest text-bone">
            No games to analyze yet
          </div>
          <p className="mt-2 max-w-md text-sm text-muted">
            We couldn&apos;t find any recent matches for this account. Play a
            game (or two) and the champion breakdown will show up here.
          </p>
        </div>
      )}

      {data && !error && data.champions.length > 0 && (
        <div className="space-y-4">
          {/* Overall + role distribution */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="card p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-faint">
                Overall
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`stat text-3xl ${wrColor(data.overall.winRate)}`}
                >
                  {Math.round(data.overall.winRate * 100)}%
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {data.overall.wins}W {data.overall.losses}L
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted">
                {data.overall.kda.toFixed(2)} KDA
              </div>
            </div>

            <div className="card p-4 lg:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-faint">
                Role Distribution
              </div>
              <div className="mt-3 space-y-1.5">
                {data.roles.map((r) => (
                  <div key={r.role} className="flex items-center gap-2">
                    <span className="w-14 font-mono text-[11px] uppercase text-muted">
                      {ROLE_LABEL[r.role] ?? r.role}
                    </span>
                    <div className="h-2 flex-1 bg-surface2">
                      <div
                        className="h-full bg-gold"
                        style={{ width: `${Math.round(r.share * 100)}%` }}
                      />
                    </div>
                    <span className="stat w-10 text-right text-[11px] text-muted">
                      {Math.round(r.share * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-champion table */}
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-faint">
              <span>Champion</span>
              <span className="w-16 text-right">Games</span>
              <span className="w-16 text-right">Win %</span>
              <span className="w-16 text-right">KDA</span>
            </div>
            {data.champions.slice(0, 10).map((c) => (
              <div
                key={c.championId}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-line/30 px-4 py-2 text-sm last:border-0"
              >
                <span className="flex items-center gap-2">
                  <img
                    src={ddragonImg.champion(version, `${c.championName}.png`)}
                    alt={c.championName}
                    width={28}
                    height={28}
                    onError={onIconError}
                    className="border border-line"
                  />
                  <span className="truncate text-bone">{c.championName}</span>
                </span>
                <span className="stat w-16 text-right text-muted">
                  {c.games}
                </span>
                <span className={`stat w-16 text-right ${wrColor(c.winRate)}`}>
                  {Math.round(c.winRate * 100)}%
                </span>
                <span className="stat w-16 text-right text-muted">
                  {c.kda.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Mastery */}
          {data.mastery.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">
                Top Mastery
              </div>
              <div className="flex flex-wrap gap-2">
                {data.mastery.slice(0, 8).map((m) => (
                  <div
                    key={m.championId}
                    className="card flex items-center gap-2 px-2 py-1.5"
                    title={`${m.points.toLocaleString()} pts`}
                  >
                    <img
                      src={ddragonImg.champion(
                        version,
                        `${m.championName}.png`,
                      )}
                      alt={m.championName}
                      width={24}
                      height={24}
                      onError={onIconError}
                      className="border border-line"
                    />
                    <span className="font-mono text-[10px] text-muted">
                      M{m.level} · {(m.points / 1000).toFixed(0)}k
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
