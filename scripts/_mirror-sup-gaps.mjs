// Pull a known-good supplement image off Bunny and re-upload it to each missing slot.
import { SITE } from '../server/lib/site-config.mjs';

const MISSING = [4, 21, 32, 34, 36, 37, 40, 44, 52, 60];
// rotate through several known-good slots
const SOURCES = [1, 2, 5, 6, 7, 9, 10, 11, 12, 14];

async function get(slot) {
  const u = `https://${SITE.bunnyPullzone}/supplements/sup-${String(slot).padStart(2, '0')}.webp`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('get ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
async function put(slot, buf) {
  const u = `https://${SITE.bunnyHostname}/${SITE.bunnyStorageZone}/supplements/sup-${String(slot).padStart(2, '0')}.webp`;
  const r = await fetch(u, {
    method: 'PUT',
    headers: { AccessKey: SITE.bunnyApiKey, 'Content-Type': 'image/webp' },
    body: buf,
  });
  if (!r.ok) throw new Error('put ' + r.status);
}

let ok = 0, bad = 0;
for (let i = 0; i < MISSING.length; i++) {
  const dst = MISSING[i];
  const src = SOURCES[i % SOURCES.length];
  process.stdout.write(`mirror ${src} -> ${dst} `);
  try {
    const buf = await get(src);
    await put(dst, buf);
    console.log('ok');
    ok++;
  } catch (e) {
    console.log('FAIL ' + e.message);
    bad++;
  }
}
console.log(`\n=> mirrored ${ok}, failed ${bad}`);
