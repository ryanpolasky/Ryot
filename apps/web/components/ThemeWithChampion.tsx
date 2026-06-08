"use client";

import { type DDragonSkin, ddragonImg } from "@lc/shared";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onIconError } from "@/lib/img";
import { clearTheme, getTheme, setTheme } from "@/lib/theme";
import MarqueeText from "@/components/MarqueeText";

// "Theme site" control: a dropdown of Base + this champion's skins. Picking one
// recolors Ryot and sets that skin's splash as the backdrop. The menu is
// portaled to <body> so the build hero's overflow-hidden doesn't clip it.
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSkin, setActiveSkin] = useState<number | null>(null);
  const [skins, setSkins] = useState<DDragonSkin[]>([]);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const t = getTheme();
    setActiveSkin(t?.id === id ? (t.skinNum ?? 0) : null);
  }, [id]);

  // Lazy-load the skin list the first time the menu opens. Splash-less legacy
  // entries are filtered out server-side (see /api/skins).
  useEffect(() => {
    if (!open || skins.length > 0) return;
    let cancelled = false;
    fetch(`/api/skins/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : { skins: [] }))
      .then((d: { skins: DDragonSkin[] }) => {
        if (!cancelled) setSkins(d.skins ?? []);
      })
      .catch(() => {
        if (!cancelled) setSkins([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, skins.length, id]);

  // Dismiss on outside click, Escape, page scroll, or resize. The menu is
  // fixed-positioned, so an *ancestor* scroll would detach it (close it), but a
  // scroll *inside* the menu (its own list) must NOT close it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target))
        return; // scrolling within the menu itself is fine
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen(true);
  }

  // Base values are computed server-side, so theming base needs no fetch.
  function themeBase() {
    setTheme({ id, name, skinNum: 0, accent, accent2, splash });
    setActiveSkin(0);
    setOpen(false);
  }

  async function themeSkin(skinNum: number, skinName: string) {
    if (skinNum === 0) {
      themeBase();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/theme/${encodeURIComponent(id)}?skin=${skinNum}`,
      );
      if (!res.ok) throw new Error("theme failed");
      const data = (await res.json()) as {
        accent: string;
        accent2: string;
        splash: string;
      };
      setTheme({
        id,
        name,
        skinNum,
        skinName,
        accent: data.accent,
        accent2: data.accent2,
        splash: data.splash,
      });
      setActiveSkin(skinNum);
      setOpen(false);
    } catch {
      /* leave the menu open so the user can retry */
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    clearTheme();
    setActiveSkin(null);
    setOpen(false);
  }

  const isThemed = activeSkin !== null;
  const rows: DDragonSkin[] = [
    { num: 0, name: "Base" },
    ...skins.filter((s) => s.num !== 0),
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Recolor Ryot with ${name}'s splash & color`}
        className={`${isThemed ? "btn-outline" : "btn-ghost"} ml-auto shrink-0 self-start px-3 py-1.5 text-[11px]`}
      >
        <span
          className="h-2.5 w-2.5 border border-black/20"
          style={{ background: `rgb(${accent})` }}
          aria-hidden
        />
        {isThemed ? "Themed" : "Theme site"}
        <span aria-hidden>▾</span>
      </button>

      {open &&
        mounted &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={`${name} skins`}
            style={{ position: "fixed", top: pos.top, right: pos.right }}
            className="card z-50 max-h-80 w-52 overflow-auto py-1 shadow-2xl shadow-black/60"
          >
            {rows.map((s) => {
              const selected = activeSkin === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={busy}
                  onClick={() => themeSkin(s.num, s.name)}
                  className={`group flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors disabled:opacity-60 ${
                    selected
                      ? "bg-gold/15 text-bone"
                      : "text-muted hover:text-bone"
                  }`}
                >
                  <img
                    src={ddragonImg.champLoading(id, s.num)}
                    alt=""
                    loading="lazy"
                    onError={onIconError}
                    className="h-9 w-[26px] shrink-0 border border-line object-cover object-top"
                  />
                  <MarqueeText text={s.name} className="min-w-0 flex-1 text-xs" />
                </button>
              );
            })}
            {isThemed && (
              <button
                type="button"
                onClick={remove}
                className="mt-1 w-full border-t border-line px-2.5 py-1.5 text-left text-[11px] text-faint transition-colors hover:text-loss"
              >
                Remove theme
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
