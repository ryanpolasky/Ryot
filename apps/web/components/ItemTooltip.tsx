"use client";

import { useEffect, useId, useState, useRef, type ReactNode } from "react";

interface Props {
  name: string;
  /** League's full in-game description (Data Dragon rich markup HTML). */
  description?: string;
  /** Total gold cost (Data Dragon). */
  gold?: number | null;
  /** Optional win rate (%) for this item in the current build context. */
  winRate?: number;
  children: ReactNode;
}

export default function ItemTooltip({
  name,
  description,
  gold,
  winRate,
  children,
}: Props) {
  const [show, setShow] = useState(false);
  const tooltipId = useId();
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const enter = () => {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setShow(true), 150);
  };
  const leave = () => {
    clearTimeout(timeout.current);
    setShow(false);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      tabIndex={0}
      aria-label={name}
      aria-describedby={show ? tooltipId : undefined}
    >
      {children}
      {show && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[min(300px,calc(100vw-2rem))] -translate-x-1/2 border border-line bg-surface px-3 py-2 text-left shadow-xl"
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-sans text-xs font-bold uppercase tracking-wide text-gold">
              {name}
            </span>
            {gold != null && (
              <span className="shrink-0 font-mono text-[11px] font-bold text-gold2">
                {gold.toLocaleString()}g
              </span>
            )}
          </span>
          {description && (
            <span
              className="item-desc mt-1.5 block font-sans text-[11px] leading-relaxed text-muted"
              // Data Dragon item descriptions are static, trusted Riot data (not user input).
              // Collapse the extra <br>s Data Dragon puts after the stats block so the
              // stat list sits tight against the effects below it.
              dangerouslySetInnerHTML={{
                __html: description.replace(
                  /<\/stats>(?:\s*<br\s*\/?>)+/i,
                  "</stats>",
                ),
              }}
            />
          )}
          {winRate != null && (
            <span className="mt-2 block border-t border-line/60 pt-1.5 font-mono text-[10px] uppercase tracking-widest text-faint">
              Win rate <span className="text-bone">{winRate}%</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
