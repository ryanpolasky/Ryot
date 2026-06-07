import { app, BrowserWindow } from "electron";
// electron-updater ships as CommonJS; under "type": "module" the named export
// isn't reliably picked up, so destructure off the default import.
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;

/**
 * Wire auto-updates from GitHub Releases.
 *
 * On launch (packaged builds only) we check the configured GitHub repo for a
 * newer release, download it silently in the background, and install it on the
 * next quit. The repo + provider come from electron-builder.yml's `publish`
 * block, which electron-builder bakes into app-update.yml at package time.
 *
 * In dev (unpackaged) there's no app-update.yml, so we no-op to avoid the
 * "update check is only available in packaged builds" error spam.
 */
export function initAutoUpdates(
  getMainWindow: () => BrowserWindow | null,
): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on("error", (err) => {
    // A failed update check should never crash the app or interrupt the user;
    // just log it. They keep running the current version.
    console.warn("[updater] error:", err?.message ?? err);
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`[updater] update available: ${info.version}, downloading…`);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] already on the latest version.");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[updater] ${info.version} downloaded; will install on quit.`);
    // Let the renderer optionally surface a "restart to update" prompt.
    getMainWindow()?.webContents.send("updater:downloaded", {
      version: info.version,
    });
  });

  // Fire-and-forget; errors are handled by the listener above.
  void autoUpdater.checkForUpdatesAndNotify();

  // Re-check periodically for long-running sessions (every 6 hours).
  setInterval(
    () => {
      void autoUpdater.checkForUpdates().catch(() => {});
    },
    6 * 60 * 60 * 1000,
  );
}

/** Quit and install a downloaded update immediately (e.g. from a UI button). */
export function quitAndInstallUpdate(): void {
  autoUpdater.quitAndInstall();
}
