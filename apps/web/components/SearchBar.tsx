"use client";

import { PLATFORMS, PLATFORM_LABELS } from "@lc/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const [name, tag] = trimmed.includes("#")
      ? trimmed.split("#")
      : [trimmed, region.replace(/[0-9]/g, "").toUpperCase()];
    if (!name || !tag) return;
    router.push(
      `/summoner/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full gap-2">
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="field shrink-0 cursor-pointer font-mono text-xs uppercase tracking-wider"
        aria-label="Region"
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {PLATFORM_LABELS[p]}
          </option>
        ))}
      </select>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="RIOT ID // e.g. Faker#KR1"
        className="field min-w-0 flex-1 text-base"
        aria-label="Riot ID (name and tag)"
        autoFocus={autoFocus}
      />
      <button type="submit" className="btn-primary shrink-0 px-5 sm:px-7">
        Search
      </button>
    </form>
  );
}
