"use client";

import { ddragonImg, type DDragonChampion } from "@lc/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getChampions } from "@/lib/api";
import { onIconError } from "@/lib/img";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function BuildIndexClient() {
  const [champions, setChampions] = useState<DDragonChampion[]>([]);
  const [version, setVersion] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    getChampions()
      .then((r) => {
        setVersion(r.version);
        setChampions(r.champions);
      })
      .catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query);
    const list = q
      ? champions.filter(
          (c) => norm(c.name).includes(q) || norm(c.id).includes(q),
        )
      : champions;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [champions, query]);

  return (
    <div className="animate-riseIn space-y-8">
      <section className="pt-4">
        <p className="eyebrow mb-4">// Champion builds</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          BUILDS
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          Pick a champion for the best runes, items, skill order, and counters,
          by role and rank, updated each patch.
        </p>
      </section>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search champions…"
        className="field w-full"
        aria-label="Search champions"
      />

      {error ? (
        <p className="text-sm text-loss">
          Couldn&apos;t load the champion list. Try reloading.
        </p>
      ) : champions.length === 0 ? (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 lg:grid-cols-9">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 lg:grid-cols-9">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/build/${encodeURIComponent(c.id)}`}
              title={c.name}
              className="group border border-line transition-colors hover:border-gold"
            >
              <img
                src={ddragonImg.champion(version, c.image.full)}
                alt={c.name}
                loading="lazy"
                decoding="async"
                onError={onIconError}
                className="aspect-square w-full object-cover"
              />
              <span className="block truncate px-1 py-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-muted group-hover:text-bone">
                {c.name}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-faint">
              No champion matches &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
