// Round 4 phase 3: build a 1200x630 OG share image for every published
// article. Strategy:
//   - Pull the article's already-on-Bunny hero photo (warm, on-theme).
//   - Crop to 1200x630, darken the bottom 60%, overlay the article title in
//     Merriweather + a Veteran Crisis bug + a thin sage rule. WebP @ q85.
//   - Upload to Bunny CDN under /og/<slug>.webp.
//   - Add `ogImage` column to articles table, populate, and the runtime can
//     emit og:image / twitter:image meta from this column.
//
// Why programmatic instead of AI: 30 perfectly typed, perfectly branded
// 1200x630 cards in 30 seconds. AI generation can't reliably render text.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const STORAGE_KEY = '42c5b84f-70e4-493c-98cacd9b0731-f166-4832';
const STORAGE_URL = 'https://ny.storage.bunnycdn.com/veteran-crisis';

mkdirSync('/tmp/og', { recursive: true });

// Add ogImage column if missing
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await c.query("SHOW COLUMNS FROM articles");
const hasOg = cols.some(c => c.Field === 'ogImage');
if (!hasOg) {
  console.log('adding ogImage column...');
  await c.query("ALTER TABLE articles ADD COLUMN ogImage VARCHAR(512) NULL");
  console.log('  added.');
} else {
  console.log('ogImage column already exists.');
}

// Pull all published articles that don't yet have an OG image (resumable)
const [rows] = await c.query(
  "SELECT id, slug, title, heroUrl FROM articles WHERE status='published' AND (ogImage IS NULL OR ogImage = '') ORDER BY publishedAt ASC"
);
console.log(`articles to process: ${rows.length}`);

// Write a Python helper that does the crop + overlay (Pillow has the best text rendering)
const PY = `
import sys, json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
PALETTE = {
  'cream': (246, 244, 238),
  'olive': (107, 122, 60),
  'dark':  (26,  32,  24),
  'sage':  (232, 237, 224),
}
# Try several common font paths; fall back to default
def font(size, weight='regular'):
  candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf' if weight=='bold' else '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf' if weight=='bold' else '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
  ]
  for p in candidates:
    if os.path.exists(p):
      return ImageFont.truetype(p, size)
  return ImageFont.load_default()

def wrap(draw, text, fnt, max_w):
  words = text.split()
  lines, cur = [], []
  for w in words:
    cur.append(w)
    bbox = draw.textbbox((0,0), ' '.join(cur), font=fnt)
    if (bbox[2]-bbox[0]) > max_w:
      cur.pop()
      if cur: lines.append(' '.join(cur))
      cur = [w]
  if cur: lines.append(' '.join(cur))
  return lines

def build(hero_path, title, out_path):
  base = Image.open(hero_path).convert('RGB')
  # Cover-fit to 1200x630
  bw, bh = base.size
  ratio = max(W/bw, H/bh)
  nw, nh = int(bw*ratio), int(bh*ratio)
  base = base.resize((nw, nh), Image.LANCZOS)
  base = base.crop(((nw-W)//2, (nh-H)//2, (nw-W)//2 + W, (nh-H)//2 + H))
  # Darken bottom 60% with a vertical gradient of black 0->75%
  overlay = Image.new('RGBA', (W, H), (0,0,0,0))
  od = ImageDraw.Draw(overlay)
  for y in range(int(H*0.40), H):
    t = (y - H*0.40) / (H*0.60)
    a = int(190 * t)
    od.line([(0,y),(W,y)], fill=(20,24,18,a))
  # Solid base block at very bottom
  od.rectangle([(0, H-200),(W, H)], fill=(20,24,18,200))
  # Sage thin rule above title
  od.rectangle([(80, H-228),(180, H-225)], fill=(180,200,140,255))
  composed = Image.alpha_composite(base.convert('RGBA'), overlay).convert('RGB')
  d = ImageDraw.Draw(composed)
  # Eyebrow
  d.text((80, H-260), 'VETERAN CRISIS', font=font(22, 'bold'), fill=PALETTE['sage'])
  # Title (wrapped)
  title_font = font(48, 'bold')
  lines = wrap(d, title, title_font, W-160)
  if len(lines) > 3:
    lines = lines[:3]
    lines[-1] = lines[-1].rstrip(' ,.;:') + '...'
  ty = H - 200 + 24
  for l in lines:
    d.text((80, ty), l, font=title_font, fill=(248,246,240))
    ty += 58
  # Domain bug bottom-right
  d.text((W-300, H-44), 'veterancrisis.com', font=font(20, 'regular'), fill=(180,200,140))
  # Save WebP
  composed.save(out_path, 'WEBP', quality=85, method=6)

if __name__ == '__main__':
  data = json.loads(sys.stdin.read())
  build(data['hero'], data['title'], data['out'])
  print('OK')
`;
writeFileSync('/tmp/og_build.py', PY);

async function downloadHero(url) {
  // Replace b-cdn.net with ny.storage if needed; we already use pull-zone
  const r = await fetch(url, { headers: { 'User-Agent': 'VeteranCrisisOG/1.0' } });
  if (!r.ok) throw new Error(`hero ${url} -> ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const tmp = `/tmp/og/_hero.webp`;
  writeFileSync(tmp, buf);
  return tmp;
}

async function uploadOg(localPath, slug) {
  const buf = readFileSync(localPath);
  const remote = `og/${slug}.webp`;
  const r = await fetch(`${STORAGE_URL}/${remote}`, {
    method: 'PUT',
    headers: { AccessKey: STORAGE_KEY, 'Content-Type': 'application/octet-stream' },
    body: buf,
  });
  return { ok: r.ok, status: r.status, url: `https://veteran-crisis.b-cdn.net/${remote}`, kb: (buf.length/1024).toFixed(0) };
}

let ok = 0, fail = 0;
for (const r of rows) {
  try {
    const heroLocal = await downloadHero(r.heroUrl);
    const out = `/tmp/og/${r.slug}.webp`;
    execSync(`python3 /tmp/og_build.py`, {
      input: JSON.stringify({ hero: heroLocal, title: r.title, out }),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const up = await uploadOg(out, r.slug);
    if (!up.ok) throw new Error(`upload ${up.status}`);
    await c.query("UPDATE articles SET ogImage = ? WHERE id = ?", [up.url, r.id]);
    console.log(`[${++ok}/${rows.length}] ${r.slug}  ${up.kb} KB`);
  } catch (e) {
    fail++;
    console.error(`FAIL ${r.slug}: ${e.message}`);
  }
}

console.log(`\nDone. ok=${ok} fail=${fail}`);
const [verify] = await c.query("SELECT COUNT(*) n FROM articles WHERE status='published' AND ogImage IS NOT NULL AND ogImage <> ''");
console.log(`published articles with ogImage: ${verify[0].n}/${rows.length}`);
await c.end();
process.exit(fail > 0 ? 2 : 0);
