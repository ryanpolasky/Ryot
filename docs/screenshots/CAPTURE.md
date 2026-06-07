# Screenshot capture guide

The images referenced by the root `README.md` live in this folder. Capture them
from the live build so they stay accurate. Use a consistent browser width
(**1440px**) and save as **PNG** with the exact filenames below.

## Setup

1. `cp .env.example .env` and set `RIOT_API_KEY` (a real key gives real data).
2. `pnpm dev` runs web on <http://localhost:3000>, API on <http://localhost:4000>.
3. Size the browser to **1440×900**, hide the bookmarks bar, and clear any
   personal extensions for a clean frame.

## Web (<http://localhost:3000>)

| File                            | Route                                          | What to show                                                                                              |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `web-home.png`                  | `/`                                            | Landing hero: wordmark, tagline, search. (README hero image.)                                             |
| `web-profile.png`               | `/summoner/na1/Faker/KR1`                      | Rank card, match history, session tracker.                                                                |
| `web-build.png`                 | `/build/Jinx`                                  | Runes, items, skill order (+ the "Theme site" button).                                                    |
| `web-live.png`                  | `/live/na1/<player-in-game>/<tag>`             | Both teams with ranks, winrates, premades. If nobody is in a game, capture the live-scout preview on `/`. |
| `web-match.png`                 | Click any match's **Breakdown** (`/match/...`) | Victory/Defeat banner, post-game awards, gold/XP graph.                                                   |
| `web-tierlist.png` _(optional)_ | `/tier-list`                                   | SR tier list.                                                                                             |

## Desktop & overlay (mock data, any OS)

| File          | How                                                             | What to show                                                                                            |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `overlay.png` | `cd apps/overlay && pnpm build && pnpm mock`                    | Transparent overlay: game clock, Dragon/Baron/Herald timers, scoreboard. Capture over a dark wallpaper. |
| `pregame.png` | `cd apps/desktop && pnpm build && LC_OVERLAY_MOCK=1 pnpm start` | Champ-select pre-game: both teams, bans, counters, rune editor.                                         |

## Tips

- Keep widths uniform so the README grid stays even.
- Scrub any real account names/IDs you don't want public (`Faker#KR1` is safe and iconic).
- Optimize PNGs (e.g. <https://tinypng.com>) to keep the repo light.
