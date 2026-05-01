// Upload the 12 AI-generated, on-theme hero images to Bunny CDN library.
// Replaces the misnamed Unsplash slots so every article hero matches its topic.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE } from '../server/lib/site-config.mjs';

const TMP = join(tmpdir(), 'vc-gen-heroes');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
const PY = `
import sys
from PIL import Image
src = sys.argv[1]; dst = sys.argv[2]
img = Image.open(src).convert("RGB")
img.thumbnail((1600, 1100), Image.LANCZOS)
img.save(dst, "WEBP", quality=82, method=6)
`;
const PYFILE = join(TMP, 'cmp.py');
writeFileSync(PYFILE, PY);

// AI-generated hero URLs (compressed webp tied to webdev project lifecycle).
// Each entry = (slot, themeKey, url). Slots 1-12 are the "core" themes,
// slots 13-40 are reused/mirrored from these 12.
const GENERATED = [
  [1,  'dawn',           'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-01-dawn-PVnoSBUBBCu8ZQwnjxVmDh.webp'],
  [2,  'family',         'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-02-family-2foAfzPbCeLjMBMiqo5Lmq.webp'],
  [3,  'career',         'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-03-career-cAh3qyzYHn7TAp2baUKTNb.webp'],
  [4,  'school',         'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-04-school-ewFtDjFXkHXsXFYeWPfJDr.webp'],
  [5,  'running',        'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-05-running-H3GfmgdzJzNdDsh9R9RDt3.webp'],
  [6,  'mentor',         'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-06-mentor-eGTEez3FnjR2jX4UHv77PW.webp'],
  [7,  'circle',         'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-07-veterans-circle-RwtmS6656bCi8QygZWa8Hg.webp'],
  [8,  'journal',        'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-08-journal-cLDdXTMiqz3cE3wDtEH4MY.webp'],
  [9,  'workshop',       'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-09-workshop-dN2KFohNXiyzN8RDdRaEtq.webp'],
  [10, 'couple',         'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-10-couple-ZgeoN7PigPnEgq2WcMxEL6.webp'],
  [11, 'paperwork',      'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-11-paperwork-kypDgfSsQZTdhC4MSauE3V.webp'],
  [12, 'boots',          'https://d2xsxph8kpxj0f.cloudfront.net/310519663309220512/KEeVZSvLRJLVY3sPLCjxN9/vc-hero-12-boots-Ngt9oVy5mGzqVRE2iPDW97.webp'],
];

// Slots 13-40 reuse the 12 core themes in rotation so we still have 40 unique
// distribution slots (slot N maps to (N-1) % 12 + 1).
const FULL = [];
for (let n = 1; n <= 40; n++) {
  if (n <= 12) FULL.push([n, GENERATED[n-1][1], GENERATED[n-1][2]]);
  else FULL.push([n, GENERATED[(n-1)%12][1], GENERATED[(n-1)%12][2]]);
}

async function dl(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('GET ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
async function up(slot, buf) {
  const u = `https://${SITE.bunnyHostname}/${SITE.bunnyStorageZone}/library/lib-${String(slot).padStart(2, '0')}.webp`;
  const r = await fetch(u, {
    method: 'PUT',
    headers: { AccessKey: SITE.bunnyApiKey, 'Content-Type': 'image/webp' },
    body: buf,
  });
  if (!r.ok) throw new Error('PUT ' + r.status);
}

let ok = 0, bad = 0;
for (const [slot, theme, url] of FULL) {
  process.stdout.write(`[${slot}/${FULL.length}] ${theme}: `);
  try {
    const raw = await dl(url);
    const rawFile = join(TMP, `r${slot}.webp`);
    const webpFile = join(TMP, `o${slot}.webp`);
    writeFileSync(rawFile, raw);
    execSync(`python3 ${PYFILE} ${rawFile} ${webpFile}`);
    const webp = readFileSync(webpFile);
    await up(slot, webp);
    console.log(`ok (${(webp.length / 1024).toFixed(0)}kb)`);
    ok++;
  } catch (e) {
    console.log('FAIL ' + e.message);
    bad++;
  }
}
console.log(`\n=> uploaded ${ok}, failed ${bad}`);
