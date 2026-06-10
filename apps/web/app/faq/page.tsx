import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about Ryot: Riot API keys, data & privacy, regions, the overlay, and the live-game scout.",
};

const GROUPS: { title: string; qa: { q: string; a: string[] }[] }[] = [
  {
    title: "Getting started",
    qa: [
      {
        q: "Do I need a Riot API key to use Ryot?",
        a: [
          "Not for most of it. Tier lists, champion builds, champ-select counters, live comp analysis, and the overlay all work with no key.",
          "You only need a key for the account-based features: profile + match history, match timelines, the live-game scout, and the session/LP tracker. On the hosted site these run on the host's key; you can also paste your own.",
        ],
      },
      {
        q: "Development key or Personal key: which should I register?",
        a: [
          "Register a Personal key. Development keys expire every 24 hours (and regenerate the moment you open the developer portal), so you'd have to re-paste it daily. A Personal key persists.",
          "Both have the same low rate limits (~20 requests/sec, 100 per 2 min); the difference is that the Personal one doesn't die on you.",
        ],
      },
      {
        q: "Where do I get a key?",
        a: [
          "developer.riotgames.com → sign in with your Riot account → Register Product → Personal. Paste the resulting RGAPI-… key into Settings.",
        ],
      },
    ],
  },
  {
    title: "Privacy & data",
    qa: [
      {
        q: "Is my data stored anywhere?",
        a: [
          "No. Ryot fetches data live from Riot, shows it to you, and forgets it. There's no database of your matches or profile, no analytics, no trackers, and no ads.",
        ],
      },
      {
        q: "What happens to my API key if I paste one?",
        a: [
          "It's stored only in your own browser. When a feature needs it, it's sent with that single request and immediately discarded server-side, never written to disk, never logged.",
        ],
      },
      {
        q: "Is Ryot really open source?",
        a: [
          "Yes, MIT-licensed. You can read every line on GitHub, confirm there's nothing sketchy, and self-host your own copy if you'd rather not trust mine.",
        ],
      },
      {
        q: 'What does marking a profile as "me" do?',
        a: [
          "Almost nothing, by design. It pins your own profile to the top of your search suggestions and is stored only in your browser. It doesn't claim or verify the account, doesn't change anything about the profile, and isn't sent anywhere, it's purely a shortcut so you can jump to your own stats faster.",
        ],
      },
    ],
  },
  {
    title: "Features & limits",
    qa: [
      {
        q: "Why does the live-game scout only reveal everyone at game load, not in champ select?",
        a: [
          "Riot hides enemy summoner names during ranked champ select, so their profiles literally can't be fetched until the game loads. Your own team, the champ picks, comp analysis, and counters are all live during champ select; the full 10-player profile reveal lands at game start. This is exactly how Porofessor's \"load\" works.",
        ],
      },
      {
        q: "Which regions are supported?",
        a: [
          "All of Riot's routing regions: NA, EUW, EUNE, KR, BR, LAN, LAS, OCE, JP, TR, RU, and the SEA cluster. Pick your region in the search bar.",
        ],
      },
      {
        q: 'Why do builds and the tier list say "coming soon"?',
        a: [
          "Builds, tier lists, and matchups are moving to Ryot's own meta engine, aggregated from Riot's match data instead of a third-party site. That engine is still being built, so those pages show a 'coming soon' notice for now — they'll light up once it's live.",
        ],
      },
      {
        q: "Can a personal key handle a lot of users?",
        a: [
          "Not really: the rate limits are low, so a personal key comfortably serves you and a few friends (with caching), not a public audience. For a broader launch you'd apply for a Production key, or lean on BYOK so each person's own key fetches their own data.",
        ],
      },
    ],
  },
  {
    title: "Desktop app & overlay",
    qa: [
      {
        q: "What does the desktop app add over the website?",
        a: [
          "It opens straight to your profile (detected via the League Client), draws the in-game overlay (objective timers + scoreboard), and shows a champ-select pre-game popup. It can also import runes and summoner spells straight into the client.",
        ],
      },
      {
        q: "Is the overlay against Riot's rules?",
        a: [
          "No. It only reads League's local Live Client Data API on your own machine to draw timers and stats, and it doesn't automate anything or give an unfair advantage. Ryot deliberately avoids ToS-risky things like auto-accept or auto-dodge.",
        ],
      },
      {
        q: "Why does Windows say the app isn't safe?",
        a: [
          "Because I didn't pay for a code-signing certificate. Windows SmartScreen flags any installer that isn't signed by a recognized publisher, regardless of what's actually inside it. Click \"More info\" then \"Run anyway\" to continue. If you'd rather not take my word for it, the whole thing is open source: read it, or build the installer yourself.",
        ],
      },
      {
        q: "Why does macOS say the app isn't safe?",
        a: [
          "Same idea: the app isn't notarized with a paid Apple Developer ID, so Gatekeeper gets nervous about an \"unidentified developer.\" Right-click (or Control-click) the app and choose Open, or allow it under System Settings → Privacy & Security. As always, the source is right there if you'd rather verify it first.",
        ],
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="animate-riseIn space-y-12">
      <section className="pt-4">
        <p className="eyebrow mb-4">// Questions, answered</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          FAQ
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          The stuff people actually ask about: keys, privacy, regions, and how
          the live scout works.
        </p>
      </section>

      {GROUPS.map((g, gi) => (
        <section key={gi} className="space-y-6">
          <h2 className="border-t border-line pt-6 font-mono text-xs uppercase tracking-[0.25em] text-gold">
            {g.title}
          </h2>
          <div className="space-y-6">
            {g.qa.map((item, i) => (
              <div key={i}>
                <h3 className="font-display text-xl uppercase tracking-tightest text-bone">
                  {item.q}
                </h3>
                {item.a.map((p, j) => (
                  <p
                    key={j}
                    className="mt-2 max-w-2xl text-sm leading-relaxed text-muted"
                  >
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        <Link href="/settings" className="btn-outline text-sm">
          Add your key &rarr;
        </Link>
        <Link href="/about" className="btn-ghost text-sm">
          About Ryot
        </Link>
        <Link href="/privacy" className="btn-ghost text-sm">
          Privacy
        </Link>
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Still stuck? It&apos;s open source · not endorsed by Riot Games
      </p>
    </div>
  );
}
