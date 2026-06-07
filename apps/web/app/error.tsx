"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="animate-riseIn">
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-loss">
          // Something broke
        </div>
        <h1 className="mt-3 font-display text-6xl uppercase leading-none tracking-tightest sm:text-7xl">
          <span className="text-bone">Critical </span>
          <span className="text-loss">Error</span>
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted">
          Something went wrong on our end. This usually clears up on a retry. If
          it keeps happening, an upstream data source (Riot or u.gg) may be
          rate-limiting us.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-outline">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
