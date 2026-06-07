import SearchBar from "@/components/SearchBar";
import Link from "next/link";

const FEATURES = [
  {
    n: "01",
    title: "Profile & Ranked",
    desc: "Solo / Flex rank, LP, and win rates at a glance.",
  },
  {
    n: "02",
    title: "Match History",
    desc: "KDA, CS, items, and full team rosters per game.",
  },
  {
    n: "03",
    title: "Live-Game Scout",
    desc: "Everyone in your current match, auto-refreshed.",
  },
  {
    n: "04",
    title: "Champion Builds",
    desc: "Runes, skill order & item paths from community data.",
  },
];

export default function HomePage() {
  return (
    <div className="animate-riseIn">
      {/* Hero */}
      <section className="relative pb-12 pt-6">
        <p className="eyebrow mb-5">// League of Legends companion</p>

        <h1 className="font-display text-[16vw] leading-[0.82] tracking-tightest text-bone sm:text-[11rem]">
          LOOK UP <br />
          ANY <span className="text-gold">SUMMONER</span>
        </h1>

        <p className="mt-6 max-w-xl font-sans text-sm text-muted">
          Match history, ranked stats, a live-game scout, and champion builds.
          Open source and self-hosted for you and your friends.
        </p>

        <div className="mt-7 max-w-2xl">
          <SearchBar autoFocus />
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-faint">
            Enter a Riot ID // <span className="text-muted">Name#TAG</span>
          </p>
        </div>
      </section>

      {/* Editorial feature list */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.n}
            className="group relative -ml-px -mt-px border border-line p-6 transition-colors hover:bg-surface"
          >
            <span className="font-display text-3xl leading-none text-line transition-colors group-hover:text-gold">
              {f.n}
            </span>
            <h3 className="mt-3 font-sans text-base font-bold uppercase tracking-wide text-bone">
              {f.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{f.desc}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/build/Aatrox" className="btn-primary">
          Browse Champion Builds →
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-faint">
          No login required
        </span>
      </div>
    </div>
  );
}
