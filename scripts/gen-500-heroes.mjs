#!/usr/bin/env node
/**
 * Generate one unique hero image per article (500 total) via DALL·E 3,
 * convert to WebP, upload to Bunny CDN under articles/{id}.webp,
 * and update articles.heroUrl in the DB.
 *
 * Resume-safe: rows whose heroUrl already points at /articles/{id}.webp are skipped.
 * Throttled to ~3 concurrent / paced ~1s between starts so we respect rate limits.
 */
import sharp from 'sharp';
import { getConn } from '../server/lib/articles-db.mjs';
import { SITE } from '../server/lib/site-config.mjs';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) { console.error('Missing OPENAI_API_KEY'); process.exit(2); }

const BUNNY_KEY = SITE.bunnyApiKey;
const BUNNY_ZONE = SITE.bunnyStorageZone;
const BUNNY_HOST = SITE.bunnyHostname;
const BUNNY_PULL = SITE.bunnyPullZone;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Style banks: rotated to keep the 500-set visually varied while staying
// inside the warm-light editorial photography aesthetic.
const PALETTES = [
  'soft golden-hour amber light', 'overcast cool morning blue light',
  'warm low-sun ember light', 'misty dawn diffuse light',
  'late-afternoon honey light through windows', 'twilight indigo with warm interior glow',
];
const SETTINGS = [
  'rural front porch with weathered wood', 'kitchen with sunlit table and ceramic mugs',
  'narrow city street near brownstones', 'open midwestern field at the edge of pines',
  'coastal pier and quiet boats', 'small-town gym with chalk dust',
  'community college courtyard', 'workshop with wood-shavings and tools',
  'living room with morning newspaper', 'hospital hallway with soft window light',
  'simple chapel with bench rows', 'public library with reading lamps',
  'community garden raised beds', 'mountain trailhead at first light',
  'desert highway shoulder at sunset', 'fishing dock with quiet water',
  'farmhouse kitchen with cast iron', 'high school football field at dusk',
  'corner barbershop with wooden chairs', 'auto shop with open garage doors',
];
const SUBJECTS = [
  'a middle-aged veteran in a flannel shirt walking thoughtfully',
  'two veterans seated facing each other in conversation',
  'a veteran father reading with a small child on the floor',
  'a veteran spouse and partner at a kitchen counter making coffee',
  'a young veteran sitting at a notebook writing',
  'a veteran community group around a wooden table laughing softly',
  'a veteran watching the horizon from a porch step, hands clasped',
  'a veteran walking a dog along a quiet road',
  'an older veteran mentor showing a younger person something on paper',
  'a veteran stretching at a trailhead before a run',
  'a veteran cook plating food in a warm kitchen',
  'a veteran in a college lecture room taking notes',
  'a veteran looking at a laptop in a small business office',
  'a veteran on a bench in a city park reading',
  'a veteran couple holding hands while walking through tall grass',
  'a veteran in flannel and work jeans repairing a fence',
  'a veteran sitting in a therapy office with hands on lap',
  'a veteran waving as a child runs across a yard',
];

const NEGATIVES = [
  'no text, no captions, no logos, no watermarks',
  'no military uniforms, no salutes, no flags as the focal point',
  'no clichés like dramatic crying soldiers, no propaganda iconography',
  'no AI-rendered glossy plastic skin; aim for natural film-like texture',
  'no surreal elements; this is documentary editorial photography',
];

const STYLE_TAIL = 'cinematic shallow depth of field, soft 35mm film grain, naturalistic skin tones, restrained composition, warm muted palette, editorial photo journalism';

const pick = (arr, i) => arr[i % arr.length];

function buildPrompt(article, index) {
  const palette = pick(PALETTES, index);
  const setting = pick(SETTINGS, Math.floor(index / 6));
  const subject = pick(SUBJECTS, Math.floor(index / 3));
  const titleHint = String(article.title || '').slice(0, 90);
  const cat = String(article.category || '').toLowerCase();
  return [
    `Editorial documentary photograph illustrating: "${titleHint}".`,
    `Subject: ${subject}.`,
    `Setting: ${setting}.`,
    `Light: ${palette}.`,
    `Theme tone: ${cat || 'transition and identity'}.`,
    STYLE_TAIL + '.',
    NEGATIVES.join('; ') + '.',
  ].join(' ');
}

async function generateOne(article, index) {
  const prompt = buildPrompt(article, index);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1792x1024',
          quality: 'standard',
          response_format: 'url',
        }),
      });
      if (r.status === 429) { await sleep(15000 * attempt); continue; }
      const j = await r.json();
      if (!r.ok) throw new Error(`openai ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
      const url = j?.data?.[0]?.url;
      if (!url) throw new Error('no-url');
      const img = await fetch(url);
      const buf = Buffer.from(await img.arrayBuffer());
      // Resize hero to a clean 1600×900 WebP (16:9), q88.
      const webp = await sharp(buf).resize(1600, 900, { fit: 'cover' }).webp({ quality: 88 }).toBuffer();
      return webp;
    } catch (e) {
      console.error(`  ! attempt ${attempt} failed for ${article.slug}: ${e.message}`);
      if (attempt === 3) throw e;
      await sleep(5000 * attempt);
    }
  }
}

async function uploadToBunny(remotePath, bytes) {
  const r = await fetch(`https://${BUNNY_HOST}/${BUNNY_ZONE}/${remotePath}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'image/webp' },
    body: bytes,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`bunny ${r.status}: ${t.slice(0, 200)}`);
  }
  return `${BUNNY_PULL}/${remotePath}`;
}

async function main() {
  const conn = await getConn();
  try {
    const [rows] = await conn.query(
      `SELECT id, slug, title, category, tags, heroUrl FROM articles ORDER BY id ASC`,
    );
    const limit = parseInt(process.env.SMOKE_LIMIT || '0', 10);
    if (limit > 0) rows.length = Math.min(rows.length, limit);
    console.log(`Loaded ${rows.length} articles${limit ? ' (smoke limit)' : ''}.`);
    // Filter rows that actually need generation
    const todo = rows.filter(a => a.heroUrl !== `${BUNNY_PULL}/articles/${a.id}.webp`);
    const skipped = rows.length - todo.length;
    let done = 0, failed = 0, idx = 0;
    const startAt = Date.now();
    const CONCURRENCY = parseInt(process.env.CONCURRENCY || '6', 10);
    console.log(`Concurrency=${CONCURRENCY}, todo=${todo.length}, skipped=${skipped}`);

    async function worker(workerId) {
      while (true) {
        const i = idx++;
        if (i >= todo.length) return;
        const a = todo[i];
        const remotePath = `articles/${a.id}.webp`;
        const expectedUrl = `${BUNNY_PULL}/${remotePath}`;
        try {
          const webp = await generateOne(a, a.id);
          await uploadToBunny(remotePath, webp);
          // Each worker uses its own short-lived connection burst to UPDATE.
          await conn.query(`UPDATE articles SET heroUrl=? WHERE id=?`, [expectedUrl, a.id]);
          done++;
          const elapsed = ((Date.now() - startAt) / 1000).toFixed(0);
          const rate = done / Math.max(1, (Date.now() - startAt) / 60000);
          console.log(`[w${workerId} ${done}/${todo.length}] id=${a.id} ${a.slug.slice(0,50)} ok (${elapsed}s, ${rate.toFixed(1)}/min, fail=${failed})`);
        } catch (e) {
          failed++;
          console.error(`[w${workerId} id=${a.id}] FAILED ${a.slug.slice(0,50)}: ${e.message}`);
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, (_, k) => worker(k + 1)));
    console.log(`\nFinished. done=${done} skipped=${skipped} failed=${failed} total=${rows.length}`);
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
