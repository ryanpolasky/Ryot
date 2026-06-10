# <span style="color:#c8aa6e">Ry</span>ot

**Open-source League of Legends companion - OP.GG-style stats · Porofessor-style live-game scout · Blitz-style in-game overlay. Self-hostable for you and your friends.**

Ryot is a League companion I built because every other one eventually wanted my
money or buried the stats under ads and an Overwolf install. It's intentionally
small: no accounts, no tracking, no growth team, no roadmap. Self-host it for you
and a few friends and it gets out of the way.

---

## Features

| Feature                   | Description                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Summoner Search**       | Look up any player by Riot ID (e.g. `Faker#KR1`) across all regions.                                                                                                                                                                                                                                                                                             |
| **Profile & Ranked**      | Profile icon, summoner level, Solo/Duo & Flex rank + LP, winrate.                                                                                                                                                                                                                                                                                                |
| **Match History**         | Recent 10 matches with champion, KDA, CS, items, duration, and both team rosters.                                                                                                                                                                                                                                                                                |
| **Live-Game Scout**       | See everyone in a player's current match: ranked info, winrate, champion. Auto-refreshes every 30 s.                                                                                                                                                                                                                                                             |
| **Champion Builds**       | Recommended runes, summoner spells, skill order, starting items, core build, and situational items per champion & role. Powered by Ryot's own meta engine (Riot Match-V5 aggregation; coming soon).                                                                                                                                                                                                        |
| **Item Tooltips**         | Hover any item for a fit-to-content tooltip with its gold cost and the real in-game effect description (Data Dragon, with League's stat/passive/active markup).                                                                                                                                                                                                  |
| **Desktop App**           | One Electron app with **three windows**: a native main window that loads the Ryot site and opens straight to _your_ profile (detected via the League Client), the in-game overlay, and the champ-select pre-game popup. Friends point it at your hosted backend - no per-user API key.                                                                           |
| **Champ-Select Pre-Game** | Porofessor-style popup (on a monitor you choose) the moment you enter champ select: both teams, bans, a two-stage meta board (most-picked → that champ's common ban targets on hover), **enemy lane prediction** (cards reordered top→jg→mid→bot→sup), recommended build, and an in-app **rune editor** (pre-filled, click-to-swap) with auto-import on lock-in. |
| **Import to League**      | Push a build's runes (and summoner spells, in champ select) into the League client via the local LCU API - from the build page or the pre-game window.                                                                                                                                                                                                           |
| **In-Game Overlay**       | Transparent overlay that draws game clock, Dragon/Baron/Herald spawn timers, and a live scoreboard over your game.                                                                                                                                                                                                                                               |
| **Docker Self-Host**      | `docker compose up` with one `.env` file.                                                                                                                                                                                                                                                                                                                        |

---

## Architecture

```
ryot/
├── packages/shared     @lc/shared   Riot API client, types, Data Dragon helpers
├── apps/server         @lc/server   Fastify backend - API proxy, TTL cache, rate limiter, meta/builds
├── apps/web            @lc/web      Next.js frontend - search, profile, matches, live scout, builds
├── apps/overlay        @lc/overlay  Standalone Electron overlay - Live Client Data API
├── apps/desktop        @lc/desktop  Electron app - main window + overlay + champ-select pre-game + LCU
├── Dockerfile.server
├── Dockerfile.web
└── docker-compose.yml
```

- **Monorepo** via pnpm workspaces.
- Server proxies all Riot API calls, adds in-memory TTL caching, and a conservative rate limiter (stays well under dev-key limits).
- Web fetches from Server; server-side rendering for profiles/matches, client-side polling for live scout.
- Overlay reads League's **Live Client Data API** (`https://127.0.0.1:2999`) - 100 % ToS compliant.
- Desktop app reads the **League Client (LCU) API** (local lockfile auth) to detect the current summoner, watch champ select, and import runes/spells/item sets - also ToS compliant (no memory reading).
- **Shared-backend model:** the Riot API key lives only on the backend you host. The desktop app (you + friends) is a thin client that points at your hosted Ryot URL - friends never need a key.
- UI follows the **“RYOT // UPRISING”** design language - see [`DESIGN.md`](./DESIGN.md) for tokens, type, and components.

---

## Quick Start (local dev)

### Prerequisites

| Tool           | Version                                         |
| -------------- | ----------------------------------------------- |
| Node.js        | ≥ 20                                            |
| pnpm           | ≥ 9                                             |
| A Riot API key | [Get one here](https://developer.riotgames.com) |

### 1. Install

```bash
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
# edit .env - at minimum set RIOT_API_KEY
```

### 3. Run

```bash
# Start server (port 4000) + web (port 3000) together:
pnpm dev

# Or separately:
pnpm dev:server
pnpm dev:web
```

Open **http://localhost:3000** and search any Riot ID.

### 4. Overlay (Windows / macOS only)

The overlay reads data from the League client running on your machine.

```bash
cd apps/overlay
pnpm build        # compile TypeScript
pnpm start         # launch Electron overlay
```

| Shortcut       | Action                                                |
| -------------- | ----------------------------------------------------- |
| `Ctrl+Shift+O` | Toggle click-through (interact with overlay controls) |
| `Ctrl+Shift+H` | Hide / show overlay                                   |

To test without League running:

```bash
pnpm mock          # loads built-in sample game data
```

---

## Desktop App (main window + overlay + pre-game)

The desktop app bundles three windows in one Electron process: the **main window**
(loads your hosted Ryot site, auto-opening to your own profile via the League
Client), the **overlay**, and the **champ-select pre-game** popup. The Riot key
stays on the backend - friends only set the Ryot server URL once.

```bash
cd apps/desktop
pnpm build

# Point at your hosted backend + site (defaults to localhost):
RYOT_URL=https://ryot.example.com RYOT_API_URL=https://api.ryot.example.com pnpm start
```

| Shortcut       | Action                                                               |
| -------------- | -------------------------------------------------------------------- |
| `Ctrl+Shift+O` | Overlay: toggle click-through                                        |
| `Ctrl+Shift+H` | Overlay: hide / show                                                 |
| `Ctrl+Shift+S` | Open Settings (Ryot URL, default Riot ID, pre-game monitor, toggles) |

Test the windows without League running (mock data):

```bash
LC_OVERLAY_MOCK=1 pnpm start   # overlay + pre-game render from built-in mock data
```

> The overlay and pre-game windows build and render on any OS, but live LCU
> detection, champ-select auto-open, drawing over a real match, and importing to
> the client only work on **Windows / macOS with League running**.

---

## Docker Self-Host

```bash
cp .env.example .env
# Set RIOT_API_KEY in .env

docker compose up -d
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000

To rebuild after changes:

```bash
docker compose up -d --build
```

### Environment Variables

| Variable               | Default                 | Description                                                                    |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `RIOT_API_KEY`         | _(required)_            | Your Riot API key.                                                             |
| `DEFAULT_REGION`       | `na1`                   | Fallback region for the backend.                                               |
| `PORT`                 | `4000`                  | Server port.                                                                   |
| `CORS_ORIGINS`         | `http://localhost:3000` | Allowed origins (comma-separated).                                             |
| `CACHE_TTL_SUMMONER`   | `300`                   | Summoner/ranked cache TTL (seconds).                                           |
| `CACHE_TTL_MATCH`      | `86400`                 | Match data cache TTL.                                                          |
| `CACHE_TTL_SPECTATOR`  | `20`                    | Live-game data cache TTL.                                                      |
| `CACHE_TTL_DDRAGON`    | `3600`                  | Data Dragon cache TTL.                                                         |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:4000` | API URL the **browser** uses.                                                  |
| `API_BASE`             | _(same as above)_       | API URL for **server-side rendering** (set to `http://server:4000` in Docker). |
| `OVERLAY_API_BASE`     | `http://localhost:4000` | API URL the overlay uses (future use).                                         |

> **Build/meta engine** (off by default): `STATS_CRAWL_ENABLED`, plus
> `STATS_CRAWL_PLATFORMS`, `STATS_CRAWL_SCOPE`, `STATS_MATCHES_PER_PLAYER`,
> `STATS_CYCLE_INTERVAL_MIN`, and `STATS_SNAPSHOT_PATH` (see `.env.example`).
> It aggregates builds/tier lists from Riot's Match-V5 API and needs a
> **production** key; until it's enabled those pages show "coming soon".

---

## Riot API Keys

| Type            | Expires    | Rate Limit                | Best For                                 |
| --------------- | ---------- | ------------------------- | ---------------------------------------- |
| **Development** | Every 24 h | 20 req / 1 s, 100 / 2 min | Quick testing                            |
| **Personal**    | Never      | 20 req / 1 s, 100 / 2 min | You & friends long-term                  |
| **Production**  | Never      | Higher limits             | Public app (requires full Riot approval) |

For a small friend group, a **Personal API key** is ideal. Apply at https://developer.riotgames.com/app-type - approval is usually quick for personal/non-commercial apps.

---

## Tech Stack

- **Backend:** Node.js 22 · Fastify · TypeScript
- **Frontend:** Next.js 15 (App Router) · React 19 · Tailwind CSS
- **Overlay & Desktop:** Electron 33 · TypeScript · Live Client Data API · League Client (LCU) API
- **Packaging:** pnpm workspaces · Docker Compose
- **Data Sources:** Riot API (Account-v1, Summoner-v4, League-v4, Match-v5, Spectator-v5) · Data Dragon CDN · Ryot's own meta engine (Match-v5 aggregation) for builds & tier lists

---

## Project Scripts

```bash
pnpm dev             # server + web in parallel
pnpm build           # build all packages
pnpm typecheck       # TypeScript check across all packages
pnpm lint            # lint all packages
pnpm clean           # remove dist / .next / caches
```

---

## License

MIT - see [LICENSE](./LICENSE).

This project is a personal open-source project and is not affiliated with, endorsed by, or sponsored by any employer.

> **Ryot** isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
