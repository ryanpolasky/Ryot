"use client";

import {
  type DDragonChampion,
  ddragonImg,
  fetchChampions,
  getLatestVersion,
} from "@lc/shared";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

// Common shorthands players type for champions that don't prefix/substring
// match their display name (most do, e.g. "kha" -> Kha'Zix via the id).
const ALIASES: Record<string, string> = {
  mf: "MissFortune",
  tf: "TwistedFate",
  ww: "Warwick",
  asol: "AurelionSol",
  j4: "JarvanIV",
  yi: "MasterYi",
  lb: "Leblanc",
  gp: "Gangplank",
};

const MAX_RESULTS = 7;

// Strip case, spaces, and punctuation so "kha'zix" and "Khazix" both match.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type ChampData = { version: string; champions: DDragonChampion[] };

// Module-scoped cache so the ~170-entry list is fetched once per session, not
// on every mount. Data Dragon is CORS-enabled, so this runs in the browser.
let championCache: ChampData | null = null;
let championPromise: Promise<ChampData> | null = null;

function loadChampions(): Promise<ChampData> {
  if (championCache) return Promise.resolve(championCache);
  if (!championPromise) {
    championPromise = (async () => {
      const version = await getLatestVersion();
      const champions = await fetchChampions(version);
      championCache = { version, champions };
      return championCache;
    })();
    // Allow a retry on the next keystroke if the fetch fails.
    championPromise.catch(() => {
      championPromise = null;
    });
  }
  return championPromise;
}

export default function ChampionSearch({ current }: { current?: string }) {
  void current;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ChampData | null>(championCache);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    loadChampions()
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const results = useMemo<DDragonChampion[]>(() => {
    const q = norm(query);
    if (!q || !data) return [];
    const aliasId = ALIASES[q];
    return data.champions
      .map((c) => {
        const nName = norm(c.name);
        const nId = norm(c.id);
        let score = Infinity;
        if (aliasId && c.id === aliasId) score = -1;
        else if (nName.startsWith(q) || nId.startsWith(q)) score = 0;
        else if (nName.includes(q) || nId.includes(q)) score = 1;
        return { c, score };
      })
      .filter((x) => x.score < Infinity)
      .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
      .slice(0, MAX_RESULTS)
      .map((x) => x.c);
  }, [query, data]);

  // Reset the highlight whenever the query (and thus the result set) changes.
  useEffect(() => setActive(0), [query]);

  const showList = open && results.length > 0;

  function go(champ: DDragonChampion) {
    router.push(`/build/${encodeURIComponent(champ.id)}`);
    setQuery("");
    setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (showList && results[active]) {
      go(results[active]);
      return;
    }
    const name = query.trim();
    if (!name) return;
    router.push(`/build/${encodeURIComponent(name)}`);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          placeholder="SEARCH CHAMPION // e.g. Jinx, Yasuo"
          className="field w-full"
          aria-label="Champion name"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={
            showList ? `${listId}-opt-${active}` : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="card absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-auto py-1"
          >
            {results.map((c, i) => (
              <li
                key={c.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  // Keep focus so the blur handler doesn't close us first.
                  e.preventDefault();
                  go(c);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                  i === active ? "bg-gold/15 text-bone" : "text-muted"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    data ? ddragonImg.champion(data.version, c.image.full) : ""
                  }
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  className="h-7 w-7 shrink-0 border border-line"
                />
                <span className="truncate text-sm">{c.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" className="btn-primary shrink-0">
        Go
      </button>
    </form>
  );
}
