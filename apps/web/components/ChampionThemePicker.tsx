"use client";

import {
  ddragonImg,
  type DDragonChampion,
  type DDragonSkin,
  fetchChampionSkins,
} from "@lc/shared";
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
  const [skins, setSkins] = useState<DDragonSkin[]>([]);
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

  // Once the version is known, load the active champion's skins so the skin
  // strip is present on reload, not only after a fresh pick.
  useEffect(() => {
    const t = getTheme();
    if (!version || !t) return;
    fetchChampionSkins(version, t.id)
      .then(setSkins)
      .catch(() => setSkins([]));
  }, [version]);

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

  async function loadSkins(id: string) {
    if (!version) return;
    try {
      setSkins(await fetchChampionSkins(version, id));
    } catch {
      setSkins([]);
    }
  }

  async function applyTheme(
    c: DDragonChampion,
    skinNum: number,
    skinName?: string,
  ) {
    setLoadingId(c.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/theme/${encodeURIComponent(c.id)}?skin=${skinNum}`,
      );
      if (!res.ok) throw new Error("theme request failed");
      const data = (await res.json()) as {
        accent: string;
        accent2: string;
        splash: string;
      };
      const theme: ChampionTheme = {
        id: c.id,
        name: c.name,
        skinNum,
        skinName,
        accent: data.accent,
        accent2: data.accent2,
        splash: data.splash,
      };
      setTheme(theme);
      setActive(theme);
    } catch {
      setError(`Couldn't theme with ${skinName ?? c.name}. Try again shortly.`);
    } finally {
      setLoadingId(null);
    }
  }

  // Picking a champion themes with its base skin and reveals its other skins.
  function pick(c: DDragonChampion) {
    applyTheme(c, 0);
    loadSkins(c.id);
  }

  function reset() {
    clearTheme();
    setActive(null);
    setSkins([]);
  }

  // Skin label without the redundant champion name ("PROJECT: Yasuo" -> "PROJECT:").
  function skinLabel(name: string, champName: string): string {
    if (name.toLowerCase() === "default") return "Default";
    const short = name.replace(champName, "").replace(/\s+/g, " ").trim();
    return short || name;
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
            Themed with{" "}
            <span className="text-bone">{active.skinName ?? active.name}</span>
          </div>
          <span
            className="ml-auto h-6 w-6 border border-line"
            style={{ background: `rgb(${active.accent})` }}
            aria-hidden
          />
        </div>
      )}

      {active && activeChamp && skins.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Skin
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {skins.map((s) => {
              const isActiveSkin = (active.skinNum ?? 0) === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() =>
                    applyTheme(
                      activeChamp,
                      s.num,
                      s.num === 0 ? undefined : s.name,
                    )
                  }
                  disabled={loadingId !== null}
                  aria-pressed={isActiveSkin}
                  title={skinLabel(s.name, activeChamp.name)}
                  className={`relative shrink-0 overflow-hidden border transition-colors disabled:opacity-60 ${
                    isActiveSkin
                      ? "border-gold"
                      : "border-line hover:border-gold/60"
                  }`}
                >
                  <img
                    src={ddragonImg.champLoading(activeChamp.id, s.num)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={onIconError}
                    className="h-24 w-[68px] object-cover object-top"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/75 px-1 py-0.5 text-center font-mono text-[9px] uppercase tracking-wide text-bone">
                    {skinLabel(s.name, activeChamp.name)}
                  </span>
                </button>
              );
            })}
          </div>
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
