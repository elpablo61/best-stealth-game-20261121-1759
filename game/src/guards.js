// The guards: patrol, suspicion and chase. A guard walks its waypoints, looks where it
// walks, and watches its vision cone. Seeing the player raises its alert; losing sight
// lets the alert fall again, so a player who breaks away can recover. At full alert the
// guard chases, and catching the player costs a life.

import { GUARD, STEP } from './config.js';
import { inShadow, moveCircle, segmentBlocked } from './level.js';

export const GUARD_CALM = 0;
export const GUARD_SUSPICIOUS = 1;
export const GUARD_ALARMED = 2;

/** A fresh guard from a patrol definition ({ waypoints, pause }), at index `guardIndex`. */
export function makeGuard(def, speed, guardIndex) {
  const first = def.waypoints[0];
  return {
    guardIndex,
    x: first[0],
    y: first[1],
    angle: 0,
    waypointIndex: 1 % def.waypoints.length,
    pauseLeft: 0,
    pause: def.pause ?? GUARD.waypointPause,
    alert: 0,
    state: GUARD_CALM,
    /** Seconds since the guard last saw the player (for giving up a chase). */
    unseenFor: 0,
    /** Where the guard is walking toward while suspicious or chasing. */
    targetX: first[0],
    targetY: first[1],
    speed,
    /** Distance to the player, for the footstep volume. */
    distToPlayer: Infinity,
    /** True this step when the guard can see the player. */
    seesPlayer: false,
  };
}

/** Angle difference wrapped to [-PI, PI]. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Can this guard see the player right now? The player must be inside the cone's range
 * and angle, and the line of sight must be clear of walls and cover.
 */
export function canSee(solids, guard, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return false;
  if (dist < 1) return true;
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angleTo, guard.angle)) > GUARD.viewHalfAngle) return false;
  return !segmentBlocked(solids, guard.x, guard.y, px, py);
}

/**
 * Step one guard for dt seconds. `player` is { x, y, sneaking, inShadow }. Returns an
 * event string ('caught' when the guard touches the player while alarmed) or null.
 */
export function stepGuard(guard, level, player, dt) {
  const solids = level.solids;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  guard.distToPlayer = Math.hypot(dx, dy);
  const seen = canSee(solids, guard, player.x, player.y);
  guard.seesPlayer = seen;

  if (seen) {
    let rate = GUARD.alertGain;
    if (player.sneaking) rate *= 0.45;
    if (player.inShadow) rate *= 0.5;
    // Closer is easier to spot: up to twice the rate at point blank.
    const closeness = 1 + (1 - Math.min(1, guard.distToPlayer / GUARD.viewRange));
    guard.alert = Math.min(1, guard.alert + rate * closeness * dt);
    guard.unseenFor = 0;
    guard.targetX = player.x;
    guard.targetY = player.y;
  } else {
    guard.alert = Math.max(0, guard.alert - GUARD.alertDecay * dt);
    guard.unseenFor += dt;
  }

  const was = guard.state;
  if (guard.alert >= GUARD.alarmAt) guard.state = GUARD_ALARMED;
  else if (guard.alert >= GUARD.suspiciousAt) guard.state = GUARD_SUSPICIOUS;
  else guard.state = GUARD_CALM;

  // An alarmed guard that has not seen the player for a while gives up and goes back.
  if (guard.state === GUARD_ALARMED && guard.unseenFor > GUARD.chaseMemory) {
    guard.alert = GUARD.suspiciousAt;
    guard.state = GUARD_SUSPICIOUS;
  }

  const speed = guard.speed;
  if (guard.state === GUARD_ALARMED) {
    // Chase the player's last seen spot, then the player itself when visible.
    const tx = guard.targetX;
    const ty = guard.targetY;
    const d = Math.hypot(tx - guard.x, ty - guard.y);
    if (d > 4) {
      const vx = ((tx - guard.x) / d) * GUARD.chaseSpeed * speed * dt;
      const vy = ((ty - guard.y) / d) * GUARD.chaseSpeed * speed * dt;
      const moved = moveCircle(solids, guard.x, guard.y, GUARD.radius, vx, vy);
      guard.x = moved.x;
      guard.y = moved.y;
      guard.angle = Math.atan2(ty - guard.y, tx - guard.x);
    }
    if (guard.distToPlayer < GUARD.radius + 13) return 'caught';
  } else if (guard.state === GUARD_SUSPICIOUS) {
    // Walk toward the last seen spot and look around; if nothing is there, calm down.
    const tx = guard.targetX;
    const ty = guard.targetY;
    const d = Math.hypot(tx - guard.x, ty - guard.y);
    if (d > 26) {
      const vx = ((tx - guard.x) / d) * GUARD.patrolSpeed * speed * 1.25 * dt;
      const vy = ((ty - guard.y) / d) * GUARD.patrolSpeed * speed * 1.25 * dt;
      const moved = moveCircle(solids, guard.x, guard.y, GUARD.radius, vx, vy);
      guard.x = moved.x;
      guard.y = moved.y;
      guard.angle = Math.atan2(ty - guard.y, tx - guard.x);
    } else {
      // Look around slowly while the suspicion fades.
      guard.angle += 0.9 * dt;
    }
    if (was === GUARD_ALARMED && guard.state !== GUARD_ALARMED) {
      guard.targetX = guard.x;
      guard.targetY = guard.y;
    }
  } else {
    // Patrol: walk to the next waypoint, pause, then walk on.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
    } else {
      const wp = level.def.guards[guard.guardIndex].waypoints[guard.waypointIndex];
      const d = Math.hypot(wp[0] - guard.x, wp[1] - guard.y);
      if (d < 8) {
        guard.waypointIndex = (guard.waypointIndex + 1) % level.def.guards[guard.guardIndex].waypoints.length;
        guard.pauseLeft = guard.pause;
      } else {
        const vx = ((wp[0] - guard.x) / d) * GUARD.patrolSpeed * speed * dt;
        const vy = ((wp[1] - guard.y) / d) * GUARD.patrolSpeed * speed * dt;
        const moved = moveCircle(solids, guard.x, guard.y, GUARD.radius, vx, vy);
        guard.x = moved.x;
        guard.y = moved.y;
        guard.angle = Math.atan2(wp[1] - guard.y, wp[0] - guard.x);
      }
    }
  }
  return null;
}
