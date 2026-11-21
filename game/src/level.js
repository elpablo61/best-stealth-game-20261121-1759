// The level: its walls, cover, shadows, guards, relic and exit, plus the geometry the
// stealth rules need — line of sight, and the visible part of a guard's vision cone
// (raycast against every solid rectangle, so walls and cover really hide the player).

import { FIELD, LEVELS } from './config.js';

/** All solid rectangles in a level (walls + cover): they block movement and sight. */
export function solidsOf(level) {
  return level.walls.concat(level.cover);
}

/** True when the point (x, y) is inside any solid rectangle (with a small margin). */
export function hitsSolid(solids, x, y, margin) {
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    if (x > s.x - margin && x < s.x + s.w + margin && y > s.y - margin && y < s.y + s.h + margin) return true;
  }
  return false;
}

/** True when the point is inside the level bounds (the outer walls already cover this). */
export function insideField(x, y) {
  return x >= 0 && x <= FIELD.width && y >= 0 && y <= FIELD.height;
}

/** Move a circle (x, y, r) by (dx, dy), sliding along solids instead of sticking to them. */
export function moveCircle(solids, x, y, r, dx, dy) {
  let nx = x + dx;
  if (!hitsSolid(solids, nx, y, r) && insideField(nx, y)) x = nx;
  let ny = y + dy;
  if (!hitsSolid(solids, x, ny, r) && insideField(x, ny)) y = ny;
  return { x, y };
}

/**
 * True when the segment from (x1, y1) to (x2, y2) is blocked by any solid rectangle.
 * Uses the slab test: a segment hits a rectangle when the intervals overlap on both axes.
 */
export function segmentBlocked(solids, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    let tmin = 0;
    let tmax = 1;
    if (dx === 0) {
      if (x1 < s.x || x1 > s.x + s.w) continue;
    } else {
      let t1 = (s.x - x1) / dx;
      let t2 = (s.x + s.w - x1) / dx;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (dy === 0) {
      if (y1 < s.y || y1 > s.y + s.h) continue;
    } else {
      let t1 = (s.y - y1) / dy;
      let t2 = (s.y + s.h - y1) / dy;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    return true;
  }
  return false;
}

/** Distance from (x, y) along direction (dx, dy) to the first solid, or maxDist. */
function rayDistance(solids, x, y, dx, dy, maxDist) {
  let best = maxDist;
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    let tmin = 0;
    let tmax = best;
    if (dx === 0) {
      if (x < s.x || x > s.x + s.w) continue;
    } else {
      let t1 = (s.x - x) / dx;
      let t2 = (s.x + s.w - x) / dx;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (dy === 0) {
      if (y < s.y || y > s.y + s.h) continue;
    } else {
      let t1 = (s.y - y) / dy;
      let t2 = (s.y + s.h - y) / dy;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin < best) best = tmin;
  }
  return best;
}

/**
 * The visible part of a vision cone: a polygon from the guard's position, sweeping the
 * cone's angle in small steps, each ray stopping at the first wall or cover. Returns the
 * polygon points (starting and ending at the guard) for the renderer to fill.
 */
export function conePolygon(solids, gx, gy, angle, halfAngle, range) {
  const steps = 24;
  const points = [[gx, gy]];
  for (let i = 0; i <= steps; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / steps;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const d = rayDistance(solids, gx, gy, dx, dy, range);
    points.push([gx + dx * d, gy + dy * d]);
  }
  return points;
}

/** True when the point (x, y) is inside any shadow patch of the level. */
export function inShadow(level, x, y) {
  for (let i = 0; i < level.shadows.length; i += 1) {
    const s = level.shadows[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

/** A fresh, mutable state for a level index (0-based). */
export function makeLevel(index) {
  const def = LEVELS[index];
  return {
    index,
    def,
    solids: solidsOf(def),
    relicTaken: false,
    relic: { x: def.relic.x, y: def.relic.y },
    exit: def.exit,
  };
}
