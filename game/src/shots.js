// The screenshot scenes behind ?shot=cover|patrol|alarm|escape. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a small
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame.

import { STEP } from './config.js';
import { canSee, stepGuard } from './guards.js';
import { inShadow, moveCircle } from './level.js';
import { SCREEN_PLAY } from './render.js';

const DIRS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/**
 * A greedy local planner: of the 8 ways to walk and the 8 ways to sneak (plus standing
 * still), pick the one that moves toward `target` while staying out of every guard's
 * sight. Being seen costs far more than standing still, so the pilot hides behind
 * cover and waits for a patrol to pass, as a patient player does.
 */
function autopilot(state, target, sneakBias) {
  const player = state.player;
  const level = state.level;
  const solids = level.solids;
  let best = { dx: 0, dy: 0, sneak: true, score: -Infinity };
  const options = [];
  for (const [dx, dy] of DIRS) {
    options.push({ dx, dy, sneak: false });
    options.push({ dx, dy, sneak: true });
  }
  options.push({ dx: 0, dy: 0, sneak: true });
  for (const opt of options) {
    const speed = opt.sneak ? 115 : 210;
    const len = Math.hypot(opt.dx, opt.dy) || 1;
    const moved = moveCircle(solids, player.x, player.y, 13, (opt.dx / len) * speed * STEP, (opt.dy / len) * speed * STEP);
    // Reject moves that run into a wall.
    if ((opt.dx !== 0 || opt.dy !== 0) && moved.x === player.x && moved.y === player.y) continue;
    const mx = moved.x;
    const my = moved.y;
    const distNow = Math.hypot(target.x - player.x, target.y - player.y);
    const distNext = Math.hypot(target.x - mx, target.y - my);
    let score = (distNow - distNext) * 2;
    if (inShadow(level, mx, my)) score += 6;
    if (opt.sneak) score += sneakBias;
    // A big penalty for stepping where a guard can actually see you (cone + clear sight).
    for (const g of state.guards) {
      if (canSee(solids, g, mx, my)) score -= 400;
    }
    if (score > best.score) best = { dx: opt.dx, dy: opt.dy, sneak: opt.sneak, score };
  }
  return best;
}

/** Step the guards and the relic check for dt (the player has already moved). */
function stepAll(state, dt) {
  const player = state.player;
  player.inShadow = inShadow(state.level, player.x, player.y);
  for (const g of state.guards) stepGuard(g, state.level, player, dt);
  if (!state.level.relicTaken) {
    const r = state.level.relic;
    if (Math.hypot(player.x - r.x, player.y - r.y) < 34) state.level.relicTaken = true;
  }
}

/** Play forward `seconds` with the autopilot steering toward `target`. */
function runTo(state, seconds, target, sneakBias) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const best = autopilot(state, target, sneakBias);
    const player = state.player;
    const len = Math.hypot(best.dx, best.dy) || 1;
    const speed = best.sneak ? 115 : 210;
    const moved = moveCircle(state.level.solids, player.x, player.y, 13, (best.dx / len) * speed * STEP, (best.dy / len) * speed * STEP);
    player.x = moved.x;
    player.y = moved.y;
    player.sneaking = Boolean(best.sneak);
    stepAll(state, STEP);
    if (state.level.relicTaken && target === state.level.relic) break;
    const e = state.level.exit;
    if (state.level.relicTaken && player.x > e.x - 6 && player.x < e.x + e.w + 6 && player.y > e.y - 6 && player.y < e.y + e.h + 6) break;
  }
}

/**
 * Set the world to the named scene and return the screen to draw over it.
 * cover: the player sneaks toward the relic, guards patrolling with cones out.
 * patrol: the player waits behind cover while a guard walks past (a near miss).
 * alarm: the player is spotted — a guard chases, cone red, "!" overhead.
 * escape: the relic is taken and the player stands at the glowing exit.
 */
export function stageShot(name, state, seed) {
  void seed;
  const level = state.level;
  const player = state.player;
  if (name === 'alarm') {
    // Put the player right in front of the first guard, in its cone, in the open.
    const g = state.guards[0];
    player.x = g.x + Math.cos(g.angle) * 120;
    player.y = g.y + Math.sin(g.angle) * 120;
    player.sneaking = false;
    // Stand still and be seen: the guard's alert fills and it gives chase.
    const steps = Math.floor(2.2 / STEP);
    for (let i = 0; i < steps; i += 1) stepAll(state, STEP);
    // Then run a little, so the frame shows the chase in motion.
    runTo(state, 0.5, level.exit, 0);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'escape') {
    level.relicTaken = true;
    player.x = level.exit.x - 60;
    player.y = level.exit.y + 30;
    runTo(state, 1.2, { x: level.exit.x + 23, y: level.exit.y + 30 }, 0);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'patrol') {
    // Sneak to the crate at (150, 300) and wait there while the guard walks past.
    runTo(state, 6, { x: 185, y: 335 }, 8);
    const steps = Math.floor(1.5 / STEP);
    for (let i = 0; i < steps; i += 1) {
      player.sneaking = true;
      stepAll(state, STEP);
    }
    return { screen: SCREEN_PLAY };
  }
  // cover (default): sneak toward the relic for a while, mid-level, cones out.
  runTo(state, 9, level.relic, 8);
  return { screen: SCREEN_PLAY };
}
