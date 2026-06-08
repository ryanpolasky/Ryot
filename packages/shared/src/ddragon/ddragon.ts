/**
 * Data Dragon static-data helpers.
 * Data Dragon is Riot's free static CDN for champions, items, runes, spells
 * and the images for all of them. No API key required.
 */

export const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

export interface DDragonChampion {
  /** Numeric champion id as a string (matches match-v5 championId). */
  key: string;
  /** Data Dragon id, e.g. "MonkeyKing". Used for the image filename. */
  id: string;
  /** Display name, e.g. "Wukong". */
  name: string;
  image: { full: string };
  /** Class tags from Data Dragon, e.g. ["Fighter","Tank"]. */
  tags?: string[];
}

export interface DDragonSkin {
  /** Skin number within the champion (0 = base/default). */
  num: number;
  /** Display name; the base skin is "default" in Data Dragon. */
  name: string;
}

export interface DDragonItem {
  name: string;
  description: string;
  plaintext: string;
  image: { full: string };
  gold?: { base: number; total: number; sell: number; purchasable: boolean };
}

/**
 * Rune stat-shard ids -> display name. These aren't in Data Dragon, so we map
 * the small fixed set by hand. Icons are omitted (rendered as text chips).
 */
export const STAT_SHARD_NAME: Record<string, string> = {
  "5001": "Health Scaling",
  "5002": "Armor",
  "5003": "Magic Resist",
  "5005": "Attack Speed",
  "5007": "Ability Haste",
  "5008": "Adaptive Force",
  "5010": "Move Speed",
  "5011": "Health",
  "5013": "Tenacity",
};

export interface RuneStyle {
  id: number;
  key: string;
  name: string;
  icon: string;
  slots: Array<{
    runes: Array<{ id: number; key: string; name: string; icon: string }>;
  }>;
}

/** Map of summoner-spell id -> Data Dragon image filename (without extension). */
export const SUMMONER_SPELL_IMAGE: Record<number, string> = {
  1: "SummonerBoost", // Cleanse
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste", // Ghost
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana", // Clarity
  14: "SummonerDot", // Ignite
  21: "SummonerBarrier",
  32: "SummonerSnowball", // Mark (ARAM)
};

export async function getLatestVersion(
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${DDRAGON_BASE}/api/versions.json`);
  if (!res.ok)
    throw new Error(`Failed to fetch Data Dragon versions: ${res.status}`);
  const versions = (await res.json()) as string[];
  const latest = versions[0];
  if (!latest) throw new Error("Data Dragon returned no versions");
  return latest;
}

export async function fetchChampions(
  version: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DDragonChampion[]> {
  const res = await fetchImpl(
    `${DDRAGON_BASE}/cdn/${version}/data/en_US/champion.json`,
  );
  if (!res.ok) throw new Error(`Failed to fetch champions: ${res.status}`);
  const json = (await res.json()) as {
    data: Record<string, DDragonChampion & { tags?: string[] }>;
  };
  return Object.values(json.data).map((c) => ({
    key: c.key,
    id: c.id,
    name: c.name,
    image: c.image,
    tags: c.tags,
  }));
}

/**
 * A champion's real skins (base + named skins). Chromas are filtered out: they
 * carry a `parentSkin` and have no distinct splash art (the CDN 403s), so they
 * can't back a theme. Requires the per-champion file, not the summary list.
 */
export async function fetchChampionSkins(
  version: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DDragonSkin[]> {
  const res = await fetchImpl(
    `${DDRAGON_BASE}/cdn/${version}/data/en_US/champion/${id}.json`,
  );
  if (!res.ok)
    throw new Error(`Failed to fetch skins for ${id}: ${res.status}`);
  const json = (await res.json()) as {
    data: Record<
      string,
      { skins?: { num: number; name: string; parentSkin?: number }[] }
    >;
  };
  return (json.data[id]?.skins ?? [])
    .filter((s) => !s.parentSkin)
    .map((s) => ({ num: s.num, name: s.name }));
}

export async function fetchItems(
  version: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, DDragonItem>> {
  const res = await fetchImpl(
    `${DDRAGON_BASE}/cdn/${version}/data/en_US/item.json`,
  );
  if (!res.ok) throw new Error(`Failed to fetch items: ${res.status}`);
  const json = (await res.json()) as { data: Record<string, DDragonItem> };
  return json.data;
}

export async function fetchRuneStyles(
  version: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RuneStyle[]> {
  const res = await fetchImpl(
    `${DDRAGON_BASE}/cdn/${version}/data/en_US/runesReforged.json`,
  );
  if (!res.ok) throw new Error(`Failed to fetch runes: ${res.status}`);
  return (await res.json()) as RuneStyle[];
}

/** URL builders. These are pure functions so the web app can use them directly. */
export const ddragonImg = {
  profileIcon: (version: string, iconId: number) =>
    `${DDRAGON_BASE}/cdn/${version}/img/profileicon/${iconId}.png`,
  /** champFile is the Data Dragon image.full value, e.g. "Aatrox.png". */
  champion: (version: string, champFile: string) =>
    `${DDRAGON_BASE}/cdn/${version}/img/champion/${champFile}`,
  /** Full splash art for a skin (skinNum 0 = base). Version-independent. */
  champSplash: (championId: string, skinNum = 0) =>
    `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`,
  /** Portrait loading art for a skin; handy for small thumbnails. */
  champLoading: (championId: string, skinNum = 0) =>
    `${DDRAGON_BASE}/cdn/img/champion/loading/${championId}_${skinNum}.jpg`,
  item: (version: string, itemId: number) =>
    itemId > 0 ? `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png` : null,
  summonerSpell: (version: string, spellId: number) => {
    const name = SUMMONER_SPELL_IMAGE[spellId];
    return name ? `${DDRAGON_BASE}/cdn/${version}/img/spell/${name}.png` : null;
  },
  /** Rune/perk icon path comes from runesReforged "icon" fields. */
  runeIcon: (iconPath: string) => `${DDRAGON_BASE}/cdn/img/${iconPath}`,
};
