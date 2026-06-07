/**
 * Team composition analysis.
 *
 * Provides a curated champion-attribute table and functions to derive
 * Porofessor-style draft tags ("Low AP", "Good Peel", etc.) from a team comp.
 */

// ── Champion attribute types ─────────────────────────────────────────────────

export type DamageType = "AD" | "AP" | "MIXED";

export interface ChampAttrs {
  dmg: DamageType;
  engage?: boolean;
  peel?: boolean;
  frontline?: boolean;
  poke?: boolean;
  scaling?: boolean;
  early?: boolean;
  mobile?: boolean;
}

// ── Curated attribute table (keyed by DDragon id e.g. "Aatrox") ──────────────

const ATTRS: Record<string, ChampAttrs> = {
  // A
  Aatrox: { dmg: "AD", frontline: true, engage: true },
  Ahri: { dmg: "AP", mobile: true },
  Akali: { dmg: "AP", mobile: true },
  Akshan: { dmg: "AD", mobile: true },
  Alistar: { dmg: "AP", engage: true, peel: true, frontline: true },
  Amumu: { dmg: "AP", engage: true, frontline: true },
  Anivia: { dmg: "AP", peel: true, scaling: true },
  Annie: { dmg: "AP", engage: true },
  Aphelios: { dmg: "AD", scaling: true },
  Ashe: { dmg: "AD", peel: true, poke: true },
  AurelionSol: { dmg: "AP", scaling: true },
  Aurora: { dmg: "AP", mobile: true },
  Azir: { dmg: "AP", scaling: true, engage: true },
  // B
  Bard: { dmg: "AP", peel: true, engage: true, mobile: true },
  Belveth: { dmg: "AD", scaling: true, mobile: true },
  Blitzcrank: { dmg: "AP", engage: true, peel: true },
  Brand: { dmg: "AP", poke: true },
  Braum: { dmg: "AD", peel: true, frontline: true },
  Briar: { dmg: "AD", engage: true, mobile: true },
  Caitlyn: { dmg: "AD", poke: true },
  Camille: { dmg: "AD", mobile: true, engage: true },
  Cassiopeia: { dmg: "AP", scaling: true, peel: true },
  Chogath: { dmg: "AP", frontline: true, peel: true },
  Corki: { dmg: "MIXED", poke: true, mobile: true },
  // D
  Darius: { dmg: "AD", frontline: true, early: true },
  Diana: { dmg: "AP", engage: true },
  Draven: { dmg: "AD", early: true },
  DrMundo: { dmg: "MIXED", frontline: true, scaling: true },
  // E
  Ekko: { dmg: "AP", mobile: true },
  Elise: { dmg: "AP", early: true },
  Evelynn: { dmg: "AP", mobile: true },
  Ezreal: { dmg: "MIXED", poke: true, mobile: true },
  // F
  Fiddlesticks: { dmg: "AP", engage: true },
  Fiora: { dmg: "AD", mobile: true, scaling: true },
  Fizz: { dmg: "AP", mobile: true },
  // G
  Galio: { dmg: "AP", engage: true, frontline: true, peel: true },
  Gangplank: { dmg: "MIXED", poke: true, scaling: true },
  Garen: { dmg: "AD", frontline: true, early: true },
  Gnar: { dmg: "MIXED", engage: true, frontline: true },
  Gragas: { dmg: "AP", engage: true, frontline: true },
  Graves: { dmg: "AD", mobile: true },
  Gwen: { dmg: "AP", scaling: true, mobile: true },
  // H
  Hecarim: { dmg: "AD", engage: true, mobile: true, frontline: true },
  Heimerdinger: { dmg: "AP", poke: true },
  Hwei: { dmg: "AP", poke: true, peel: true },
  // I
  Illaoi: { dmg: "AD", frontline: true },
  Irelia: { dmg: "AD", mobile: true, engage: true },
  Ivern: { dmg: "AP", peel: true },
  // J
  Janna: { dmg: "AP", peel: true },
  JarvanIV: { dmg: "AD", engage: true, frontline: true },
  Jax: { dmg: "MIXED", scaling: true, frontline: true },
  Jayce: { dmg: "AD", poke: true, early: true },
  Jhin: { dmg: "AD", poke: true },
  Jinx: { dmg: "AD", scaling: true },
  // K
  Kaisa: { dmg: "MIXED", mobile: true, scaling: true },
  Kalista: { dmg: "AD", mobile: true, engage: true },
  Karma: { dmg: "AP", peel: true, poke: true },
  Karthus: { dmg: "AP", scaling: true },
  Kassadin: { dmg: "AP", scaling: true, mobile: true },
  Katarina: { dmg: "MIXED", mobile: true },
  Kayle: { dmg: "AP", scaling: true },
  Kayn: { dmg: "AD", mobile: true },
  Kennen: { dmg: "AP", engage: true },
  Khazix: { dmg: "AD", mobile: true },
  Kindred: { dmg: "AD", mobile: true },
  Kled: { dmg: "AD", engage: true, frontline: true, early: true },
  KogMaw: { dmg: "MIXED", scaling: true, poke: true },
  KSante: { dmg: "AD", frontline: true, engage: true },
  // L
  Leblanc: { dmg: "AP", mobile: true },
  LeeSin: { dmg: "AD", mobile: true, engage: true, early: true },
  Leona: { dmg: "AP", engage: true, frontline: true, peel: true },
  Lillia: { dmg: "AP", mobile: true },
  Lissandra: { dmg: "AP", engage: true, peel: true },
  Lucian: { dmg: "AD", mobile: true, early: true },
  Lulu: { dmg: "AP", peel: true },
  Lux: { dmg: "AP", poke: true, peel: true },
  // M
  Malphite: { dmg: "AP", engage: true, frontline: true },
  Malzahar: { dmg: "AP", peel: true },
  Maokai: { dmg: "AP", engage: true, frontline: true, peel: true },
  MasterYi: { dmg: "AD", scaling: true, mobile: true },
  MissFortune: { dmg: "AD", poke: true },
  MonkeyKing: { dmg: "AD", engage: true, frontline: true },
  Mordekaiser: { dmg: "AP", frontline: true },
  Morgana: { dmg: "AP", peel: true },
  Naafiri: { dmg: "AD", mobile: true },
  Nami: { dmg: "AP", peel: true, engage: true },
  Nasus: { dmg: "AD", frontline: true, scaling: true },
  Nautilus: { dmg: "AP", engage: true, frontline: true, peel: true },
  Neeko: { dmg: "AP", engage: true },
  Nidalee: { dmg: "AP", poke: true, mobile: true, early: true },
  Nilah: { dmg: "AD", scaling: true, engage: true },
  Nocturne: { dmg: "AD", engage: true },
  Nunu: { dmg: "AP", frontline: true, engage: true },
  // O
  Olaf: { dmg: "AD", frontline: true, early: true },
  Orianna: { dmg: "AP", peel: true, engage: true, scaling: true },
  Ornn: { dmg: "MIXED", engage: true, frontline: true, peel: true },
  // P
  Pantheon: { dmg: "AD", engage: true, early: true },
  Poppy: { dmg: "AD", frontline: true, peel: true },
  Pyke: { dmg: "AD", engage: true, mobile: true },
  // Q
  Qiyana: { dmg: "AD", mobile: true, engage: true },
  Quinn: { dmg: "AD", mobile: true, early: true },
  // R
  Rakan: { dmg: "AP", engage: true, peel: true, mobile: true },
  Rammus: { dmg: "AP", engage: true, frontline: true },
  RekSai: { dmg: "AD", engage: true, early: true },
  Rell: { dmg: "AP", engage: true, frontline: true, peel: true },
  Renata: { dmg: "AP", peel: true },
  Renekton: { dmg: "AD", frontline: true, early: true },
  Rengar: { dmg: "AD", mobile: true, early: true },
  Riven: { dmg: "AD", mobile: true, early: true },
  Rumble: { dmg: "AP", frontline: true },
  Ryze: { dmg: "AP", scaling: true },
  // S
  Samira: { dmg: "AD", mobile: true, engage: true },
  Sejuani: { dmg: "AP", engage: true, frontline: true, peel: true },
  Senna: { dmg: "AD", poke: true, scaling: true },
  Seraphine: { dmg: "AP", peel: true, poke: true },
  Sett: { dmg: "AD", engage: true, frontline: true, peel: true },
  Shaco: { dmg: "AD", mobile: true },
  Shen: { dmg: "MIXED", frontline: true, peel: true, engage: true },
  Shyvana: { dmg: "MIXED", frontline: true, scaling: true },
  Singed: { dmg: "AP", frontline: true },
  Sion: { dmg: "AD", engage: true, frontline: true },
  Sivir: { dmg: "AD", poke: true, scaling: true },
  Skarner: { dmg: "AD", engage: true, frontline: true },
  Smolder: { dmg: "MIXED", scaling: true, poke: true },
  Sona: { dmg: "AP", peel: true, scaling: true },
  Soraka: { dmg: "AP", peel: true },
  Swain: { dmg: "AP", frontline: true },
  Sylas: { dmg: "AP", mobile: true },
  Syndra: { dmg: "AP", poke: true },
  // T
  TahmKench: { dmg: "AP", frontline: true, peel: true },
  Taliyah: { dmg: "AP", peel: true },
  Talon: { dmg: "AD", mobile: true },
  Taric: { dmg: "AP", peel: true, frontline: true, engage: true },
  Teemo: { dmg: "AP", poke: true },
  Thresh: { dmg: "AP", engage: true, peel: true },
  Tristana: { dmg: "AD", mobile: true, scaling: true },
  Trundle: { dmg: "AD", frontline: true },
  Tryndamere: { dmg: "AD", mobile: true, scaling: true },
  TwistedFate: { dmg: "AP", poke: true },
  Twitch: { dmg: "AD", scaling: true },
  // U
  Udyr: { dmg: "MIXED", frontline: true, engage: true },
  Urgot: { dmg: "AD", frontline: true },
  // V
  Varus: { dmg: "MIXED", poke: true },
  Vayne: { dmg: "AD", scaling: true, mobile: true },
  Veigar: { dmg: "AP", scaling: true, peel: true },
  Velkoz: { dmg: "AP", poke: true },
  Vex: { dmg: "AP", engage: true },
  Vi: { dmg: "AD", engage: true },
  Viego: { dmg: "AD", mobile: true },
  Viktor: { dmg: "AP", poke: true, scaling: true },
  Vladimir: { dmg: "AP", scaling: true },
  Volibear: { dmg: "MIXED", engage: true, frontline: true },
  // W
  Warwick: { dmg: "MIXED", engage: true, frontline: true },
  Xayah: { dmg: "AD", peel: true },
  Xerath: { dmg: "AP", poke: true },
  XinZhao: { dmg: "AD", engage: true, frontline: true, early: true },
  // Y
  Yasuo: { dmg: "AD", mobile: true, scaling: true },
  Yone: { dmg: "MIXED", engage: true, mobile: true, scaling: true },
  Yorick: { dmg: "AD", scaling: true },
  Yuumi: { dmg: "AP", peel: true },
  // Z
  Zac: { dmg: "AP", engage: true, frontline: true },
  Zed: { dmg: "AD", mobile: true },
  Zeri: { dmg: "AD", mobile: true, scaling: true },
  Ziggs: { dmg: "AP", poke: true },
  Zilean: { dmg: "AP", peel: true },
  Zyra: { dmg: "AP", poke: true, peel: true },
};

// ── Fallback inference from DDragon tags ─────────────────────────────────────

function inferAttrs(tags?: string[]): ChampAttrs {
  if (!tags || tags.length === 0) return { dmg: "AD" };
  const t = new Set(tags.map((s) => s.toLowerCase()));
  let dmg: DamageType = "AD";
  if (t.has("mage") || t.has("support")) dmg = "AP";
  if (t.has("marksman")) dmg = "AD";
  if (t.has("assassin") && t.has("mage")) dmg = "MIXED";
  const frontline = t.has("tank") || undefined;
  return { dmg, frontline };
}

/** Look up attributes for a champion DDragon id. Falls back to tag inference. */
export function champAttrs(ddId: string, tags?: string[]): ChampAttrs {
  return ATTRS[ddId] ?? inferAttrs(tags);
}

// ── Comp analysis ────────────────────────────────────────────────────────────

export interface CompTag {
  label: string;
  tone: "good" | "warn" | "info";
}

export interface CompCounts {
  ad: number;
  ap: number;
  mixed: number;
  engage: number;
  peel: number;
  frontline: number;
  poke: number;
  scaling: number;
  early: number;
  mobile: number;
}

export interface CompAnalysis {
  tags: CompTag[];
  counts: CompCounts;
}

/**
 * Analyze a team composition (up to 5 champions) and return trait tags.
 * @param champIds Array of DDragon champion ids (e.g. ["Aatrox","Jinx",...])
 * @param tagLookup Optional map of ddId -> DDragon tags for fallback inference
 */
export function analyzeComp(
  champIds: string[],
  tagLookup?: Record<string, string[] | undefined>,
): CompAnalysis {
  const counts: CompCounts = {
    ad: 0,
    ap: 0,
    mixed: 0,
    engage: 0,
    peel: 0,
    frontline: 0,
    poke: 0,
    scaling: 0,
    early: 0,
    mobile: 0,
  };

  for (const id of champIds) {
    const a = champAttrs(id, tagLookup?.[id]);
    if (a.dmg === "AD") counts.ad++;
    else if (a.dmg === "AP") counts.ap++;
    else counts.mixed++;
    if (a.engage) counts.engage++;
    if (a.peel) counts.peel++;
    if (a.frontline) counts.frontline++;
    if (a.poke) counts.poke++;
    if (a.scaling) counts.scaling++;
    if (a.early) counts.early++;
    if (a.mobile) counts.mobile++;
  }

  const tags: CompTag[] = [];
  const n = champIds.length;
  if (n === 0) return { tags, counts };

  // Effective AD/AP: mixed counts 0.5 to each side.
  const effAP = counts.ap + counts.mixed * 0.5;
  const effAD = counts.ad + counts.mixed * 0.5;

  // Damage balance
  if (effAP === 0 && n >= 3)
    tags.push({ label: "Full AD - easy to itemize", tone: "warn" });
  else if (effAD === 0 && n >= 3)
    tags.push({ label: "Full AP - easy to itemize", tone: "warn" });
  else if (effAP <= 1 && n >= 4)
    tags.push({ label: "Low AP damage", tone: "warn" });
  else if (effAD <= 1 && n >= 4)
    tags.push({ label: "Low AD damage", tone: "warn" });
  else if (effAP >= 2 && effAD >= 2)
    tags.push({ label: "Balanced damage", tone: "good" });

  // Frontline
  if (counts.frontline === 0 && n >= 4)
    tags.push({ label: "No frontline", tone: "warn" });
  else if (counts.frontline >= 2)
    tags.push({ label: "Strong frontline", tone: "good" });

  // Engage
  if (counts.engage === 0 && n >= 4)
    tags.push({ label: "Lacks engage", tone: "warn" });
  else if (counts.engage >= 3)
    tags.push({ label: "Heavy engage", tone: "good" });
  else if (counts.engage >= 2)
    tags.push({ label: "Good engage", tone: "good" });

  // Peel
  if (counts.peel === 0 && n >= 4)
    tags.push({ label: "Low peel", tone: "warn" });
  else if (counts.peel >= 3)
    tags.push({ label: "Excellent peel", tone: "good" });
  else if (counts.peel >= 2) tags.push({ label: "Good peel", tone: "good" });

  // CC (engage + peel loosely approximates CC density)
  const ccCount = counts.engage + counts.peel;
  if (ccCount >= 5) tags.push({ label: "Lots of CC", tone: "good" });

  // Scaling vs early
  if (counts.scaling >= 3) tags.push({ label: "Scales hard", tone: "info" });
  else if (counts.early >= 3 && counts.scaling <= 1)
    tags.push({ label: "Early-game focused", tone: "info" });

  // Poke
  if (counts.poke >= 3) tags.push({ label: "Strong poke/siege", tone: "info" });

  // Mobility
  if (counts.mobile >= 4) tags.push({ label: "Very mobile", tone: "info" });

  return { tags, counts };
}

// ── Win prediction (comp-only heuristic, 0-100) ──────────────────────────────

/**
 * Lightweight win prediction from comp analysis of both teams.
 * Returns estimated win% for team A (50 = even). No rank input, pure comp.
 */
export function predictWin(teamA: CompAnalysis, teamB: CompAnalysis): number {
  let score = 50;

  // Damage balance advantage
  const aDmgBal =
    teamA.counts.ap + teamA.counts.mixed * 0.5 > 0 &&
    teamA.counts.ad + teamA.counts.mixed * 0.5 > 0;
  const bDmgBal =
    teamB.counts.ap + teamB.counts.mixed * 0.5 > 0 &&
    teamB.counts.ad + teamB.counts.mixed * 0.5 > 0;
  if (aDmgBal && !bDmgBal) score += 2;
  if (!aDmgBal && bDmgBal) score -= 2;

  // Frontline
  score += Math.min(3, (teamA.counts.frontline - teamB.counts.frontline) * 1.5);

  // Engage vs peel asymmetry
  const engageAdvantage = teamA.counts.engage - teamB.counts.peel;
  score += Math.max(-3, Math.min(3, engageAdvantage));

  // Scaling
  score += Math.min(2, (teamA.counts.scaling - teamB.counts.scaling) * 0.8);

  // Poke
  score += Math.min(2, (teamA.counts.poke - teamB.counts.poke) * 0.7);

  return Math.max(35, Math.min(65, Math.round(score)));
}
