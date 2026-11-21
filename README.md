# Leonida Case File — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/zoelicious/leonida-case-file/rank.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/zoelicious/leonida-case-file/reward.svg)](https://make.fun/c/gta6-trophy-guide-01)

An offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI.
Every trophy is a case file: **claim → evidence → verdict → safe play**.

## What it is

- **Tracker** — all 55 trophies with their official names, descriptions and grades;
  progress saved in the browser (localStorage), export to a file and import back;
  filters (story, missable, collectibles, activities, online, PSN-hidden, disputed,
  unconfirmed, earned, not earned), search, and a spoiler setting that hides story
  trophies until they are earned.
- **Roadmap** — five stages to the platinum (Chapter 1 first → story → strangers →
  activities → collectibles & 100%), with earned counts per stage and the disputed
  headline numbers shown both ways (~200 h vs 250–300 h; difficulty 4/10 vs 7/10).
- **Cited guidance** — every step cites its source by number; the source rail shows
  10 guides read 20–21 Nov 2026 with a reliability badge (FULL GUIDE / KEY SECTIONS /
  LIST ONLY / ECHO) and a cited-by count counted from the data.
- **Verdicts** — 11 trophies carry a verdict panel: both versions of a dispute side by
  side, our call, and a confidence (2 disputed · 7 unconfirmed · 2 confirmed = 11 verdicts).
- **Safe Play** — the one possibly missable trophy, Positive Mental Attitude, gets an
  exact save-point instruction, a 1 + 1 + 16 = 18 meditation count check, and a
  tick-one-by-one list of all 18 meditations at 10 spots.

## The one missable, stated plainly

Positive Mental Attitude (meditate at every spot across Leonida) is the only trophy
the guides flag as possibly missable: the Chapter 1 balcony meditation at Jason's
house (Lucia, after Down to Earth) may be required, and there is no mission replay.
Do it before leaving Chapter 1. The maths, checked: 8 spots × 2 meditations = 16,
+ balcony 1 + Ascent 1 = 18 meditations at 10 spots.

## How it was built

Names, descriptions and grades are the official list as PlayStation publishes it
(55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden). Guide text is
written in our own words; a source is cited, never copied. Where guides disagree
(meditations 18 vs 15, hours ~200 vs 250–300, difficulty 4/10 vs 7/10), both versions
are shown with a verdict. The game launched 19 Nov 2026 — 13 years after GTA V
(Sep 2013) — so nothing here is confirmed by playing it yet, and this file says so.

## Run it

Static files under `app/` — no build step, no network at run time:

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Credits

Original design and guide text for this entry; no Rockstar Games logo, artwork or
screenshots. Official names, descriptions and grades as published by PlayStation.
make.fun referral: [nmy46sr8](https://make.fun/r/nmy46sr8).
