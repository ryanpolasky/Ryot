"use client";

// champion site theme: recolors gold accents + sets a splash backdrop. stored in localStorage only.

const KEY = "ryot.theme";

export type ChampionTheme = {
  id: string;
  name: string;
  /** "r g b" channels for --gold-rgb (matches the design system var format). */
  accent: string;
  /** "r g b" channels for --gold-2-rgb (lighter hover variant). */
  accent2: string;
  /** Data Dragon splash URL used for the page backdrop. */
  splash: string;
};

export function getTheme(): ChampionTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChampionTheme) : null;
  } catch {
    return null;
  }
}

/** Write the theme to the DOM (CSS vars + backdrop flag) without persisting. */
export function applyTheme(theme: ChampionTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--gold-rgb", theme.accent);
  root.style.setProperty("--gold-2-rgb", theme.accent2);
  root.style.setProperty("--champion-splash", `url("${theme.splash}")`);
  root.setAttribute("data-champion-theme", theme.id);
  // Tint the mobile browser chrome (URL bar) to match the accent.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute("content", `rgb(${theme.accent.split(" ").join(",")})`);
}

/** Persist + apply a theme. */
export function setTheme(theme: ChampionTheme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(theme));
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

/** Remove the theme and revert to the brand gold defaults. */
export function clearTheme(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const root = document.documentElement;
  root.style.removeProperty("--gold-rgb");
  root.style.removeProperty("--gold-2-rgb");
  root.style.removeProperty("--champion-splash");
  root.removeAttribute("data-champion-theme");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#0a0a0b");
}
