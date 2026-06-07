"use client";

import { useEffect, useState } from "react";
import { clearTheme, getTheme, setTheme } from "@/lib/theme";

// one-tap "theme the site with this champion" toggle
export default function ThemeWithChampion({
  id,
  name,
  accent,
  accent2,
  splash,
}: {
  id: string;
  name: string;
  accent: string;
  accent2: string;
  splash: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(getTheme()?.id === id);
  }, [id]);

  function toggle() {
    if (active) {
      clearTheme();
      setActive(false);
    } else {
      setTheme({ id, name, accent, accent2, splash });
      setActive(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      title={
        active
          ? "Remove this site theme"
          : `Recolor Ryot with ${name}'s splash & color`
      }
      className={`${active ? "btn-outline" : "btn-ghost"} ml-auto shrink-0 self-start px-3 py-1.5 text-[11px]`}
    >
      <span
        className="h-2.5 w-2.5 border border-black/20"
        style={{ background: `rgb(${accent})` }}
        aria-hidden
      />
      {active ? "Themed" : "Theme site"}
    </button>
  );
}
