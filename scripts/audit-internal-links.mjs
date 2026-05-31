#!/usr/bin/env node
// Parallel audit (concurrency 20) of internal /articles/ link counts per body
// across all article JSONs on Bunny. Reports distribution and low-link slugs.
import { getConn } from '../server/lib/articles-db.mjs';
import { getJsonFromBunny } from '../server/lib/bunny.mjs';
import { getQueuedFromBunny } from '../server/lib/bunny-queue.mjs';

const c = await getConn();
const [rows] = await c.query("SELECT slug, status FROM articles");
console.log(`Auditing ${rows.length} articles, concurrency=20`);

const buckets = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
const lowSamples = [];
let i = 0;

async function worker(id) {
  while (true) {
    const idx = i++;
    if (idx >= rows.length) return;
    const r = rows[idx];
    try {
      const j = r.status === 'published'
        ? await getJsonFromBunny(`articles/${r.slug}.json`)
        : await getQueuedFromBunny(r.slug);
      if (!j || !j.body) continue;
      const matches = j.body.match(/href="\/articles\/[^"]+"/g) || [];
      const n = matches.length;
      if (n >= 4) buckets['4+']++;
      else buckets[n]++;
      if (n < 3 && lowSamples.length < 25) lowSamples.push({ slug: r.slug, n, status: r.status });
    } catch (e) {
      // ignore
    }
    if (idx % 100 === 0 && idx > 0) console.log(`  ${idx}/${rows.length}`);
  }
}

await Promise.all(Array.from({ length: 20 }, (_, k) => worker(k)));
console.log('Internal-link distribution:', buckets);
console.log('Sample low-link articles:', lowSamples);
await c.end();
