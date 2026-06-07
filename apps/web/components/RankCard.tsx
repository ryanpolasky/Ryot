import type { LeagueEntryDTO } from "@lc/shared";
import { rankLabel, tierColor, winrate } from "@/lib/format";

const QUEUE_TITLES: Record<string, string> = {
  RANKED_SOLO_5x5: "Ranked Solo/Duo",
  RANKED_FLEX_SR: "Ranked Flex",
};

export default function RankCard({
  entry,
  queueType,
}: {
  entry?: LeagueEntryDTO;
  queueType: string;
}) {
  const title = QUEUE_TITLES[queueType] ?? queueType;
  if (!entry) {
    return (
      <div className="card flex-1 p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          {title}
        </div>
        <div className="mt-3 font-display text-2xl uppercase text-faint">
          Unranked
        </div>
      </div>
    );
  }
  const wr = winrate(entry.wins, entry.losses);
  const color = tierColor(entry.tier);
  return (
    <div className="card card-hover flex-1 overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          {title}
        </span>
        <span
          className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ color, backgroundColor: `${color}22` }}
        >
          {entry.tier}
        </span>
      </div>
      <div
        className="mt-2 font-display text-3xl uppercase leading-none"
        style={{ color }}
      >
        {rankLabel(entry)}
      </div>
      <div className="mt-4 flex items-center justify-between font-mono text-xs">
        <span className="text-muted">
          <span className="stat text-bone">{entry.wins}</span>W{" "}
          <span className="stat text-bone">{entry.losses}</span>L
        </span>
        <span
          className={`stat font-bold ${wr >= 50 ? "text-win" : "text-loss"}`}
        >
          {wr}%
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden bg-surface2">
        <div
          className={`h-full ${wr >= 50 ? "bg-win" : "bg-loss"}`}
          style={{ width: `${wr}%` }}
        />
      </div>
    </div>
  );
}
