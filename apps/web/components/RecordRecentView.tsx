"use client";

import { useEffect } from "react";
import { addRecent } from "@/lib/recents";

// Records a viewed summoner profile into local recent-search suggestions, so
// shared links and players opened from match history show up later (not just
// typed searches). Renders nothing.
export default function RecordRecentView({
  region,
  gameName,
  tagLine,
}: {
  region: string;
  gameName: string;
  tagLine: string;
}) {
  useEffect(() => {
    addRecent({ region, gameName, tagLine, source: "search" });
  }, [region, gameName, tagLine]);
  return null;
}
