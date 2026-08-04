import { motion, useReducedMotion } from "framer-motion";

const SQUARES = Array.from({ length: 64 });

// A few pieces that glide into position on reveal.
const PIECES = [
  { glyph: "♜", square: 0, delay: 0.15 },
  { glyph: "♞", square: 3, delay: 0.25 },
  { glyph: "♛", square: 27, delay: 0.35 },
  { glyph: "♚", square: 36, delay: 0.45 },
  { glyph: "♝", square: 42, delay: 0.55 },
  { glyph: "♟", square: 49, delay: 0.65 },
];

/** Animated 8x8 board: squares fade in, pieces slide onto their squares. */
export function AnimatedBoard({ size = 256 }: { size?: number }) {
  const reduce = useReducedMotion();
  const cell = size / 8;

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden shadow-2xl"
      style={{ width: size, height: size }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.006 } } }}
    >
      <div className="grid grid-cols-8 w-full h-full">
        {SQUARES.map((_, i) => {
          const row = Math.floor(i / 8);
          const dark = (row + i) % 2 === 1;
          return (
            <motion.div
              key={i}
              className={dark ? "bg-navy" : "bg-white"}
              variants={{
                hidden: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 },
                show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
              }}
            />
          );
        })}
      </div>

      {PIECES.map((p) => {
        const row = Math.floor(p.square / 8);
        const col = p.square % 8;
        return (
          <motion.span
            key={p.glyph + p.square}
            className="absolute flex items-center justify-center select-none pointer-events-none text-gold drop-shadow"
            style={{ left: col * cell, top: row * cell, width: cell, height: cell, fontSize: cell * 0.78 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -cell * 1.6, scale: 0.8 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
          >
            {p.glyph}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
