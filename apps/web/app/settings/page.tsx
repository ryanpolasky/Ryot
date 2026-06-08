import type { Metadata } from "next";
import ByokSettings from "@/components/ByokSettings";
import ChampionThemePicker from "@/components/ChampionThemePicker";
import DesktopSettings from "@/components/DesktopSettings";
import MeSettings from "@/components/MeSettings";
import RecentsSettings from "@/components/RecentsSettings";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Configure Ryot: an optional Bring-Your-Own-Key and a champion theme for the whole site.",
};

export default function SettingsPage() {
  return (
    <div className="animate-riseIn space-y-8">
      <div>
        <p className="eyebrow mb-3">// Settings</p>
        <h1 className="font-display text-6xl uppercase tracking-tightest text-bone">
          Settings
        </h1>
      </div>

      <ByokSettings />

      <div className="card p-6">
        <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
          What a key unlocks
        </h2>
        <ul className="mt-3 space-y-2 font-sans text-sm text-muted">
          <li>
            <span className="text-bone">Deep match breakdowns</span>: per-match
            timeline charts (gold/XP diff, CS@10/15, damage share).
          </li>
          <li>
            <span className="text-bone">Bigger samples</span>: analyze up to 50
            recent games for champion stats instead of 20.
          </li>
          <li>
            <span className="text-bone">Deeper match history</span>: page
            further back than the default 10 games.
          </li>
        </ul>
        <p className="mt-3 font-sans text-xs text-faint">
          Everything else (builds, tier lists, overlay, pre-game scout) is free
          and needs no key.
        </p>
      </div>

      <DesktopSettings />

      <ChampionThemePicker />

      <MeSettings />

      <RecentsSettings />
    </div>
  );
}
