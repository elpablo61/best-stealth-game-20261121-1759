// The Quiet Gallery — every tuning number, colour and level layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 210,
  sneakSpeed: 115,
  /** Detection rate multiplier while sneaking (harder to spot). */
  sneakDetect: 0.45,
  /** Detection rate multiplier while standing in a shadow patch. */
  shadowDetect: 0.5,
};

export const GUARD = {
  radius: 14,
  /** Patrol speed by level (multiplied by level.speed). */
  patrolSpeed: 95,
  /** Chase speed by level (multiplied by level.speed). */
  chaseSpeed: 205,
  /** Vision cone: how far a guard can see, in pixels. */
  viewRange: 250,
  /** Vision cone: half-angle in radians (so the full cone is ~70 degrees). */
  viewHalfAngle: 0.61,
  /** Alert (0..1) gained per second while the player is seen. */
  alertGain: 0.85,
  /** Alert lost per second while the player is unseen. */
  alertDecay: 0.22,
  /** Above this alert the guard is suspicious (turns to look, walks toward the player slowly). */
  suspiciousAt: 0.35,
  /** At this alert the guard is alarmed (chases, raises the alarm). */
  alarmAt: 1.0,
  /** Seconds a guard keeps chasing after losing sight before giving up. */
  chaseMemory: 2.5,
  /** Seconds a guard waits at each waypoint before walking on. */
  waypointPause: 0.9,
};

export const LIVES = 3;

/** A wall or a piece of cover: { x, y, w, h, kind } — kind is 'wall', 'crate', 'pillar', 'case' or 'shadow'. */
function rect(x, y, w, h, kind) {
  return { x, y, w, h, kind };
}

export const LEVELS = [
  {
    name: 'Gallery Wing',
    sub: 'Level 1 — learn the patrols',
    speed: 1.0,
    player: { x: 90, y: 620 },
    relic: { x: 640, y: 130 },
    exit: { x: 1190, y: 620, w: 46, h: 60 },
    walls: [
      rect(0, 0, 1280, 24, 'wall'),
      rect(0, 696, 1280, 24, 'wall'),
      rect(0, 0, 24, 720, 'wall'),
      rect(1256, 0, 24, 720, 'wall'),
      rect(300, 180, 180, 26, 'wall'),
      rect(800, 180, 180, 26, 'wall'),
      rect(300, 480, 180, 26, 'wall'),
      rect(800, 480, 180, 26, 'wall'),
    ],
    cover: [
      rect(150, 300, 70, 70, 'crate'),
      rect(1060, 300, 70, 70, 'crate'),
      rect(560, 330, 60, 60, 'pillar'),
      rect(660, 330, 60, 60, 'pillar'),
      rect(420, 560, 90, 46, 'case'),
      rect(770, 560, 90, 46, 'case'),
    ],
    shadows: [
      rect(180, 120, 220, 130, 'shadow'),
      rect(880, 120, 220, 130, 'shadow'),
      rect(480, 560, 320, 110, 'shadow'),
    ],
    guards: [
      { waypoints: [[420, 120], [860, 120], [860, 300], [420, 300]], pause: 0.9 },
      { waypoints: [[900, 560], [380, 560], [380, 420], [900, 420]], pause: 0.9 },
    ],
  },
  {
    name: 'The Vault Hall',
    sub: 'Level 2 — three guards, tighter routes',
    speed: 1.12,
    player: { x: 90, y: 620 },
    relic: { x: 640, y: 100 },
    exit: { x: 1190, y: 620, w: 46, h: 60 },
    walls: [
      rect(0, 0, 1280, 24, 'wall'),
      rect(0, 696, 1280, 24, 'wall'),
      rect(0, 0, 24, 720, 'wall'),
      rect(1256, 0, 24, 720, 'wall'),
      rect(240, 150, 26, 220, 'wall'),
      rect(1014, 150, 26, 220, 'wall'),
      rect(560, 300, 160, 26, 'wall'),
      rect(240, 470, 300, 26, 'wall'),
      rect(740, 470, 300, 26, 'wall'),
    ],
    cover: [
      rect(120, 260, 70, 70, 'crate'),
      rect(1090, 260, 70, 70, 'crate'),
      rect(420, 120, 60, 60, 'pillar'),
      rect(800, 120, 60, 60, 'pillar'),
      rect(600, 380, 80, 80, 'pillar'),
      rect(330, 560, 90, 46, 'case'),
      rect(860, 560, 90, 46, 'case'),
    ],
    shadows: [
      rect(90, 90, 200, 120, 'shadow'),
      rect(990, 90, 200, 120, 'shadow'),
      rect(90, 540, 220, 120, 'shadow'),
      rect(970, 540, 220, 120, 'shadow'),
      rect(560, 540, 160, 120, 'shadow'),
    ],
    guards: [
      { waypoints: [[340, 110], [940, 110], [940, 250], [340, 250]], pause: 0.8 },
      { waypoints: [[640, 620], [640, 360], [300, 360], [300, 620]], pause: 0.8 },
      { waypoints: [[1080, 420], [1080, 620], [900, 620], [900, 420]], pause: 0.8 },
    ],
  },
  {
    name: 'The Grand Atrium',
    sub: 'Level 3 — four guards, no safe road',
    speed: 1.25,
    player: { x: 90, y: 620 },
    relic: { x: 640, y: 90 },
    exit: { x: 1190, y: 620, w: 46, h: 60 },
    walls: [
      rect(0, 0, 1280, 24, 'wall'),
      rect(0, 696, 1280, 24, 'wall'),
      rect(0, 0, 24, 720, 'wall'),
      rect(1256, 0, 24, 720, 'wall'),
      rect(200, 120, 200, 26, 'wall'),
      rect(880, 120, 200, 26, 'wall'),
      rect(200, 560, 200, 26, 'wall'),
      rect(880, 560, 200, 26, 'wall'),
      rect(540, 260, 200, 26, 'wall'),
      rect(540, 430, 200, 26, 'wall'),
    ],
    cover: [
      rect(120, 300, 70, 70, 'crate'),
      rect(1090, 300, 70, 70, 'crate'),
      rect(480, 120, 60, 60, 'pillar'),
      rect(740, 120, 60, 60, 'pillar'),
      rect(480, 540, 60, 60, 'pillar'),
      rect(740, 540, 60, 60, 'pillar'),
      rect(610, 340, 60, 60, 'pillar'),
      rect(300, 340, 90, 46, 'case'),
      rect(890, 340, 90, 46, 'case'),
    ],
    shadows: [
      rect(90, 90, 180, 110, 'shadow'),
      rect(1010, 90, 180, 110, 'shadow'),
      rect(90, 520, 180, 110, 'shadow'),
      rect(1010, 520, 180, 110, 'shadow'),
      rect(480, 200, 320, 60, 'shadow'),
      rect(480, 460, 320, 60, 'shadow'),
    ],
    guards: [
      { waypoints: [[320, 100], [960, 100], [960, 200], [320, 200]], pause: 0.7 },
      { waypoints: [[200, 400], [200, 620], [500, 620], [500, 400]], pause: 0.7 },
      { waypoints: [[1080, 400], [1080, 620], [780, 620], [780, 400]], pause: 0.7 },
      { waypoints: [[640, 340], [900, 340], [900, 500], [640, 500], [380, 500], [380, 340]], pause: 0.7 },
    ],
  },
];

export const PALETTE = {
  backdrop: '#0d0f14',
  floor: '#1a1d27',
  floorAlt: '#1e222e',
  wall: '#3a4152',
  wallTop: '#4a5266',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  pillar: '#565e73',
  pillarTop: '#6d7690',
  case: '#2c4a5e',
  caseTop: '#3d647f',
  shadow: '#10131c',
  player: '#e8c85a',
  playerSneak: '#b89a3e',
  guard: '#e5534b',
  guardSuspicious: '#e8912d',
  guardAlarm: '#ff2e2e',
  coneCalm: 'rgba(232, 200, 90, 0.16)',
  coneSuspicious: 'rgba(232, 145, 45, 0.28)',
  coneAlarm: 'rgba(255, 46, 46, 0.32)',
  relic: '#7fe3c0',
  exit: '#7fe3c0',
  exitDoor: '#123527',
  panel: '#171a22',
  text: '#eef1f5',
  muted: '#8b93a3',
  danger: '#ff5a5a',
  ok: '#7fe3c0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'quiet-gallery.best';
