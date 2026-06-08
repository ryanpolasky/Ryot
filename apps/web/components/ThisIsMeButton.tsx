"use client";

import { useEffect, useRef, useState } from "react";
import { clearMe, isMe, setMe } from "@/lib/recents";

// Summoner-page control: when no account is marked as "me", offer to mark this
// one (with a confirmation explaining it does nothing but pin it locally).
export default function ThisIsMeButton({
  region,
  gameName,
  tagLine,
}: {
  region: string;
  gameName: string;
  tagLine: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setMine(isMe({ region, gameName, tagLine }));
  }, [region, gameName, tagLine]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // localStorage is client-only; avoid an SSR/client flash.
  if (!mounted) return null;

  if (mine) {
    return (
      <button
        type="button"
        onClick={() => {
          clearMe();
          setMine(false);
        }}
        title="Set as your account on this device. Click to unset."
        className="chip chip-active cursor-pointer"
      >
        ✓ This is you
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="btn-ghost text-[11px]"
      >
        This is me
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Mark profile as yours"
          className="card absolute right-0 top-full z-20 mt-1 w-64 p-3 text-left shadow-2xl shadow-black/60"
        >
          <p className="text-xs leading-relaxed text-muted">
            Mark{" "}
            <span className="text-bone">
              {gameName}#{tagLine}
            </span>{" "}
            as yours? This only pins it to the top of your search suggestions on
            this device, it doesn&apos;t claim the account or send anything
            anywhere.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMe({ region, gameName, tagLine });
                setMine(true);
                setOpen(false);
              }}
              className="btn-primary text-[11px]"
            >
              Yes, it&apos;s me
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost text-[11px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
