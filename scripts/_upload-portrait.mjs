// Compress the generated Oracle Lover portrait to a 1200x1200 square WebP
// and a 600x600 thumbnail, then upload both to Bunny CDN.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SRC = '/home/ubuntu/webdev-static-assets/oracle-lover-portrait.png';
const TMP_LARGE = '/tmp/oracle-lover-portrait-1200.webp';
const TMP_SMALL = '/tmp/oracle-lover-portrait-600.webp';
const STORAGE_KEY = '42c5b84f-70e4-493c-98cacd9b0731-f166-4832';
const STORAGE_URL = 'https://ny.storage.bunnycdn.com/veteran-crisis';

if (!existsSync(SRC)) { console.error('source missing:', SRC); process.exit(1); }

execSync(`python3 -c "
from PIL import Image
im = Image.open('${SRC}').convert('RGB')
im.thumbnail((1200,1200), Image.LANCZOS)
im.save('${TMP_LARGE}', 'WEBP', quality=82, method=6)
im2 = Image.open('${SRC}').convert('RGB')
im2.thumbnail((600,600), Image.LANCZOS)
im2.save('${TMP_SMALL}', 'WEBP', quality=82, method=6)
"`, { stdio: 'inherit' });

async function put(local, remote) {
  const buf = readFileSync(local);
  const r = await fetch(`${STORAGE_URL}/${remote}`, {
    method: 'PUT',
    headers: { AccessKey: STORAGE_KEY, 'Content-Type': 'application/octet-stream' },
    body: buf,
  });
  console.log(`PUT ${remote} → ${r.status} (${(buf.length/1024).toFixed(0)} KB)`);
  if (!r.ok) console.error(await r.text());
}

await put(TMP_LARGE, 'author/oracle-lover-portrait.webp');
await put(TMP_SMALL, 'author/oracle-lover-portrait-thumb.webp');

console.log('\nCDN URLs:');
console.log('https://veteran-crisis.b-cdn.net/author/oracle-lover-portrait.webp');
console.log('https://veteran-crisis.b-cdn.net/author/oracle-lover-portrait-thumb.webp');
