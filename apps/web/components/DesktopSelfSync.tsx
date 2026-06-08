"use client";

import { useEffect } from "react";
import { getMatches } from "@/lib/api";
import type { RyotCurrentSummoner } from "@/lib/desktop";
import { addRecents, getMe, setMe } from "@/lib/recents";

const SYNC_KEY = "ryot.selfsync.ts";
const SYNC_EVERY_MS = 30 * 60_000;

// Desktop-only: pin the signed-in account ("you") and seed search suggestions
// with the players from your recent games ("played with"). A no-op in a normal
// browser (no window.ryot). Renders nothing.
export default function DesktopSelfSync() {
  useEffect(() => {
    const bridge = window.ryot;
    if (!bridge?.isDesktop || !bridge.getCurrentSummoner) return;
    const getSelf = bridge.getCurrentSummoner;

    let cancelled = false;
    void (async () => {
      let me: RyotCurrentSummoner | null = null;
      try {
        me = await getSelf();
      } catch {
        return;
      }
      if (cancelled || !me || !me.gameName || !me.tagLine) return;

      const region = me.platform;
      const puuid = me.puuid;
      const selfEntry = {
        region,
        gameName: me.gameName,
        tagLine: me.tagLine,
      };

      // Pin yourself. Respect a manually-set "me"; otherwise adopt the client's.
      if (getMe()) addRecents([{ ...selfEntry, source: "self" }]);
      else setMe(selfEntry);

      // Harvest recent co-players, throttled (this one hits the match API).
      const last = Number(localStorage.getItem(SYNC_KEY) ?? 0);
      if (!puuid || Date.now() - last < SYNC_EVERY_MS) return;

      try {
        const { matches } = await getMatches(region, puuid, 10);
        if (cancelled) return;
        const seen = new Set<string>();
        const coPlayers = matches
          .flatMap((m) => m.info.participants)
          .filter(
            (p) => p.puuid !== puuid && p.riotIdGameName && p.riotIdTagline,
          )
          .map((p) => ({
            region,
            gameName: p.riotIdGameName!,
            tagLine: p.riotIdTagline!,
            source: "teammate" as const,
          }))
          .filter((e) => {
            const k = `${e.gameName}#${e.tagLine}`.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        addRecents(coPlayers);
        localStorage.setItem(SYNC_KEY, String(Date.now()));
      } catch {
        /* best-effort: a missing key / rate limit just skips the harvest */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
