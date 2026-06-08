import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Anton, Space_Grotesk, Space_Mono } from "next/font/google";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import DesktopSelfSync from "@/components/DesktopSelfSync";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  jsonLd,
} from "@/lib/site";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s // ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "League of Legends",
    "LoL stats",
    "tier list",
    "champion builds",
    "live game scout",
    "match history",
    "overlay",
    "Ryot",
  ],
  authors: [{ name: "Ryan Polasky", url: "https://ryanpolasky.com" }],
  creator: "Ryan Polasky",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

const TICKER = [
  "NO ADS",
  "NO TRACKING",
  "OPEN SOURCE",
  "LIVE-GAME SCOUT",
  "MATCH HISTORY",
  "CHAMPION BUILDS",
  "RANKED STATS",
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${anton.variable} ${grotesk.variable} ${spaceMono.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        {/* re-apply saved champion theme before first paint (no flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ryot.theme');if(!s)return;var t=JSON.parse(s);var r=document.documentElement;if(t.accent)r.style.setProperty('--gold-rgb',t.accent);if(t.accent2)r.style.setProperty('--gold-2-rgb',t.accent2);if(t.splash)r.style.setProperty('--champion-splash','url("'+t.splash+'")');if(t.id)r.setAttribute('data-champion-theme',t.id);var m=document.querySelector('meta[name="theme-color"]');if(m&&t.accent)m.setAttribute('content','rgb('+t.accent.split(' ').join(',')+')');}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <DesktopSelfSync />
        {/* Ticker */}
        <div className="marquee border-b border-line bg-surface/60 py-1.5 text-[10px] uppercase tracking-[0.25em] text-faint">
          {[0, 1].map((dup) => (
            <div key={dup} className="marquee-track" aria-hidden={dup === 1}>
              {TICKER.map((t, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="flex items-center font-mono"
                >
                  <span className="px-6">{t}</span>
                  <span className="text-gold">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>

        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
          {/* relative wrapper so the mobile dropdown anchors to the bar */}
          <div className="relative">
            <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3">
              <Link
                href="/"
                className="group flex items-baseline gap-0.5 font-display text-3xl leading-none tracking-tightest"
              >
                <span className="text-brand">RY</span>
                <span className="text-bone">OT</span>
              </Link>

              <nav className="ml-3 hidden items-center gap-1 whitespace-nowrap font-mono text-xs uppercase tracking-[0.15em] text-muted sm:flex">
                <Link
                  href="/"
                  className="px-3 py-2 transition-colors hover:text-bone"
                >
                  Search
                </Link>
                <Link
                  href="/build"
                  className="px-3 py-2 transition-colors hover:text-bone"
                >
                  Builds
                </Link>
                <Link
                  href="/tier-list"
                  className="px-3 py-2 transition-colors hover:text-bone"
                >
                  Tier List
                </Link>
                <Link
                  href="/download"
                  className="px-3 py-2 transition-colors hover:text-gold"
                >
                  Download
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-2 transition-colors hover:text-bone"
                >
                  Settings
                </Link>
                <Link
                  href="/about"
                  className="px-3 py-2 transition-colors hover:text-bone"
                >
                  About
                </Link>
              </nav>

              <span className="ml-auto hidden items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint lg:flex">
                no ads · open source
              </span>

              <MobileNav />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
          {children}
        </main>

        <footer className="mx-auto max-w-6xl px-5 py-12">
          <div className="mb-4 h-px rule-gold" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            <span className="font-display tracking-normal text-bone">
              <span className="text-brand">RY</span>OT
            </span>
            <span>
              · not endorsed by Riot Games · data via Riot API &amp; Data Dragon
            </span>
            <Link
              href="/about"
              className="ml-auto transition-colors hover:text-bone"
            >
              About
            </Link>
            <Link href="/faq" className="transition-colors hover:text-bone">
              FAQ
            </Link>
            <Link
              href="/changelog"
              className="transition-colors hover:text-bone"
            >
              Changelog
            </Link>
            <Link href="/status" className="transition-colors hover:text-bone">
              Status
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-bone">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-bone">
              Terms
            </Link>
            <Link
              href="/download"
              className="transition-colors hover:text-bone"
            >
              Download
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
