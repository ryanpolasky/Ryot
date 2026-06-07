import { SITE_URL } from "@/lib/site";

const GITHUB = "https://github.com/ryanpolasky/ryot";

// Served at /.well-known/security.txt via a rewrite (see next.config.mjs).
// RFC 9116. Expires is computed at request time (1 year out) so it never goes
// stale and needs no manual upkeep.
export function GET(): Response {
  const expires = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const body = [
    `Contact: ${GITHUB}/security/advisories/new`,
    `Contact: ${GITHUB}/issues`,
    `Expires: ${expires}`,
    `Policy: ${GITHUB}/blob/main/SECURITY.md`,
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    "Preferred-Languages: en",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
