#!/usr/bin/env node
// Round 15 security purge: delete every queued/draft article JSON that may
// already exist on Bunny CDN. Only `status='published'` slugs should ever
// have a public articles/<slug>.json. Idempotent — safe to re-run.
import { getConn } from '../server/lib/articles-db.mjs';
import { deleteFromBunny } from '../server/lib/bunny.mjs';

const t0 = Date.now();
const conn = await getConn();
const [rows] = await conn.query(
  `SELECT slug, status FROM articles WHERE status <> 'published'`,
);
console.log(`[purge] found ${rows.length} non-published rows to verify against Bunny`);

let deleted = 0;
let already = 0;
let failed = 0;
const CONCURRENCY = 8;
const queue = [...rows];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const r = queue.shift();
    if (!r) break;
    try {
      const status = await deleteFromBunny(`articles/${r.slug}.json`);
      if (status === 404) already++;
      else deleted++;
      if ((deleted + already) % 50 === 0) {
        console.log(`[purge] progress deleted=${deleted} 404=${already} fail=${failed}`);
      }
    } catch (err) {
      failed++;
      console.warn(`[purge] FAIL ${r.slug}: ${err.message}`);
    }
  }
}));

await conn.end();
console.log(`[purge] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — deleted=${deleted}, already-missing=${already}, failed=${failed}`);
