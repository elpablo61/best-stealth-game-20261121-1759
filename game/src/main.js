// The Quiet Gallery — the game loop and the state machine. Fixed 60Hz steps, a title
// screen, three levels, level-clear / caught / win screens, and a ?shot= mode that
// stages one deterministic scene for a screenshot and draws it once.

import { BEST_KEY, FIELD, LEVELS, LIVES, STEP } from './config.js';
import { inShadow, makeLevel } from './level.js';
import { GUARD_ALARMED, makeGuard, stepGuard } from './guards.js';
import { makePlayer, stepDue, stepPlayer } from './player.js';
import { attachInput, makeInput } from './input.js';
import { playAlarm, playChime, playGuardStep, playStep, unlockAudio } from './audio.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, render } from './render.js';
import { stageShot } from './shots.js';

function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.totalTime === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveBest(totalTime) {
  try {
    const prev = loadBest();
    if (!prev || totalTime < prev.totalTime) {
      localStorage.setItem(BEST_KEY, JSON.stringify({ totalTime }));
    }
  } catch {
    // Best score is a nicety; a browser that refuses storage still plays.
  }
}

function freshGuards(level) {
  return level.def.guards.map((def, i) => makeGuard(def, level.def.speed, i));
}

export function createGame(canvas) {
  const keys = makeInput();
  attachInput(keys);
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  const seed = Number(params.get('seed') || '1') || 1;

  const state = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: makeLevel(0),
    guards: [],
    player: null,
    lives: LIVES,
    time: 0,
    totalTime: 0,
    best: loadBest(),
    keys,
    alarmed: false,
    guardStepAcc: 0,
  };
  state.guards = freshGuards(state.level);
  state.player = makePlayer(state.level.def.player.x, state.level.def.player.y);

  function resetLevel(index) {
    state.levelIndex = index;
    state.level = makeLevel(index);
    state.guards = freshGuards(state.level);
    state.player = makePlayer(state.level.def.player.x, state.level.def.player.y);
    state.time = 0;
    state.alarmed = false;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
  window.addEventListener('resize', resize);
  resize();

  // Screenshot mode: stage one deterministic scene and draw it once, then stop.
  if (shotName) {
    const staged = stageShot(shotName, state, seed);
    state.screen = staged.screen;
    render(canvas, state);
    return { state };
  }

  let last = performance.now();
  let acc = 0;
  let raf = 0;

  function step(dt) {
    state.time += dt;
    const player = state.player;
    player.inShadow = inShadow(state.level, player.x, player.y);
    stepPlayer(player, state.level, keys, dt);
    if (player.moving && stepDue(player)) playStep(player.sneaking);

    // The nearest guard's footsteps grow louder as it closes in.
    let nearest = Infinity;
    for (const g of state.guards) nearest = Math.min(nearest, g.distToPlayer);
    state.guardStepAcc += dt;
    if (state.guardStepAcc > 0.42 && nearest < 320) {
      state.guardStepAcc = 0;
      playGuardStep(1 - nearest / 320);
    }

    let anyAlarmed = false;
    for (const g of state.guards) {
      const event = stepGuard(g, state.level, player, dt);
      if (g.state === GUARD_ALARMED) anyAlarmed = true;
      if (event === 'caught') {
        state.lives -= 1;
        if (state.lives <= 0) {
          state.screen = SCREEN_OVER;
          saveBest(state.totalTime);
        } else {
          // Caught: lose a life, the guards calm down, and you start the level again.
          resetLevel(state.levelIndex);
          state.screen = SCREEN_PLAY;
        }
        return;
      }
    }
    if (anyAlarmed && !state.alarmed) playAlarm();
    state.alarmed = anyAlarmed;

    // The relic: walk onto the pedestal to take it.
    if (!state.level.relicTaken) {
      const r = state.level.relic;
      if (Math.hypot(player.x - r.x, player.y - r.y) < 34) {
        state.level.relicTaken = true;
        playChime(true);
      }
    }
    // The exit: with the relic, walk into the door to clear the level.
    if (state.level.relicTaken) {
      const e = state.level.exit;
      if (player.x > e.x - 6 && player.x < e.x + e.w + 6 && player.y > e.y - 6 && player.y < e.y + e.h + 6) {
        state.totalTime += state.time;
        playChime(false);
        if (state.levelIndex + 1 >= LEVELS.length) {
          state.screen = SCREEN_WIN;
          saveBest(state.totalTime);
        } else {
          state.screen = SCREEN_CLEAR;
        }
        return;
      }
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    unlockAudio();
    if (state.screen === SCREEN_PLAY) {
      acc += dt;
      while (acc >= STEP) {
        step(STEP);
        acc -= STEP;
        if (state.screen !== SCREEN_PLAY) break;
      }
    } else if (state.screen === SCREEN_TITLE) {
      if (keys.confirm) {
        keys.confirm = false;
        resetLevel(0);
        state.lives = LIVES;
        state.totalTime = 0;
        state.screen = SCREEN_PLAY;
      }
    } else if (state.screen === SCREEN_CLEAR) {
      if (keys.confirm) {
        keys.confirm = false;
        resetLevel(state.levelIndex + 1);
        state.screen = SCREEN_PLAY;
      }
    } else if (state.screen === SCREEN_OVER || state.screen === SCREEN_WIN) {
      if (keys.restart || keys.confirm) {
        keys.restart = false;
        keys.confirm = false;
        resetLevel(0);
        state.lives = LIVES;
        state.totalTime = 0;
        state.screen = SCREEN_PLAY;
      }
    }
    render(canvas, state);
  }

  raf = requestAnimationFrame(frame);
  return { state, stop: () => cancelAnimationFrame(raf) };
}

/** Boot the game on the page's canvas. */
export function boot() {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  createGame(canvas);
}
