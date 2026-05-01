// Upload 60 warm-light supplement / herbal / wellness photos to Bunny under /supplements/sup-XX.webp
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE } from '../server/lib/site-config.mjs';

const TMP = join(tmpdir(), 'vc-sup');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const PY = `
import sys
from PIL import Image
src = sys.argv[1]; dst = sys.argv[2]
img = Image.open(src).convert("RGB")
img.thumbnail((900, 900), Image.LANCZOS)
img.save(dst, "WEBP", quality=82, method=6)
print("ok")
`;
const PYFILE = join(TMP, 'compress.py');
writeFileSync(PYFILE, PY);

// 60 high-quality, warm, light, plant/herbal/wellness Unsplash photos.
// Each one is generic enough to fit any supplement category.
const URLS = [
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136', // herb tea cup
  'https://images.unsplash.com/photo-1471864190281-a93a3070b6de', // jar herbs
  'https://images.unsplash.com/photo-1515442621091-3a72bbeefd07', // mortar herbs
  'https://images.unsplash.com/photo-1542736667-069246bdbc6d', // tea pour
  'https://images.unsplash.com/photo-1506084868230-bb9d95c24759', // bottle herbal
  'https://images.unsplash.com/photo-1471193945509-9ad0617afabf', // dropper bottle
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843', // forest light
  'https://images.unsplash.com/photo-1568725290612-e652b3e83bc4', // capsules
  'https://images.unsplash.com/photo-1576675784201-0e142b423952', // green powder
  'https://images.unsplash.com/photo-1543362906-acfc16c67564', // smoothie greens
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d', // capsule white
  'https://images.unsplash.com/photo-1559757175-5700dde675bc', // pills natural
  'https://images.unsplash.com/photo-1542736667-069246bdbc6d', // tea
  'https://images.unsplash.com/photo-1493836512294-502baa1986e2', // chamomile
  'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2', // herbs basket
  'https://images.unsplash.com/photo-1559059699-085698eba48c', // dropper amber
  'https://images.unsplash.com/photo-1550831107-1553da8c8464', // herbs spread
  'https://images.unsplash.com/photo-1474722883778-792e7990302f', // gold drops
  'https://images.unsplash.com/photo-1493957988430-a5f2e9f7b1a3', // tea pour 2
  'https://images.unsplash.com/photo-1471864190281-a93a3070b6de', // jar herbs alt
  'https://images.unsplash.com/photo-1583497486-b67d12a6fb40', // wellness flatlay
  'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f', // herbs natural
  'https://images.unsplash.com/photo-1610836793404-3a4b6c91dab6', // mushroom forest
  'https://images.unsplash.com/photo-1604326531570-2689ea7ee287', // mushrooms
  'https://images.unsplash.com/photo-1517914309068-7f7e7e1d6f29', // ginger root
  'https://images.unsplash.com/photo-1604335078948-7eb7f29c4e7a', // turmeric root
  'https://images.unsplash.com/photo-1546549032-9571cd6b27df', // green tea matcha
  'https://images.unsplash.com/photo-1546548970-71785318a17b', // matcha bowl
  'https://images.unsplash.com/photo-1515443961218-a51367888e4b', // morning routine
  'https://images.unsplash.com/photo-1499540633125-484965b60031', // golden cup
  'https://images.unsplash.com/photo-1558640476-437a2b9438a2', // honey lemon
  'https://images.unsplash.com/photo-1610113595480-fec8b73d6a4a', // wellness shelf
  'https://images.unsplash.com/photo-1620315808304-66597517f188', // capsules pile
  'https://images.unsplash.com/photo-1626078299034-94c123a5d7b6', // amber dropper
  'https://images.unsplash.com/photo-1631549916768-4119b4220292', // amber bottles row
  'https://images.unsplash.com/photo-1611070221487-3eed3a7e64db', // herbal stack
  'https://images.unsplash.com/photo-1550831106-0994fe8abdaa', // herb mortar 2
  'https://images.unsplash.com/photo-1612197527762-8cfb55b618d1', // ashwagandha root
  'https://images.unsplash.com/photo-1471864190281-a93a3070b6de', // jar herbs
  'https://images.unsplash.com/photo-1564535905904-c7a3a72a7b9a', // green powder bowl
  'https://images.unsplash.com/photo-1600628421055-4d30de868b8f', // smoothie green
  'https://images.unsplash.com/photo-1505576399279-565b52d4ac71', // wellness spread
  'https://images.unsplash.com/photo-1570194065650-d99fb4cb4f24', // hot tea ginger
  'https://images.unsplash.com/photo-1563865436914-aa90e3608b04', // honey jar
  'https://images.unsplash.com/photo-1518621012420-8ab10887ca53', // herbs crate
  'https://images.unsplash.com/photo-1584280571925-32d50097aa83', // capsules close
  'https://images.unsplash.com/photo-1542843137-8791a6904d14', // breakfast wellness
  'https://images.unsplash.com/photo-1610648453617-9f88f8a9d4b5', // amber droppers shelf
  'https://images.unsplash.com/photo-1553530666-ba11a7da3888', // tea ritual
  'https://images.unsplash.com/photo-1593498385833-1ce62fb50fdf', // cinnamon spice
  'https://images.unsplash.com/photo-1535914254981-b5012eebbd15', // garlic herbs
  'https://images.unsplash.com/photo-1563865436914-aa90e3608b04', // honey
  'https://images.unsplash.com/photo-1511081692775-05d0f180a065', // ginseng root
  'https://images.unsplash.com/photo-1546549032-9571cd6b27df', // matcha
  'https://images.unsplash.com/photo-1598971639058-fab3c3109a00', // dried roots
  'https://images.unsplash.com/photo-1508243771214-6e95d137426b', // sun bottle
  'https://images.unsplash.com/photo-1605425183435-25b7e99104a4', // calm bottle
  'https://images.unsplash.com/photo-1547573854-74d2a71d0826', // citrus & herbs
  'https://images.unsplash.com/photo-1607962837359-5e7e89f86776', // cup tea peace
  'https://images.unsplash.com/photo-1597481499666-15ba4ba39d50', // honey pour
];

async function dl(url) {
  const r = await fetch(url + '?auto=format&fit=crop&w=900&q=82');
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
  if (!r.ok) throw new Error('up ' + r.status + ' ' + (await r.text()).slice(0, 100));
}

let ok = 0, bad = 0;
for (let i = 0; i < URLS.length; i++) {
  const slug = `sup-${String(i + 1).padStart(2, '0')}.webp`;
  const remote = `supplements/${slug}`;
  process.stdout.write(`[${i + 1}/${URLS.length}] ${slug} `);
  try {
    const raw = await dl(URLS[i]);
    const rawFile = join(TMP, `r${i}.jpg`);
    const webpFile = join(TMP, `o${i}.webp`);
    writeFileSync(rawFile, raw);
    execSync(`python3 ${PYFILE} ${rawFile} ${webpFile}`);
    const webp = readFileSync(webpFile);
    await up(remote, webp);
    unlinkSync(rawFile);
    unlinkSync(webpFile);
    console.log(`ok (${(webp.length / 1024).toFixed(0)}kb)`);
    ok++;
  } catch (e) {
    console.log('FAIL ' + e.message);
    bad++;
  }
}
console.log(`\n=> uploaded ${ok}, failed ${bad}`);
