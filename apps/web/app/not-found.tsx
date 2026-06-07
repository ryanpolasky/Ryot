import Link from "next/link";

export default function NotFound() {
  return (
    <div className="animate-riseIn">
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-faint">
          // Error 404
        </div>
        <h1 className="mt-3 font-display text-7xl uppercase leading-none tracking-tightest sm:text-8xl">
          <span className="text-bone">Off the </span>
          <span className="text-gold">Map</span>
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted">
          This page doesn&apos;t exist. Like a ward in the enemy jungle,
          it&apos;s nowhere to be found. Check the URL or head back to base.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            ← Home
          </Link>
          <Link href="/tier-list" className="btn-outline">
            Tier List
          </Link>
          <Link href="/build/Aatrox" className="btn-outline">
            Champion Builds
          </Link>
        </div>
      </div>
    </div>
  );
}
