"use client";

import { useEffect, useState } from "react";
import "@/lib/desktop"; // window.ryot global typing

// desktop-only "import to league" controls; only render inside the ryot desktop app

interface Props {
  champion: string;
  role: string;
  primaryStyleId: number;
  subStyleId: number;
  perkIds: number[];
  spell1Id?: number;
  spell2Id?: number;
}

export default function ImportToLeague({
  champion,
  role,
  primaryStyleId,
  subStyleId,
  perkIds,
  spell1Id,
  spell2Id,
}: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setIsDesktop(Boolean(window.ryot?.isDesktop));
  }, []);

  if (!isDesktop) return null;

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 3500);
  }

  async function importRunes() {
    if (!window.ryot) return;
    try {
      await window.ryot.importRunes({
        name: `Ryot · ${champion} ${role}`,
        primaryStyleId,
        subStyleId,
        selectedPerkIds: perkIds,
      });
      flash("Rune page created in League.");
    } catch (e) {
      flash(`Failed: ${(e as Error).message}`);
    }
  }

  async function importRunesAndSpells() {
    if (!window.ryot) return;
    try {
      await window.ryot.importRunes({
        name: `Ryot · ${champion} ${role}`,
        primaryStyleId,
        subStyleId,
        selectedPerkIds: perkIds,
      });
      if (spell1Id != null && spell2Id != null) {
        await window.ryot.importSpells({ spell1Id, spell2Id });
        flash("Runes created + spells set (champ select only).");
      } else {
        flash("Rune page created in League.");
      }
    } catch (e) {
      flash(`Failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <span className="kicker">Import to League</span>
      <button onClick={importRunes} className="btn-primary">
        Import Runes
      </button>
      {spell1Id != null && spell2Id != null && (
        <button onClick={importRunesAndSpells} className="btn-outline">
          Runes + Spells
        </button>
      )}
      {status && <span className="stat text-[11px] text-muted">{status}</span>}
    </div>
  );
}
