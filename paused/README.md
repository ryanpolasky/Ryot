# Paused page

A self-contained page using the colors, wordmark and fonts from `apps/web`.
Fonts and the favicon are embedded; it makes no external asset requests.
Ryot has a dark theme only.

Serve locally from this directory with `wrangler dev --local`.
No production route is configured. Nothing is deployed automatically.
GET and HEAD on every path show the paused page, including old profile links.
