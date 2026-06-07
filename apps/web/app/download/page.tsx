import type { Metadata } from "next";
import Link from "next/link";
import { COMING_SOON } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Download Ryot // Free, No Ads, Open Source" },
  description:
    "A League companion that doesn't want your money or bury you in ads. Desktop app with in-game overlay, champ-select scout, and rune import.",
};

// Stable "latest release" asset URLs. GitHub redirects /releases/latest/download/<name>
// to the newest release, and electron-builder emits version-less artifact names
// (Ryot.dmg, Ryot-Setup.exe), so these never need updating across releases.
const REPO = "https://github.com/ryanpolasky/ryot";
const RELEASES = `${REPO}/releases`;
const DOWNLOAD_MAC = `${RELEASES}/latest/download/Ryot.dmg`;
const DOWNLOAD_WIN = `${RELEASES}/latest/download/Ryot-Setup.exe`;

const COMPARE = [
  { them: "Monthly subscription", us: "Free forever" },
  { them: "Full-screen ads between every click", us: "Zero ads, period" },
  { them: "Sell your match data", us: "Nothing collected, nothing stored" },
  { them: "Closed source", us: "Fully open source" },
  {
    them: "Mega-corp behind a paywall",
    us: "Hosted by a guy who doesn't want your data",
  },
];

const FEATURES = [
  {
    title: "Auto Lobby Reveal",
    desc: "The moment champ select loads, a pre-game window pulls both teams: ranks, recent form, top champs, and premade/duo links. No typing, no manual lookups. Porofessor-style, minus the ads.",
  },
  {
    title: "Live Comp Analysis",
    desc: "A draft read on both teams as picks lock in: tags like Heavy Engage, Low AP, No Frontline, and Scales Hard, plus a lightweight comp-edge estimate.",
  },
  {
    title: "Matchup Tips & Counters",
    desc: "On hover or lock-in, see your lane matchup win rate, ban targets, and a quick how-to-play note against the likely opponent.",
  },
  {
    title: "Session & LP Tracker",
    desc: "Wins, losses, and net LP this session with behavioral tags (Heater, Cold Streak, Bounce Back, On Tilt) so you know when to keep queuing or call it.",
  },
  {
    title: "Post-Game Awards",
    desc: "Every match gets Porofessor-style awards (MVP, Uncarriable Team, Vision God, Farm Lord) plus premade/duo detection on both teams.",
  },
  {
    title: "In-Game Overlay",
    desc: "Game clock, Dragon / Baron / Herald timers, and a live scoreboard. Auto-placed from your HUD scale, with a drag-to-tune editor for Rift and ARAM. Toggle with a hotkey.",
  },
  {
    title: "In-App Rune Editor",
    desc: "Pre-filled with the highest win-rate page. Click any rune to swap it. Auto-imports runes and spells into the League client on lock-in, or hit the button yourself.",
  },
  {
    title: "Champion Builds & Tier Lists",
    desc: "Runes, spells, skill order, and item paths per champ and role (including high-elo and pro brackets) plus SR and ARAM tier lists. Updated every patch.",
  },
  {
    title: "Profile + Match History",
    desc: "Ranked stats, LP, KDA, CS, items, and full team rosters per game, with deep timeline breakdowns. Search any player across any region.",
  },
];

export default function DownloadPage() {
  return (
    <div className="animate-riseIn space-y-16">
      {/* Hero */}
      <section className="pt-4">
        <p className="eyebrow mb-4">// A different kind of companion app</p>

        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[8rem]">
          OTHER APPS <br />
          WANT YOUR <span className="text-loss">MONEY</span>
        </h1>

        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          I thought that was annoying, so I got rid of it. No subscription, no
          ads, no{" "}
          <span className="line-through decoration-loss decoration-2">
            dark
          </span>{" "}
          data harvesting. Just a League companion that works. Open source,
          hosted by me, built for a friend group.
        </p>

        {COMING_SOON ? (
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="btn-primary pointer-events-none inline-flex items-center gap-2 text-sm opacity-60">
              Desktop app: coming soon
            </span>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] uppercase tracking-widest text-faint underline-offset-4 hover:text-muted hover:underline"
            >
              star on github to get notified &rarr;
            </a>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={DOWNLOAD_MAC}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              Download for macOS
            </a>
            <a
              href={DOWNLOAD_WIN}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              Download for Windows
            </a>
            <a
              href={`${RELEASES}/latest`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] uppercase tracking-widest text-faint underline-offset-4 hover:text-muted hover:underline"
            >
              all downloads &amp; release notes
            </a>
          </div>
        )}
        <p className="mt-3 font-mono text-[11px] text-faint">
          {COMING_SOON
            ? "The desktop app is in the works and launching soon. The web companion (search, builds, tier lists) is already live."
            : "Free and open source. macOS is a universal build (Apple Silicon + Intel); Windows is a 64-bit installer. Auto-updates once installed."}
        </p>
      </section>

      {/* Comparison table */}
      <section>
        <h2 className="section-title">Them vs. Us</h2>
        <div className="mt-4 overflow-hidden border border-line">
          <div className="grid grid-cols-2 border-b border-line bg-surface px-5 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
            <span>The other guys</span>
            <span className="text-gold">Ryot</span>
          </div>
          {COMPARE.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-2 border-b border-line/30 px-5 py-3 text-sm transition-colors last:border-0 hover:bg-surface/50"
            >
              <span className="text-muted line-through decoration-loss/40">
                {row.them}
              </span>
              <span className="font-medium text-bone">{row.us}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section>
        <h2 className="section-title">What You Get</h2>
        <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-bg p-6">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-bone">
                {f.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* BYOK teaser */}
      <section className="card p-8">
        <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
          Bring Your Own Key
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          The shared backend handles most features for free. For heavier stuff
          (deep match timelines, extended history, faster refresh), paste your
          own Riot API key in Settings. It goes through our server for the
          request and is{" "}
          <strong className="text-bone">immediately discarded</strong>. We
          don&apos;t store it, log it, or care about it.
        </p>
        <a
          href="https://developer.riotgames.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline mt-4 inline-block text-xs"
        >
          Get a free Riot API key →
        </a>
      </section>

      {/* Hosted by me */}
      <section className="card p-8">
        <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
          Hosted by Me. I Don&apos;t Want Your Data.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          The backend runs on my own server, with my own Riot API key. You and
          your friends just install the app and you&apos;re in. No accounts, no
          sign-ups, no key to configure. I genuinely don&apos;t collect, store,
          sell, or care about your data. There are no analytics, no trackers,
          and nothing phoning home. Your match data is pulled live from Riot
          when you look at it, and then it&apos;s gone.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/privacy" className="btn-outline text-xs">
            Read the privacy policy &rarr;
          </Link>
          <a
            href="https://github.com/ryanpolasky/ryot"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs"
          >
            It&apos;s open source, check for yourself
          </a>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        {COMING_SOON ? (
          <span className="btn-primary pointer-events-none text-sm opacity-60">
            Desktop app: coming soon
          </span>
        ) : (
          <>
            <a href={DOWNLOAD_MAC} className="btn-primary text-sm">
              Download for macOS
            </a>
            <a href={DOWNLOAD_WIN} className="btn-primary text-sm">
              Download for Windows
            </a>
          </>
        )}
        <a
          href="https://github.com/ryanpolasky/ryot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-sm"
        >
          View on GitHub
        </a>
        <Link href="/" className="btn-ghost text-sm">
          Search a summoner →
        </Link>
      </section>
    </div>
  );
}
