# Changelog

All notable changes to Ryot are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.1]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.1
[1.0.0]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.0
