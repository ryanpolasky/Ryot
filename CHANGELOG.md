# Changelog

All notable changes to Ryot are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/ryanpolasky/ryot/releases/tag/v1.0.0
