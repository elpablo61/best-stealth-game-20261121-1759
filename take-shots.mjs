// Take the 4 screenshots for The Quiet Gallery: load each ?shot= scene in headless
// Chromium at 1280x800, save as PNG, convert to JPEG (quality 82) under 256 KiB.
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = 'http://localhost:8081';
const SHOTS = [
  ['cover', '1-cover.jpg'],
  ['patrol', '2-patrol.jpg'],
  ['alarm', '3-alarm.jpg'],
  ['escape', '4-escape.jpg'],
];
const OUT = '/home/hatch/workspace/makefun-sweep/best-stealth-game-20261121-1759/screenshots';

for (const [shot, name] of SHOTS) {
  const png = `/tmp/stealth-${shot}.png`;
  const jpg = `${OUT}/${name}`;
  execSync(`${CHROME} --no-sandbox --screenshot=${png} --window-size=1280,800 --virtual-time-budget=8000 "${BASE}/?shot=${shot}&seed=1"`, { stdio: 'pipe' });
  // Convert to JPEG; lower quality until it fits under 256 KiB.
  let quality = 82;
  for (;;) {
    execSync(`ffmpeg -y -loglevel error -i ${png} -q:v ${quality} ${jpg}`, { stdio: 'pipe' });
    const size = statSync(jpg).size;
    console.log(`${name}: ${size} bytes (q=${quality})`);
    if (size <= 262144 || quality <= 40) break;
    quality -= 10;
  }
  const dims = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ${jpg}`, { encoding: 'utf8' }).trim();
  console.log(`  dimensions: ${dims}`);
}
console.log('done');
