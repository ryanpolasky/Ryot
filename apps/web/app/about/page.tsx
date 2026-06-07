import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ryot is an open-source, ad-free, privacy-first League of Legends companion, built for a friend group, not a funding round.",
};

const SECTIONS = [
  {
    h: "What it is",
    body: [
      "Ryot is a League of Legends companion app: summoner search, ranked stats, match history, a live-game scout, champion builds and tier lists, an in-game overlay, and a Porofessor-style champ-select pre-game window. The familiar stuff from OP.GG, Porofessor, and Blitz, all in one place.",
      "The difference is in how it's run: no ads, no trackers, no accounts, and no data harvesting. It's open source and self-hostable, so you can read every line or run your own copy.",
    ],
  },
  {
    h: "Why it exists",
    body: [
      "Every other companion app eventually wanted my money or buried the game data under ads, upsells, and an Overwolf install. I just wanted clean stats for me and my friends without the bloat, so I built it.",
      "It's intentionally small. There's no growth team, no roadmap meeting, no premium tier dangling the features you actually want. Just a tool that does its job and gets out of the way.",
    ],
  },
  {
    h: "How it's built",
    list: [
      "A Next.js web app for the lookup site, tier lists, and builds.",
      "A Fastify backend that talks to Riot's official API and caches impersonal public data (builds, item costs, patch) briefly so it stays light.",
      "An Electron desktop app with three windows: your profile, the in-game overlay, and a champ-select pre-game popup.",
      "Static champion/item art loads straight from Riot's Data Dragon CDN to your browser; it never passes through a Ryot server.",
    ],
  },
  {
    h: "The data model",
    body: [
      "Ryot doesn't warehouse anything. It fetches what you ask for live from Riot, shows it, and forgets it. Nothing about you is written to a database. That's also why it's cheap enough to keep public and free: there's no data lake to feed.",
      "The free features (tier lists, builds, champ-select counters, live comp analysis, the overlay) need no Riot key at all. The account-based features (profiles, match history, live scout) use the host's key, or you can paste your own (BYOK) for higher limits.",
    ],
  },
  {
    h: "Who's behind it",
    body: [
      "Ryot is made and run by me, Ryan, for my friend group, hosted on my own server with my own Riot API key. It's open source under the MIT license. If anything here sounds too good to be true, the source is right there to check.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="animate-riseIn space-y-12">
      <section className="pt-4">
        <p className="eyebrow mb-4">// A different kind of companion app</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          ABOUT <br />
          RYOT
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          An open-source, ad-free, privacy-first League companion. Built for a
          friend group, not a funding round.
        </p>
      </section>

      <section className="space-y-10">
        {SECTIONS.map((s, i) => (
          <div key={i} className="border-t border-line pt-6">
            <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
              {s.h}
            </h2>
            {s.body?.map((p, j) => (
              <p
                key={j}
                className="mt-3 max-w-2xl text-sm leading-relaxed text-muted"
              >
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="mt-3 max-w-2xl space-y-2">
                {s.list.map((item, j) => (
                  <li
                    key={j}
                    className="flex gap-3 text-sm leading-relaxed text-muted"
                  >
                    <span className="mt-1 text-gold">◆</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
          Find me
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          I&apos;m Ryan, I build things for my friends when I&apos;m
          procrastinating actual work, &amp; occasionally I ship one publicly
          like this. If you find any issues, have a suggestion, or just want to
          talk, feel free to reach me at one of these spots:
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://github.com/ryanpolasky"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/ryan-polasky/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm"
          >
            LinkedIn
          </a>
          <a
            href="https://ryanpolasky.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm"
          >
            ryanpolasky.com
          </a>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        <a
          href="https://github.com/ryanpolasky/ryot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-sm"
        >
          View on GitHub &rarr;
        </a>
        <Link href="/download" className="btn-ghost text-sm">
          Download
        </Link>
        <Link href="/faq" className="btn-ghost text-sm">
          FAQ
        </Link>
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Ryot isn&apos;t endorsed by Riot Games and doesn&apos;t reflect their
        views. Data via the Riot API &amp; Data Dragon.
      </p>
    </div>
  );
}
