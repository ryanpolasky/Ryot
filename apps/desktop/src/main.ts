import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
  type IpcMainInvokeEvent,
} from "electron";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { uIOhook, UiohookKey } from "uiohook-napi";

import {
  loadSettings,
  saveSettings,
  type Settings,
  type OverlayLayout,
} from "./settings.js";
import { readHudConfig } from "./persisted-settings.js";
import { initAutoUpdates } from "./updater.js";
import {
  getCurrentSummoner,
  getChampSelectSession,
  getGameflowPhase,
  getRecentMatches,
  getRegion,
  importRunes,
  importSpells,
  importItemSet,
  isClientRunning,
  type RuneImportPayload,
  type SpellImportPayload,
} from "./lcu.js";
import { regionToPlatform } from "./regions.js";
import { watchLeagueForeground, type ForegroundWatcher } from "./foreground.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK = process.env.LC_OVERLAY_MOCK === "1";

let mainWin: BrowserWindow | null = null;
let overlayWin: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let pregameWin: BrowserWindow | null = null;
let overlayInteractive = false;
let overlayCalibrating = false;
let champSelectPollTimer: ReturnType<typeof setInterval> | null = null;
let wasInChampSelect = false;
let lastRevealedGame = false;
// Overlay auto-hide: the overlay is an in-game HUD, so it should be visible only
// while the League game window is focused. Non-Windows can't be polled, so it
// defaults to focused there (overlay always shows, as before).
let leagueForeground = process.platform !== "win32";
let overlayManualHidden = false;
let foregroundWatcher: ForegroundWatcher | null = null;
let tray: Tray | null = null;
// Close-to-tray keeps Ryot resident so it reopens instantly; isQuitting lets a
// real quit (tray menu / app.quit) bypass the hide-on-close. trayHintShown
// gates the one-time "still running" notice.
let isQuitting = false;
let trayHintShown = false;
let mainStartUrl = "";

/** Build the Ryot URL to open on launch: your profile if the client is up. */
async function resolveStartUrl(settings: Settings): Promise<string> {
  const base = settings.ryotUrl.replace(/\/+$/, "");

  const summoner = await getCurrentSummoner();
  if (summoner?.gameName) {
    const region = (await getRegion()) ?? settings.defaultRegion;
    const platform = regionToPlatform(region);
    const name = encodeURIComponent(summoner.gameName);
    const tag = encodeURIComponent(summoner.tagLine || "");
    return `${base}/summoner/${platform}/${name}/${tag}`;
  }

  // Fallback: a saved default Riot ID, if any.
  if (settings.defaultRiotId.includes("#")) {
    const [name, tag] = settings.defaultRiotId.split("#");
    return `${base}/summoner/${settings.defaultRegion}/${encodeURIComponent(
      (name ?? "").trim(),
    )}/${encodeURIComponent((tag ?? "").trim())}`;
  }

  // Otherwise the normal search home.
  return `${base}/`;
}

/** Schemes we're willing to hand off to the OS via shell.openExternal. */
function isSafeExternalScheme(targetUrl: string): boolean {
  try {
    const { protocol } = new URL(targetUrl);
    return (
      protocol === "https:" || protocol === "http:" || protocol === "mailto:"
    );
  } catch {
    return false;
  }
}

/**
 * Whether the main window may navigate to a URL in-app. The privileged
 * `window.ryot` bridge is injected into this window, so we keep it pinned to the
 * trusted Ryot origin (read fresh so it tracks Settings changes) plus local
 * file:// helper pages. Anything else is treated as an external link.
 */
function isInAppNavigation(targetUrl: string): boolean {
  try {
    const u = new URL(targetUrl);
    if (u.protocol === "file:") return true;
    return u.origin === new URL(loadSettings().ryotUrl).origin;
  } catch {
    return false;
  }
}

function createMainWindow(startUrl: string) {
  mainWin = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#0a0a0b",
    title: "Ryot",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "main-preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM (.mjs) preload scripts require the sandbox to be disabled in Electron.
      sandbox: false,
    },
  });

  mainWin.loadURL(startUrl);

  // Close-to-tray: hide instead of quitting so Ryot stays resident and reopens
  // instantly. A real quit sets isQuitting first (before-quit / tray menu).
  mainWin.on("close", (e) => {
    if (isQuitting || !loadSettings().closeToTray) return;
    e.preventDefault();
    mainWin?.hide();
    if (!trayHintShown) {
      trayHintShown = true;
      try {
        tray?.displayBalloon({
          title: "Ryot is still running",
          content:
            "Ryot stays in the tray so it reopens instantly. Right-click the tray icon to quit.",
        });
      } catch {
        /* balloons are Windows-only; ignore elsewhere */
      }
    }
  });

  // If the hosted site can't be reached, drop to a local helper page that lets
  // the user fix the server URL.
  mainWin.webContents.on(
    "did-fail-load",
    (_e, code, _desc, failedUrl, isMainFrame) => {
      if (!isMainFrame || code === -3 /* aborted */) return;
      const url = new URL(`file://${join(__dirname, "loading.html")}`);
      url.searchParams.set("error", "1");
      url.searchParams.set("target", failedUrl);
      mainWin?.loadURL(url.toString());
    },
  );

  // Keep the privileged window.ryot bridge bound to the trusted Ryot origin:
  // block in-frame navigation/redirects to any other origin (and open safe
  // links in the real browser instead). Without this, an XSS on the hosted site
  // or a redirect to an attacker origin would inherit the LCU-import bridge.
  mainWin.webContents.on("will-navigate", (event, targetUrl) => {
    if (isInAppNavigation(targetUrl)) return;
    event.preventDefault();
    if (isSafeExternalScheme(targetUrl)) shell.openExternal(targetUrl);
  });
  mainWin.webContents.on("will-redirect", (event, targetUrl) => {
    if (isInAppNavigation(targetUrl)) return;
    event.preventDefault();
    if (isSafeExternalScheme(targetUrl)) shell.openExternal(targetUrl);
  });

  // Open external links (e.g. Riot dev portal) in the real browser, but only
  // for schemes we trust - never file://, smb://, or custom protocol handlers.
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalScheme(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

// Show (and focus) the main window, recreating it if it was fully closed.
function showMainWindow() {
  if (!mainWin) {
    createMainWindow(mainStartUrl);
    return;
  }
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

// System-tray icon so Ryot can live in the tray (close-to-tray) and reopen
// instantly. Best-effort: if the icon can't load, skip the tray rather than
// crash.
function createTray() {
  if (tray) return;
  const img = nativeImage.createFromPath(join(__dirname, "icon.png"));
  if (img.isEmpty()) return;
  try {
    tray = new Tray(img.resize({ width: 16, height: 16 }));
  } catch {
    return;
  }
  tray.setToolTip("Ryot");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Ryot", click: showMainWindow },
      { label: "Settings", click: openSettings },
      { type: "separator" },
      {
        label: "Quit Ryot",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", showMainWindow);
}

function createOverlay() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  overlayWin = new BrowserWindow({
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
    show: true,
    webPreferences: {
      preload: join(__dirname, "overlay-preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM (.mjs) preload scripts require the sandbox to be disabled in Electron.
      sandbox: false,
    },
  });

  overlayWin.setAlwaysOnTop(true, "screen-saver");
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWin.setIgnoreMouseEvents(true, { forward: true });

  const url = new URL(`file://${join(__dirname, "overlay.html")}`);
  if (MOCK) url.searchParams.set("mock", "1");
  url.searchParams.set("api", loadSettings().apiUrl);
  overlayWin.loadURL(url.toString());
}

// The overlay shows only while the League game is focused - EXCEPT while you're
// actively using it (edit / calibration / interactive), and never when you've
// force-hidden it with Ctrl+Shift+H.
function overlayShouldShow(): boolean {
  if (overlayCalibrating || overlayInteractive) return true;
  if (overlayManualHidden) return false;
  return leagueForeground;
}

function applyOverlayVisibility() {
  if (!overlayWin) return;
  const show = overlayShouldShow();
  // showInactive so re-appearing never steals focus from the game.
  if (show && !overlayWin.isVisible()) overlayWin.showInactive();
  else if (!show && overlayWin.isVisible()) overlayWin.hide();
}

function setOverlayInteractive(next: boolean) {
  overlayInteractive = next;
  if (!overlayWin) return;
  applyOverlayVisibility();
  overlayWin.setIgnoreMouseEvents(!overlayInteractive, { forward: true });
  overlayWin.webContents.send("overlay:interactive", overlayInteractive);
}

function openSettings() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 520,
    height: 560,
    resizable: false,
    backgroundColor: "#0a0a0b",
    title: "Ryot Settings",
    autoHideMenuBar: true,
    parent: mainWin ?? undefined,
    modal: false,
    webPreferences: {
      preload: join(__dirname, "settings-preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM (.mjs) preload scripts require the sandbox to be disabled in Electron.
      sandbox: false,
    },
  });
  settingsWin.loadURL(`file://${join(__dirname, "settings.html")}`);
  settingsWin.on("closed", () => (settingsWin = null));
}

// ── pre-game (champ-select) window ───────────────────────────────────────────

function openPregame() {
  if (pregameWin) {
    pregameWin.focus();
    return;
  }
  const settings = loadSettings();
  // Pick the configured display (fallback: primary).
  const displays = screen.getAllDisplays();
  const display =
    displays.find((d) => d.id === settings.pregameDisplayId) ??
    screen.getPrimaryDisplay();

  pregameWin = new BrowserWindow({
    width: 1100,
    height: 740,
    x: display.workArea.x + Math.round((display.workArea.width - 1100) / 2),
    y: display.workArea.y + Math.round((display.workArea.height - 740) / 2),
    backgroundColor: "#0a0a0b",
    title: "Ryot Pre-Game",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "pregame-preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM (.mjs) preload scripts require the sandbox to be disabled in Electron.
      sandbox: false,
    },
  });
  const url = new URL(`file://${join(__dirname, "pregame.html")}`);
  if (MOCK) url.searchParams.set("mock", "1");
  pregameWin.loadURL(url.toString());
  pregameWin.on("closed", () => (pregameWin = null));
}

function closePregame() {
  pregameWin?.close();
  pregameWin = null;
}

/**
 * Auto lobby reveal: when a game starts, navigate the main window to the live
 * scout for the current summoner, which reveals all 10 players (ranks, recent
 * form, premades) with zero typing. Reuses the web Live Scout page.
 */
async function revealLiveLobby() {
  const settings = loadSettings();
  const summoner = await getCurrentSummoner();
  if (!summoner?.gameName) return;
  const region = (await getRegion()) ?? settings.defaultRegion;
  const platform = regionToPlatform(region);
  const base = settings.ryotUrl.replace(/\/+$/, "");
  const url = `${base}/live/${platform}/${encodeURIComponent(
    summoner.gameName,
  )}/${encodeURIComponent(summoner.tagLine || "")}`;
  if (mainWin) {
    mainWin.loadURL(url);
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.show();
    mainWin.focus();
  }
}

function startChampSelectPolling() {
  if (champSelectPollTimer) return;
  console.log(
    `[pregame] champ-select polling started (pregameEnabled=${
      loadSettings().pregameEnabled
    }); the pre-game window only opens while you're in champ select`,
  );

  champSelectPollTimer = setInterval(async () => {
    const settings = loadSettings();

    // ── Auto lobby reveal on game start (independent of pregame setting). ──
    if (settings.autoReveal && !MOCK) {
      const phase = await getGameflowPhase();
      const inGame = phase === "InProgress" || phase === "GameStart";
      if (inGame && !lastRevealedGame) {
        lastRevealedGame = true;
        revealLiveLobby().catch(() => {});
      } else if (!inGame && phase !== null && lastRevealedGame) {
        // Reset once the game ends so the next game re-reveals.
        lastRevealedGame = false;
      }
    }

    if (!settings.pregameEnabled && !MOCK) return;

    const session = MOCK ? null : await getChampSelectSession();
    const inChampSelect = session !== null || MOCK;

    if (inChampSelect && !wasInChampSelect) {
      wasInChampSelect = true;
      console.log("[pregame] champ select detected -> opening pre-game window");
      openPregame();
    } else if (!inChampSelect && wasInChampSelect) {
      wasInChampSelect = false;
      console.log("[pregame] champ select ended -> closing pre-game window");
      closePregame();
    }

    // Forward session state to pregame window.
    if (session && pregameWin) {
      pregameWin.webContents.send("pregame:session", session);
    }
  }, 2000);
}

// League's local APIs (Live Client + LCU) use self-signed certs on 127.0.0.1.
// Trust ONLY localhost; everything else verifies normally.
app.on(
  "certificate-error",
  (event, _wc, url, _error, _certificate, callback) => {
    if (url.startsWith("https://127.0.0.1")) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  },
);

// Single-instance lock: a second launch (or a leftover dev instance) would fail
// to register the global hotkeys, leaving them silently dead. Bail out of the
// duplicate and focus the already-running window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });
}

app.whenReady().then(async () => {
  const settings = loadSettings();
  const startUrl = await resolveStartUrl(settings);

  mainStartUrl = startUrl;
  createMainWindow(startUrl);
  createOverlay();
  createTray();

  // Auto-hide the overlay whenever the League game window isn't focused (e.g.
  // you alt-tab to a browser). Windows-only; fails open so it can't get stuck
  // hidden.
  foregroundWatcher = watchLeagueForeground((isGame) => {
    leagueForeground = isGame;
    applyOverlayVisibility();
  });
  applyOverlayVisibility();

  // Auto-update from GitHub Releases (packaged builds only).
  initAutoUpdates(() => mainWin);

  // Overlay hotkeys. Log if any fail to register - usually another app (or a
  // leftover Ryot instance) already owns the combo.
  const hotkey = (accel: string, cb: () => void) => {
    if (!globalShortcut.register(accel, cb))
      console.warn(`[overlay] hotkey ${accel} not registered (already in use?)`);
  };

  // Ctrl+Shift+O: toggle full click-through so you can click overlay controls.
  hotkey("CommandOrControl+Shift+O", () =>
    setOverlayInteractive(!overlayInteractive),
  );
  hotkey("CommandOrControl+Shift+H", () => {
    if (!overlayWin) return;
    // Manual force-hide that overrides auto-hide until toggled back.
    overlayManualHidden = !overlayManualHidden;
    applyOverlayVisibility();
  });
  hotkey("CommandOrControl+Shift+S", openSettings);
  // Ctrl+Shift+D: toggle the calibration (debug) editor.
  hotkey("CommandOrControl+Shift+D", () => {
    overlayCalibrating = !overlayCalibrating;
    if (!overlayWin) return;
    applyOverlayVisibility();
    overlayWin.setIgnoreMouseEvents(!overlayCalibrating, { forward: true });
    overlayWin.setFocusable(overlayCalibrating);
    if (overlayCalibrating) overlayWin.focus();
    overlayWin.webContents.send("overlay:calibrate-mode", overlayCalibrating);
  });

  // ── IPC: overlay ──
  ipcMain.handle("overlay:quit", () => app.quit());
  // Auto-placement: HUD config read from League's PersistedSettings.json.
  ipcMain.handle("overlay:get-hud-config", () => readHudConfig());
  ipcMain.handle("overlay:get-layout", () => loadSettings().overlayLayout);
  ipcMain.handle("overlay:save-layout", (_e, saved: OverlayLayout | null) => {
    saveSettings({ overlayLayout: saved });
  });
  // Per-region click-through: the renderer makes the window interactive only
  // while the cursor is over a draggable panel, so those panels are draggable at
  // all times without blocking clicks to the game everywhere else.
  ipcMain.handle("overlay:set-ignore-mouse", (_e, ignore: unknown) => {
    if (!overlayWin) return;
    // Calibration / O-mode own full interactivity; don't fight them.
    if (overlayCalibrating || overlayInteractive) return;
    overlayWin.setIgnoreMouseEvents(!!ignore, { forward: true });
  });
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
    overlayCalibrating = false;
    if (!overlayWin) return;
    overlayWin.setIgnoreMouseEvents(true, { forward: true });
    overlayWin.setFocusable(false);
    overlayWin.webContents.send("overlay:calibrate-mode", false);
    applyOverlayVisibility();
  });

  // ── IPC: bridge exposed to the hosted web page (window.ryot) ──
  // Defense-in-depth: ensure the frame requesting privileged LCU actions is actually
  // the trusted Ryot origin, not a malicious iframe or XSS payload.
  function verifySender(event: IpcMainInvokeEvent): boolean {
    try {
      const frameUrl = event.senderFrame?.url;
      if (!frameUrl) return false;
      if (frameUrl.startsWith("file://")) return true;
      return (
        new URL(frameUrl).origin === new URL(loadSettings().ryotUrl).origin
      );
    } catch {
      return false;
    }
  }

  ipcMain.handle("ryot:isClientRunning", (e) => {
    if (!verifySender(e)) return false;
    return isClientRunning();
  });
  ipcMain.handle("ryot:getCurrentSummoner", async (e) => {
    if (!verifySender(e)) return null;
    const s = await getCurrentSummoner();
    if (!s) return null;
    const region = (await getRegion()) ?? settings.defaultRegion;
    return { ...s, platform: regionToPlatform(region) };
  });
  ipcMain.handle("ryot:getLcuMatches", async (e, count?: number) => {
    if (!verifySender(e)) return [];
    return getRecentMatches(typeof count === "number" ? count : 20);
  });
  ipcMain.handle("ryot:importRunes", async (e, payload: RuneImportPayload) => {
    if (!verifySender(e)) throw new Error("Unauthorized IPC");
    await importRunes(payload);
    return { ok: true };
  });
  ipcMain.handle(
    "ryot:importSpells",
    async (e, payload: SpellImportPayload) => {
      if (!verifySender(e)) throw new Error("Unauthorized IPC");
      await importSpells(payload);
      return { ok: true };
    },
  );
  // Desktop preferences the web Settings page can read/write (gated to the
  // trusted Ryot frame). Side-effect-light: closeToTray is read fresh on window
  // close; launchOnStartup maps to the OS login-item.
  ipcMain.handle("ryot:getPrefs", (e) => {
    if (!verifySender(e)) return null;
    return {
      closeToTray: loadSettings().closeToTray,
      launchOnStartup: app.getLoginItemSettings().openAtLogin,
    };
  });
  ipcMain.handle(
    "ryot:setPrefs",
    (e, prefs: { closeToTray?: boolean; launchOnStartup?: boolean }) => {
      if (!verifySender(e)) return;
      if (typeof prefs?.closeToTray === "boolean") {
        saveSettings({ closeToTray: prefs.closeToTray });
      }
      if (typeof prefs?.launchOnStartup === "boolean") {
        app.setLoginItemSettings({ openAtLogin: prefs.launchOnStartup });
      }
    },
  );

  // ── IPC: settings ──
  ipcMain.handle("settings:get", () => loadSettings());
  ipcMain.handle("settings:get-displays", () =>
    screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: `Display ${i + 1} · ${d.size.width}×${d.size.height}${d.internal ? " (built-in)" : ""}`,
      width: d.size.width,
      height: d.size.height,
    })),
  );
  ipcMain.handle("settings:save", async (_e, next: Partial<Settings>) => {
    const saved = saveSettings(next);
    // Re-navigate the main window to reflect the new server / default profile.
    const url = await resolveStartUrl(saved);
    mainWin?.loadURL(url);
    settingsWin?.close();
    return saved;
  });
  ipcMain.handle("app:openSettings", openSettings);
  ipcMain.handle("app:reload", async () => {
    const url = await resolveStartUrl(loadSettings());
    mainWin?.loadURL(url);
  });

  // ── IPC: pregame ──
  ipcMain.handle(
    "pregame:importRunes",
    async (_e, payload: RuneImportPayload) => {
      await importRunes(payload);
      return { ok: true };
    },
  );
  ipcMain.handle(
    "pregame:importSpells",
    async (_e, payload: SpellImportPayload) => {
      await importSpells(payload);
      return { ok: true };
    },
  );
  ipcMain.handle(
    "pregame:importItemSet",
    async (
      _e,
      payload: {
        title: string;
        championKey: number;
        blocks: { type: string; items: { id: string; count: number }[] }[];
      },
    ) => {
      await importItemSet(payload);
      return { ok: true };
    },
  );
  ipcMain.handle("pregame:getSession", () => getChampSelectSession());
  ipcMain.handle("pregame:openPregame", openPregame);

  // ── Passive Tab key listener (for scoreboard/camp timer expansion) ──
  // uIOhook listens without intercepting, so Tab still reaches League.
  let tabHeld = false;
  uIOhook.on("keydown", (e) => {
    if (e.keycode === UiohookKey.Tab && !tabHeld) {
      tabHeld = true;
      overlayWin?.webContents.send("overlay:tab-state", true);
    }
  });
  uIOhook.on("keyup", (e) => {
    if (e.keycode === UiohookKey.Tab && tabHeld) {
      tabHeld = false;
      overlayWin?.webContents.send("overlay:tab-state", false);
    }
  });
  uIOhook.start();

  // Start champ-select polling.
  startChampSelectPolling();

  // In mock mode, auto-open the pregame window for testing.
  if (MOCK) {
    wasInChampSelect = true;
    openPregame();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(startUrl);
      createOverlay();
    }
  });
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  isQuitting = true;
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  foregroundWatcher?.stop();
  tray?.destroy();
  tray = null;
  try {
    uIOhook.stop();
  } catch {
    /* already stopped */
  }
});
