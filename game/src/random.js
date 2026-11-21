// A tiny seeded random generator (mulberry32) so a fixed seed always gives the same
// patrol jitter and the same screenshot frames.

export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a value in [min, max) from a seeded random. */
export function range(random, min, max) {
  return min + random() * (max - min);
}
