import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("overlay", {
  onInteractiveChange: (cb: (interactive: boolean) => void) =>
    ipcRenderer.on("overlay:interactive", (_e, v: boolean) => cb(v)),
  onTabState: (cb: (held: boolean) => void) =>
    ipcRenderer.on("overlay:tab-state", (_e, v: boolean) => cb(v)),
  quit: () => ipcRenderer.invoke("overlay:quit"),
  // Layout / auto-placement bridge.
  getHudConfig: () => ipcRenderer.invoke("overlay:get-hud-config"),
  onHudConfig: (cb: (cfg: unknown) => void) =>
    ipcRenderer.on("overlay:hud-config", (_e, v: unknown) => cb(v)),
  getSavedLayout: () => ipcRenderer.invoke("overlay:get-layout"),
  saveLayout: (saved: unknown) =>
    ipcRenderer.invoke("overlay:save-layout", saved),
  onEditMode: (cb: (on: boolean) => void) =>
    ipcRenderer.on("overlay:edit-mode", (_e, v: boolean) => cb(v)),
  endEdit: () => ipcRenderer.invoke("overlay:end-edit"),
  // Calibration editor bridge.
  onCalibrateMode: (cb: (on: boolean) => void) =>
    ipcRenderer.on("overlay:calibrate-mode", (_e, v: boolean) => cb(v)),
  saveCalibration: (data: string, map?: string) =>
    ipcRenderer.invoke("overlay:save-calibration", data, map),
  showCalibrationFile: () => ipcRenderer.invoke("overlay:show-calibration"),
  endCalibrate: () => ipcRenderer.invoke("overlay:end-calibrate"),
});
