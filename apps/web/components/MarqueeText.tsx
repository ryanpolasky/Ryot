"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

// Scrolls overflowing text (marquee) on hover instead of truncating, so long
// names stay readable without widening their container. The scroll triggers on
// hovering an ancestor with the `group` class (e.g. a row/tile) or the text
// itself; styling + keyframes live in globals.css (.marquee-fit).
export default function MarqueeText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const over = wrap.scrollWidth - wrap.clientWidth;
      setShift(over > 1 ? over : 0);
    };
    measure();
    // Re-measure on layout changes (menu opening, font load, resize).
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text]);

  const overflow = shift > 0;
  return (
    <span
      ref={wrapRef}
      title={text}
      className={`marquee-fit ${className ?? ""}`}
      style={
        overflow
          ? ({
              // +6px so the tail isn't flush; speed scales with distance.
              "--marquee-fit-shift": `-${shift + 6}px`,
              "--marquee-fit-duration": `${Math.max(2, (shift + 6) / 24)}s`,
            } as CSSProperties)
          : undefined
      }
    >
      <span
        className="marquee-fit__inner"
        data-overflow={overflow ? "true" : "false"}
      >
        {text}
      </span>
    </span>
  );
}
