"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DDragonChampion, MatchDTO } from "@lc/shared";
import { ApiError, championMaps, getMatches } from "@/lib/api";
import { byokHeaders, hasByokKey } from "@/lib/byok";
import { ddragonVersionForGame, loadVersions } from "@/lib/champions";
import MatchRow from "@/components/MatchRow";
import { lcuGamesToMatches, mergeRecentMatches } from "@/lib/lcuMatches";
import "@/lib/desktop"; // window.ryot bridge typing

const PAGE_SIZE = 20;

type QueueFilter = {
  id: string;
  label: string;
  // match-v5 server-side filter; omitted = all queues. Lets deep-history queues
  // (e.g. ARAM) be pulled directly instead of waiting for them to page in.
  fetch?: { queue?: number; type?: string };
};

const QUEUE_FILTERS: QueueFilter[] = [
  { id: "all", label: "All" },
  { id: "solo", label: "Solo", fetch: { queue: 420 } },
  { id: "flex", label: "Flex", fetch: { queue: 440 } },
  { id: "normal", label: "Normal", fetch: { type: "normal" } },
  { id: "aram", label: "ARAM", fetch: { queue: 450 } },
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

  // Desktop only: recent games pulled from the local League Client, which
  // includes event/RGM modes (ARAM Mayhem, Brawl) that match-v5 never returns.
  const [lcu, setLcu] = useState<MatchDTO[]>([]);

  // Data Dragon version list, so each row can render with its own patch's icons.
  const [versions, setVersions] = useState<string[]>([]);
  useEffect(() => {
    loadVersions()
      .then(setVersions)
      .catch(() => {});
  }, []);

  const { byKey } = useMemo(() => championMaps(champions), [champions]);

  // Pull the signed-in user's client history (own profile only) and convert it
  // to the match-v5 shape. No-op in a normal browser or on someone else's page.
  useEffect(() => {
    const bridge = window.ryot;
    if (
      !bridge?.isDesktop ||
      !bridge.getLcuMatches ||
      !bridge.getCurrentSummoner
    )
      return;
    const getSelf = bridge.getCurrentSummoner;
    const getClientMatches = bridge.getLcuMatches;
    let cancelled = false;
    void (async () => {
      try {
        const me = await getSelf();
        if (cancelled || !me?.puuid || me.puuid !== puuid) return;
        const games = await getClientMatches(PAGE_SIZE);
        if (cancelled || !Array.isArray(games) || games.length === 0) return;
        setLcu(lcuGamesToMatches(games, byKey));
      } catch {
        /* client down / private history: silently skip */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [puuid, byKey]);

  // On the "All" view, pin client-only games on top of the server list.
  const display = useMemo(
    () =>
      queue === "all" && lcu.length > 0
        ? mergeRecentMatches(lcu, matches)
        : matches,
    [queue, lcu, matches],
  );

  // matchIds in the server (match-v5) list, so we can flag client-only games
  // (event/RGM modes) that have no match-v5 breakdown.
  const serverIds = useMemo(
    () => new Set(matches.map((m) => m.metadata.matchId)),
    [matches],
  );

  const champOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of display) {
      const me = m.info.participants.find((p) => p.puuid === puuid);
      if (me?.championName)
        counts.set(me.championName, (counts.get(me.championName) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [display, puuid]);

  const visible = useMemo(() => {
    if (!champ) return display;
    return display.filter((m) => {
      const me = m.info.participants.find((p) => p.puuid === puuid);
      return me?.championName === champ;
    });
  }, [display, champ, puuid]);

  // Fetch a page for the active queue. Switching queues replaces the list;
  // "Load more" appends. Queue filtering is server-side (match-v5 queue/type),
  // so deep-history queues like ARAM load directly.
  async function fetchPage(filterId: string, replace: boolean) {
    const f = QUEUE_FILTERS.find((x) => x.id === filterId) ?? QUEUE_FILTERS[0];
    setLoading(true);
    setError(null);
    try {
      const res = await getMatches(region, puuid, PAGE_SIZE, {
        start: replace ? 0 : matches.length,
        queue: f.fetch?.queue,
        type: f.fetch?.type,
        headers: byokHeaders(),
      });
      setMatches((prev) => {
        const base = replace ? [] : prev;
        const seen = new Set(base.map((m) => m.metadata.matchId));
        return [
          ...base,
          ...res.matches.filter((m) => !seen.has(m.metadata.matchId)),
        ];
      });
      setDone(res.matches.length < PAGE_SIZE);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load matches.");
    } finally {
      setLoading(false);
    }
  }

  function selectQueue(id: string) {
    if (id === queue) return;
    setQueue(id);
    setChamp("");
    setError(null);
    if (id === "all") {
      // Restore the server-rendered recent list without another request.
      setMatches(initial);
      setDone(initial.length < PAGE_SIZE);
    } else {
      setMatches([]);
      setDone(false);
      fetchPage(id, true);
    }
  }

  if (initial.length === 0 && lcu.length === 0) {
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
          {QUEUE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectQueue(f.id)}
              aria-pressed={queue === f.id}
              className={queue === f.id ? "seg seg-active" : "seg"}
            >
              {f.label}
            </button>
          ))}
        </div>

        {champOptions.length > 1 && (
          <select
            value={champ}
            onChange={(e) => setChamp(e.target.value)}
            className="select w-full py-2 font-mono text-xs uppercase tracking-wider sm:ml-auto sm:w-auto"
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

      {loading && matches.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[84px] w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          No games found for this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((m) => (
            <MatchRow
              key={m.metadata.matchId}
              match={m}
              focusPuuid={puuid}
              version={ddragonVersionForGame(
                m.info.gameVersion,
                versions,
                version,
              )}
              byKey={byKey}
              region={region}
              name={name}
              tag={tag}
              local={!serverIds.has(m.metadata.matchId)}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="card mt-3 p-3 text-center text-sm text-loss">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-2">
        {!done && visible.length > 0 && (
          <button
            onClick={() => fetchPage(queue, false)}
            disabled={loading}
            className="btn-outline"
          >
            {loading ? "Loading\u2026" : "Load more"}
          </button>
        )}
        {!done && !byok && (
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-faint">
            <Link
              href="/settings"
              className="text-gold/80 transition hover:text-gold"
            >
              Add your Riot key
            </Link>{" "}
            to page faster
          </p>
        )}
        {done && display.length > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
            End of match history
          </p>
        )}
      </div>
    </div>
  );
}
