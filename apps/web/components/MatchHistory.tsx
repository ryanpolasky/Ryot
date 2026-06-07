"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DDragonChampion, MatchDTO } from "@lc/shared";
import { ApiError, championMaps, getMatches } from "@/lib/api";
import { byokHeaders, hasByokKey } from "@/lib/byok";
import MatchRow from "@/components/MatchRow";

const PAGE_SIZE = 20;

type QueueFilter = {
  id: string;
  label: string;
  test: (queueId: number) => boolean;
};

// client-side queue grouping; server-side filtering avoided to keep the shared key safe
const QUEUE_FILTERS: QueueFilter[] = [
  { id: "all", label: "All", test: () => true },
  { id: "solo", label: "Solo", test: (q) => q === 420 },
  { id: "flex", label: "Flex", test: (q) => q === 440 },
  {
    id: "normal",
    label: "Normal",
    test: (q) => q === 400 || q === 430 || q === 490,
  },
  { id: "aram", label: "ARAM", test: (q) => q === 450 },
];

export default function MatchHistory({
  region,
  name,
  tag,
  puuid,
  version,
  champions,
  initial,
}: {
  region: string;
  name: string;
  tag: string;
  puuid: string;
  version: string;
  champions: DDragonChampion[];
  initial: MatchDTO[];
}) {
  const [matches, setMatches] = useState<MatchDTO[]>(initial);
  const [queue, setQueue] = useState("all");
  const [champ, setChamp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initial.length < PAGE_SIZE);
  // Read BYOK after mount to avoid a hydration mismatch (localStorage is
  // unavailable during SSR, so the server always renders the non-BYOK state).
  const [byok, setByok] = useState(false);
  useEffect(() => setByok(hasByokKey()), []);

  const { byKey } = useMemo(() => championMaps(champions), [champions]);

  const queueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of QUEUE_FILTERS) {
      counts[f.id] = matches.filter((m) => f.test(m.info.queueId)).length;
    }
    return counts;
  }, [matches]);

  const champOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      const me = m.info.participants.find((p) => p.puuid === puuid);
      if (me)
        counts.set(me.championName, (counts.get(me.championName) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [matches, puuid]);

  const visible = useMemo(() => {
    const f = QUEUE_FILTERS.find((x) => x.id === queue) ?? QUEUE_FILTERS[0];
    return matches.filter((m) => {
      if (!f.test(m.info.queueId)) return false;
      if (champ) {
        const me = m.info.participants.find((p) => p.puuid === puuid);
        if (!me || me.championName !== champ) return false;
      }
      return true;
    });
  }, [matches, queue, champ, puuid]);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await getMatches(region, puuid, PAGE_SIZE, {
        start: matches.length,
        headers: byokHeaders(),
      });
      const seen = new Set(matches.map((m) => m.metadata.matchId));
      const next = res.matches.filter((m) => !seen.has(m.metadata.matchId));
      setMatches((prev) => [...prev, ...next]);
      if (res.matches.length < PAGE_SIZE) setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't load more matches.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (initial.length === 0) {
    return (
      <div>
        <h2 className="kicker mb-3">Recent Matches</h2>
        <div className="card flex flex-col items-center p-8 text-center">
          <div className="font-display text-xl uppercase tracking-tightest text-bone">
            No recent matches
          </div>
          <p className="mt-2 max-w-md text-sm text-muted">
            This account hasn&apos;t played recently, or match history is
            private. New games show up here automatically once they&apos;re
            finished.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="kicker">Recent Matches</h2>

        <div className="flex flex-wrap items-center gap-1.5">
          {QUEUE_FILTERS.filter(
            (f) => f.id === "all" || queueCounts[f.id] > 0,
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setQueue(f.id)}
              aria-pressed={queue === f.id}
              className={queue === f.id ? "seg seg-active" : "seg"}
            >
              {f.label}
              <span className="ml-1.5 font-mono opacity-50">
                {queueCounts[f.id]}
              </span>
            </button>
          ))}
        </div>

        {champOptions.length > 1 && (
          <select
            value={champ}
            onChange={(e) => setChamp(e.target.value)}
            className="field w-full cursor-pointer py-2 font-mono text-xs uppercase tracking-wider sm:ml-auto sm:w-auto"
            aria-label="Filter by champion"
          >
            <option value="">All champions</option>
            {champOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          No games match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((m) => (
            <MatchRow
              key={m.metadata.matchId}
              match={m}
              focusPuuid={puuid}
              version={version}
              byKey={byKey}
              region={region}
              name={name}
              tag={tag}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="card mt-3 p-3 text-center text-sm text-loss">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        {!done && byok && (
          <button onClick={loadMore} disabled={loading} className="btn-outline">
            {loading ? "Loading\u2026" : "Load more"}
          </button>
        )}
        {!done && !byok && (
          <p className="text-center font-mono text-[11px] uppercase tracking-widest text-faint">
            Showing your 20 most recent games &middot;{" "}
            <Link
              href="/settings"
              className="text-gold/80 transition hover:text-gold"
            >
              Add your Riot key
            </Link>{" "}
            for full history
          </p>
        )}
        {done && matches.length > PAGE_SIZE && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
            End of match history
          </p>
        )}
      </div>
    </div>
  );
}
