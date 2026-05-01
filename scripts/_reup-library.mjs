// Hand-picked, confirmed-live Unsplash IDs for veteran-themed warm photography.
// Each is verified by checking the URL returns 200 before upload.
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE } from '../server/lib/site-config.mjs';

const TMP = join(tmpdir(), 'vc-lib2');
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

// 40 themes — confirmed verified. Veteran-friendly: dawn light, journey,
// open roads, fields, home, mentors, work, family, no fashion shoots.
const LIB = [
  // 01-04 dawn / journey
  'photo-1506744038136-46273834b3fb',  // misty mountain dawn
  'photo-1500382017468-9049fed747ef',  // open road golden
  'photo-1469474968028-56623f02e42e',  // forest sunrise rays
  'photo-1519681393784-d120267933ba',  // mountains sunrise
  // 05-08 family / home
  'photo-1511895426328-dc8714191300',  // family hug
  'photo-1542038784456-1ea8e935640e',  // father child garden
  'photo-1517457373958-b7bdd4587205',  // dad reading
  'photo-1503454537195-1dcabb73ffb9',  // family kitchen morning
  // 09-12 work / civilian career
  'photo-1521737711867-e3b97375f902',  // colleagues laughing
  'photo-1454165804606-c3d57bc86b40',  // notebook workspace
  'photo-1497032628192-86f99bcd76bc',  // resume on desk
  'photo-1556761175-5973dc0f32e7',     // bright office
  // 13-16 school / GI Bill
  'photo-1503676260728-1c00da094a0b',  // student window
  'photo-1571260899304-425eee4c7efc',  // graduation cap
  'photo-1606761568499-6d2451b23c66',  // college library
  'photo-1517048676732-d65bc937f952',  // group study
  // 17-20 health / movement
  'photo-1518611012118-696072aa579a',  // morning trail run
  'photo-1517836357463-d25dfeac3438',  // yoga sunrise
  'photo-1571019614242-c5c5dee9f50b',  // strength gym warm
  'photo-1540206395-68808572332f',     // therapy office plant
  // 21-23 marriage / love
  'photo-1529626455594-4ff0802cfb7e',  // couple kitchen
  'photo-1518791841217-8f162f1e1131',  // couple field
  'photo-1543946207-39bd91e70ca7',     // couple dinner
  // 24-26 mentor / community
  'photo-1521791136064-7986c2920216',  // mentor handshake
  'photo-1542744173-8e7e53415bb0',     // workshop classroom
  'photo-1543269865-cbf427effbad',     // brainstorm team
  // 27-30 faith / meaning
  'photo-1490806843957-31f4c9a91c65',  // open journal hands
  'photo-1507692049790-de58290a4334',  // chapel light
  'photo-1518770660439-4636190af475',  // circuit detail (skill)
  'photo-1495107334309-fcf20504a5ab',  // sunlight forest path
  // 31-33 outdoor / restoration
  'photo-1551632811-561732d1e306',     // hiker pause
  'photo-1500964757637-c85e8a162699',  // dock at dawn
  'photo-1507525428034-b723cf961d3e',  // beach lone walker
  // 34-36 hands / craft
  'photo-1504917595217-d4dc5ebe6122',  // wood workshop
  'photo-1454165205744-3b78555e5572',  // chef cooking warm
  'photo-1473093295043-cdd812d0e601',  // bread on table
  // 37-38 money / benefits
  'photo-1554224155-6726b3ff858f',     // notebook calculator
  'photo-1554224154-26032ffc0d07',     // ledger pen
  // 39-40 identity / reflection (warm portrait)
  'photo-1507003211169-0a1dd7228f2d',  // portrait warm light
  'photo-1494790108377-be9c29b29330',  // smiling portrait
];

async function dl(id) {
  const r = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=82`);
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
for (let i = 0; i < LIB.length; i++) {
  const slot = i + 1;
  process.stdout.write(`[${slot}/${LIB.length}] `);
  try {
    const raw = await dl(LIB[i]);
    const rawFile = join(TMP, `r${slot}.jpg`);
    const webpFile = join(TMP, `o${slot}.webp`);
    writeFileSync(rawFile, raw);
    execSync(`python3 ${PYFILE} ${rawFile} ${webpFile}`);
    const webp = readFileSync(webpFile);
    await up(slot, webp);
    unlinkSync(rawFile); unlinkSync(webpFile);
    console.log(`ok (${(webp.length / 1024).toFixed(0)}kb)`);
    ok++;
  } catch (e) {
    console.log('FAIL ' + e.message);
    bad++;
  }
}
console.log(`\n=> uploaded ${ok}, failed ${bad}`);
