/**
 * Loopback / private-network address detection, used to exempt internal callers
 * from rate limiting: in Docker the web app calls this API from the internal
 * network during SSR, and the overlay/desktop on the same machine use localhost.
 * Only genuinely public clients get throttled. If you run behind a reverse
 * proxy, enable Fastify's `trustProxy` so `req.ip` reflects the real client.
 */
export function isLoopbackOrPrivate(ip: string): boolean {
  const addr = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (addr === "127.0.0.1" || addr === "::1") return true;
  if (addr.startsWith("10.") || addr.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true;
  if (/^f[cd]/i.test(addr)) return true; // IPv6 unique-local fc00::/7
  return false;
}
