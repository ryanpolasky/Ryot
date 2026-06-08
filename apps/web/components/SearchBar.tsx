"use client";

import {
  type DDragonChampion,
  ddragonImg,
  PLATFORMS,
  PLATFORM_LABELS,
} from "@lc/shared";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  type ChampData,
  exactChampion,
  loadChampions,
  matchChampions,
} from "@/lib/champions";
import {
  addRecent,
  getMe,
  getRecents,
  type Me,
  type RecentSummoner,
} from "@/lib/recents";

const MAX_SUMMONERS = 4;
const MAX_CHAMPIONS = 5;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const SOURCE_LABEL: Record<RecentSummoner["source"], string> = {
  self: "you",
  teammate: "played with",
  search: "recent",
};

type Suggestion =
  | { kind: "champion"; key: string; champ: DDragonChampion }
  | { kind: "summoner"; key: string; rec: RecentSummoner };

export default function SearchBar({
  defaultRegion = "na1",
  initialQuery = "",
  autoFocus = false,
}: {
  defaultRegion?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [region, setRegion] = useState(defaultRegion);
  const [query, setQuery] = useState(initialQuery);
  const [recents, setRecents] = useState<RecentSummoner[]>([]);
  const [me, setMeState] = useState<Me | null>(null);
  const [champData, setChampData] = useState<ChampData | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecents(getRecents());
    setMeState(getMe());
    loadChampions()
      .then(setChampData)
      .catch(() => {});
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = norm(query);

    // Summoners: "me" pinned first, then recents, deduped, filtered by query.
    const pool: RecentSummoner[] = me
      ? [{ ...me, source: "self", ts: Number.MAX_SAFE_INTEGER }, ...recents]
      : recents;
    const seen = new Set<string>();
    const summoners: Suggestion[] = [];
    for (const r of pool) {
      const k = `${r.region}:${r.gameName}:${r.tagLine}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      if (q && !norm(`${r.gameName}#${r.tagLine}`).includes(q)) continue;
      summoners.push({ kind: "summoner", key: `s:${k}`, rec: r });
      if (summoners.length >= MAX_SUMMONERS) break;
    }

    // Champions: only once you're typing.
    const champions: Suggestion[] = q
      ? matchChampions(query, champData, MAX_CHAMPIONS).map((c) => ({
          kind: "champion" as const,
          key: `c:${c.id}`,
          champ: c,
        }))
      : [];

    return [...summoners, ...champions];
  }, [recents, me, champData, query]);

  useEffect(() => setActive(0), [query]);

  const showList = open && suggestions.length > 0;

  function goSummoner(
    r: string,
    name: string,
    tag: string,
    source: RecentSummoner["source"] = "search",
  ) {
    addRecent({ region: r, gameName: name, tagLine: tag, source });
    router.push(
      `/summoner/${r}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    );
    setOpen(false);
  }

  function goChampion(id: string) {
    router.push(`/build/${encodeURIComponent(id)}`);
    setOpen(false);
  }

  function pick(s: Suggestion) {
    if (s.kind === "champion") goChampion(s.champ.id);
    else goSummoner(s.rec.region, s.rec.gameName, s.rec.tagLine, s.rec.source);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (showList && suggestions[active]) {
      pick(suggestions[active]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    // Riot ID -> summoner.
    if (trimmed.includes("#")) {
      const [name, tag] = trimmed.split("#");
      if (name && tag) goSummoner(region, name, tag);
      return;
    }
    // Exact champion name -> build.
    const champ = exactChampion(trimmed, champData);
    if (champ) {
      goChampion(champ.id);
      return;
    }
    // Otherwise treat it as a summoner name using the region's tag.
    const tag = region.replace(/[0-9]/g, "").toUpperCase();
    if (tag) goSummoner(region, trimmed, tag);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full gap-2">
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="select shrink-0 font-mono text-xs uppercase tracking-wider"
        aria-label="Region"
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {PLATFORM_LABELS[p]}
          </option>
        ))}
      </select>

      <div className="relative min-w-0 flex-1">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setRecents(getRecents());
            setMeState(getMe());
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          placeholder="Riot ID or champion // Faker#KR1, Jinx"
          className="field w-full text-base"
          aria-label="Search a Riot ID or champion"
          autoFocus={autoFocus}
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
            {suggestions.map((s, i) => (
              <li
                key={s.key}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${
                  i === active ? "bg-gold/15 text-bone" : "text-muted"
                }`}
              >
                {s.kind === "champion" ? (
                  <>
                    <img
                      src={
                        champData
                          ? ddragonImg.champion(
                              champData.version,
                              s.champ.image.full,
                            )
                          : ""
                      }
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      className="h-6 w-6 shrink-0 border border-line"
                    />
                    <span className="min-w-0 truncate text-sm">
                      {s.champ.name}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                      build
                    </span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 truncate text-sm">
                      {s.rec.gameName}
                      <span className="text-faint"> #{s.rec.tagLine}</span>
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                      {s.rec.region} · {SOURCE_LABEL[s.rec.source]}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className="btn-primary shrink-0 px-5 sm:px-7">
        Search
      </button>
    </form>
  );
}
