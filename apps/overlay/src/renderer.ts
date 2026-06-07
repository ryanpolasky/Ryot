import {
  AllGameData,
  LIVE_CLIENT_BASE,
  computeCampTimers,
  computeInhibTimers,
  computeObjectiveTimers,
  detectMapMode,
  formatClock,
} from "./liveclient.js";
import {
  CoachState,
  GoldDiff,
  ItemCostMap,
  OverlayBuild,
  StatPanel,
  computeAdvice,
  computeGoldDiff,
  computeStatPanel,
  findActivePlayer,
  newCoachState,
} from "./coach.js";
import {
  DEFAULT_HUD,
  HudConfig,
  LayoutBase,
  MapMode,
  OverlayLayout,
  Rect,
  SavedLayouts,
  applySavedLayout,
  computeLayout,
  defaultBaseFor,
  deriveBase,
  layoutToSaved,
  normalizeSavedLayouts,
} from "./layout.js";

declare global {
  interface Window {
    overlay?: {
      onInteractiveChange: (cb: (interactive: boolean) => void) => void;
      onTabState?: (cb: (held: boolean) => void) => void;
      quit: () => Promise<void>;
      // Layout / auto-placement bridge (desktop app provides these).
      getHudConfig?: () => Promise<HudConfig | null>;
      onHudConfig?: (cb: (cfg: HudConfig) => void) => void;
      getSavedLayout?: () => Promise<unknown>;
      saveLayout?: (saved: SavedLayouts | null) => Promise<void>;
      onEditMode?: (cb: (on: boolean) => void) => void;
      endEdit?: () => Promise<void>;
      // Calibration editor bridge.
      onCalibrateMode?: (cb: (on: boolean) => void) => void;
      saveCalibration?: (data: string, map?: string) => Promise<string | null>;
      showCalibrationFile?: () => Promise<void>;
      endCalibrate?: () => Promise<void>;
    };
  }
}

const params = new URLSearchParams(location.search);
const MOCK = params.get("mock") === "1";
const API_BASE = params.get("api") || "http://localhost:4000";
const DATA_URL = MOCK
  ? "./mock-allgamedata.json"
  : `${LIVE_CLIENT_BASE}/allgamedata`;
const POLL_MS = 1000;

const $ = (id: string) => document.getElementById(id)!;

// ── layout engine ────────────────────────────────────────────────────────────
let hudConfig: HudConfig = { ...DEFAULT_HUD };
let savedLayouts: SavedLayouts = {};
let mapMode: MapMode = "rift"; // detected from the live game data
let calMapMode: MapMode = "rift"; // the map currently being edited in the editor
let lastData: AllGameData | null = null;
let layout: OverlayLayout = computeLayout(
  window.innerWidth,
  window.innerHeight,
  hudConfig,
);
const layoutChampion: string | null = null;

/** The map whose layout is currently active (the editor's choice overrides). */
function activeMap(): MapMode {
  return calibrating ? calMapMode : mapMode;
}

const LS_KEY = "ryot-overlay-layout";

function place(
  el: HTMLElement,
  r: { x: number; y: number; w: number; h: number },
) {
  el.style.position = "absolute";
  el.style.left = `${r.x}px`;
  el.style.top = `${r.y}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
  if (r.w) el.style.width = `${r.w}px`;
  if (r.h) el.style.height = `${r.h}px`;
}

function applyLayout() {
  place($("statpanel"), layout.statpanel);
  place($("scoreboard"), layout.scoreboard);
  place($("nextbuy"), layout.nextbuy);
  // minimap is a square
  const mm = $("minimap");
  mm.style.position = "absolute";
  mm.style.left = `${layout.minimap.x}px`;
  mm.style.top = `${layout.minimap.y}px`;
  mm.style.right = "auto";
  mm.style.bottom = "auto";
  mm.style.width = `${layout.minimap.w}px`;
  mm.style.height = `${layout.minimap.h}px`;
}

function recomputeLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const map = activeMap();
  layout = computeLayout(w, h, hudConfig, layoutChampion ?? undefined, map);
  const saved = savedLayouts[map];
  if (saved) layout = applySavedLayout(layout, saved, w, h);
  applyLayout();
}

async function initLayout() {
  // 1. HUD config: from the desktop app (reads League's LCU game settings),
  //    else fall back to localStorage cache, else defaults.
  try {
    const cfg = (await window.overlay?.getHudConfig?.()) ?? null;
    if (cfg) hudConfig = cfg;
  } catch {
    /* defaults */
  }
  // 2. Saved manual positions for the two draggable zones (stored per map).
  try {
    const raw = (await window.overlay?.getSavedLayout?.()) ?? null;
    savedLayouts = normalizeSavedLayouts(raw);
  } catch {
    savedLayouts = {};
  }
  if (Object.keys(savedLayouts).length === 0) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) savedLayouts = normalizeSavedLayouts(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }
  recomputeLayout();
}

window.overlay?.onHudConfig?.((cfg) => {
  hudConfig = cfg;
  recomputeLayout();
});
window.addEventListener("resize", recomputeLayout);

function fmtK(n: number): string {
  const a = Math.abs(n);
  return a >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}
function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmtK(n)}`;
}

// ── item costs (bought-item gold values) ─────────────────────────────────────
let itemCosts: ItemCostMap = new Map();
async function loadItemCosts() {
  try {
    const res = await fetch(`${API_BASE}/api/static/item-costs`, {
      cache: "force-cache",
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { costs: Record<string, number> };
    itemCosts = new Map(
      Object.entries(json.costs).map(([k, v]) => [Number(k), v]),
    );
  } catch {
    /* leave empty; gold shows 0 until reachable */
  }
}

// ── recommended build (Feature 3/4) ──────────────────────────────────────────
const buildCache = new Map<string, OverlayBuild | null>();
let currentChampion: string | null = null;
const coachState: CoachState = newCoachState();

async function fetchBuild(champion: string): Promise<void> {
  if (buildCache.has(champion)) return;
  buildCache.set(champion, null);
  try {
    const res = await fetch(
      `${API_BASE}/api/build/${encodeURIComponent(champion)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(String(res.status));
    buildCache.set(champion, (await res.json()) as OverlayBuild);
  } catch {
    buildCache.set(champion, null);
  }
}

function setStatus(text: string, ok: boolean) {
  const el = $("status");
  el.textContent = text;
  el.className = ok ? "status ok" : "status off";
}

// ── 1. Stat panel (top-right) ────────────────────────────────────────────────
function statRow(
  label: string,
  value: string,
  delta?: { v: number; suffix?: string },
): string {
  const d =
    delta && delta.v !== 0
      ? `<span class="sp-delta ${delta.v > 0 ? "up" : "down"}">${
          delta.v > 0 ? "▲" : "▼"
        } ${signed(delta.v)}${delta.suffix ?? ""}</span>`
      : "";
  return `<div class="sp-row"><span class="sp-l">${label}</span><span class="sp-v">${value}</span>${d}</div>`;
}

function renderStatPanel(sp: StatPanel) {
  $("sp-rows").innerHTML = [
    statRow("Team Gold", fmtK(sp.teamGold), { v: sp.teamGoldDelta }),
    statRow("CS / min", sp.csPerMin.toFixed(1)),
    statRow("Gold / min", Math.round(sp.goldPerMin).toString()),
    statRow("Vision / min", sp.visionPerMin.toFixed(2)),
    statRow("Kill Part.", `${sp.killParticipation}%`),
    statRow("Level", String(sp.level)),
  ].join("");
}

// ── 2. Minimap timers ────────────────────────────────────────────────────────
// Positions as fractions of the minimap box (origin = top-left of square).
// Summoner's Rift: blue base bottom-left, red base top-right.
interface MapPos {
  left: number;
  top: number;
  icon: string;
}
const PITS: Record<string, MapPos> = {
  // Epic objectives
  Baron: { left: 0.34, top: 0.31, icon: "🟣" },
  Herald: { left: 0.34, top: 0.31, icon: "👁" },
  Dragon: { left: 0.66, top: 0.69, icon: "🐉" },
  // Blue-side jungle camps (B)
  "Blue (B)": { left: 0.22, top: 0.72, icon: "🔵" },
  "Red (B)": { left: 0.3, top: 0.82, icon: "🔴" },
  "Gromp (B)": { left: 0.15, top: 0.68, icon: "🐸" },
  "Wolves (B)": { left: 0.25, top: 0.64, icon: "🐺" },
  "Raptors (B)": { left: 0.38, top: 0.76, icon: "🐦" },
  "Krugs (B)": { left: 0.42, top: 0.86, icon: "🪨" },
  // Red-side jungle camps (R)
  "Blue (R)": { left: 0.78, top: 0.28, icon: "🔵" },
  "Red (R)": { left: 0.7, top: 0.18, icon: "🔴" },
  "Gromp (R)": { left: 0.85, top: 0.32, icon: "🐸" },
  "Wolves (R)": { left: 0.75, top: 0.36, icon: "🐺" },
  "Raptors (R)": { left: 0.62, top: 0.24, icon: "🐦" },
  "Krugs (R)": { left: 0.58, top: 0.14, icon: "🪨" },
  // Scuttle crabs
  "Scuttle Top": { left: 0.42, top: 0.44, icon: "🦀" },
  "Scuttle Bot": { left: 0.58, top: 0.56, icon: "🦀" },
  // Inhibitors (generic, shown near center since API doesn't specify lane)
  Inhib: { left: 0.5, top: 0.5, icon: "🏛" },
};

// Howling Abyss (ARAM) is a single diagonal lane with no jungle camps, scuttles
// or epic monsters, so the only trackable timer is the inhibitor rebuild. The
// Live Client doesn't tag which inhibitor fell, so timers stack along the lane.
const PITS_ARAM: Record<string, MapPos> = {
  Inhib: { left: 0.5, top: 0.5, icon: "🏛" },
};

// Major objectives always show full timestamp; minor camps show grey hourglass
// by default and expand to timestamp when Tab (scoreboard) is held. The
// desktop app sends "tab-state" messages to toggle `body.tab-held`.
const MAJOR = new Set(["Dragon", "Baron", "Herald"]);

function renderMinimapTimers(data: AllGameData, map: MapMode = "rift") {
  const aram = map === "aram";
  const all = aram
    ? computeInhibTimers(data)
    : [
        ...computeObjectiveTimers(data),
        ...computeCampTimers(data),
        ...computeInhibTimers(data),
      ];
  const pits = aram ? PITS_ARAM : PITS;

  const usedPositions = new Map<string, number>();

  $("mm-objs").innerHTML = all
    .map((t) => {
      const pit = pits[t.label];
      if (!pit) return "";
      const secs = t.secondsUntil ?? 0;
      const isMajor = MAJOR.has(t.label) || t.label.startsWith("Inhib");
      const imminent = !t.up && secs <= 10; // gold highlight at T-10

      // Minor camps: show hourglass icon; full time only when tab-held (CSS).
      const timeStr = t.up ? "UP" : formatClock(secs);
      const display = isMajor
        ? `<span class="mm-t ${imminent ? "imminent" : ""}">${timeStr}</span>`
        : `<span class="mm-hg">⏳</span><span class="mm-t mm-minor ${imminent ? "imminent" : ""}">${timeStr}</span>`;

      const key = `${pit.left},${pit.top}`;
      const idx = usedPositions.get(key) ?? 0;
      usedPositions.set(key, idx + 1);
      const yOff = idx * 18;
      const cls = [
        "mm-chip",
        t.up ? "up" : "",
        isMajor ? "" : "minor",
        t.label.startsWith("Inhib") ? "inhib" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<div class="${cls}" style="left:${pit.left * 100}%;top:${pit.top * 100}%;transform:translate(-50%,${-50 + yOff}%)">${
        isMajor ? `<span class="mm-ic">${pit.icon}</span>` : ""
      }${display}</div>`;
    })
    .join("");
}

// ── 3. Gold-diff scoreboard ──────────────────────────────────────────────────
const CHAMP_SHORT = (name: string) => name.slice(0, 3).toUpperCase();

function renderGoldScoreboard(gd: GoldDiff) {
  $("gs-blue").textContent = fmtK(gd.blueGold);
  $("gs-red").textContent = fmtK(gd.redGold);
  const diffEl = $("gs-diff");
  diffEl.textContent = signed(gd.diff);
  diffEl.className = `gs-diff ${gd.diff > 0 ? "ahead" : gd.diff < 0 ? "behind" : ""}`;

  $("lanes").innerHTML = gd.lanes
    .map((l) => {
      const ahead = l.diff > 0;
      const allyC = l.ally ? CHAMP_SHORT(l.ally.championName) : "-";
      const enemyC = l.enemy ? CHAMP_SHORT(l.enemy.championName) : "-";
      return `<div class="lane">
        <span class="ln-champ ally">${allyC}</span>
        <span class="ln-diff ${ahead ? "ahead" : l.diff < 0 ? "behind" : ""}">${signed(l.diff)}</span>
        <span class="ln-champ enemy">${enemyC}</span>
      </div>`;
    })
    .join("");
}

// ── 4. Next-buy / build (bottom-right) ───────────────────────────────────────

function renderNextBuy(data: AllGameData) {
  const me = findActivePlayer(data);
  const champ = me?.championName ?? null;
  const nb = $("nextbuy");

  if (!champ) {
    nb.classList.remove("show");
    return;
  }
  if (champ !== currentChampion) {
    currentChampion = champ;
    void fetchBuild(champ);
  }
  const build = buildCache.get(champ) ?? null;
  if (!build) {
    nb.classList.remove("show");
    return;
  }
  nb.classList.add("show");

  $("nb-champ").textContent = `${build.champion} Build`;
  $("nb-role").textContent = build.role || "";

  const owned = new Set((me!.items ?? []).map((i) => i.itemID));
  $("build-path").innerHTML = build.coreItems
    .map((it) => {
      const has = owned.has(it.id);
      const icon = it.icon
        ? `<img src="${it.icon}" alt="${it.name}" />`
        : `<span class="noimg"></span>`;
      return `<div class="bi ${has ? "owned" : ""}" title="${it.name}">${icon}</div>`;
    })
    .join("");

  const advice = computeAdvice(data, me, build, coachState);
  const alerts: string[] = [];
  if (advice.spike)
    alerts.push(
      `<div class="alert spike">⚡ ${advice.spike.name} online</div>`,
    );
  if (advice.recommendBack && advice.nextItem)
    alerts.push(
      `<div class="alert back">↩ Back: buy ${advice.nextItem.name}</div>`,
    );
  $("nb-alerts").innerHTML = alerts.join("");

  if (advice.nextItem) {
    const remain = advice.goldNeeded;
    $("next-item").innerHTML = `
      <div class="ni-card ${advice.canAfford ? "ready" : ""}">
        ${advice.nextItem.icon ? `<img src="${advice.nextItem.icon}" alt="" />` : ""}
        <span class="ni-gold">${advice.canAfford ? "READY" : remain}</span>
      </div>`;
  } else {
    $("next-item").innerHTML =
      `<div class="ni-card"><span class="ni-gold">✓</span></div>`;
  }
}

// ── main loop ────────────────────────────────────────────────────────────────
async function tick() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as AllGameData;
    if (!data.gameData) throw new Error("no game data");

    document.body.classList.add("in-game");
    setStatus(MOCK ? "MOCK" : "LIVE", true);
    $("gametime").textContent = formatClock(data.gameData.gameTime);

    lastData = data;
    const detected = detectMapMode(data);
    if (!calibrating && detected !== mapMode) {
      mapMode = detected;
      recomputeLayout();
    }

    const me = findActivePlayer(data);
    if (me) renderStatPanel(computeStatPanel(data, me, itemCosts));
    renderMinimapTimers(data, activeMap());
    renderGoldScoreboard(computeGoldDiff(data, me, itemCosts));
    renderNextBuy(data);
  } catch {
    document.body.classList.remove("in-game");
    setStatus("Waiting for game…", false);
  }
}

window.overlay?.onInteractiveChange((interactive) => {
  document.body.classList.toggle("interactive", interactive);
});

window.overlay?.onTabState?.((held) => {
  document.body.classList.toggle("tab-held", held);
});

$("quit")?.addEventListener("click", () => window.overlay?.quit());

// ── edit mode: drag the two free zones (stat panel + next-buy) ────────────────
let editing = false;

function setEditMode(on: boolean) {
  editing = on;
  document.body.classList.toggle("edit", on);
}

function persistLayout() {
  savedLayouts[mapMode] = layoutToSaved(
    layout,
    window.innerWidth,
    window.innerHeight,
  );
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(savedLayouts));
  } catch {
    /* ignore */
  }
  void window.overlay?.saveLayout?.(savedLayouts);
}

function resetLayout() {
  delete savedLayouts[mapMode];
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(savedLayouts));
  } catch {
    /* ignore */
  }
  void window.overlay?.saveLayout?.(savedLayouts);
  recomputeLayout();
}

// Drag handling for elements carrying a .drag-handle child.
let drag: { zone: "statpanel" | "nextbuy"; dx: number; dy: number } | null =
  null;

document.querySelectorAll<HTMLElement>(".drag-handle").forEach((h) => {
  h.addEventListener("mousedown", (e) => {
    if (!editing) return;
    const zone = h.dataset.zone as "statpanel" | "nextbuy";
    const rect = layout[zone];
    drag = { zone, dx: e.clientX - rect.x, dy: e.clientY - rect.y };
    e.preventDefault();
  });
});

window.addEventListener("mousemove", (e) => {
  if (!drag) return;
  const x = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - drag.dx));
  const y = Math.max(0, Math.min(window.innerHeight - 20, e.clientY - drag.dy));
  layout[drag.zone] = { ...layout[drag.zone], x, y };
  applyLayout();
});

window.addEventListener("mouseup", () => {
  drag = null;
});

$("edit-save")?.addEventListener("click", () => {
  persistLayout();
  setEditMode(false);
  void window.overlay?.endEdit?.();
});
$("edit-reset")?.addEventListener("click", resetLayout);
$("edit-done")?.addEventListener("click", () => {
  setEditMode(false);
  void window.overlay?.endEdit?.();
});

// Edit mode is toggled by the desktop hotkey (Ctrl+Shift+E) via IPC, and by
// pressing "e" when the overlay is focusable (used for headless testing).
window.overlay?.onEditMode?.((on) => setEditMode(on));
window.addEventListener("keydown", (e) => {
  if (e.key === "e" && !drag && document.activeElement?.tagName !== "INPUT") {
    setEditMode(!editing);
  }
});

// ── calibration (debug) editor ────────────────────────────────────────────────
// Ctrl+Shift+D (or 'd' in headless): every zone is draggable + resizable.
// An inspector shows the selected zone's pixel rect and derived B constants.
// On Save, writes the full calibration JSON to disk (via IPC) or downloads it.

type ZoneId = "minimap" | "scoreboard" | "statpanel" | "nextbuy" | "hudBar";

interface CalZone {
  id: ZoneId;
  label: string;
  el: HTMLElement;
  /** Which layout key to read/write pixel rect */
  key: keyof OverlayLayout;
  /** Height is auto-sized by content (0 in layout); use rendered height. */
  autoH: boolean;
}

let calibrating = false;
let calSelected: CalZone | null = null;
let calDrag: {
  zone: CalZone;
  dx: number;
  dy: number;
  mode: "move" | string;
} | null = null;

function calZones(): CalZone[] {
  return [
    {
      id: "minimap",
      label: "Minimap",
      el: $("minimap"),
      key: "minimap",
      autoH: false,
    },
    {
      id: "scoreboard",
      label: "Scoreboard",
      el: $("scoreboard"),
      key: "scoreboard",
      autoH: true,
    },
    {
      id: "statpanel",
      label: "Stat Panel",
      el: $("statpanel"),
      key: "statpanel",
      autoH: true,
    },
    {
      id: "nextbuy",
      label: "Next Buy",
      el: $("nextbuy"),
      key: "nextbuy",
      autoH: true,
    },
    {
      id: "hudBar",
      label: "HUD Bar",
      el: $("hud-ref"),
      key: "hudBar",
      autoH: false,
    },
  ];
}

const HANDLES = ["tl", "tr", "bl", "br", "tc", "bc", "ml", "mr"] as const;

function injectCalHandles(zone: CalZone) {
  // Tag label
  if (!zone.el.querySelector(".cal-tag")) {
    const tag = document.createElement("span");
    tag.className = "cal-tag";
    tag.textContent = zone.label;
    zone.el.appendChild(tag);
  }
  // Resize handles
  for (const h of HANDLES) {
    if (zone.el.querySelector(`.cal-rh.${h}`)) continue;
    const el = document.createElement("div");
    el.className = `cal-rh ${h}`;
    el.dataset.handle = h;
    el.dataset.zone = zone.id;
    zone.el.style.position = "absolute";
    zone.el.appendChild(el);
  }
}

function calGetRect(z: CalZone): Rect {
  const r = layout[z.key];
  const h = z.autoH && r.h === 0 ? z.el.offsetHeight : r.h;
  return { x: r.x, y: r.y, w: r.w, h };
}

function calSetRect(z: CalZone, r: Rect) {
  layout[z.key] = { x: r.x, y: r.y, w: r.w, h: z.autoH ? 0 : r.h };
  place(z.el, { x: r.x, y: r.y, w: r.w, h: z.autoH ? 0 : r.h });
  if (z.id === "hudBar") {
    z.el.style.width = `${r.w}px`;
    z.el.style.height = `${r.h}px`;
  }
}

function calSelect(z: CalZone | null) {
  calSelected = z;
  for (const zone of calZones())
    zone.el.classList.toggle("cal-selected", zone === z);
  calUpdateInspector();
}

function calUpdateInspector() {
  const nameEl = $("cal-zone-name");
  const fieldsEl = $("cal-fields");
  const baseEl = $("cal-base");
  if (!calSelected) {
    nameEl.textContent = "Select a zone";
    fieldsEl.innerHTML = "";
    baseEl.textContent = "";
    return;
  }
  const z = calSelected;
  const r = calGetRect(z);
  nameEl.textContent = z.label;

  // Build x/y/w/h editable fields
  fieldsEl.innerHTML = "";
  for (const prop of ["x", "y", "w", "h"] as const) {
    const wrap = document.createElement("div");
    wrap.className = "cal-field";
    const lbl = document.createElement("label");
    lbl.textContent = prop;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.value = String(Math.round(r[prop]));
    inp.addEventListener("change", () => {
      const cur = calGetRect(z);
      const val = Number(inp.value);
      const updated: Rect = {
        x: prop === "x" ? val : cur.x,
        y: prop === "y" ? val : cur.y,
        w: prop === "w" ? val : cur.w,
        h: prop === "h" ? val : cur.h,
      };
      calSetRect(z, updated);
      calUpdateBasePreview();
    });
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    fieldsEl.appendChild(wrap);
  }

  calUpdateBasePreview();
}

function calUpdateBasePreview() {
  const baseEl = $("cal-base");
  const base = deriveBase(
    layout,
    window.innerWidth,
    window.innerHeight,
    hudConfig,
    calMapMode,
  );
  const def = defaultBaseFor(calMapMode);
  const lines = Object.entries(base)
    .map(([k, v]) => {
      const d = def[k as keyof LayoutBase];
      const changed = v !== d;
      return `${k}: ${v}${changed ? ` (was ${d})` : ""}`;
    })
    .join("\n");
  baseEl.textContent = lines;
}

function baseVarName(map: MapMode): string {
  return map === "aram" ? "B_ARAM" : "B_RIFT";
}

function formatBaseObj(base: LayoutBase, name = "B"): string {
  return `const ${name} = {\n${Object.entries(base)
    .map(([k, v]) => `  ${k}: ${v},`)
    .join("\n")}\n};`;
}

function buildCalibrationJSON(): string {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const base = deriveBase(layout, w, h, hudConfig, calMapMode);
  const zones: Record<string, Rect> = {};
  for (const z of calZones()) zones[z.id] = calGetRect(z);
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      map: calMapMode,
      screen: { width: w, height: h },
      hudConfig,
      zones,
      derivedBase: base,
      baseObjectCode: formatBaseObj(base, baseVarName(calMapMode)),
    },
    null,
    2,
  );
}

function placeHudRef() {
  const hudRef = $("hud-ref");
  place(hudRef, layout.hudBar);
  hudRef.style.width = `${layout.hudBar.w}px`;
  hudRef.style.height = `${layout.hudBar.h}px`;
}

function updateCalMapButtons() {
  $("cal-map-rift")?.classList.toggle("active", calMapMode === "rift");
  $("cal-map-aram")?.classList.toggle("active", calMapMode === "aram");
}

/** Switch which map the editor is calibrating; re-lays-out + refreshes zones. */
function setCalMap(map: MapMode) {
  if (!calibrating || calMapMode === map) return;
  calMapMode = map;
  updateCalMapButtons();
  recomputeLayout();
  placeHudRef();
  for (const z of calZones()) injectCalHandles(z);
  if (lastData) renderMinimapTimers(lastData, calMapMode);
  calSelect(calSelected);
}

function setCalibrationMode(on: boolean) {
  calibrating = on;
  document.body.classList.toggle("calibrating", on);
  if (on) {
    // Default to editing whichever map the live game is on.
    calMapMode = mapMode;
    updateCalMapButtons();
    recomputeLayout();
    placeHudRef();
    for (const z of calZones()) injectCalHandles(z);
    calSelect(null);
    if (lastData) renderMinimapTimers(lastData, calMapMode);
  } else {
    calSelect(null);
    calDrag = null;
    // Revert to the live map's layout (the editor may have previewed another).
    recomputeLayout();
  }
}

// Zone click → select
document.addEventListener(
  "mousedown",
  (e) => {
    if (!calibrating) return;
    const target = e.target as HTMLElement;

    // Check if it's a resize handle
    const handleEl = target.closest<HTMLElement>(".cal-rh");
    if (handleEl) {
      const zoneId = handleEl.dataset.zone as ZoneId;
      const handleDir = handleEl.dataset.handle!;
      const z = calZones().find((z) => z.id === zoneId);
      if (!z) return;
      calSelect(z);
      const r = calGetRect(z);
      calDrag = {
        zone: z,
        dx: e.clientX - r.x,
        dy: e.clientY - r.y,
        mode: handleDir,
      };
      e.preventDefault();
      return;
    }

    // Check if clicked on a zone body
    for (const z of calZones()) {
      if (
        z.el.contains(target) &&
        !target.closest(".cal-inspector") &&
        !target.closest(".cal-toolbar")
      ) {
        calSelect(z);
        const r = calGetRect(z);
        calDrag = {
          zone: z,
          dx: e.clientX - r.x,
          dy: e.clientY - r.y,
          mode: "move",
        };
        e.preventDefault();
        return;
      }
    }
  },
  true,
);

document.addEventListener("mousemove", (e) => {
  if (!calDrag) return;
  const z = calDrag.zone;
  const r = calGetRect(z);
  const mx = e.clientX;
  const my = e.clientY;

  if (calDrag.mode === "move") {
    r.x = Math.max(0, Math.min(window.innerWidth - r.w, mx - calDrag.dx));
    r.y = Math.max(0, Math.min(window.innerHeight - r.h, my - calDrag.dy));
  } else {
    const h = calDrag.mode;
    const MIN = 20;
    // Left edge: tl, bl, ml
    if (h === "tl" || h === "bl" || h === "ml") {
      const newX = Math.min(mx, r.x + r.w - MIN);
      r.w += r.x - newX;
      r.x = newX;
    }
    // Right edge: tr, br, mr
    if (h === "tr" || h === "br" || h === "mr") {
      r.w = Math.max(MIN, mx - r.x);
    }
    // Top edge: tl, tr, tc
    if (h === "tl" || h === "tr" || h === "tc") {
      const newY = Math.min(my, r.y + r.h - MIN);
      r.h += r.y - newY;
      r.y = newY;
    }
    // Bottom edge: bl, br, bc
    if (h === "bl" || h === "br" || h === "bc") {
      r.h = Math.max(MIN, my - r.y);
    }
  }
  calSetRect(z, r);
  calUpdateInspector();
});

document.addEventListener("mouseup", () => {
  calDrag = null;
});

// Toolbar buttons
$("cal-map-rift")?.addEventListener("click", () => setCalMap("rift"));
$("cal-map-aram")?.addEventListener("click", () => setCalMap("aram"));

$("cal-save")?.addEventListener("click", async () => {
  const json = buildCalibrationJSON();
  // Persist the draggable-zone positions for this map so they survive reloads.
  savedLayouts[calMapMode] = layoutToSaved(
    layout,
    window.innerWidth,
    window.innerHeight,
  );
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(savedLayouts));
  } catch {
    /* ignore */
  }
  void window.overlay?.saveLayout?.(savedLayouts);
  if (window.overlay?.saveCalibration) {
    const path = await window.overlay.saveCalibration(json, calMapMode);
    if (path) {
      $("cal-zone-name").textContent = `Saved to: ${path}`;
    }
  } else {
    // Fallback: download as blob
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ryot-calibration.json";
    a.click();
    URL.revokeObjectURL(a.href);
    $("cal-zone-name").textContent =
      `Downloaded ryot-calibration-${calMapMode}.json`;
  }
});

$("cal-copy")?.addEventListener("click", () => {
  const base = deriveBase(
    layout,
    window.innerWidth,
    window.innerHeight,
    hudConfig,
    calMapMode,
  );
  const code = formatBaseObj(base, baseVarName(calMapMode));
  void navigator.clipboard.writeText(code).then(() => {
    $("cal-zone-name").textContent =
      `Copied ${baseVarName(calMapMode)} to clipboard!`;
    setTimeout(() => calSelect(calSelected), 1500);
  });
});

$("cal-reset")?.addEventListener("click", () => {
  // Reset only the active map back to its computed defaults.
  delete savedLayouts[calMapMode];
  recomputeLayout();
  placeHudRef();
  for (const z of calZones()) injectCalHandles(z);
  calSelect(calSelected);
});

$("cal-done")?.addEventListener("click", () => {
  setCalibrationMode(false);
  void window.overlay?.endCalibrate?.();
});

// Calibration toggled by Ctrl+Shift+D (desktop) or 'd' key (headless).
window.overlay?.onCalibrateMode?.((on) => setCalibrationMode(on));
window.addEventListener("keydown", (e) => {
  if (
    e.key === "d" &&
    !calDrag &&
    document.activeElement?.tagName !== "INPUT"
  ) {
    setCalibrationMode(!calibrating);
  }
});

setStatus("Waiting for game…", false);
void initLayout();
void loadItemCosts();
tick();
setInterval(tick, POLL_MS);
