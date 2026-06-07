"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChampionSearch({ current }: { current?: string }) {
  void current;
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = query.trim();
    if (!name) return;
    router.push(`/build/${encodeURIComponent(name)}`);
    setQuery("");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SEARCH CHAMPION // e.g. Jinx, Yasuo"
        className="field min-w-0 flex-1"
        aria-label="Champion name"
      />
      <button type="submit" className="btn-primary shrink-0">
        Go
      </button>
    </form>
  );
}
