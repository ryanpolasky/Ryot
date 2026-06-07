import { DDragonChampion, fetchChampions, getLatestVersion } from "@lc/shared";
import { cache } from "./cache.js";
import { config } from "./config.js";

const VERSION_KEY = "ddragon:version";
const CHAMPS_KEY = "ddragon:champions";

export async function getVersion(): Promise<string> {
  return cache.wrap(VERSION_KEY, config.cacheTtl.ddragon, () =>
    getLatestVersion(),
  );
}

/** champion numeric key -> Data Dragon champion (for image + name lookups). */
export async function getChampionMap(): Promise<
  Record<string, DDragonChampion>
> {
  return cache.wrap(CHAMPS_KEY, config.cacheTtl.ddragon, async () => {
    const version = await getVersion();
    const champs = await fetchChampions(version);
    const map: Record<string, DDragonChampion> = {};
    for (const c of champs) map[c.key] = c;
    return map;
  });
}

export async function championFileById(
  championId: number,
): Promise<string | null> {
  const map = await getChampionMap();
  return map[String(championId)]?.image.full ?? null;
}

/** champion numeric id -> display name (e.g. 266 -> "Aatrox"). */
export async function getChampionNameById(): Promise<Map<number, string>> {
  const map = await getChampionMap();
  const out = new Map<number, string>();
  for (const [key, champ] of Object.entries(map))
    out.set(Number(key), champ.name);
  return out;
}
