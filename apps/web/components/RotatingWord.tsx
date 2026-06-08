"use client";

import { useEffect, useState } from "react";

// Decorative word that fades between options (e.g. SUMMONER <-> CHAMPION).
// Rendered aria-hidden; pair it with an sr-only static phrase for screen
// readers. Respects prefers-reduced-motion by holding on the first word.
export default function RotatingWord({
  words,
  interval = 2600,
  className,
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let fade: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setVisible(false);
      fade = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setVisible(true);
      }, 260);
    }, interval);
    return () => {
      clearInterval(cycle);
      clearTimeout(fade);
    };
  }, [words, interval]);

  return (
    <span
      aria-hidden
      className={`inline-block transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className ?? ""}`}
    >
      {words[index]}
    </span>
  );
}
