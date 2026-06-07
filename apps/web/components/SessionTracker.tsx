import type { MatchDTO } from "@lc/shared";
import { currentSession, ddragonImg, type SessionTagTone } from "@lc/shared";

const TAG_TONE: Record<SessionTagTone, string> = {
  good: "border-win/50 text-win bg-win/[0.05]",
  bad: "border-loss/50 text-loss bg-loss/[0.05]",
  neutral: "border-line text-muted bg-surface2/40",
};

function fmtDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// "this session" panel built from recent matches, no extra api calls. ranked only.
export default function SessionTracker({
  matches,
  focusPuuid,
  version,
}: {
  matches: MatchDTO[];
  focusPuuid: string;
  version: string;
}) {
  const session = currentSession(matches, focusPuuid);
  if (!session || session.games.length < 2) return null;

  const {
    wins,
    losses,
    winRate,
    streakType,
    streakLen,
    netLpEst,
    tags,
    durationMs,
  } = session;
  const lpPositive = netLpEst >= 0;

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
          This Session
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint/60">
          · {session.games.length} games · {fmtDuration(durationMs)}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.id}
              title={t.description}
              className={`inline-flex items-center gap-1 border px-2 py-0.5 font-display text-[11px] uppercase tracking-wide ${TAG_TONE[t.tone]}`}
            >
              <span className="leading-none">{t.icon}</span>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="font-display text-3xl leading-none tracking-tightest">
            <span className="text-win">{wins}W</span>
            <span className="text-faint"> · </span>
            <span className="text-loss">{losses}L</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">
            <span className="stat text-bone">{Math.round(winRate * 100)}%</span>{" "}
            win rate
          </div>
        </div>

        <div>
          <div
            className={`font-display text-3xl leading-none tracking-tightest ${lpPositive ? "text-win" : "text-loss"}`}
          >
            {lpPositive ? "+" : ""}
            {netLpEst}
          </div>
          <div
            className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint"
            title="Riot's match API does not expose real LP changes, so this is an estimate (~21 per win, ~18 per loss)."
          >
            net LP <span className="text-faint/60">(est.)</span>
          </div>
        </div>

        {streakType && streakLen >= 2 && (
          <div>
            <div
              className={`font-display text-3xl leading-none tracking-tightest ${streakType === "W" ? "text-win" : "text-loss"}`}
            >
              {streakLen}
              {streakType}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">
              {streakType === "W" ? "win" : "loss"} streak
            </div>
          </div>
        )}

        {/* Per-game pip strip, newest on the right. */}
        <div className="ml-auto flex items-end gap-1">
          {[...session.games]
            .reverse()
            .slice(-12)
            .map((g) => (
              <div
                key={g.matchId}
                title={`${g.championName} · ${g.kills}/${g.deaths}/${g.assists} · ${g.win ? "Win" : "Loss"} (${g.lpDeltaEst > 0 ? "+" : ""}${g.lpDeltaEst} LP est.)`}
                className={`relative h-9 w-7 shrink-0 overflow-hidden border ${g.win ? "border-win/60" : "border-loss/60"}`}
              >
                <img
                  src={ddragonImg.champion(version, `${g.championName}.png`)}
                  alt={g.championName}
                  className="h-full w-full object-cover opacity-90"
                />
                <span
                  className={`absolute inset-x-0 bottom-0 h-1 ${g.win ? "bg-win" : "bg-loss"}`}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
