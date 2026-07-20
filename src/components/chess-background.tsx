import { useMemo } from "react";

const PIECES = ["♟", "♞", "♝", "♜", "♛", "♚"];

export function ChessBackground({ density = 14 }: { density?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: density }).map((_, i) => ({
        piece: PIECES[i % PIECES.length],
        left: Math.random() * 100,
        size: 18 + Math.random() * 26,
        duration: 22 + Math.random() * 28,
        delay: -Math.random() * 40,
        opacity: 0.05 + Math.random() * 0.08,
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
