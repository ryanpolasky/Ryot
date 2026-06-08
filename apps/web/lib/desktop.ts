// Type of the desktop bridge the Ryot Electron app injects as `window.ryot`
// (see apps/desktop/src/main-preload.ts). Present only inside the desktop app;
// `undefined` in a normal browser, which is how the web detects desktop mode.

export interface RyotCurrentSummoner {
  gameName: string;
  tagLine: string;
  /** Riot platform id, e.g. "na1". */
  platform: string;
  puuid?: string;
}

export interface RyotBridge {
  isDesktop: boolean;
  isClientRunning?: () => Promise<boolean>;
  getCurrentSummoner?: () => Promise<RyotCurrentSummoner | null>;
  importRunes: (p: {
    name: string;
    primaryStyleId: number;
    subStyleId: number;
    selectedPerkIds: number[];
  }) => Promise<{ ok: true }>;
  importSpells: (p: {
    spell1Id: number;
    spell2Id: number;
  }) => Promise<{ ok: true }>;
}

declare global {
  interface Window {
    ryot?: RyotBridge;
  }
}
