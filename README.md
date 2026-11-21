[![best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/elpablo61/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![entries](https://make.fun/badge/best-stealth-game-20261121-1759/elpablo61/best-stealth-game-20261121-1759/entries.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/elpablo61/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# The Quiet Gallery — a stealth game

A museum at night. Steal the relic, then reach the EXIT unseen.

**Play it:** open `game/index.html` in desktop Chrome (or `node serve.ts` and visit http://localhost:8080). No network request, no build step — plain static files.

**How to play:** WASD or arrows to move. Hold Shift to sneak — slower, but harder to spot. Guards patrol with vision cones; break line of sight behind crates, pillars and display cases, and hide in the shadows. If a guard spots you, its alert rises — run and hide until it fades. Get caught three times and the night is over. Three galleries, three relics, one quiet thief.

**What is inside:**
- `game/` — the playable game (index.html + ES modules under `game/src/`)
- `screenshots/` — 4 real renders of the game (the first is the cover)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `serve.ts` — a tiny static server for local play-testing

**Hand it in:** `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`

Made for the [best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty on [make.fun](https://make.fun).
