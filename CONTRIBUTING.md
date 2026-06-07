# Contributing to Ryot

Thanks for your interest! Ryot is an open-source, privacy-first League companion.
Contributions of all sizes are welcome.

## Getting started

Prereqs: **Node 20+** and **pnpm 9** (`corepack enable` will pick up the version
pinned in `package.json`).

```bash
pnpm install
cp .env.example .env        # add your Riot API key (see the file for details)
pnpm dev                    # runs the server + web app
```

See the [README](./README.md) for the full architecture and self-hosting (Docker)
instructions. The repo is a pnpm monorepo:

- `packages/shared`: Riot API client, types, Data Dragon helpers
- `apps/server`: Fastify backend (API proxy, cache, rate limiter)
- `apps/web`: Next.js frontend
- `apps/overlay`: standalone Electron overlay
- `apps/desktop`: Electron app (main window + overlay + champ-select pre-game)

## Before opening a PR

Run these from the repo root and make sure they pass (CI runs the same):

```bash
pnpm -r typecheck
pnpm -r build
```

Then:

1. Branch off `main` (e.g. `feat/short-description` or `fix/short-description`).
2. Keep changes focused; match the existing code style (no enforced formatter,
   just mimic nearby code).
3. Write a clear PR description of what changed and why. Screenshots help for UI.
4. Link any related issue.

## Reporting bugs / requesting features

Use the issue templates. For bugs, include your OS, what you expected, what
happened, and steps to reproduce.

For **security** issues, please follow [SECURITY.md](./SECURITY.md) instead of
opening a public issue.

## Code of Conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## A note on Riot's ToS

Ryot only uses the official Riot API and League's local LCU / Live Client Data
APIs (no memory reading, no automation of gameplay). Please keep contributions
within those bounds.
