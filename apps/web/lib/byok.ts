"use client";

// bring-your-own-key storage. the riot key lives only in the browser (localStorage).

const KEY = "ryot.byok";

export function getByokKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setByokKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key.trim()) window.localStorage.setItem(KEY, key.trim());
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function clearByokKey(): void {
  setByokKey("");
}

export function hasByokKey(): boolean {
  return getByokKey().length > 0;
}

/** Headers to attach to a fetch when a BYOK key is present. */
export function byokHeaders(): Record<string, string> {
  const key = getByokKey();
  return key ? { "X-Riot-Key": key } : {};
}
