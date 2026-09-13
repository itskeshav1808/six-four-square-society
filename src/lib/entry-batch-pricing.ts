export function batchPricing(count: number, baseFee: number, threshold: number, discount: number) {
  const unlocked = count >= threshold;
  const off = unlocked ? discount : 0;
  const perEntry = Math.max(0, baseFee - off);
  return {
    unlocked,
    discountPerEntry: off,
    perEntry,
    total: perEntry * count,
  };
}

export function lineTotal(baseFees: number[], threshold: number, discount: number) {
  const unlocked = baseFees.length >= threshold;
  const off = unlocked ? discount : 0;
  const lines = baseFees.map((fee) => Math.max(0, fee - off));
  return {
    unlocked,
    discountPerEntry: off,
    lines,
    total: lines.reduce((a, n) => a + n, 0),
  };
}

export function draftExpiryWarning(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return { approaching: false, expired: false, hoursLeft: null as number | null };
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return { approaching: false, expired: true, hoursLeft: 0 };
  const hoursLeft = ms / (60 * 60 * 1000);
  return { approaching: hoursLeft <= 48, expired: false, hoursLeft };
}
