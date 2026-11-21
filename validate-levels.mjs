// Validate every level: each guard's patrol segment must not cross a solid rectangle
// (wall or cover), and each waypoint must sit in open floor. Prints every violation.
import { LEVELS } from '/home/hatch/workspace/makefun-sweep/best-stealth-game-20261121-1759/game/src/config.js';
import { segmentBlocked, solidsOf } from '/home/hatch/workspace/makefun-sweep/best-stealth-game-20261121-1759/game/src/level.js';

let problems = 0;
LEVELS.forEach((level, li) => {
  const solids = solidsOf(level);
  // Player start, relic and exit must be in open floor.
  for (const [name, p] of [['player', level.player], ['relic', level.relic]]) {
    for (const s of solids) {
      if (p.x > s.x - 14 && p.x < s.x + s.w + 14 && p.y > s.y - 14 && p.y < s.y + s.h + 14) {
        console.log(`L${li + 1} ${name} at (${p.x},${p.y}) is inside/near solid (${s.x},${s.y},${s.w},${s.h},${s.kind})`);
        problems += 1;
      }
    }
  }
  level.guards.forEach((g, gi) => {
    const wps = g.waypoints;
    for (let i = 0; i < wps.length; i += 1) {
      const [x, y] = wps[i];
      for (const s of solids) {
        if (x > s.x - 14 && x < s.x + s.w + 14 && y > s.y - 14 && y < s.y + s.h + 14) {
          console.log(`L${li + 1} guard ${gi} waypoint ${i} (${x},${y}) is inside/near solid (${s.x},${s.y},${s.w},${s.h},${s.kind})`);
          problems += 1;
        }
      }
    }
    for (let i = 0; i < wps.length; i += 1) {
      const a = wps[i];
      const b = wps[(i + 1) % wps.length];
      if (segmentBlocked(solids, a[0], a[1], b[0], b[1])) {
        console.log(`L${li + 1} guard ${gi} segment ${i} (${a}) -> (${b}) crosses a solid`);
        problems += 1;
      }
    }
  });
});
console.log(problems === 0 ? 'ALL CLEAR' : `${problems} problem(s)`);
