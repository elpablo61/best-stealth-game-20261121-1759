// Headless end-to-end test for The Quiet Gallery. Drives the REAL game modules
// (level, guards, player) with the SAME win/lose rules as main.js's step().
// 1. Autopilot completes level 1: takes the relic, reaches the exit -> level clears.
// 2. A player who stands in a guard's cone gets caught -> loses a life.
// 3. Three catches -> game over.
import { LEVELS, LIVES, STEP } from './game/src/config.js';
import { inShadow, makeLevel } from './game/src/level.js';
import { GUARD_ALARMED, makeGuard, stepGuard } from './game/src/guards.js';
import { makePlayer } from './game/src/player.js';
import { moveCircle } from './game/src/level.js';
import { canSee } from './game/src/guards.js';

const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

function freshState(levelIndex) {
  const level = makeLevel(levelIndex);
  return {
    levelIndex,
    level,
    guards: level.def.guards.map((def, i) => makeGuard(def, level.def.speed, i)),
    player: makePlayer(level.def.player.x, level.def.player.y),
    lives: LIVES,
    time: 0,
    screen: 'play',
  };
}

// Same autopilot as shots.js (greedy, hides from cones).
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
    if ((opt.dx !== 0 || opt.dy !== 0) && moved.x === player.x && moved.y === player.y) continue;
    const distNow = Math.hypot(target.x - player.x, target.y - player.y);
    const distNext = Math.hypot(target.x - moved.x, target.y - moved.y);
    let score = (distNow - distNext) * 2;
    if (inShadow(level, moved.x, moved.y)) score += 6;
    if (opt.sneak) score += sneakBias;
    for (const g of state.guards) {
      if (canSee(solids, g, moved.x, moved.y)) score -= 400;
    }
    if (score > best.score) best = { dx: opt.dx, dy: opt.dy, sneak: opt.sneak, score };
  }
  return best;
}

// One fixed step with the same rules as main.js's step() (relic, exit, catch).
function step(state, dt, move) {
  state.time += dt;
  const player = state.player;
  const level = state.level;
  player.inShadow = inShadow(level, player.x, player.y);
  if (move) {
    const len = Math.hypot(move.dx, move.dy) || 1;
    const speed = move.sneak ? 115 : 210;
    const moved = moveCircle(level.solids, player.x, player.y, 13, (move.dx / len) * speed * dt, (move.dy / len) * speed * dt);
    player.x = moved.x;
    player.y = moved.y;
    player.sneaking = move.sneak;
  }
  for (const g of state.guards) {
    const event = stepGuard(g, level, player, dt);
    if (event === 'caught') {
      state.lives -= 1;
      if (state.lives <= 0) {
        state.screen = 'over';
      } else {
        // Respawn at the level start (same as main.js's resetLevel).
        const fresh = freshState(state.levelIndex);
        state.level = fresh.level;
        state.guards = fresh.guards;
        state.player = fresh.player;
        state.time = 0;
      }
      return 'caught';
    }
  }
  if (!level.relicTaken) {
    const r = level.relic;
    if (Math.hypot(player.x - r.x, player.y - r.y) < 34) level.relicTaken = true;
  }
  if (level.relicTaken) {
    const e = level.exit;
    if (player.x > e.x - 6 && player.x < e.x + e.w + 6 && player.y > e.y - 6 && player.y < e.y + e.h + 6) {
      state.screen = state.levelIndex + 1 >= LEVELS.length ? 'win' : 'clear';
      return 'exit';
    }
  }
  return null;
}

function runTo(state, seconds, target, sneakBias) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const best = autopilot(state, target, sneakBias);
    const ev = step(state, STEP, best);
    if (ev === 'exit' || ev === 'caught') return ev;
    if (Math.hypot(target.x - state.player.x, target.y - state.player.y) < 10) return 'arrived';
  }
  return 'timeout';
}

// --- Test 1: complete level 1 (relic -> exit) ---
{
  const state = freshState(0);
  const r1 = runTo(state, 60, state.level.relic, 8);
  console.log('T1 relic:', r1, 'relicTaken:', state.level.relicTaken, 'lives:', state.lives);
  const r2 = state.level.relicTaken ? runTo(state, 60, { x: state.level.exit.x + 23, y: state.level.exit.y + 30 }, 0) : 'skipped';
  console.log('T1 exit:', r2, 'screen:', state.screen, 'lives:', state.lives, 'time:', state.time.toFixed(1) + 's');
  console.log(r2 === 'exit' && state.screen === 'clear' ? 'T1 PASS: level 1 clears' : 'T1 FAIL');
}

// --- Test 2: standing in a guard's cone gets you caught ---
{
  const state = freshState(0);
  const g = state.guards[0];
  // Put the player 120px in front of guard 0, in its cone, and stand still.
  state.player.x = g.x + 120;
  state.player.y = g.y;
  let caught = false;
  for (let i = 0; i < Math.floor(5 / STEP); i += 1) {
    const ev = step(state, STEP, null);
    if (ev === 'caught') { caught = true; break; }
  }
  console.log('T2 caught:', caught, 'lives:', state.lives, 'guard mode:', state.guards[0].mode);
  console.log(caught && state.lives === LIVES - 1 ? 'T2 PASS: caught, lost a life' : 'T2 FAIL');
}

// --- Test 3: three catches -> game over ---
{
  const state = freshState(0);
  let catches = 0;
  for (let round = 0; round < 3; round += 1) {
    const g = state.guards[0];
    state.player.x = g.x + 120;
    state.player.y = g.y;
    for (let i = 0; i < Math.floor(5 / STEP); i += 1) {
      const ev = step(state, STEP, null);
      if (ev === 'caught') { catches += 1; break; }
    }
  }
  console.log('T3 catches:', catches, 'lives:', state.lives, 'screen:', state.screen);
  console.log(catches === 3 && state.screen === 'over' ? 'T3 PASS: 3 catches -> game over' : 'T3 FAIL');
}

// --- Test 4: the relic is required; the exit does nothing without it ---
{
  const state = freshState(0);
  state.player.x = state.level.exit.x + 23;
  state.player.y = state.level.exit.y + 30;
  const ev = step(state, STEP, null);
  console.log('T4 exit-without-relic:', ev, 'screen:', state.screen);
  console.log(ev === null && state.screen === 'play' ? 'T4 PASS: no relic, no clear' : 'T4 FAIL');
}
console.log('done');
