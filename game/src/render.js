// The renderer: one canvas, one fixed 1280x720 logical field scaled to the window.
// It draws the floor, shadows, walls and cover, the exit and the relic, each guard's
// vision cone (raycast, so walls really hide you), the guards and the player, the HUD,
// and the title / level-clear / game-over / win screens.

import { FIELD, FONT, PALETTE } from './config.js';
import { conePolygon } from './level.js';
import { GUARD_ALARMED, GUARD_SUSPICIOUS } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** Fit the 1280x720 field into the canvas, letterboxed, and return the scale. */
function fit(canvas, ctx) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(w / FIELD.width, h / FIELD.height);
  const ox = (w - FIELD.width * scale) / 2;
  const oy = (h - FIELD.height * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  return scale;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Checkerboard tiles, faint, so the floor reads at a glance.
  const tile = 80;
  ctx.fillStyle = PALETTE.floorAlt;
  for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
    for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
      if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }
  // Shadow patches: dark floor where the player is harder to spot.
  for (const s of level.def.shadows) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
}

function drawObstacle(ctx, o) {
  const top = 8;
  let fill = PALETTE.wall;
  let topFill = PALETTE.wallTop;
  if (o.kind === 'crate') { fill = PALETTE.crate; topFill = PALETTE.crateTop; }
  if (o.kind === 'pillar') { fill = PALETTE.pillar; topFill = PALETTE.pillarTop; }
  if (o.kind === 'case') { fill = PALETTE.case; topFill = PALETTE.caseTop; }
  ctx.fillStyle = fill;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.fillStyle = topFill;
  ctx.fillRect(o.x, o.y, o.w, top);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
  if (o.kind === 'case') {
    // A glass case: a pale inner rectangle, the relic's home.
    ctx.fillStyle = 'rgba(127, 227, 192, 0.18)';
    ctx.fillRect(o.x + 8, o.y + 12, o.w - 16, o.h - 20);
  }
  if (o.kind === 'pillar') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(o.x + o.w / 2, o.y + o.h / 2, Math.min(o.w, o.h) / 2 - 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, level, relicTaken, time) {
  const e = level.exit;
  const open = relicTaken;
  const pulse = open ? 0.55 + 0.35 * Math.sin(time * 4) : 0.25;
  ctx.fillStyle = PALETTE.exitDoor;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = `rgba(127, 227, 192, ${pulse})`;
  ctx.fillRect(e.x + 5, e.y + 5, e.w - 10, e.h - 10);
  ctx.strokeStyle = PALETTE.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  ctx.fillStyle = PALETTE.exit;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y - 10);
}

function drawRelic(ctx, level, time) {
  if (level.relicTaken) return;
  const r = level.relic;
  const glow = 0.5 + 0.3 * Math.sin(time * 3);
  const grad = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 46);
  grad.addColorStop(0, `rgba(127, 227, 192, ${glow})`);
  grad.addColorStop(1, 'rgba(127, 227, 192, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r.x, r.y, 46, 0, Math.PI * 2);
  ctx.fill();
  // The relic: a small diamond on a pedestal.
  ctx.fillStyle = '#2c4a5e';
  ctx.fillRect(r.x - 22, r.y + 8, 44, 12);
  ctx.fillStyle = PALETTE.relic;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y - 16);
  ctx.lineTo(r.x + 10, r.y);
  ctx.lineTo(r.x, r.y + 14);
  ctx.lineTo(r.x - 10, r.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('RELIC', r.x, r.y - 26);
}

function drawCone(ctx, level, guard) {
  let fill = PALETTE.coneCalm;
  if (guard.state === GUARD_SUSPICIOUS) fill = PALETTE.coneSuspicious;
  if (guard.state === GUARD_ALARMED) fill = PALETTE.coneAlarm;
  const points = conePolygon(level.solids, guard.x, guard.y, guard.angle, 0.61, 250);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard, time) {
  let body = PALETTE.guard;
  if (guard.state === GUARD_SUSPICIOUS) body = PALETTE.guardSuspicious;
  if (guard.state === GUARD_ALARMED) body = PALETTE.guardAlarm;
  // Body + facing tick.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.angle) * 20, guard.y + Math.sin(guard.angle) * 20);
  ctx.stroke();
  // Eyes: two dots facing the patrol direction.
  const ex = Math.cos(guard.angle);
  const ey = Math.sin(guard.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(guard.x + ex * 5 - ey * 5, guard.y + ey * 5 + ex * 5, 2.5, 0, Math.PI * 2);
  ctx.arc(guard.x + ex * 5 + ey * 5, guard.y + ey * 5 - ex * 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Alert meter arc + mark.
  if (guard.alert > 0.02) {
    ctx.strokeStyle = guard.state === GUARD_ALARMED ? PALETTE.guardAlarm : PALETTE.guardSuspicious;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.alert);
    ctx.stroke();
  }
  if (guard.state === GUARD_SUSPICIOUS || guard.state === GUARD_ALARMED) {
    const mark = guard.state === GUARD_ALARMED ? '!' : '?';
    const bob = Math.sin(time * 6) * 2;
    ctx.fillStyle = guard.state === GUARD_ALARMED ? PALETTE.guardAlarm : PALETTE.guardSuspicious;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(mark, guard.x, guard.y - 26 + bob);
  }
}

function drawPlayer(ctx, player, time) {
  // Lantern glow around the player.
  const grad = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, 70);
  grad.addColorStop(0, 'rgba(232, 200, 90, 0.20)');
  grad.addColorStop(1, 'rgba(232, 200, 90, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick + a little hood point.
  ctx.strokeStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.angle) * 18, player.y + Math.sin(player.angle) * 18);
  ctx.stroke();
  if (player.sneaking) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y + 26);
  }
}

function drawHud(ctx, state) {
  const level = state.level;
  ctx.fillStyle = 'rgba(13, 15, 20, 0.82)';
  roundRect(ctx, 12, 12, 330, 74, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(level.def.name, 26, 38);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(level.relicTaken ? 'Relic taken — reach the EXIT' : 'Steal the relic, then reach the EXIT', 26, 60);
  const lives = '●'.repeat(Math.max(0, state.lives)) + '○'.repeat(Math.max(0, 3 - state.lives));
  ctx.fillStyle = state.lives <= 1 ? PALETTE.danger : PALETTE.ok;
  ctx.font = `15px ${FONT}`;
  ctx.fillText(`Lives ${lives}`, 26, 80 - 2);
  // Alert: the highest guard alert, as a bar on the right.
  let worst = 0;
  for (const g of state.guards) worst = Math.max(worst, g.alert);
  const bw = 220;
  const bx = FIELD.width - bw - 12;
  ctx.fillStyle = 'rgba(13, 15, 20, 0.82)';
  roundRect(ctx, bx - 12, 12, bw + 24, 74, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('ALARM', bx, 38);
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(bx, 46, bw, 12);
  ctx.fillStyle = worst >= 1 ? PALETTE.guardAlarm : worst >= 0.35 ? PALETTE.guardSuspicious : PALETTE.ok;
  ctx.fillRect(bx, 46, bw * worst, 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(worst >= 1 ? 'SPOTTED — run!' : worst >= 0.35 ? 'Suspicious…' : 'Unseen', bx, 78);
  // Timer + level, bottom right.
  ctx.fillStyle = 'rgba(13, 15, 20, 0.82)';
  roundRect(ctx, FIELD.width - 190, FIELD.height - 44, 178, 32, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'right';
  const t = Math.floor(state.time);
  ctx.fillText(`Level ${state.levelIndex + 1}/3   ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, FIELD.width - 24, FIELD.height - 22);
  ctx.textAlign = 'left';
}

function drawPanel(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(10, 12, 17, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 340, 190, 600, 340, 14);
  ctx.fill();
  ctx.strokeStyle = '#2a3040';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 260);
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, 640, y);
    y += 30;
  }
  ctx.fillStyle = PALETTE.player;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(hint, 640, 480);
  ctx.textAlign = 'left';
}

/** Draw the whole game for the current screen. `state` holds level, guards, player, etc. */
export function render(canvas, state) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  fit(canvas, ctx);
  const level = state.level;
  const time = state.time;
  drawFloor(ctx, level);
  for (const w of level.def.walls) drawObstacle(ctx, w);
  for (const c of level.def.cover) drawObstacle(ctx, c);
  drawExit(ctx, level, level.relicTaken, time);
  drawRelic(ctx, level, time);
  // Vision cones first (under the guards), then guards, then the player on top.
  for (const g of state.guards) drawCone(ctx, level, g);
  for (const g of state.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, state.player, time);

  if (state.screen === SCREEN_TITLE) {
    drawPanel(ctx, 'THE QUIET GALLERY', [
      'A museum at night. Steal the relic, then reach the EXIT unseen.',
      'Move: WASD or arrows.  Sneak: hold Shift (slower, harder to spot).',
      'Guards patrol with vision cones — break line of sight to stay hidden.',
      'Hide in shadows and behind crates. If a guard spots you, run and hide',
      'until the alarm fades. Caught three times and the night is over.',
    ], 'Press Enter to begin');
  } else if (state.screen === SCREEN_CLEAR) {
    drawPanel(ctx, 'LEVEL CLEAR', [
      `${level.def.name} — the relic is yours.`,
      `Time ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}   Lives left ${state.lives}`,
    ], 'Press Enter for the next gallery');
  } else if (state.screen === SCREEN_OVER) {
    drawPanel(ctx, 'CAUGHT', [
      'The guards found you. The gallery keeps its relic — this time.',
      `You reached ${level.def.name}.`,
    ], 'Press R or Enter to try again');
  } else if (state.screen === SCREEN_WIN) {
    drawPanel(ctx, 'THE GALLERY IS YOURS', [
      'All three relics, all three galleries — and not a single alarm that stuck.',
      `Total time ${Math.floor(state.totalTime / 60)}:${String(Math.floor(state.totalTime % 60)).padStart(2, '0')}`,
    ], 'Press R or Enter to play again');
  } else {
    drawHud(ctx, state);
  }
}
