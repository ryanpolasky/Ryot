"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import "@/lib/desktop"; // window.ryot bridge typing

// Desktop-only chrome tweaks. Marks <html data-desktop> (CSS then hides web-only
// chrome like the Download nav link) and redirects the download page to home,
// since you're already running the app. A no-op in a normal browser.
export default function DesktopChrome() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!window.ryot?.isDesktop) return;
    document.documentElement.setAttribute("data-desktop", "1");
    if (pathname === "/download") router.replace("/");
  }, [pathname, router]);
  return null;
}
