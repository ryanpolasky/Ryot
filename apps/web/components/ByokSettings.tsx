"use client";

import { useEffect, useState } from "react";
import { clearByokKey, getByokKey, setByokKey } from "@/lib/byok";

export default function ByokSettings() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const k = getByokKey();
    setValue(k);
    setHasKey(k.length > 0);
  }, []);

  function save() {
    setByokKey(value);
    setHasKey(value.trim().length > 0);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function clear() {
    clearByokKey();
    setValue("");
    setHasKey(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
          Bring Your Own Key
        </h2>
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            hasKey ? "text-win" : "text-faint"
          }`}
        >
          {hasKey ? "● Active" : "○ Not set"}
        </span>
      </div>

      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted">
        Optional. Paste a Riot API key to unlock the heavier features (deep
        match timelines, analyzing more games at once) without leaning on the
        shared key. Your key is stored{" "}
        <span className="text-bone">only in this browser</span> and sent with
        the request that needs it. We don&apos;t store it, log it, or care about
        it; it&apos;s used for that one call and discarded.
      </p>

      <div className="mt-4 max-w-2xl rounded border border-line bg-surface/40 p-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-gold/90">
          Security note
        </p>
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-faint">
          The key is kept in this browser&apos;s{" "}
          <span className="text-bone">local storage</span>, so any script
          running on this page (a browser extension, or a future vulnerability
          on the site) could read it. Use a key you can{" "}
          <span className="text-bone">rotate</span>, never reuse your account
          password, and click <span className="text-bone">Remove</span> when on
          a shared or public computer.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="field min-w-[320px] flex-1 font-mono text-sm"
          aria-label="Riot API key"
          autoComplete="off"
          spellCheck={false}
        />
        <button onClick={save} className="btn-primary">
          {saved ? "Saved" : "Save key"}
        </button>
        {hasKey && (
          <button onClick={clear} className="btn-outline">
            Remove
          </button>
        )}
      </div>

      {value.trim().length > 0 && !value.trim().startsWith("RGAPI-") && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-loss">
          That doesn&apos;t look like a Riot key; they start with{" "}
          <span className="text-bone">RGAPI-</span>
        </p>
      )}

      <p className="mt-3 max-w-2xl font-sans text-xs leading-relaxed text-faint">
        <span className="text-bone">Tip:</span> register a{" "}
        <span className="text-bone">Personal</span> key, not a Development key.
        Dev keys expire every 24h, so you&apos;d have to re-paste daily.
      </p>

      <a
        href="https://developer.riotgames.com"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block font-mono text-[11px] uppercase tracking-widest text-gold/80 transition hover:text-gold"
      >
        Get a key at developer.riotgames.com ▸
      </a>
    </div>
  );
}
