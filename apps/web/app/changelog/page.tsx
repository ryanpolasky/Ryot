import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in Ryot: recent features, fixes, and polish.",
};

type Entry = {
  version: string;
  date: string;
  tag?: string;
  changes: { type: string; text: string }[];
};

const TAG_COLOR: Record<string, string> = {
  New: "text-win border-win/40",
  Improved: "text-gold border-gold/40",
  Fixed: "text-loss border-loss/40",
};

const ENTRIES: Entry[] = [
  {
    version: "v1.0.0 · First stable release",
    date: "June 2026",
    tag: "Latest",
    changes: [
      {
        type: "New",
        text: "First tagged release: the full companion (stats, live scout, builds, champ-select pre-game, overlay, and desktop app) is stable and self-hostable.",
      },
      {
        type: "New",
        text: "Champion theming: recolor the whole site to any champion's splash palette, from Settings or any build page.",
      },
    ],
  },
  {
    version: "Polish pass",
    date: "June 2026",
    changes: [
      { type: "New", text: "About, FAQ, Terms, and this changelog page." },
      {
        type: "New",
        text: "Mobile navigation: a hamburger menu so every page is reachable on a phone.",
      },
      {
        type: "Improved",
        text: "Tier list now shows full champion names on narrow screens (Pick % collapses on phones).",
      },
      {
        type: "Improved",
        text: "Loading skeletons across the tier list, live scout, and match timeline instead of bare text.",
      },
      {
        type: "Improved",
        text: "Branded 404 and error pages that match the app instead of the default white screen.",
      },
      {
        type: "Improved",
        text: "Settings now nudges you toward a Personal key (not a Dev key) and validates the format as you type.",
      },
      {
        type: "Fixed",
        text: "Search bars no longer clip their button off the edge on small screens.",
      },
    ],
  },
  {
    version: "Pre-game suite",
    date: "June 2026",
    changes: [
      {
        type: "New",
        text: "Auto lobby reveal: the moment a game starts, all 10 players open automatically.",
      },
      {
        type: "New",
        text: "Champ-select counters & matchup tips that load for your lane and update as you hover enemies.",
      },
      {
        type: "New",
        text: "Live comp analysis: Porofessor-style draft tags (Good peel, Low AP, No frontline, Heavy engage…) on both teams, with a lightweight comp-edge readout.",
      },
      {
        type: "Improved",
        text: "Item tooltips on situational builds now show the item's name, gold cost, in-game effect, and win rate.",
      },
    ],
  },
  {
    version: "Post-game awards",
    date: "May 2026",
    changes: [
      {
        type: "New",
        text: "Post-game awards: MVP, Uncarriable Team, Vision God, Sharpshooter, KDA King, Farm Lord, Playmaker, and Punching Bag.",
      },
      {
        type: "New",
        text: "Session / LP tracker with behavioral tags (hot streak, cold streak, bounce-back).",
      },
      {
        type: "New",
        text: "Premade / duo detection in match history and the live scout.",
      },
      {
        type: "Improved",
        text: "A big Victory / Defeat banner so a loss is unmistakable on the post-game view.",
      },
      {
        type: "Fixed",
        text: 'Renamed "Uncarriable" to "Uncarriable Team" so it clearly reads as the team, not you.',
      },
    ],
  },
  {
    version: "Core companion",
    date: "May 2026",
    changes: [
      {
        type: "New",
        text: "Summoner search, profile & ranked, and match history across all regions.",
      },
      {
        type: "New",
        text: "Match timeline analytics: gold/XP diff, CS@10/@15, and damage share.",
      },
      { type: "New", text: "Live-game scout with auto-refresh." },
      {
        type: "New",
        text: "Champion builds (runes, skills, items) plus SR & ARAM tier lists.",
      },
      {
        type: "New",
        text: "In-game overlay with objective timers and a live scoreboard.",
      },
      {
        type: "New",
        text: "Bring Your Own Key (BYOK) for higher rate limits.",
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="animate-riseIn space-y-12">
      <section className="pt-4">
        <p className="eyebrow mb-4">// What&apos;s new</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          CHANGELOG
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          Ryot is actively maintained. Here&apos;s what&apos;s landed recently,
          newest first.
        </p>
      </section>

      <section className="space-y-10">
        {ENTRIES.map((e, i) => (
          <div key={i} className="border-t border-line pt-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
                {e.version}
              </h2>
              {e.tag && (
                <span className="border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                  {e.tag}
                </span>
              )}
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                {e.date}
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {e.changes.map((c, j) => (
                <li
                  key={j}
                  className="flex flex-wrap items-baseline gap-3 text-sm leading-relaxed"
                >
                  <span
                    className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      TAG_COLOR[c.type] ?? "text-muted border-line"
                    }`}
                  >
                    {c.type}
                  </span>
                  <span className="max-w-2xl text-muted">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        <a
          href="https://github.com/ryanpolasky/ryot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-sm"
        >
          Full history on GitHub &rarr;
        </a>
        <Link href="/about" className="btn-ghost text-sm">
          About Ryot
        </Link>
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Dates are approximate · not endorsed by Riot Games
      </p>
    </div>
  );
}
