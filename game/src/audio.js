// Sound, all generated with the Web Audio API — no audio files. A soft footstep tick
// when the player walks (quieter while sneaking), a nearer guard's footsteps that grow
// louder as it closes in, and a short two-note sting when a guard raises the alarm.

let ctx = null;
let master = null;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

/** Resume the audio context after a user gesture (browsers block sound before one). */
export function unlockAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/** A short filtered noise tick, quiet and low — a footstep. */
function tick(volume, frequency) {
  if (!ensure()) return;
  if (ctx.state === 'suspended') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.55), now + 0.07);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.1);
}

/** The player's footstep: soft, and softer still while sneaking. */
export function playStep(sneaking) {
  tick(sneaking ? 0.05 : 0.11, sneaking ? 150 : 190);
}

/** A guard's footstep: volume rises as the guard gets closer (0 = far, 1 = on top of you). */
export function playGuardStep(closeness) {
  tick(0.03 + 0.14 * closeness, 120);
}

/** Two rising notes when a guard raises the alarm. */
export function playAlarm() {
  if (!ensure() || ctx.state === 'suspended') return;
  const now = ctx.currentTime;
  [0, 0.14].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(i === 0 ? 320 : 470, now + delay);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + delay);
    osc.stop(now + delay + 0.18);
  });
}

/** A soft chime when the relic is taken, and a low one when a level is cleared. */
export function playChime(high) {
  if (!ensure() || ctx.state === 'suspended') return;
  const now = ctx.currentTime;
  [0, 0.1, 0.2].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(high ? 660 + i * 110 : 330 + i * 55, now + delay);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.09, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + delay);
    osc.stop(now + delay + 0.32);
  });
}
