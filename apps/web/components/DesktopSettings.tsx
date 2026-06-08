"use client";

import { useEffect, useState } from "react";
import "@/lib/desktop"; // window.ryot bridge typing

// Desktop-only settings, gated to the Ryot desktop app (window.ryot) the same
// way download chrome is hidden there. Renders nothing in a normal browser.
// Toggles persist via the bridge straight to the Electron app's settings.
export default function DesktopSettings() {
  const [ready, setReady] = useState(false);
  const [closeToTray, setCloseToTray] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);

  useEffect(() => {
    const bridge = window.ryot;
    if (!bridge?.isDesktop || !bridge.getPrefs) return;
    bridge
      .getPrefs()
      .then((p) => {
        if (!p) return;
        setCloseToTray(p.closeToTray);
        setLaunchOnStartup(p.launchOnStartup);
        setReady(true);
      })
      .catch(() => {});
  }, []);

  if (!ready) return null;

  function update(next: { closeToTray?: boolean; launchOnStartup?: boolean }) {
    void window.ryot?.setPrefs?.(next);
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
        Desktop app
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Options for the Ryot desktop app. These only show while you&apos;re
        running it.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-bone">
          <input
            type="checkbox"
            checked={closeToTray}
            onChange={(e) => {
              setCloseToTray(e.target.checked);
              update({ closeToTray: e.target.checked });
            }}
            className="h-4 w-4 accent-gold"
          />
          Close to the tray (keep Ryot running so it reopens instantly)
        </label>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-bone">
          <input
            type="checkbox"
            checked={launchOnStartup}
            onChange={(e) => {
              setLaunchOnStartup(e.target.checked);
              update({ launchOnStartup: e.target.checked });
            }}
            className="h-4 w-4 accent-gold"
          />
          Launch Ryot when I sign in
        </label>
      </div>
    </div>
  );
}
