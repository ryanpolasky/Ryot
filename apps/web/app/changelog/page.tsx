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
    version: "v1.0.6",
    date: "June 2026",
    tag: "Latest",
    changes: [
      {
        type: "Improved",
        text: "Builds, tier lists, and matchups are moving to Ryot's own meta engine, built from Riot's official Match-V5 API. I wasn't comfortable sitting in the ToS grey area of scraping a third-party stats site (u.gg), so I'm doing it the legit way — coming soon while I build it out.",
      },
      {
        type: "Improved",
        text: "The status page now lists the build engine as 'coming soon' instead of an outage, so nothing reads as broken while it's being built.",
      },
    ],
  },
  {
    version: "v1.0.5",
    date: "June 2026",
    changes: [
      {
        type: "Fixed",
        text: "Builds and the tier list no longer show 'Down': u.gg had started blocking our requests, now resolved.",
      },
      {
        type: "New",
        text: "In-game overlay panels (stats + build) are draggable at any time, each with a settings cog: toggle individual stat rows, lock a panel, pick the build rank, and more.",
      },
      {
        type: "New",
        text: "Desktop: close to the tray to keep Ryot running for instant reopen, plus a Desktop section in Settings (close-to-tray and launch at login).",
      },
      {
        type: "Improved",
        text: "Desktop: the overlay hides when the League game window isn't focused (e.g. you alt-tab away) and returns when you tab back.",
      },
      {
        type: "Fixed",
        text: "The in-game build panel recovers from a temporary hiccup instead of staying blank, and the overlay calibration editor hotkey works reliably again.",
      },
    ],
  },
  {
    version: "v1.0.4",
    date: "June 2026",
    changes: [
      {
        type: "New",
        text: "Desktop: recent games are read from your League client, so event modes like ARAM: Mayhem and Brawl, which Riot's match API never exposes, finally show in your match history.",
      },
      {
        type: "Improved",
        text: "Desktop: the Download page and its nav links are hidden inside the app.",
      },
      {
        type: "Improved",
        text: "Long skin names in the theme pickers now scroll on hover instead of being cut off, with a loading state while a champion's skins load.",
      },
      {
        type: "Fixed",
        text: "Theme pickers skip skins with no real splash art and no longer flash the previous champion's skin when you switch.",
      },
      {
        type: "Fixed",
        text: "Readable names for the ARAM: Mayhem, Brawl, and Swiftplay queues.",
      },
    ],
  },
  {
    version: "v1.0.2",
    date: "June 2026",
    changes: [
      {
        type: "Fixed",
        text: "Recent ARAM and other off-meta games no longer go missing: the queue filters (Solo, Flex, Normal, ARAM) now query Riot directly and pull those games on demand.",
      },
      {
        type: "Fixed",
        text: "Match-history rows now use fixed, aligned columns, so KDA, items and teams stay put as you scroll.",
      },
      {
        type: "Fixed",
        text: "Item and champion icons on older matches load again, each renders with its own patch's assets, so removed items no longer show as blank squares.",
      },
      {
        type: "Improved",
        text: "The home search no longer opens its suggestion list until you start typing.",
      },
    ],
  },
  {
    version: "v1.0.1",
    date: "June 2026",
    changes: [
      {
        type: "New",
        text: "Champion search typeahead: find a champion by name from a dropdown (with portraits) on the home page and build pages.",
      },
      {
        type: "New",
        text: "Champion builds browser at /build: a searchable grid of every champion instead of defaulting to one.",
      },
      {
        type: "New",
        text: 'Skin-aware site theming: theme the whole site with a specific champion skin, from Settings or a build page\u2019s "Theme site" dropdown.',
      },
      {
        type: "New",
        text: "Recent-search suggestions in the summoner search, stored only in your browser, with an opt-out in Settings.",
      },
      {
        type: "New",
        text: 'Mark your own account as "me" (in Settings or the "This is me" button on a profile) to pin it to the top of suggestions. The desktop app also detects you and recently played-with players via the League Client.',
      },
      {
        type: "New",
        text: "Unified search: one box searches both Riot IDs and champions, with an alternating SUMMONER / CHAMPION accent word.",
      },
      {
        type: "Improved",
        text: "Sharper, better-framed champion splash art on share cards and the site theme backdrop.",
      },
      {
        type: "Improved",
        text: "Post-game and session tags are now all positive or neutral.",
      },
      {
        type: "Improved",
        text: 'The status page treats a u.gg rate-limit as a brief "degraded" that self-heals, instead of a stuck "down".',
      },
      {
        type: "Fixed",
        text: "The top ticker no longer jumps when it loops.",
      },
      {
        type: "Improved",
        text: "Tighter, sharper champion grid on the builds browser, and more consistent match-history rows.",
      },
      {
        type: "Fixed",
        text: "Match history now reaches older games and ARAMs: Load more works without a personal key.",
      },
      {
        type: "Fixed",
        text: "Champion and mastery icons on profiles now load for multi-word champions (e.g. Miss Fortune).",
      },
      {
        type: "Fixed",
        text: "The champion-theme dropdown scrolls instead of closing, and dropdown chevrons aren't cramped against the edge.",
      },
    ],
  },
  {
    version: "v1.0.0 · First stable release",
    date: "June 2026",
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
