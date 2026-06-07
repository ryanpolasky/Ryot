import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK = process.env.LC_OVERLAY_MOCK === "1";

let win: BrowserWindow | null = null;
let interactive = false; // start click-through so it doesn't block the game
let editing = false;
let calibratingMode = false;

function layoutPath(): string {
  return join(app.getPath("userData"), "overlay-layout.json");
}
function loadSavedLayout(): unknown {
  try {
    const p = layoutPath();
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function storeSavedLayout(saved: unknown): void {
  try {
    if (saved == null) {
      if (existsSync(layoutPath())) writeFileSync(layoutPath(), "null", "utf8");
      return;
    }
    writeFileSync(layoutPath(), JSON.stringify(saved, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM preload scripts require the sandbox to be disabled in Electron.
      sandbox: false,
    },
  });

  // Float above fullscreen games where the OS allows it.
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Start click-through so the overlay never steals input from the game.
  win.setIgnoreMouseEvents(true, { forward: true });

  const url = new URL(`file://${join(__dirname, "index.html")}`);
  if (MOCK) url.searchParams.set("mock", "1");
  // Backend URL so the overlay can pull recommended builds/skill order.
  url.searchParams.set(
    "api",
    process.env.RYOT_API_URL || "http://localhost:4000",
  );
  win.loadURL(url.toString());
}

function setInteractive(next: boolean) {
  interactive = next;
  if (!win) return;
  win.setIgnoreMouseEvents(!interactive, { forward: true });
  win.webContents.send("overlay:interactive", interactive);
}

function setEditMode(next: boolean) {
  editing = next;
  if (!win) return;
  // Edit mode requires mouse input so the user can drag panels.
  win.setIgnoreMouseEvents(!next, { forward: true });
  win.setFocusable(next);
  if (next) win.focus();
  win.webContents.send("overlay:edit-mode", next);
}

// League's Live Client API uses a self-signed certificate; trust ONLY that host.
app.on(
  "certificate-error",
  (event, _webContents, url, _error, _certificate, callback) => {
    if (url.startsWith("https://127.0.0.1:2999")) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  },
);

app.whenReady().then(() => {
  createWindow();

  // Ctrl+Shift+O: toggle interactivity (so you can click overlay controls).
  globalShortcut.register("CommandOrControl+Shift+O", () =>
    setInteractive(!interactive),
  );
  // Ctrl+Shift+H: hide/show the overlay.
  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else win.show();
  });
  // Ctrl+Shift+E: toggle edit mode for the draggable panels.
  globalShortcut.register("CommandOrControl+Shift+E", () =>
    setEditMode(!editing),
  );
  // Ctrl+Shift+D: toggle calibration (debug) editor.
  globalShortcut.register("CommandOrControl+Shift+D", () => {
    calibratingMode = !calibratingMode;
    if (!win) return;
    win.setIgnoreMouseEvents(!calibratingMode, { forward: true });
    win.setFocusable(calibratingMode);
    if (calibratingMode) win.focus();
    win.webContents.send("overlay:calibrate-mode", calibratingMode);
  });

  ipcMain.handle("overlay:quit", () => app.quit());
  // Standalone overlay has no LCU reader, so HUD config is null (defaults).
  ipcMain.handle("overlay:get-hud-config", () => null);
  ipcMain.handle("overlay:get-layout", () => loadSavedLayout());
  ipcMain.handle("overlay:save-layout", (_e, saved: unknown) =>
    storeSavedLayout(saved),
  );
  ipcMain.handle("overlay:end-edit", () => setEditMode(false));
  // Calibration editor
  ipcMain.handle(
    "overlay:save-calibration",
    (_e, data: string, map?: string) => {
      const dir = join(app.getPath("userData"), "calibration");
      mkdirSync(dir, { recursive: true });
      const suffix = map === "aram" ? "-aram" : map === "rift" ? "-rift" : "";
      const p = join(dir, `ryot-calibration${suffix}.json`);
      writeFileSync(p, data, "utf8");
      return p;
    },
  );
  ipcMain.handle("overlay:show-calibration", () => {
    const p = join(
      app.getPath("userData"),
      "calibration",
      "ryot-calibration.json",
    );
    if (existsSync(p)) shell.showItemInFolder(p);
  });
  ipcMain.handle("overlay:end-calibrate", () => {
    calibratingMode = false;
    if (!win) return;
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setFocusable(false);
    win.webContents.send("overlay:calibrate-mode", false);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => globalShortcut.unregisterAll());
