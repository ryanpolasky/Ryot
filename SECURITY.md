# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately via GitHub Security Advisories:
**https://github.com/ryanpolasky/ryot/security/advisories/new**

I'll acknowledge within a few days and keep you updated as it's triaged and fixed.

## Scope

Ryot is a self-hostable League of Legends companion. The most relevant areas:

- The backend (`apps/server`) proxies the Riot API. A user-supplied Riot API key
  (BYOK) is used for a single request and **immediately discarded**, never
  logged or stored. Reports about key handling are especially welcome.
- The desktop app (`apps/desktop`) talks to League's local LCU / Live Client
  APIs over `127.0.0.1` only.
- No accounts, no database of user data. Match data is fetched live and not
  persisted.

## Supported versions

This is a small open-source project; only the latest release on `main` is
supported. Please make sure you're on the newest version before reporting.
