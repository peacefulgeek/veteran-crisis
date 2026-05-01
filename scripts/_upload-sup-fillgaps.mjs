// Fill the 24 supplement slots that returned 404 in the first pass.
// Curated IDs that are confirmed live on Unsplash CDN.
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE } from '../server/lib/site-config.mjs';

const TMP = join(tmpdir(), 'vc-sup2');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const PY = `
import sys
from PIL import Image
src = sys.argv[1]; dst = sys.argv[2]
img = Image.open(src).convert("RGB")
img.thumbnail((900, 900), Image.LANCZOS)
img.save(dst, "WEBP", quality=82, method=6)
`;
const PYFILE = join(TMP, 'compress.py');
writeFileSync(PYFILE, PY);

// (slot number, replacement Unsplash ID)
const FILL = [
  [3, 'photo-1545558014-8692077e9b5c'],   // green tea pour
  [4, 'photo-1564202395998-3f0b5d9f2fe5'], // herbs jar 2
  [8, 'photo-1559757148-5c350d0d3c56'],   // capsules pile
  [13, 'photo-1558642084-fd07fae5282e'],   // tea cup steam
  [19, 'photo-1488477181946-6428a0291777'], // herbal flatlay
  [21, 'photo-1558624232-75c2a6c1e1ad'],   // wellness routine
  [23, 'photo-1599394022918-6c2776530abb'], // mushrooms
  [24, 'photo-1518173946687-a4c8892bbd9f'], // mushroom basket
  [25, 'photo-1599043513900-ed6fe01d3833'], // ginger root
  [26, 'photo-1615485290382-441e4d049cb5'], // turmeric powder
  [32, 'photo-1612386466089-fda9b5dca94b'], // wellness shelf
  [34, 'photo-1611070221487-1cc4b35ed79b'], // amber bottles
  [35, 'photo-1556227702-d1e4e7b5c232'],   // amber dropper close
  [36, 'photo-1597481499666-15ba4ba39d50'], // honey pour
  [37, 'photo-1604908176997-431b1be07f93'], // ashwagandha root
  [40, 'photo-1622097137061-8a3c43c14a6b'], // greens powder bowl
  [43, 'photo-1565299585323-38d6b0865b47'], // honey jar
  [44, 'photo-1601925268517-2ddf6cc3a2cd'], // herbs crate
  [45, 'photo-1607619056574-7b8d3ee536b2'], // capsules close
  [46, 'photo-1493770348161-369560ae357d'], // breakfast wellness
  [48, 'photo-1606756790138-261d2b21cd75'], // tea ritual
  [50, 'photo-1576092762791-dd9e2220abd1'], // garlic herbs
  [52, 'photo-1606213564085-8e1e8fb16d3d'], // ginseng root
  [60, 'photo-1620202250783-672086f2b1e1'], // honey pour 2
];

async function dl(id) {
  const r = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`);
  if (!r.ok) throw new Error('fetch ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

async function up(remotePath, buf) {
  const u = `https://${SITE.bunnyHostname}/${SITE.bunnyStorageZone}/${remotePath}`;
  const r = await fetch(u, {
    method: 'PUT',
    headers: { AccessKey: SITE.bunnyApiKey, 'Content-Type': 'image/webp' },
    body: buf,
  });
  if (!r.ok) throw new Error('up ' + r.status);
}

let ok = 0, bad = 0;
for (const [slot, id] of FILL) {
  const slug = `sup-${String(slot).padStart(2, '0')}.webp`;
  process.stdout.write(`[${slot}] ${slug} `);
  try {
    const raw = await dl(id);
    const rawFile = join(TMP, `r${slot}.jpg`);
    const webpFile = join(TMP, `o${slot}.webp`);
    writeFileSync(rawFile, raw);
    execSync(`python3 ${PYFILE} ${rawFile} ${webpFile}`);
    const webp = readFileSync(webpFile);
    await up(`supplements/${slug}`, webp);
    unlinkSync(rawFile); unlinkSync(webpFile);
    console.log(`ok (${(webp.length / 1024).toFixed(0)}kb)`);
    ok++;
  } catch (e) {
    console.log('FAIL ' + e.message);
    bad++;
  }
}
console.log(`\n=> uploaded ${ok}, failed ${bad}`);
