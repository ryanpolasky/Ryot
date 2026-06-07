import Link from "next/link";
import TimelineAnalytics from "@/components/TimelineAnalytics";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string; matchId: string }>;
  searchParams: Promise<{ puuid?: string; name?: string; tag?: string }>;
}) {
  const { region, matchId } = await params;
  const { puuid, name, tag } = await searchParams;

  const backHref =
    name && tag
      ? `/summoner/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
      : undefined;

  return (
    <div className="animate-riseIn space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-4xl uppercase tracking-tightest text-bone">
          Match Breakdown
        </h1>
        <span className="font-mono text-[11px] uppercase tracking-widest text-faint">
          {decodeURIComponent(matchId)}
        </span>
        {backHref && (
          <Link
            href={backHref}
            className="btn-ghost ml-auto px-3 py-1 text-[11px]"
          >
            ◂ Back to profile
          </Link>
        )}
      </div>

      <TimelineAnalytics
        region={region}
        matchId={decodeURIComponent(matchId)}
        puuid={puuid}
      />
    </div>
  );
}
