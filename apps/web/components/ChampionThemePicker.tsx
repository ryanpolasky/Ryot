"use client";

import { ddragonImg, type DDragonChampion } from "@lc/shared";
import { useEffect, useMemo, useState } from "react";
import { getChampions } from "@/lib/api";
import { onIconError } from "@/lib/img";
import {
  clearTheme,
  getTheme,
  setTheme,
  type ChampionTheme,
} from "@/lib/theme";

export default function ChampionThemePicker() {
  const [champions, setChampions] = useState<DDragonChampion[]>([]);
  const [version, setVersion] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ChampionTheme | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActive(getTheme());
    getChampions()
      .then((r) => {
        setVersion(r.version);
        setChampions(r.champions);
      })
      .catch(() => setError("Couldn't load the champion list. Try reloading."));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? champions.filter((c) => c.name.toLowerCase().includes(q))
      : champions;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [champions, query]);

  const activeChamp = active
    ? champions.find((c) => c.id === active.id)
    : undefined;

  async function pick(c: DDragonChampion) {
    setLoadingId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/theme/${encodeURIComponent(c.id)}`);
      if (!res.ok) throw new Error("theme request failed");
      const data = (await res.json()) as {
        accent: string;
        accent2: string;
        splash: string;
      };
      const theme: ChampionTheme = {
        id: c.id,
        name: c.name,
        accent: data.accent,
        accent2: data.accent2,
        splash: data.splash,
      };
      setTheme(theme);
      setActive(theme);
    } catch {
      setError(`Couldn't theme with ${c.name}. Try again in a moment.`);
    } finally {
      setLoadingId(null);
    }
  }

  function reset() {
    clearTheme();
    setActive(null);
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
            Champion theme
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pick a champion to recolor Ryot and set their splash as your
            backdrop. Stored only in this browser.
          </p>
        </div>
        {active && (
          <button
            onClick={reset}
            className="btn-ghost ml-auto px-3 py-1.5 text-[11px]"
          >
            Reset to gold
          </button>
        )}
      </div>

      {active && (
        <div className="mt-4 flex items-center gap-3 border border-line bg-surface2 p-3">
          {version && activeChamp && (
            <img
              src={ddragonImg.champion(version, activeChamp.image.full)}
              alt={active.name}
              width={40}
              height={40}
              onError={onIconError}
              className="border border-gold"
            />
          )}
          <div className="font-mono text-xs uppercase tracking-wider text-muted">
            Themed with <span className="text-bone">{active.name}</span>
          </div>
          <span
            className="ml-auto h-6 w-6 border border-line"
            style={{ background: `rgb(${active.accent})` }}
            aria-hidden
          />
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search champions…"
        className="field mt-4 w-full"
        aria-label="Search champions to theme with"
      />

      {error && <p className="mt-2 text-sm text-loss">{error}</p>}

      {champions.length === 0 && !error ? (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid max-h-72 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
          {filtered.map((c) => {
            const isActive = active?.id === c.id;
            const isLoading = loadingId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                disabled={isLoading}
                title={c.name}
                aria-pressed={isActive}
                aria-label={`Theme with ${c.name}`}
                className={`group relative aspect-square overflow-hidden border transition-colors ${
                  isActive ? "border-gold" : "border-line hover:border-gold/60"
                }`}
              >
                <img
                  src={ddragonImg.champion(version || "", c.image.full)}
                  alt={c.name}
                  loading="lazy"
                  decoding="async"
                  onError={onIconError}
                  className={`h-full w-full object-cover transition ${
                    isLoading ? "opacity-40" : "group-hover:scale-105"
                  }`}
                />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-faint">
              No champion matches &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
