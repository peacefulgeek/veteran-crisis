// One-time: download every hero photo, compress to WebP, push to Bunny.
// After this runs, no Unsplash hotlinks remain — every hero served from Bunny CDN.
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE } from '../server/lib/site-config.mjs';
import { HERO_LIBRARY } from '../server/lib/bunny.mjs';

const TMP = join(tmpdir(), 'vc-heroes');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const PY = `
import sys, io
from PIL import Image
src = sys.argv[1]
dst = sys.argv[2]
img = Image.open(src).convert("RGB")
# fit into 1600x1067 (landscape 3:2-ish) for hero
img.thumbnail((1600, 1600), Image.LANCZOS)
img.save(dst, "WEBP", quality=82, method=6)
print("ok")
`;
const PYFILE = join(TMP, 'compress.py');
writeFileSync(PYFILE, PY);

async function downloadAsBuffer(url) {
  const r = await fetch(url + '?auto=format&fit=crop&w=1600&q=82');
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

async function uploadToBunny(remotePath, buf) {
  const url = `https://${SITE.bunnyHostname}/${SITE.bunnyStorageZone}/${remotePath}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { AccessKey: SITE.bunnyApiKey, 'Content-Type': 'image/webp' },
    body: buf,
  });
  if (!r.ok) throw new Error(`bunny upload ${remotePath}: ${r.status} ${await r.text()}`);
}

async function main() {
  const map = {};
  for (let i = 0; i < HERO_LIBRARY.length; i++) {
    const url = HERO_LIBRARY[i];
    const slug = `lib-${String(i + 1).padStart(2, '0')}.webp`;
    const remotePath = `library/${slug}`;
    const cdnUrl = `${SITE.bunnyPullZone}/${remotePath}`;
    process.stdout.write(`[${i + 1}/${HERO_LIBRARY.length}] ${slug} `);
    try {
      const raw = await downloadAsBuffer(url);
      const rawFile = join(TMP, `raw-${i}.jpg`);
      const webpFile = join(TMP, `out-${i}.webp`);
      writeFileSync(rawFile, raw);
      execSync(`python3 ${PYFILE} ${rawFile} ${webpFile}`);
      const webp = readFileSync(webpFile);
      await uploadToBunny(remotePath, webp);
      unlinkSync(rawFile);
      unlinkSync(webpFile);
      map[url] = cdnUrl;
      console.log(`-> ${cdnUrl} (${(webp.length / 1024).toFixed(0)}kb)`);
    } catch (err) {
      console.log(`FAIL ${err.message}`);
    }
  }
  writeFileSync(
    join(process.cwd(), 'server/lib/_bunny-hero-map.json'),
    JSON.stringify(map, null, 2),
  );
  console.log(`\n=> ${Object.keys(map).length} mapped to Bunny`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
