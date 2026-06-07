/**
 * Bridge for the pre-game (champ-select) window.
 *
 * Provides access to:
 * - Champ-select session state (pushed from main via IPC)
 * - Ryot server API (builds, matchups, meta, lane prediction, rune trees)
 * - LCU import (runes, spells, item sets)
 * - Settings (auto-import toggle)
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pregame", {
  // ── IPC from main process (champ-select session updates) ──
  onSession: (cb: (session: unknown) => void) =>
    ipcRenderer.on("pregame:session", (_e, session) => cb(session)),

  getSession: () => ipcRenderer.invoke("pregame:getSession"),
  getSettings: () => ipcRenderer.invoke("settings:get"),

  // ── LCU import ──
  importRunes: (payload: unknown) =>
    ipcRenderer.invoke("pregame:importRunes", payload),
  importSpells: (payload: unknown) =>
    ipcRenderer.invoke("pregame:importSpells", payload),
  importItemSet: (payload: unknown) =>
    ipcRenderer.invoke("pregame:importItemSet", payload),

  // ── Ryot server fetches (thin wrappers so the renderer doesn't need to know the server URL) ──
  // These use the settings-saved apiUrl (backend) as base.
  async fetchBuild(champion: string, role?: string) {
    const s = (await ipcRenderer.invoke("settings:get")) as { apiUrl: string };
    const base = s.apiUrl.replace(/\/+$/, "");
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    const res = await fetch(
      `${base}/api/build/${encodeURIComponent(champion)}${q}`,
    );
    if (!res.ok) throw new Error(`Build fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchMatchups(champion: string, role?: string) {
    const s = (await ipcRenderer.invoke("settings:get")) as { apiUrl: string };
    const base = s.apiUrl.replace(/\/+$/, "");
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    const res = await fetch(
      `${base}/api/matchups/${encodeURIComponent(champion)}${q}`,
    );
    if (!res.ok) throw new Error(`Matchups fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchMeta() {
    const s = (await ipcRenderer.invoke("settings:get")) as { apiUrl: string };
    const base = s.apiUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/meta`);
    if (!res.ok) throw new Error(`Meta fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchLanePrediction(champions: string[]) {
    const s = (await ipcRenderer.invoke("settings:get")) as { apiUrl: string };
    const base = s.apiUrl.replace(/\/+$/, "");
    const res = await fetch(
      `${base}/api/predict-lanes?champions=${champions.map(encodeURIComponent).join(",")}`,
    );
    if (!res.ok) throw new Error(`Lane prediction failed: ${res.status}`);
    return res.json();
  },

  async fetchRuneTrees() {
    const s = (await ipcRenderer.invoke("settings:get")) as { apiUrl: string };
    const base = s.apiUrl.replace(/\/+$/, "");
    const vRes = await fetch(`${base}/api/static/version`);
    const { version } = (await vRes.json()) as { version: string };
    const rRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`,
    );
    return rRes.json();
  },

  async fetchChampions() {
    const s = (await ipcRenderer.invoke("settings:get")) as { apiUrl: string };
    const base = s.apiUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/static/champions`);
    if (!res.ok) throw new Error(`Champions fetch failed: ${res.status}`);
    return res.json();
  },
});
