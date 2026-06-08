/**
 * Bridge injected into the hosted Ryot web page. Its presence (`window.ryot`)
 * is how the site detects it's running inside the desktop app and reveals
 * desktop-only features like "Import to League". A normal browser never sees it.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ryot", {
  isDesktop: true,
  isClientRunning: (): Promise<boolean> =>
    ipcRenderer.invoke("ryot:isClientRunning"),
  getCurrentSummoner: (): Promise<{
    gameName: string;
    tagLine: string;
    platform: string;
    puuid?: string;
  } | null> => ipcRenderer.invoke("ryot:getCurrentSummoner"),
  importRunes: (payload: {
    name: string;
    primaryStyleId: number;
    subStyleId: number;
    selectedPerkIds: number[];
  }): Promise<{ ok: true }> => ipcRenderer.invoke("ryot:importRunes", payload),
  importSpells: (payload: {
    spell1Id: number;
    spell2Id: number;
  }): Promise<{ ok: true }> => ipcRenderer.invoke("ryot:importSpells", payload),
  openSettings: (): Promise<void> => ipcRenderer.invoke("app:openSettings"),
  reload: (): Promise<void> => ipcRenderer.invoke("app:reload"),
  getSettings: (): Promise<{
    ryotUrl: string;
    defaultRiotId: string;
    defaultRegion: string;
  }> => ipcRenderer.invoke("settings:get"),
});
