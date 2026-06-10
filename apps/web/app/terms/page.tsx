import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The plain-English terms for using Ryot: it's free, provided as-is, and not affiliated with Riot Games.",
};

const SECTIONS = [
  {
    h: "The short version",
    body: [
      "Ryot is a free, open-source hobby project. Use it, enjoy it, but understand it's provided as-is with no guarantees. By using it you're agreeing to the plain-English terms below.",
    ],
  },
  {
    h: "Not affiliated with Riot Games",
    body: [
      "Ryot isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.",
      "All game data and assets (champions, items, icons) come from Riot's official API and Data Dragon and remain the property of Riot Games.",
    ],
  },
  {
    h: "Provided as-is",
    body: [
      "Ryot is offered without warranty of any kind. Stats, builds, tier lists, and predictions are sourced from the Riot API and Ryot's own match-data analysis and may be incomplete, delayed, or wrong. Don't treat anything here as guaranteed accurate, and don't blame me for that questionable build path.",
      "The service may go down, change, or disappear at any time. It's run on a small server as a personal project, not a business with an uptime guarantee.",
    ],
  },
  {
    h: "Acceptable use",
    list: [
      "Don't abuse the service: no scraping it at scale, hammering the API, or trying to overload the backend.",
      "Don't use Ryot to break Riot's Terms of Service or do anything that gives an unfair in-game advantage. Ryot deliberately avoids automation like auto-accept or auto-dodge, and you shouldn't try to bolt that on.",
      "If you bring your own Riot API key, you're responsible for keeping it within Riot's rules and rate limits.",
      "It's open source, so if you want to do more, fork it and run your own copy.",
    ],
  },
  {
    h: "Your API key",
    body: [
      "If you paste your own Riot API key, it stays in your browser and is used only for your own requests. You're responsible for that key. Don't paste a key that isn't yours.",
    ],
  },
  {
    h: "Changes",
    body: [
      "These terms may change as the project evolves. Continued use after a change means you're okay with the update. Material changes will show up here and in the changelog.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="animate-riseIn space-y-12">
      <section className="pt-4">
        <p className="eyebrow mb-4">// The plain-English version</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          TERMS <br />
          OF USE
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          No dense legalese. It&apos;s a free hobby project, provided as-is, and
          it isn&apos;t Riot Games. Here&apos;s the deal.
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

      <section className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        <Link href="/privacy" className="btn-outline text-sm">
          Privacy Policy &rarr;
        </Link>
        <Link href="/about" className="btn-ghost text-sm">
          About Ryot
        </Link>
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Last updated June 2026 · not endorsed by Riot Games · data via Riot API
        &amp; Data Dragon
      </p>
    </div>
  );
}
