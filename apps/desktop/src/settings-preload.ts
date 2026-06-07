import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("settingsApi", {
  get: () => ipcRenderer.invoke("settings:get"),
  save: (next: unknown) => ipcRenderer.invoke("settings:save", next),
  // Enumerate displays so the user can choose where the pre-game popup appears.
  getDisplays: () => ipcRenderer.invoke("settings:get-displays"),
});
