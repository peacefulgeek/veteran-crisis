// Build OG images using local hero PNGs (network-free).
// Strategy: each article's heroUrl ends in /library/lib-NN.webp. We map
// lib-NN to one of the 12 local source PNGs via a deterministic table,
// crop+darken+overlay, then upload. If upload fails (network), we keep the
// local file ready and update the DB with the intended URL once Bunny is
// reachable again — the file path is deterministic.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

const STORAGE_KEY = '42c5b84f-70e4-493c-98cacd9b0731-f166-4832';
const STORAGE_URL = 'https://ny.storage.bunnycdn.com/veteran-crisis';
const ASSETS = '/home/ubuntu/webdev-static-assets';

mkdirSync('/tmp/og', { recursive: true });

// Map lib-NN -> one of 12 local PNG sources (mod 12 cycle, themed by topic)
const LOCAL_HEROES = [
  'vc-hero-01-dawn.png',
  'vc-hero-02-family.png',
  'vc-hero-03-career.png',
  'vc-hero-04-school.png',
  'vc-hero-05-running.png',
  'vc-hero-06-mentor.png',
  'vc-hero-07-veterans-circle.png',
  'vc-hero-08-journal.png',
  'vc-hero-09-workshop.png',
  'vc-hero-10-couple.png',
  'vc-hero-11-paperwork.png',
  'vc-hero-12-boots.png',
];

function libToLocal(heroUrl) {
  const m = heroUrl.match(/lib-(\d+)\.webp/);
  if (!m) return LOCAL_HEROES[0];
  return LOCAL_HEROES[(parseInt(m[1], 10) - 1) % LOCAL_HEROES.length];
}

// Pillow overlay script
const PY = `
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630

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
  bw, bh = base.size
  ratio = max(W/bw, H/bh)
  nw, nh = int(bw*ratio), int(bh*ratio)
  base = base.resize((nw, nh), Image.LANCZOS)
  base = base.crop(((nw-W)//2, (nh-H)//2, (nw-W)//2 + W, (nh-H)//2 + H))
  overlay = Image.new('RGBA', (W, H), (0,0,0,0))
  od = ImageDraw.Draw(overlay)
  for y in range(int(H*0.40), H):
    t = (y - H*0.40) / (H*0.60)
    a = int(190 * t)
    od.line([(0,y),(W,y)], fill=(20,24,18,a))
  od.rectangle([(0, H-200),(W, H)], fill=(20,24,18,200))
  od.rectangle([(80, H-228),(180, H-225)], fill=(180,200,140,255))
  composed = Image.alpha_composite(base.convert('RGBA'), overlay).convert('RGB')
  d = ImageDraw.Draw(composed)
  d.text((80, H-260), 'VETERAN CRISIS', font=font(22, 'bold'), fill=(232,237,224))
  title_font = font(48, 'bold')
  lines = wrap(d, title, title_font, W-160)
  if len(lines) > 3:
    lines = lines[:3]
    lines[-1] = lines[-1].rstrip(' ,.;:') + '...'
  ty = H - 200 + 24
  for l in lines:
    d.text((80, ty), l, font=title_font, fill=(248,246,240))
    ty += 58
  d.text((W-300, H-44), 'veterancrisis.com', font=font(20, 'regular'), fill=(180,200,140))
  composed.save(out_path, 'WEBP', quality=85, method=6)

if __name__ == '__main__':
  data = json.loads(sys.stdin.read())
  build(data['hero'], data['title'], data['out'])
  print('OK')
`;
writeFileSync('/tmp/og_build.py', PY);

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.query(
  "SELECT id, slug, title, heroUrl FROM articles WHERE status='published' AND (ogImage IS NULL OR ogImage = '') ORDER BY publishedAt ASC"
);
console.log(`articles to process (network-free): ${rows.length}`);

let built = 0, uploaded = 0, dbset = 0, failBuild = 0, failUpload = 0;

for (const r of rows) {
  const heroLocal = `${ASSETS}/${libToLocal(r.heroUrl)}`;
  const out = `/tmp/og/${r.slug}.webp`;
  try {
    execSync(`python3 /tmp/og_build.py`, {
      input: JSON.stringify({ hero: heroLocal, title: r.title, out }),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    built++;
  } catch (e) {
    console.error(`BUILD-FAIL ${r.slug}: ${e.message}`);
    failBuild++;
    continue;
  }

  // Try upload, but tolerate network failure
  try {
    const buf = readFileSync(out);
    const remote = `og/${r.slug}.webp`;
    const resp = await fetch(`${STORAGE_URL}/${remote}`, {
      method: 'PUT',
      headers: { AccessKey: STORAGE_KEY, 'Content-Type': 'application/octet-stream' },
      body: buf,
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`upload ${resp.status}`);
    const url = `https://veteran-crisis.b-cdn.net/${remote}`;
    await c.query("UPDATE articles SET ogImage = ? WHERE id = ?", [url, r.id]);
    uploaded++; dbset++;
    console.log(`OK ${r.slug}`);
  } catch (e) {
    console.error(`UPLOAD-FAIL ${r.slug}: ${e.message} (local file ready at ${out})`);
    failUpload++;
  }
}

console.log(`\nbuilt: ${built}, uploaded: ${uploaded}, db-set: ${dbset}, build-fail: ${failBuild}, upload-fail: ${failUpload}`);
const [v] = await c.query("SELECT COUNT(*) n FROM articles WHERE status='published' AND ogImage IS NOT NULL AND ogImage <> ''");
console.log(`published articles with ogImage now: ${v[0].n}`);
await c.end();
process.exit(0);
