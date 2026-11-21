// Keyboard input: WASD or arrows to move, Shift to sneak, R to restart, Enter to start.
// One shared object the game loop reads each step; the page never scrolls on arrows.

export function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    restart: false,
    confirm: false,
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyR: 'restart',
  Enter: 'confirm',
  Space: 'confirm',
};

/** Attach key listeners to the window; returns a detach function. */
export function attachInput(keys) {
  function down(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    if (name === 'up' || name === 'down' || name === 'left' || name === 'right' || name === 'confirm') {
      event.preventDefault();
    }
    keys[name] = true;
  }
  function up(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    keys[name] = false;
  }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return function detach() {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}
