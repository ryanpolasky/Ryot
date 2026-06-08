"use client";

import { useEffect, useState } from "react";
import {
  clearRecents,
  getRecents,
  recentsEnabled,
  setRecentsEnabled,
} from "@/lib/recents";

export default function RecentsSettings() {
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setEnabled(recentsEnabled());
    setCount(getRecents().length);
  }, []);

  function toggle() {
    const next = !enabled;
    setRecentsEnabled(next);
    setEnabled(next);
    setCount(next ? getRecents().length : 0);
  }

  function clear() {
    clearRecents();
    setCount(0);
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
            Search suggestions
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Suggest summoners you&apos;ve recently searched (and, in the desktop
            app, you plus people you&apos;ve recently played with). Stored only
            in this browser and never sent anywhere.
          </p>
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={clear}
            className="btn-ghost ml-auto shrink-0 px-3 py-1.5 text-[11px]"
          >
            Clear {count}
          </button>
        )}
      </div>

      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-bone">
        <input
          type="checkbox"
          checked={enabled}
          onChange={toggle}
          className="h-4 w-4 accent-gold"
        />
        Show recent-search suggestions
      </label>
    </div>
  );
}
