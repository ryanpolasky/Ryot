"use client";

import { PLATFORMS, PLATFORM_LABELS } from "@lc/shared";
import { useEffect, useState } from "react";
import { clearMe, getMe, type Me, setMe } from "@/lib/recents";

export default function MeSettings() {
  const [region, setRegion] = useState("na1");
  const [riotId, setRiotId] = useState("");
  const [saved, setSaved] = useState<Me | null>(null);

  useEffect(() => {
    const me = getMe();
    if (me) {
      setSaved(me);
      setRegion(me.region);
      setRiotId(`${me.gameName}#${me.tagLine}`);
    }
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const t = riotId.trim();
    const [name, tag] = t.includes("#") ? t.split("#") : [t, ""];
    if (!name || !tag) return;
    const me: Me = { region, gameName: name, tagLine: tag };
    setMe(me);
    setSaved(me);
  }

  function clear() {
    clearMe();
    setSaved(null);
    setRiotId("");
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
        Me
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Tell Ryot which account is yours and it&apos;ll pin to the top of your
        search suggestions. Stored only in this browser, it doesn&apos;t claim
        the account or send anything anywhere.
      </p>
      <form onSubmit={save} className="mt-4 flex flex-wrap gap-2">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="select shrink-0 font-mono text-xs uppercase tracking-wider"
          aria-label="Your region"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
        <input
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="Your Riot ID // Name#TAG"
          className="field min-w-0 flex-1"
          aria-label="Your Riot ID (name and tag)"
        />
        <button type="submit" className="btn-primary shrink-0">
          Save
        </button>
        {saved && (
          <button type="button" onClick={clear} className="btn-ghost shrink-0">
            Clear
          </button>
        )}
      </form>
      {saved && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-faint">
          Pinned:{" "}
          <span className="text-bone">
            {saved.gameName}#{saved.tagLine}
          </span>{" "}
          · {saved.region.toUpperCase()}
        </p>
      )}
    </div>
  );
}
