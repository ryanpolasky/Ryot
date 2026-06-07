import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "The honest version: I don't want your data, I don't collect anything, and there are no trackers or ads.",
};

const SECTIONS = [
  {
    h: "The short version",
    body: [
      "I genuinely don't want your data, I don't care about it, and I don't collect anything. There are no analytics, no trackers, no ad networks, no cookies for profiling, and nothing phoning home about what you do here.",
      "Ryot exists because the other companion apps wanted my money or buried me in ads. I wasn't going to turn around and quietly sell you out instead.",
    ],
  },
  {
    h: "What Ryot does NOT do",
    list: [
      "No accounts. There's nothing to sign up for, so there's no email, password, or profile to leak.",
      'No analytics or telemetry. No Google Analytics, no Mixpanel, no Sentry, no "anonymous usage stats."',
      "No advertising. No ad networks, no tracking pixels, no fingerprinting.",
      "No selling or sharing data. There is no data to sell, and I wouldn't sell it if there were.",
      "No long-term storage of your match history or profile. Nothing about you is written to a database.",
    ],
  },
  {
    h: "What actually happens with data",
    body: [
      "When you look up a summoner or open a live game, Ryot fetches that data live from Riot's official API and Data Dragon, shows it to you, and forgets it. It is not logged to a database or tied to any identity.",
      "The backend caches some impersonal, public data (champion builds, item costs, patch data) for a short time so the app is fast and stays light on Riot's API. That cache contains zero personal information; it's the same stuff Riot publishes for everyone.",
      "Standard web server logs (IP address, request path) may exist transiently for basic operation and abuse prevention, the same as any website. They aren't used to build a profile of you and aren't shared with anyone.",
    ],
  },
  {
    h: "Bring Your Own Key (BYOK)",
    body: [
      "If you choose to paste your own Riot API key for the heavier features, it is sent to the backend, used for that one request, and immediately discarded. It is never written to disk, never logged, and never stored. I don't want your key any more than I want your data.",
    ],
  },
  {
    h: "The in-game overlay & desktop app",
    body: [
      "The overlay reads League's local Live Client Data API on your own machine. That information stays on your computer; it's used to draw timers and stats on screen and isn't sent anywhere.",
      "The desktop app talks to the League Client locally to do things like import runes. That all happens on your machine, between the app and your game client.",
    ],
  },
  {
    h: "Who's behind it",
    body: [
      "Ryot is hosted and run by me (Ryan) for my friend group, on my own server with my own Riot API key. It's open source, so you don't have to take my word for any of this. You can read every line and confirm there's nothing sketchy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="animate-riseIn space-y-12">
      <section className="pt-4">
        <p className="eyebrow mb-4">// The honest version</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          PRIVACY <br />
          POLICY
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          No legalese, no dark patterns. I don&apos;t want your data, I
          don&apos;t collect anything, and I don&apos;t care to. Here&apos;s
          exactly what that means.
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
        <a
          href="https://github.com/ryanpolasky/ryot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-sm"
        >
          Read the source &rarr;
        </a>
        <Link href="/download" className="btn-ghost text-sm">
          Back to download
        </Link>
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Last updated June 2026 · Questions? It&apos;s open source · not endorsed
        by Riot Games
      </p>
    </div>
  );
}
