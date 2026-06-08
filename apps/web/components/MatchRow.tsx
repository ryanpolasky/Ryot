import type { DDragonChampion, MatchDTO, MatchParticipant } from "@lc/shared";
import { computeMatchAwards, ddragonImg, queueName } from "@lc/shared";
import { duration, kda, timeAgo } from "@/lib/format";
import { onIconError } from "@/lib/img";

const TONE_TEXT = {
  mvp: "border-gold/60 text-gold",
  good: "border-win/40 text-win",
  bad: "border-loss/40 text-loss",
  neutral: "border-line text-muted",
} as const;

function champFile(
  byKey: Map<string, DDragonChampion>,
  championId: number,
  championName: string,
): string {
  return byKey.get(String(championId))?.image.full ?? `${championName}.png`;
}

export default function MatchRow({
  match,
  focusPuuid,
  version,
  byKey,
  region,
  name,
  tag,
}: {
  match: MatchDTO;
  focusPuuid: string;
  version: string;
  byKey: Map<string, DDragonChampion>;
  region?: string;
  name?: string;
  tag?: string;
}) {
  const me = match.info.participants.find((p) => p.puuid === focusPuuid);
  if (!me) return null;

  const win = me.win;
  const cs = me.totalMinionsKilled + me.neutralMinionsKilled;
  const mins = match.info.gameDuration / 60;
  const items = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5];
  const blue = match.info.participants.filter((p) => p.teamId === 100);
  const red = match.info.participants.filter((p) => p.teamId === 200);
  const myBadges = computeMatchAwards(match).byPuuid[focusPuuid] ?? [];

  return (
    <div
      className={`card card-hover flex flex-wrap items-stretch gap-x-3 gap-y-2 overflow-hidden border-l-4 p-3 sm:flex-nowrap ${
        win ? "border-l-win bg-win/[0.04]" : "border-l-loss bg-loss/[0.04]"
      }`}
    >
      <div className="flex w-24 shrink-0 flex-col justify-center sm:w-28">
        <div className="truncate font-mono text-[10px] uppercase tracking-wider text-muted">
          {queueName(match.info.queueId)}
        </div>
        <div
          className={`font-display text-xl uppercase leading-tight ${win ? "text-win" : "text-loss"}`}
        >
          {win ? "Victory" : "Defeat"}
        </div>
        <div className="stat mt-0.5 truncate text-[11px] text-faint">
          {timeAgo(match.info.gameCreation)} ·{" "}
          {duration(match.info.gameDuration)}
        </div>
        {region && (
          <a
            href={`/match/${region}/${encodeURIComponent(match.metadata.matchId)}?puuid=${encodeURIComponent(
              focusPuuid,
            )}${name && tag ? `&name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}` : ""}`}
            className="mt-1 font-mono text-[10px] uppercase tracking-widest text-gold/80 transition hover:text-gold"
          >
            Breakdown ▸
          </a>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <a
          href={`/build/${encodeURIComponent(me.championName)}`}
          title={`${me.championName} build`}
        >
          <img
            src={ddragonImg.champion(
              version,
              champFile(byKey, me.championId, me.championName),
            )}
            alt={me.championName}
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            onError={onIconError}
            className="border border-line transition hover:border-gold"
          />
        </a>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {[me.summoner1Id, me.summoner2Id].map((sid, i) => {
              const url = ddragonImg.summonerSpell(version, sid);
              return url ? (
                <img
                  key={i}
                  src={url}
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                  onError={onIconError}
                  className="rounded"
                />
              ) : (
                <div key={i} className="h-5 w-5 bg-surface2" />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-36 shrink-0 flex-col justify-center">
        <div className="stat text-lg font-bold text-bone">
          {me.kills} <span className="text-faint">/</span>{" "}
          <span className="text-loss">{me.deaths}</span>{" "}
          <span className="text-faint">/</span> {me.assists}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
          <span className="stat text-bone">
            {kda(me.kills, me.deaths, me.assists)}
          </span>{" "}
          KDA
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
          <span className="stat">{cs}</span> CS ·{" "}
          <span className="stat">{(cs / Math.max(1, mins)).toFixed(1)}</span>/m
        </div>
        {myBadges.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {myBadges.map((b) => (
              <span
                key={b.id}
                title={b.description}
                className={`inline-flex items-center gap-1 border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${TONE_TEXT[b.tone]}`}
              >
                <span className="leading-none">{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full shrink-0 items-center gap-1 sm:ml-2 sm:w-auto">
        {items.map((id, i) => {
          const url = ddragonImg.item(version, id);
          return url ? (
            <img
              key={i}
              src={url}
              alt=""
              width={24}
              height={24}
              loading="lazy"
              decoding="async"
              onError={onIconError}
              className="border border-line bg-surface2"
            />
          ) : (
            <div key={i} className="h-6 w-6 border border-line bg-surface2" />
          );
        })}
      </div>

      <div className="ml-auto hidden grid-cols-2 gap-x-3 self-center text-[11px] lg:grid">
        {[blue, red].map((team, ti) => (
          <div key={ti} className="flex flex-col gap-0.5">
            {team.map((p: MatchParticipant) => (
              <div
                key={p.puuid}
                className={`flex items-center gap-1 ${p.puuid === focusPuuid ? "font-semibold text-bone" : "text-faint"}`}
              >
                <img
                  src={ddragonImg.champion(
                    version,
                    champFile(byKey, p.championId, p.championName),
                  )}
                  alt={p.championName}
                  width={16}
                  height={16}
                  loading="lazy"
                  decoding="async"
                  onError={onIconError}
                />
                <span className="max-w-[90px] truncate">
                  {p.riotIdGameName ?? p.summonerName ?? "?"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
