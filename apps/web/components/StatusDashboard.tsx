"use client";

import { getStatus, type StatusLevel, type StatusResult } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

const LEVEL: Record<StatusLevel, { label: string; dot: string; text: string }> =
  {
    operational: { label: "Operational", dot: "#5fd07a", text: "text-bone" },
    degraded: { label: "Degraded", dot: "#c8aa6e", text: "text-gold" },
    down: { label: "Down", dot: "#ff4d4d", text: "text-loss" },
    planned: { label: "Coming soon", dot: "#7c93c3", text: "text-faint" },
  };

const OVERALL_HEADLINE: Record<StatusLevel, string> = {
  operational: "All systems go",
  degraded: "Partial outage",
  down: "Major outage",
  // The overall status is never "planned"; a single planned component doesn't
  // degrade the whole system. Mapped for type-completeness only.
  planned: "All systems go",
};

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
    />
  );
}

export default function StatusDashboard() {
  const [data, setData] = useState<StatusResult | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStatus();
      setData(res);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const overall: StatusLevel = error
    ? "down"
    : (data?.overall ?? "operational");

  return (
    <div className="animate-riseIn space-y-10">
      <section className="pt-4">
        <p className="eyebrow mb-4">// Live service health</p>
        <h1 className="font-display text-[12vw] leading-[0.82] tracking-tightest text-bone sm:text-[7rem]">
          STATUS
        </h1>
        <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          Real-time health of Ryot&apos;s data sources. If something looks off,
          check here before pinging anyone.
        </p>
      </section>

      {/* Overall banner */}
      <section
        className="card notch flex flex-wrap items-center gap-4 p-5"
        aria-live="polite"
      >
        {error ? <Dot color="#ff4d4d" /> : <Dot color={LEVEL[overall].dot} />}
        <div className="flex-1">
          <h2 className="font-display text-2xl uppercase tracking-tightest text-bone">
            {error ? "Can't reach the API" : OVERALL_HEADLINE[overall]}
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-faint">
            {loading && !data
              ? "Checking..."
              : data
                ? `Last checked ${new Date(data.checkedAt).toLocaleTimeString()}`
                : "The backend isn't responding."}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn-ghost text-xs disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {/* Component list */}
      <section className="space-y-3">
        <p className="section-title">Components</p>
        {error && (
          <div className="card border-loss/40 p-4 text-sm text-muted">
            The Ryot backend isn&apos;t reachable, so component health is
            unavailable. The site may be down or restarting. Try again shortly.
          </div>
        )}

        {!error && loading && !data && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        )}

        {!error &&
          data?.components.map((c) => {
            const lvl = LEVEL[c.status];
            return (
              <div
                key={c.id}
                className="card flex flex-wrap items-center gap-4 p-4"
              >
                <Dot color={lvl.dot} />
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-sm font-bold text-bone">
                    {c.label}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">
                    {c.detail}
                  </div>
                </div>
                <span
                  className={`font-mono text-[11px] font-bold uppercase tracking-[0.15em] ${lvl.text}`}
                >
                  {lvl.label}
                </span>
              </div>
            );
          })}
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Status is sampled every minute. Account features need a Riot key (the
        host&apos;s, or your own via Settings).
      </p>
    </div>
  );
}
