// The player: a thief with a lantern, moving on WASD or arrows. Hold Shift to sneak —
// slower, but harder to spot. The player slides along walls instead of sticking to them.

import { PLAYER } from './config.js';
import { moveCircle } from './level.js';

export function makePlayer(x, y) {
  return {
    x,
    y,
    sneaking: false,
    /** Facing angle, for the lantern glow and the little direction tick. */
    angle: -Math.PI / 2,
    moving: false,
    /** Distance walked since the last footstep tick (for the sound). */
    stepAcc: 0,
  };
}

/** Step the player for dt seconds from the held keys { up, down, left, right, sneak }. */
export function stepPlayer(player, level, keys, dt) {
  let dx = 0;
  let dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  const len = Math.hypot(dx, dy);
  player.moving = len > 0;
  player.sneaking = Boolean(keys.sneak);
  if (len > 0) {
    dx /= len;
    dy /= len;
    const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const moved = moveCircle(level.solids, player.x, player.y, PLAYER.radius, dx * speed * dt, dy * speed * dt);
    player.x = moved.x;
    player.y = moved.y;
    player.angle = Math.atan2(dy, dx);
    player.stepAcc += speed * dt;
  }
  return player;
}

/** True when the player has walked far enough for another footstep tick. */
export function stepDue(player) {
  const stride = player.sneaking ? 34 : 46;
  if (player.stepAcc >= stride) {
    player.stepAcc -= stride;
    return true;
  }
  return false;
}
