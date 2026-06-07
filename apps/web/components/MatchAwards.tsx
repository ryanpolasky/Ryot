import type { MatchDTO } from "@lc/shared";
import { computeMatchAwards, ddragonImg, type AwardTone } from "@lc/shared";

const TONE: Record<AwardTone, { ring: string; text: string; bg: string }> = {
  mvp: { ring: "border-gold", text: "text-gold", bg: "bg-gold/[0.06]" },
  good: { ring: "border-win/50", text: "text-win", bg: "bg-win/[0.04]" },
  bad: { ring: "border-loss/50", text: "text-loss", bg: "bg-loss/[0.04]" },
  neutral: { ring: "border-line", text: "text-muted", bg: "bg-surface2/40" },
};

// post-game superlatives computed from end-of-game stats, no extra api calls
export default function MatchAwards({
  match,
  version,
  focusPuuid,
}: {
  match: MatchDTO;
  version: string;
  focusPuuid?: string;
}) {
  const { all } = computeMatchAwards(match);
  if (all.length === 0) return null;

  return (
    <div className="card p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-faint">
        Post-Game Awards
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {all.map((a) => {
          const tone = TONE[a.tone];
          const isMe = focusPuuid && a.puuid === focusPuuid;
          return (
            <div
              key={`${a.id}-${a.puuid}`}
              title={a.description}
              className={`flex items-center gap-2 border ${tone.ring} ${tone.bg} p-2 ${
                isMe ? "ring-1 ring-gold/60" : ""
              }`}
            >
              <span className={`text-lg leading-none ${tone.text}`}>
                {a.icon}
              </span>
              <img
                src={ddragonImg.champion(version, `${a.championName}.png`)}
                alt={a.championName}
                width={28}
                height={28}
                className="shrink-0 border border-line"
              />
              <div className="min-w-0">
                <div
                  className={`truncate font-display text-xs uppercase ${tone.text}`}
                >
                  {a.label}
                </div>
                <div className="stat truncate text-[10px] text-faint">
                  {a.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
