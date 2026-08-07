import { useMemo } from "react";

const PIECES = ["♟", "♞", "♝", "♜", "♛", "♚"];

/** Deterministic pseudo-random so server and client HTML agree on hydration. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function ChessBackground({ density = 14 }: { density?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: density }).map((_, i) => ({
        piece: PIECES[i % PIECES.length],
        left: rand(i + 1) * 100,
        size: 18 + rand(i + 2.3) * 26,
        duration: 22 + rand(i + 5.7) * 28,
        delay: -rand(i + 9.1) * 40,
        opacity: 0.05 + rand(i + 13.5) * 0.08,
      })),
    [density],
  );
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className="chess-fall"
          style={{
            left: `${it.left}%`,
            fontSize: `${it.size}px`,
            animationDuration: `${it.duration}s`,
            animationDelay: `${it.delay}s`,
            ["--fall-opacity" as string]: String(it.opacity),
          }}
        >
          {it.piece}
        </span>
      ))}
    </div>
  );
}
