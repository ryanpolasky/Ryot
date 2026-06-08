"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Search" },
  { href: "/build", label: "Builds" },
  { href: "/tier-list", label: "Tier List" },
  { href: "/download", label: "Download" },
  { href: "/settings", label: "Settings" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Close the menu whenever the route changes (after a link tap).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll and allow Escape to close while the menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ml-auto sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="relative z-50 flex h-9 w-9 flex-col items-center justify-center gap-[5px] border border-line text-bone transition-colors hover:border-gold"
      >
        <span
          className={`h-px w-4 bg-current transition-transform ${open ? "translate-y-[6px] rotate-45" : ""}`}
        />
        <span
          className={`h-px w-4 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`h-px w-4 bg-current transition-transform ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
        />
      </button>

      {/* Full-viewport scrim, portaled to <body> so it escapes the header's
          backdrop-filter (which would otherwise clip a fixed child to the
          header box). Sits below the sticky header (z-40) so the logo + close
          button stay visible, and dims/closes everything else. */}
      {open &&
        mounted &&
        createPortal(
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm sm:hidden"
          />,
          document.body,
        )}

      {open && (
        <>
          <nav className="absolute left-0 right-0 top-full z-50 border-b border-line bg-bg shadow-2xl shadow-black/60">
            <div className="mx-auto flex max-w-6xl flex-col px-5 py-2 font-mono text-sm uppercase tracking-[0.15em]">
              {LINKS.map((l) => {
                const active =
                  l.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`border-b border-line/30 py-3 transition-colors last:border-0 ${
                      active ? "text-gold" : "text-muted hover:text-bone"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
