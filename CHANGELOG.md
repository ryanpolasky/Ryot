# Changelog

All notable changes to Ryot are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-29

Ryot's own meta engine, plus a broad correctness and hardening pass.

### Changed

- Builds, tier lists, and matchups are moving to Ryot's own meta engine, built
  from Riot's official Match-V5 API. I wasn't comfortable sitting in the ToS grey
  area of scraping a third-party stats site, so I'm doing it the legit way —
  those pages (and the status dashboard) show "coming soon" while I build it out.
- The status page lists the build engine as "coming soon" rather than an outage,
  so nothing reads as broken while it's being built.
- Repeated requests for the same data are shared instead of duplicated, and every
  Riot API call now has a timeout, so one slow response can't stall everything
  queued behind it.

### Fixed

- Match length and CS/min were wrong on games played before patch 11.20. Riot
  changed the unit of the match duration field at that patch, and Ryot read it
  as-is: those games showed durations like "1920:00" and per-minute stats off by
  roughly 1000x.
- The session tracker merged separate play sessions into a single one for those
  same older games.
- Recent matches no longer read "-1m ago" when a game has only just ended; they
  now read "just now".
- Match breakdowns no longer show "NaN" for final gold difference on very short
  games, and switching match or summoner while one is still loading can no longer
  leave the previous player's numbers on screen.
- Rune import could delete one of your own rune pages when the League client was
  at its page limit. It now only ever reclaims a page Ryot created.
- Desktop: the overlay is placed from the display's full bounds, so it lands
  correctly on multi-monitor setups and when a taskbar shrinks the work area.
- Desktop: the overlay no longer stays hidden for the rest of the session if the
  window watcher stops unexpectedly.
- The standalone overlay app now starts at all: its preload script never loaded,
  which left every panel control, drag, and calibration action dead.
- Riot IDs, match ids, and champion names containing a percent sign now resolve
  instead of failing.
- Saved recent searches left over in an old or corrupted shape are ignored
  instead of rendering blank suggestion rows.
- Item tooltips are reachable by keyboard and exposed to screen readers, and no
  longer overflow narrow screens.
- The main nav switches to the mobile menu at a wider breakpoint, so the links
  stop colliding with the logo on tablet widths.

### Security

- Desktop: rune, summoner-spell, and item-set import payloads are validated
  before they reach the League client.
- Desktop: saved settings are validated on load, so a hand-edited settings file
  can no longer point the app at a non-http(s) URL.
- Desktop: the connection-error screen escapes the URL it displays, and in-app
  navigation is restricted to Ryot's own pages.
- The overlay's certificate exemption for Riot's Live Client API is scoped to
  exactly port 2999 (it previously also covered ports 29990-29999).

### Removed

- The third-party stats dependency (u.gg). Champion data now comes only from
  Riot's official API.

## [1.0.5] - 2026-06-08

Overlay upgrades, desktop quality-of-life, and a u.gg fix.

### Added

- In-game overlay panels (stats + build) are draggable at any time, each with a
  settings cog: toggle individual stat rows, lock a panel, choose the build
  rank, and more.
- Desktop: close-to-tray keeps Ryot running for instant reopen, plus a Desktop
  section in Settings (close-to-tray and launch at login).

### Changed

- Desktop: the overlay now hides whenever the League game window isn't focused
  (e.g. when you alt-tab to a browser) and reappears when you tab back.

### Fixed

- Builds and the tier list no longer show "Down": u.gg had started blocking our
  requests, which is now resolved.
- The in-game build panel recovers from a temporary hiccup instead of staying
  blank for the rest of the game.
- The overlay calibration editor hotkey (Ctrl+Shift+D) works reliably again.

## [1.0.4] - 2026-06-08

Desktop match history from the League client, plus theme polish.

### Added

- Desktop: recent games are now read from your League client, so event / RGM
  modes (ARAM: Mayhem, Brawl) that Riot's public match API never exposes finally
  appear in your match history.

### Changed

- Desktop: the Download page and its nav links are hidden inside the app.
- Long skin names in the theme pickers now scroll on hover instead of being cut
  off, and switching champions shows a loading state.

### Fixed

- Theme pickers skip skins with no real splash art (old chroma-style entries)
  and no longer briefly show the previous champion's skin when you switch.
- Readable names for the ARAM: Mayhem, Brawl, and Swiftplay queues.

## [1.0.2] - 2026-06-07

Match-history fixes and search polish.

### Fixed

- Recent ARAM and other off-meta games no longer go missing from match history.
  The queue filters (Solo, Flex, Normal, ARAM) now query Riot directly and pull
  those games on demand instead of only filtering the most recent page.
- Match-history rows now use fixed, aligned columns, so KDA, items and teams
  stay in the same place as you scroll.
- Item and champion icons on older matches load again: each match renders with
  its own patch's Data Dragon assets, so items removed since then no longer show
  as blank squares.

### Changed

- The home search no longer opens its suggestion list until you start typing.

## [1.0.1] - 2026-06-07

Polish pass plus several new web features.

### Added

- Champion search typeahead: find a champion by name from a dropdown (with
  portraits) on the home page and build pages.
- Champion builds browser at `/build`: a searchable grid of every champion,
  instead of defaulting to a single champion.
- Skin-aware site theming: theme the whole site with a specific champion skin,
  from a skin picker in Settings or each build page's "Theme site" dropdown.
- Recent-search suggestions in the summoner search, stored only in your browser,
  with an opt-out in Settings.
- "Me": mark your own account (in Settings or via the "This is me" button on any
  profile) to pin it to the top of suggestions. In the desktop app, your account
  and recently played-with players are detected automatically via the League
  Client.
- Unified search: one box on the home page searches both Riot IDs and
  champions, with an alternating SUMMONER / CHAMPION accent word.

### Changed

- Champion splash art on share cards and the site theme backdrop now uses
  Community Dragon's centered art (sharper, better framed).
- The status page reports a u.gg rate-limit as a transient "degraded" state that
  self-heals, instead of a stuck "down".
- Tighter, sharper champion grid on the builds browser, and consistent
  match-history row columns (no wrapped labels).

### Removed

- The post-game "Punching Bag" award and the negative session tags (On Tilt,
  Chain Loser, Cold Streak, Down Session): player-facing labels are now positive
  or neutral only.

### Fixed

- Match history now reaches older games and ARAMs: "Load more" works without a
  personal key (the shared key paginates).
- Champion and mastery icons on profiles now load for multi-word champions
  (e.g. Miss Fortune).
- The champion-theme dropdown scrolls instead of closing, and dropdown chevrons
  are no longer cramped against the edge.
- The top ticker no longer jumps when it loops.

### Notes

- New FAQ entries explain why Windows / macOS flag the unsigned app as "unsafe"
  and what marking a profile as "me" does.
- Added a personal open-source project / no-employer-affiliation disclaimer
  (README + About).

## [1.0.0] - 2026-06-07

First stable release. Ryot is a self-hostable, open-source League of Legends
companion: OP.GG-style stats, a Porofessor-style live-game scout, champion
builds, a champ-select pre-game suite, and a Blitz-style in-game overlay.

### Added

#### Web: stats & profiles

- Summoner search by Riot ID (e.g. `Faker#KR1`) across all regions.
- Profile with summoner level, Solo/Duo & Flex rank, LP, and winrate.
- Match history with champion, KDA, CS, items, duration, and both team rosters.
- Match timeline analytics: gold/XP differential, CS@10 / CS@15, and damage share.
- Post-game awards (MVP, Vision God, Sharpshooter, KDA King, Farm Lord,
  Playmaker, Punching Bag, Uncarriable Team) and an unmistakable Victory/Defeat banner.
- Session / LP tracker with behavioral tags (hot streak, cold streak, bounce-back).
- Premade / duo detection in match history and the live scout.

#### Web: scouting & builds

- Live-game scout: both teams' ranks, winrates, champions, and premades;
  auto-refreshes every 30s.
- Champion builds: runes, summoner spells, skill order, and starting / core /
  situational items, with rich item tooltips (gold cost, in-game effect, win rate).
- Summoner's Rift and ARAM tier lists.
- Champion theming: recolor the entire site to any champion's splash palette,
  from Settings or any build page.
- Bring Your Own Key (BYOK) for higher rate limits.
- Shareable Open Graph cards for profiles and builds.
- About, FAQ, Terms, and Changelog pages; branded 404 / error pages.

#### Desktop, overlay & pre-game (Electron)

- Desktop app: one process, three windows. A native window wrapping the Ryot
  site (auto-opening to your profile via the League Client), the overlay, and the
  champ-select pre-game popup. Auto-updates via electron-updater.
- Champ-select pre-game suite: auto lobby reveal, both teams + bans, a meta board,
  enemy lane prediction, counters / matchup tips, live comp analysis (draft tags),
  recommended build, and an in-app rune editor with auto-import on lock-in.
- In-game overlay: game clock, Dragon / Baron / Herald spawn timers, and a live
  scoreboard, powered only by Riot's official Live Client Data API.
- Import to League: push a build's runes (and summoner spells, in champ select)
  into the client via the local LCU API.
- Shared-backend model: the Riot API key lives only on the backend you host;
  friends run the desktop app pointed at your URL and never need a key.

### Infrastructure

- pnpm monorepo: `@lc/shared`, `@lc/server` (Fastify API proxy with TTL cache and
  a conservative rate limiter), `@lc/web` (Next.js 15 / React 19 / Tailwind),
  `@lc/overlay`, and `@lc/desktop`.
- Self-hosting via Docker Compose with a single `.env`.
- CI on every push/PR (build, typecheck, lint, test) and a tag-driven desktop
  release pipeline (electron-builder) for Windows and macOS installers.

### Notes

- Not endorsed by Riot Games. The overlay (Live Client Data API) and desktop
  LCU integration are ToS-compliant, with no memory reading.

[1.1.0]: https://github.com/ryanpolasky/ryot/releases/tag/v1.1.0
[1.0.5]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.5
[1.0.4]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.4
[1.0.2]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.2
[1.0.1]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.1
[1.0.0]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.0
