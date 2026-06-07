/**
 * Pre-game (champ-select) renderer.
 *
 * Uses `window.pregame` bridge (from pregame-preload.ts) for all data access.
 * Renders both teams, bans, meta board / counters (two-stage), build rune
 * editor, spells, items, and import controls.
 */

import { analyzeComp, predictWin, type CompTag } from "./comp.js";

declare interface PregameAPI {
  onSession(cb: (session: ChampSelectSession) => void): void;
  getSession(): Promise<ChampSelectSession | null>;
  getSettings(): Promise<{ apiUrl: string; autoImportRunes: boolean }>;
  importRunes(p: unknown): Promise<{ ok: boolean }>;
  importSpells(p: unknown): Promise<{ ok: boolean }>;
  importItemSet(p: unknown): Promise<{ ok: boolean }>;
  fetchBuild(champ: string, role?: string): Promise<BuildData>;
  fetchMatchups(champ: string, role?: string): Promise<MatchupData>;
  fetchMeta(): Promise<MetaData>;
  fetchLanePrediction(champs: string[]): Promise<LanePred[]>;
  fetchRuneTrees(): Promise<RuneTree[]>;
  fetchChampions(): Promise<{ version: string; champions: ChampInfo[] }>;
}

declare const pregame: PregameAPI;

// ── types ────────────────────────────────────────────────────────────────────

interface ChampSelectPlayer {
  cellId: number;
  championId: number;
  summonerId: number;
  spell1Id: number;
  spell2Id: number;
  assignedPosition: string;
}

interface ChampSelectSession {
  myTeam: ChampSelectPlayer[];
  theirTeam: ChampSelectPlayer[];
  bans: { myTeamBans: number[]; theirTeamBans: number[] };
  localPlayerCellId: number;
  timer: { phase: string; adjustedTimeLeftInPhase: number };
}

interface ChampInfo {
  key: string;
  id: string;
  name: string;
  image: { full: string };
  tags?: string[];
}

interface BuildItem {
  id: number;
  name: string;
  description: string;
  icon: string | null;
}

interface BuildData {
  champion: string;
  role: string;
  runes: {
    primaryStyle: { id: number; name: string; icon: string };
    keystone: { id: number; name: string; icon: string };
    primaryPerks: { id: number; name: string; icon: string }[];
    secondaryStyle: { id: number; name: string; icon: string };
    secondaryPerks: { id: number; name: string; icon: string }[];
    shards: string[];
    perkIds: number[];
    shardIds: number[];
  };
  summoners: BuildItem[];
  startingItems: BuildItem[];
  coreItems: BuildItem[];
  itemOptions: { item: BuildItem; winRate: number }[][];
}

interface MatchupEntry {
  champion: string;
  championIcon: string;
  championId: number;
  games: number;
  wins: number;
  winRate: number;
}

interface MatchupData {
  champion: string;
  role: string;
  counters: MatchupEntry[];
  laneOpponents: MatchupEntry[];
}

interface MetaChamp {
  champion: string;
  championIcon: string;
  championId: string;
  role: string;
  games: number;
  winRate: number;
}

interface MetaData {
  mostPicked: MetaChamp[];
  highestWinRate: MetaChamp[];
}

interface LanePred {
  lane: string;
  champion: string;
  championIcon: string;
  championId: string;
  confidence: number;
}

interface RuneTree {
  id: number;
  key: string;
  icon: string;
  name: string;
  slots: { runes: { id: number; key: string; icon: string; name: string }[] }[];
}

// ── state ────────────────────────────────────────────────────────────────────

const champByKey: Record<string, ChampInfo> = {};
const champById: Record<string, ChampInfo> = {};
let version = "";
let isMock = false;
let currentSession: ChampSelectSession | null = null;
let myChampDdragonId = "";
let myChampRole = "";
let currentBuild: BuildData | null = null;
let runeTrees: RuneTree[] = [];

// Rune editor state
let editPrimaryStyleId = 0;
let editSecondaryStyleId = 0;
let editKeystone = 0;
let editPrimaryPerks: number[] = [];
let editSecondaryPerks: number[] = [];
let editShards: number[] = [5008, 5008, 5011];

// Shard definitions
const SHARD_ROWS = [
  [
    {
      id: 5008,
      label: "AF",
      icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
    },
    {
      id: 5005,
      label: "AS",
      icon: "perk-images/StatMods/StatModsAttackSpeedIcon.png",
    },
    {
      id: 5007,
      label: "AH",
      icon: "perk-images/StatMods/StatModsCDRScalingIcon.png",
    },
  ],
  [
    {
      id: 5008,
      label: "AF",
      icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
    },
    {
      id: 5010,
      label: "MS",
      icon: "perk-images/StatMods/StatModsMovementSpeedIcon.png",
    },
    {
      id: 5001,
      label: "HP%",
      icon: "perk-images/StatMods/StatModsHealthScalingIcon.png",
    },
  ],
  [
    {
      id: 5011,
      label: "HP",
      icon: "perk-images/StatMods/StatModsHealthPlusIcon.png",
    },
    {
      id: 5013,
      label: "TEN",
      icon: "perk-images/StatMods/StatModsTenacityIcon.png",
    },
    {
      id: 5001,
      label: "HP%",
      icon: "perk-images/StatMods/StatModsHealthScalingIcon.png",
    },
  ],
];

const POSITION_ORDER = ["top", "jungle", "middle", "bottom", "utility"];
const POSITION_LABEL: Record<string, string> = {
  top: "TOP",
  jungle: "JG",
  middle: "MID",
  bottom: "BOT",
  utility: "SUP",
};

const DDRAGON = "https://ddragon.leagueoflegends.com";
function champIcon(champFile: string): string {
  return `${DDRAGON}/cdn/${version}/img/champion/${champFile}`;
}
function runeIcon(iconPath: string): string {
  return `${DDRAGON}/cdn/img/${iconPath}`;
}

// ── DOM refs ─────────────────────────────────────────────────────────────────

const $phase = document.getElementById("phase")!;
const $timer = document.getElementById("timer")!;
const $myBans = document.getElementById("my-bans")!;
const $theirBans = document.getElementById("their-bans")!;
const $myTeam = document.getElementById("my-team")!;
const $theirTeam = document.getElementById("their-team")!;
const $boardTitle = document.getElementById("board-title")!;
const $board = document.getElementById("board")!;
const $buildSection = document.getElementById("build-section")! as HTMLElement;
const $spells = document.getElementById("spells")!;
const $runeEditor = document.getElementById("rune-editor")!;
const $items = document.getElementById("items")!;
const $importRunes = document.getElementById(
  "import-runes",
)! as HTMLButtonElement;
const $importSpells = document.getElementById(
  "import-spells",
)! as HTMLButtonElement;
const $importItems = document.getElementById(
  "import-items",
)! as HTMLButtonElement;
const $importStatus = document.getElementById("import-status")!;
const $autoImport = document.getElementById("auto-import")! as HTMLInputElement;
const $lanePredNote = document.getElementById("lane-pred-note")!;
const $matchupPanel = document.getElementById("matchup-panel")!;
const $compPanel = document.getElementById("comp-panel")! as HTMLElement;
const $compTagsAlly = document.getElementById("comp-tags-ally")!;
const $compTagsEnemy = document.getElementById("comp-tags-enemy")!;
const $compWin = document.getElementById("comp-win")!;

// ── init ─────────────────────────────────────────────────────────────────────

async function init() {
  isMock = new URLSearchParams(location.search).get("mock") === "1";

  // Fetch champions + version.
  const data = await pregame.fetchChampions();
  version = data.version;
  for (const c of data.champions) {
    champByKey[c.key] = c;
    champById[c.id] = c;
  }

  // Fetch rune trees.
  runeTrees = await pregame.fetchRuneTrees();

  // Settings.
  const settings = await pregame.getSettings();
  $autoImport.checked = settings.autoImportRunes;

  // Load default meta board.
  loadMetaBoard();

  // Subscribe to session updates.
  pregame.onSession(handleSession);

  // Mock or initial session.
  if (isMock) {
    const mockRes = await fetch("./mock-champselectsession.json");
    const mock = (await mockRes.json()) as ChampSelectSession;
    handleSession(mock);
  } else {
    const s = await pregame.getSession();
    if (s) handleSession(s);
  }

  // Import buttons.
  $importRunes.addEventListener("click", doImportRunes);
  $importSpells.addEventListener("click", doImportSpells);
  $importItems.addEventListener("click", doImportItems);
}

init().catch((e) =>
  console.error("Pre-game init failed:", (e as Error).message),
);

// ── session handler ──────────────────────────────────────────────────────────

async function handleSession(session: ChampSelectSession) {
  currentSession = session;
  renderTimer(session.timer);
  renderBans(session.bans);
  renderMyTeam(session.myTeam, session.localPlayerCellId);
  await renderEnemyTeam(session.theirTeam);

  // Detect my champion.
  const me = session.myTeam.find((p) => p.cellId === session.localPlayerCellId);
  if (me && me.championId > 0) {
    const champ = champByKey[String(me.championId)];
    if (champ && champ.id !== myChampDdragonId) {
      myChampDdragonId = champ.id;
      myChampRole = positionToRole(me.assignedPosition);
      loadMyBuild(champ.id, myChampRole);
    }
  }

  // Your-lane matchup tip (my champ vs my direct lane opponent).
  loadLaneMatchup();

  // Comp analysis (once both teams have picks).
  renderCompAnalysis(session);
}

function positionToRole(pos: string): string {
  const map: Record<string, string> = {
    top: "top",
    jungle: "jungle",
    middle: "mid",
    bottom: "bottom",
    utility: "support",
  };
  return map[pos.toLowerCase()] ?? "";
}

// ── render timer ─────────────────────────────────────────────────────────────

function renderTimer(timer: {
  phase: string;
  adjustedTimeLeftInPhase: number;
}) {
  $phase.textContent = timer.phase.replace(/_/g, " ");
  const secs = Math.max(0, Math.ceil(timer.adjustedTimeLeftInPhase / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  $timer.textContent = `${m}:${String(s).padStart(2, "0")}`;
}

// ── render bans ──────────────────────────────────────────────────────────────

function renderBans(bans: { myTeamBans: number[]; theirTeamBans: number[] }) {
  $myBans.innerHTML = "";
  $theirBans.innerHTML = "";
  for (const id of bans.myTeamBans) $myBans.appendChild(banIcon(id));
  for (const id of bans.theirTeamBans) $theirBans.appendChild(banIcon(id));
}

function banIcon(champId: number): HTMLElement {
  if (champId <= 0) {
    const d = document.createElement("div");
    d.className = "ban-icon empty";
    return d;
  }
  const c = champByKey[String(champId)];
  if (!c) {
    const d = document.createElement("div");
    d.className = "ban-icon empty";
    return d;
  }
  const img = document.createElement("img");
  img.className = "ban-icon";
  img.src = champIcon(c.image.full);
  img.title = c.name;
  return img;
}

// ── render teams ─────────────────────────────────────────────────────────────

function renderMyTeam(players: ChampSelectPlayer[], localCellId: number) {
  $myTeam.innerHTML = "";
  const sorted = [...players].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(a.assignedPosition.toLowerCase());
    const bi = POSITION_ORDER.indexOf(b.assignedPosition.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  for (const p of sorted) {
    $myTeam.appendChild(playerCard(p, p.cellId === localCellId));
  }
}

let enemyPredictions: LanePred[] = [];
let lastEnemyKeys = "";

async function renderEnemyTeam(players: ChampSelectPlayer[]) {
  const champKeys = players
    .map((p) => champByKey[String(p.championId)]?.id ?? "")
    .filter(Boolean);

  // Attempt lane prediction if we have 5 enemy champs.
  if (champKeys.length === 5) {
    const keysStr = champKeys.join(",");
    if (keysStr !== lastEnemyKeys) {
      lastEnemyKeys = keysStr;
      try {
        enemyPredictions = await pregame.fetchLanePrediction(champKeys);
        $lanePredNote.textContent = "(predicted lanes)";
      } catch {
        enemyPredictions = [];
        $lanePredNote.textContent = "";
      }
    }
  } else {
    enemyPredictions = [];
    $lanePredNote.textContent = "";
  }

  $theirTeam.innerHTML = "";
  if (enemyPredictions.length === 5) {
    // Render in predicted lane order.
    for (const pred of enemyPredictions) {
      const origPlayer = players.find(
        (p) => String(p.championId) === pred.championId,
      );
      const card = enemyCard(
        origPlayer ?? null,
        pred.champion,
        pred.championIcon,
        pred.lane,
        pred.confidence,
      );
      $theirTeam.appendChild(card);
    }
  } else {
    for (const p of players) $theirTeam.appendChild(playerCard(p, false));
  }
}

function playerCard(p: ChampSelectPlayer, isMe: boolean): HTMLElement {
  const card = document.createElement("div");
  card.className = "player-card" + (isMe ? " me" : "");

  const c = champByKey[String(p.championId)];
  if (c) {
    const img = document.createElement("img");
    img.className = "champ-icon";
    img.src = champIcon(c.image.full);
    card.appendChild(img);

    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "champ-name";
    name.textContent = c.name;
    info.appendChild(name);
    const role = document.createElement("div");
    role.className = "role-tag";
    role.textContent =
      (POSITION_LABEL[p.assignedPosition.toLowerCase()] ??
        p.assignedPosition) ||
      "---";
    info.appendChild(role);
    card.appendChild(info);

    // Hover: show counters for this champ.
    card.addEventListener("mouseenter", () => loadCounters(c.id));
    card.addEventListener("mouseleave", showMetaBoard);
  } else {
    const empty = document.createElement("div");
    empty.className = "champ-icon empty";
    card.appendChild(empty);
    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "champ-name";
    name.textContent = "Picking...";
    info.appendChild(name);
    card.appendChild(info);
  }

  return card;
}

function enemyCard(
  p: ChampSelectPlayer | null,
  champName: string,
  champIconUrl: string,
  lane: string,
  confidence: number,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "player-card";

  if (champIconUrl) {
    const img = document.createElement("img");
    img.className = "champ-icon";
    img.src = champIconUrl;
    card.appendChild(img);
  } else {
    const empty = document.createElement("div");
    empty.className = "champ-icon empty";
    card.appendChild(empty);
  }

  const info = document.createElement("div");
  info.className = "info";
  const name = document.createElement("div");
  name.className = "champ-name";
  name.textContent = champName;
  info.appendChild(name);
  const role = document.createElement("div");
  role.className = "role-tag";
  role.textContent = lane.toUpperCase();
  info.appendChild(role);
  const conf = document.createElement("div");
  conf.className = "confidence";
  conf.textContent = `${Math.round(confidence * 100)}% conf`;
  info.appendChild(conf);
  card.appendChild(info);

  // Hover counters.
  const c = Object.values(champByKey).find((ch) => ch.name === champName);
  if (c) {
    card.addEventListener("mouseenter", () => loadCounters(c.id));
    card.addEventListener("mouseleave", showMetaBoard);
  }

  return card;
}

// ── meta board (default) ─────────────────────────────────────────────────────

let metaCache: MetaData | null = null;

async function loadMetaBoard() {
  try {
    metaCache = await pregame.fetchMeta();
    showMetaBoard();
  } catch {
    $board.innerHTML = '<div class="empty">Could not load meta data.</div>';
  }
}

function showMetaBoard() {
  if (!metaCache) return;
  $boardTitle.textContent = "Meta // Most Picked";
  $board.innerHTML = "";
  const top10 = metaCache.mostPicked.slice(0, 10);
  for (const c of top10) {
    const row = document.createElement("div");
    row.className = "meta-row";
    row.innerHTML = `
      <img src="${c.championIcon}" alt="${c.champion}" />
      <span class="name">${c.champion}</span>
      <span class="role">${c.role}</span>
      <span class="stat wr">${c.winRate}%</span>
      <span class="stat games">${fmtK(c.games)}</span>
    `;
    $board.appendChild(row);
  }
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ── counters (on champion hover) ─────────────────────────────────────────────

const counterCache: Record<string, MatchupData> = {};

async function loadCounters(champDdragonId: string) {
  $boardTitle.textContent = `Ban Targets // ${champDdragonId}`;
  $board.innerHTML = '<div class="loading">Loading matchups...</div>';

  try {
    if (!counterCache[champDdragonId]) {
      counterCache[champDdragonId] =
        await pregame.fetchMatchups(champDdragonId);
    }
    const data = counterCache[champDdragonId]!;
    $boardTitle.textContent = `Ban Targets // ${data.champion} ${data.role}`;
    $board.innerHTML = "";
    const counters = data.counters.slice(0, 8);
    for (const c of counters) {
      const row = document.createElement("div");
      row.className = "counter-row";
      const fillClass =
        c.winRate < 45 ? "low" : c.winRate < 50 ? "mid" : "high";
      row.innerHTML = `
        <img src="${c.championIcon}" alt="${c.champion}" />
        <span class="name">${c.champion}</span>
        <div class="wr-bar"><div class="wr-fill ${fillClass}" style="width:${c.winRate}%"></div></div>
        <span class="wr-text">${c.winRate}%</span>
      `;
      $board.appendChild(row);
    }
    if (counters.length === 0) {
      $board.innerHTML = '<div class="empty">No counter data available.</div>';
    }
  } catch {
    $board.innerHTML = '<div class="empty">Failed to load counters.</div>';
  }
}

// ── your-lane matchup tip ─────────────────────────────────────────────────────

function roleToLaneLabel(role: string): string {
  const map: Record<string, string> = {
    top: "Top",
    jungle: "Jungle",
    middle: "Mid",
    mid: "Mid",
    bottom: "Bottom",
    utility: "Support",
    support: "Support",
  };
  return map[role.toLowerCase()] ?? "";
}

/** Numeric championId of my direct lane opponent, or null if unknown. */
function laneOpponentChampId(): number | null {
  if (!currentSession) return null;
  const me = currentSession.myTeam.find(
    (p) => p.cellId === currentSession!.localPlayerCellId,
  );
  if (!me) return null;
  const myPos = me.assignedPosition.toLowerCase();

  // 1) Enemy with the same assigned position (drafts where roles are known).
  if (myPos) {
    const opp = currentSession.theirTeam.find(
      (p) => p.assignedPosition.toLowerCase() === myPos && p.championId > 0,
    );
    if (opp) return opp.championId;
  }

  // 2) Fall back to predicted lanes.
  const myLane = roleToLaneLabel(myPos);
  if (myLane) {
    const pred = enemyPredictions.find((p) => p.lane === myLane);
    if (pred) {
      const c = Object.values(champByKey).find(
        (ch) => ch.id === pred.championId || ch.name === pred.champion,
      );
      if (c) return Number(c.key);
    }
  }
  return null;
}

interface MatchupTip {
  tone: "good" | "even" | "bad";
  text: string;
}

/** Actionable lane tip from the head-to-head win rate (my champ's perspective). */
function matchupTip(winRate: number | null, games: number): MatchupTip {
  if (winRate === null || games < 80)
    return {
      tone: "even",
      text: "Limited matchup data. Play standard and track their jungler.",
    };
  if (winRate >= 54)
    return {
      tone: "good",
      text: "Favored lane: trade aggressively and look to snowball.",
    };
  if (winRate >= 51)
    return {
      tone: "good",
      text: "Slight edge: win trades, deny CS, build a lead.",
    };
  if (winRate >= 49)
    return {
      tone: "even",
      text: "Even matchup: focus CS and your roam timings.",
    };
  if (winRate >= 46)
    return {
      tone: "bad",
      text: "Slight disadvantage: play safe early, then scale.",
    };
  return {
    tone: "bad",
    text: "Hard matchup: respect their spikes, ward for ganks, ask for help.",
  };
}

async function loadLaneMatchup() {
  const oppId = laneOpponentChampId();
  if (!myChampDdragonId || oppId === null) {
    $matchupPanel.style.display = "none";
    return;
  }
  const oppChamp = champByKey[String(oppId)];
  const myChamp =
    champByKey[
      String(
        Object.values(champByKey).find((c) => c.id === myChampDdragonId)?.key ??
          "",
      )
    ];
  if (!oppChamp || !myChamp) {
    $matchupPanel.style.display = "none";
    return;
  }
  try {
    if (!counterCache[myChampDdragonId]) {
      counterCache[myChampDdragonId] = await pregame.fetchMatchups(
        myChampDdragonId,
        myChampRole || undefined,
      );
    }
    const data = counterCache[myChampDdragonId]!;
    const entry =
      data.laneOpponents.find((e) => e.championId === oppId) ??
      data.counters.find((e) => e.championId === oppId) ??
      null;
    renderLaneMatchup(myChamp, oppChamp, entry);
  } catch {
    $matchupPanel.style.display = "none";
  }
}

function renderLaneMatchup(
  myChamp: ChampInfo,
  oppChamp: ChampInfo,
  entry: MatchupEntry | null,
) {
  const wr = entry ? entry.winRate : null;
  const games = entry ? entry.games : 0;
  const tip = matchupTip(wr, games);
  const wrClass =
    wr === null ? "even" : wr >= 51 ? "good" : wr >= 49 ? "even" : "bad";
  $matchupPanel.style.display = "";
  $matchupPanel.innerHTML = `
    <div class="matchup-title">Your Lane</div>
    <div class="matchup-vs">
      <img src="${champIcon(myChamp.image.full)}" alt="${myChamp.name}" title="${myChamp.name}" />
      <div class="matchup-mid">
        <span class="matchup-wr ${wrClass}">${wr === null ? "-" : wr + "%"}</span>
        <span class="matchup-vs-label">vs</span>
        <span class="matchup-games">${games > 0 ? fmtK(games) + " games" : "no data"}</span>
      </div>
      <img src="${champIcon(oppChamp.image.full)}" alt="${oppChamp.name}" title="${oppChamp.name}" />
    </div>
    <div class="matchup-tip ${tip.tone}">${tip.text}</div>
  `;
}

// ── load build ───────────────────────────────────────────────────────────────

async function loadMyBuild(champDdragonId: string, role: string) {
  $buildSection.style.display = "";
  try {
    currentBuild = await pregame.fetchBuild(champDdragonId, role || undefined);
    renderBuild(currentBuild);
  } catch {
    $buildSection.innerHTML = '<div class="empty">Failed to load build.</div>';
  }
}

function renderBuild(build: BuildData) {
  // Spells.
  $spells.innerHTML = "";
  for (const sp of build.summoners) {
    if (sp.icon) {
      const img = document.createElement("img");
      img.src = sp.icon;
      img.title = sp.name;
      $spells.appendChild(img);
    }
  }

  // Items.
  $items.innerHTML = "";
  const allItems = [...build.startingItems, ...build.coreItems];
  for (const it of allItems) {
    const div = document.createElement("div");
    div.className = "build-item";
    if (it.icon) {
      const img = document.createElement("img");
      img.src = it.icon;
      div.appendChild(img);
    }
    const span = document.createElement("span");
    span.textContent = it.name;
    div.appendChild(span);
    $items.appendChild(div);
  }

  // Pre-fill rune editor.
  editPrimaryStyleId = build.runes.primaryStyle.id;
  editSecondaryStyleId = build.runes.secondaryStyle.id;
  editKeystone = build.runes.keystone.id;
  editPrimaryPerks = build.runes.primaryPerks.map((r) => r.id);
  editSecondaryPerks = build.runes.secondaryPerks.map((r) => r.id);
  editShards =
    build.runes.shardIds.length >= 3
      ? build.runes.shardIds.slice(0, 3)
      : [5008, 5008, 5011];
  renderRuneEditor();
}

// ── rune editor ──────────────────────────────────────────────────────────────

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function renderRuneEditor() {
  $runeEditor.innerHTML = "";

  const primaryTree = runeTrees.find((t) => t.id === editPrimaryStyleId);
  const secondaryTree = runeTrees.find((t) => t.id === editSecondaryStyleId);

  const SHARD_LABELS = ["Offense", "Flex", "Defense"];

  // ── helpers ──

  function makePathSelector(
    trees: typeof runeTrees,
    selectedId: number,
    onPick: (tree: (typeof runeTrees)[0]) => void,
  ): HTMLElement {
    const row = el("div", "path-selector");
    for (const tree of trees) {
      const btn = el(
        "div",
        "path-btn" + (tree.id === selectedId ? " selected" : ""),
      );
      const img = document.createElement("img");
      img.src = runeIcon(tree.icon);
      img.title = tree.name;
      btn.appendChild(img);
      btn.addEventListener("click", () => onPick(tree));
      row.appendChild(btn);
    }
    return row;
  }

  function makeRuneRow(
    runes: { id: number; icon: string; name: string }[],
    isSelected: (id: number) => boolean,
    onPick: (id: number) => void,
    isKeystone = false,
  ): HTMLElement {
    const row = el("div", "rune-slot");
    for (const rune of runes) {
      const btn = el(
        "div",
        "rune-pick" +
          (isKeystone ? " keystone" : "") +
          (isSelected(rune.id) ? " selected" : ""),
      );
      const img = document.createElement("img");
      img.src = runeIcon(rune.icon);
      img.title = rune.name;
      btn.appendChild(img);
      btn.addEventListener("click", () => onPick(rune.id));
      row.appendChild(btn);
    }
    return row;
  }

  // ── PRIMARY panel ──

  const primaryPanel = el("div", "rune-tree");

  if (primaryTree) {
    const header = el("div", "tree-header");
    header.innerHTML = `<img src="${runeIcon(primaryTree.icon)}" /> ${primaryTree.name}`;
    primaryPanel.appendChild(header);
  }

  primaryPanel.appendChild(
    makePathSelector(runeTrees, editPrimaryStyleId, (tree) => {
      editPrimaryStyleId = tree.id;
      if (editSecondaryStyleId === tree.id) {
        editSecondaryStyleId = runeTrees.find((t) => t.id !== tree.id)?.id ?? 0;
        editSecondaryPerks = [];
      }
      editKeystone = 0;
      editPrimaryPerks = [];
      renderRuneEditor();
    }),
  );

  if (primaryTree) {
    const ksLabel = el("div", "rune-label");
    ksLabel.textContent = "Keystone";
    primaryPanel.appendChild(ksLabel);

    primaryPanel.appendChild(
      makeRuneRow(
        primaryTree.slots[0]?.runes ?? [],
        (id) => id === editKeystone,
        (id) => {
          editKeystone = id;
          renderRuneEditor();
        },
        true,
      ),
    );

    primaryPanel.appendChild(el("div", "rune-divider"));

    for (let s = 1; s <= 3; s++) {
      primaryPanel.appendChild(
        makeRuneRow(
          primaryTree.slots[s]?.runes ?? [],
          (id) => editPrimaryPerks[s - 1] === id,
          (id) => {
            editPrimaryPerks[s - 1] = id;
            renderRuneEditor();
          },
        ),
      );
    }
  }
  $runeEditor.appendChild(primaryPanel);

  // ── SECONDARY panel ──

  const secPanel = el("div", "rune-tree");

  if (secondaryTree) {
    const header = el("div", "tree-header");
    header.innerHTML = `<img src="${runeIcon(secondaryTree.icon)}" /> ${secondaryTree.name}`;
    secPanel.appendChild(header);
  }

  const secTrees = runeTrees.filter((t) => t.id !== editPrimaryStyleId);
  secPanel.appendChild(
    makePathSelector(secTrees, editSecondaryStyleId, (tree) => {
      editSecondaryStyleId = tree.id;
      editSecondaryPerks = [];
      renderRuneEditor();
    }),
  );

  if (secondaryTree) {
    const pickLabel = el("div", "rune-label");
    pickLabel.textContent = "Pick 2";
    secPanel.appendChild(pickLabel);

    for (let s = 1; s <= 3; s++) {
      secPanel.appendChild(
        makeRuneRow(
          secondaryTree.slots[s]?.runes ?? [],
          (id) => editSecondaryPerks.includes(id),
          (id) => {
            if (editSecondaryPerks.includes(id)) {
              editSecondaryPerks = editSecondaryPerks.filter((x) => x !== id);
            } else {
              const sameSlot =
                secondaryTree.slots[s]?.runes.map((r) => r.id) ?? [];
              editSecondaryPerks = editSecondaryPerks.filter(
                (x) => !sameSlot.includes(x),
              );
              editSecondaryPerks.push(id);
              if (editSecondaryPerks.length > 2) editSecondaryPerks.shift();
            }
            renderRuneEditor();
          },
        ),
      );
    }
  }
  $runeEditor.appendChild(secPanel);

  // ── SHARDS panel ──

  const shardPanel = el("div", "rune-tree shards-panel");
  const shTitle = el("div", "tree-header");
  shTitle.textContent = "Shards";
  shardPanel.appendChild(shTitle);

  SHARD_ROWS.forEach((row, ri) => {
    const label = el("div", "rune-label");
    label.textContent = SHARD_LABELS[ri] ?? "";
    shardPanel.appendChild(label);

    const slot = el("div", "shard-row");
    for (const shard of row) {
      const btn = el(
        "div",
        "shard-pick" + (editShards[ri] === shard.id ? " selected" : ""),
      );
      const img = document.createElement("img");
      img.src = runeIcon(shard.icon);
      img.title = shard.label;
      btn.appendChild(img);
      btn.addEventListener("click", () => {
        editShards[ri] = shard.id;
        renderRuneEditor();
      });
      slot.appendChild(btn);
    }
    shardPanel.appendChild(slot);
  });
  $runeEditor.appendChild(shardPanel);
}

// ── import handlers ──────────────────────────────────────────────────────────

function showStatus(msg: string) {
  $importStatus.textContent = msg;
  setTimeout(() => ($importStatus.textContent = ""), 3000);
}

async function doImportRunes() {
  if (!currentBuild) return;
  const selectedPerkIds = [
    editKeystone,
    ...editPrimaryPerks,
    ...editSecondaryPerks,
    ...editShards,
  ].filter((id) => id > 0);
  try {
    await pregame.importRunes({
      name: `Ryot \u00B7 ${currentBuild.champion} ${currentBuild.role}`,
      primaryStyleId: editPrimaryStyleId,
      subStyleId: editSecondaryStyleId,
      selectedPerkIds,
    });
    showStatus("Runes imported!");
  } catch (e: unknown) {
    showStatus(`Failed: ${(e as Error).message}`);
  }
}

async function doImportSpells() {
  if (!currentBuild || currentBuild.summoners.length < 2) return;
  try {
    await pregame.importSpells({
      spell1Id: currentBuild.summoners[0]!.id,
      spell2Id: currentBuild.summoners[1]!.id,
    });
    showStatus("Spells imported!");
  } catch (e: unknown) {
    showStatus(`Failed: ${(e as Error).message}`);
  }
}

async function doImportItems() {
  if (!currentBuild) return;
  const champKey = Number(
    Object.values(champByKey).find((c) => c.id === myChampDdragonId)?.key ?? 0,
  );
  const blocks = [
    {
      type: "Starting Items",
      items: currentBuild.startingItems.map((i) => ({
        id: String(i.id),
        count: 1,
      })),
    },
    {
      type: "Core Build",
      items: currentBuild.coreItems.map((i) => ({
        id: String(i.id),
        count: 1,
      })),
    },
  ];
  // Add item options as situational blocks.
  currentBuild.itemOptions.forEach((group, gi) => {
    if (group.length > 0) {
      blocks.push({
        type: `Situational ${gi + 1}`,
        items: group.map((o) => ({ id: String(o.item.id), count: 1 })),
      });
    }
  });
  try {
    await pregame.importItemSet({
      title: `Ryot \u00B7 ${currentBuild.champion} ${currentBuild.role}`,
      championKey: champKey,
      blocks,
    });
    showStatus("Item set imported!");
  } catch (e: unknown) {
    showStatus(`Failed: ${(e as Error).message}`);
  }
}

// ── Comp analysis ────────────────────────────────────────────────────────────

function renderCompAnalysis(session: ChampSelectSession) {
  const allyIds = session.myTeam
    .map((p) => champByKey[String(p.championId)]?.id)
    .filter((id): id is string => Boolean(id));
  const enemyIds = session.theirTeam
    .map((p) => champByKey[String(p.championId)]?.id)
    .filter((id): id is string => Boolean(id));

  // Need at least 2 picks on each side to show meaningful analysis.
  if (allyIds.length < 2 && enemyIds.length < 2) {
    $compPanel.style.display = "none";
    return;
  }

  // Build tag lookup from champion data (for fallback inference).
  const tagLookup: Record<string, string[] | undefined> = {};
  for (const c of Object.values(champByKey)) {
    tagLookup[c.id] = c.tags;
  }

  const allyComp = analyzeComp(allyIds, tagLookup);
  const enemyComp = analyzeComp(enemyIds, tagLookup);

  $compTagsAlly.innerHTML = renderTags(allyComp.tags);
  $compTagsEnemy.innerHTML = renderTags(enemyComp.tags);

  // Win prediction (only show when both sides have 3+ picks).
  if (allyIds.length >= 3 && enemyIds.length >= 3) {
    const win = predictWin(allyComp, enemyComp);
    const cls = win >= 53 ? "good" : win <= 47 ? "bad" : "even";
    $compWin.innerHTML = `<span class="win-pct ${cls}">${win}%</span> <span class="win-label">comp edge</span>`;
  } else {
    $compWin.innerHTML = "";
  }

  $compPanel.style.display = "";
}

function renderTags(tags: CompTag[]): string {
  if (tags.length === 0)
    return '<span class="comp-tag info">Analyzing...</span>';
  return tags
    .map((t) => `<span class="comp-tag ${t.tone}">${t.label}</span>`)
    .join("");
}
