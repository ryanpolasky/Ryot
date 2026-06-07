import type { MatchDTO } from "@lc/shared";
import { ddragonImg, queueName } from "@lc/shared";

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// large post-game result headline (gold win / red loss) for the focused player
export default function ResultBanner({
  match,
  version,
  focusPuuid,
}: {
  match: MatchDTO;
  version: string;
  focusPuuid?: string;
}) {
  const me = focusPuuid
    ? match.info.participants.find((p) => p.puuid === focusPuuid)
    : undefined;
  if (!me) return null;

  const win = me.win;
  const cs = me.totalMinionsKilled + me.neutralMinionsKilled;
  const csPerMin = match.info.gameDuration
    ? (cs / (match.info.gameDuration / 60)).toFixed(1)
    : "0";
  const kda =
    me.deaths === 0
      ? "Perfect KDA"
      : `${((me.kills + me.assists) / me.deaths).toFixed(2)} KDA`;

  return (
    <div
      className={`card flex items-center gap-4 border-l-4 p-5 ${
        win ? "border-l-gold bg-gold/[0.05]" : "border-l-loss bg-loss/[0.05]"
      }`}
    >
      <img
        src={ddragonImg.champion(version, `${me.championName}.png`)}
        alt={me.championName}
        width={56}
        height={56}
        className={`shrink-0 border-2 ${win ? "border-gold" : "border-loss"}`}
      />
      <div className="min-w-0">
        <div
          className={`font-display text-4xl uppercase leading-none tracking-tightest sm:text-5xl ${
            win ? "text-gold" : "text-loss"
          }`}
        >
          {win ? "Victory" : "Defeat"}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span className="text-bone">{me.championName}</span>
          <span className="text-faint">·</span>
          <span className="stat text-bone">
            {me.kills}/{me.deaths}/{me.assists}
          </span>
          <span className="text-faint">({kda})</span>
          <span className="text-faint">·</span>
          <span>
            {cs} CS ({csPerMin}/m)
          </span>
          <span className="text-faint">·</span>
          <span>{queueName(match.info.queueId)}</span>
          <span className="text-faint">·</span>
          <span>{fmtDuration(match.info.gameDuration)}</span>
        </div>
      </div>
    </div>
  );
}
