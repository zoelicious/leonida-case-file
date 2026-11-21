// Leonida Case File — GTA VI trophy guide & tracker (gta6-trophy-guide-01).
// Entry program (Node 22, standard library only). It hands the guide in: it copies
// this repository's app/ and screenshots/ into /output and writes /output/dossier.json
// with the vendored make.fun library (vendor/makefun-frontend.ts, the kit's copy,
// unchanged). Run outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The guide itself is plain static files under app/ — no build step, no network at
// run time — so the program only copies files and writes the dossier, twice with the
// same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps: only text_max_bytes shapes the dossier bytes; the rest refuse
// an entry the scorer would refuse (more than 4 screenshots or one over 256 KiB;
// more than 993 files and directories in app/, or 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
