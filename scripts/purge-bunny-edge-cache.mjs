#!/usr/bin/env node
// Round 15 follow-up: edge-cache purge for the 467 queued-slug URLs that
// were already pulled into the Bunny CDN edge before the source-side fix.
// Storage origin is already clean (purge-bunny-queued-jsons.mjs deleted them
// in Round 15), but Bunny pull-zone Cache-Control is `public, max-age=2592000`
// so without an explicit purge the edge will keep serving the cached copies
// for up to 30 days.
//
// Requires the Bunny ACCOUNT API key (different from the per-storage-zone
// AccessKey). Get yours at https://dash.bunny.net/account/api-key and export:
//   export BUNNY_ACCOUNT_API_KEY=...
//
// Usage:  BUNNY_ACCOUNT_API_KEY=... node scripts/purge-bunny-edge-cache.mjs
import { getConn } from '../server/lib/articles-db.mjs';
import { SITE } from '../server/lib/site-config.mjs';

const ACCOUNT_KEY = process.env.BUNNY_ACCOUNT_API_KEY;
if (!ACCOUNT_KEY) {
  console.error(`[edge-purge] BUNNY_ACCOUNT_API_KEY not set.

This script needs the Bunny ACCOUNT API key (the global one from
https://dash.bunny.net/account/api-key), NOT the per-storage-zone AccessKey.

Export it and re-run, e.g.:
  export BUNNY_ACCOUNT_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  node scripts/purge-bunny-edge-cache.mjs

Without an account key the only alternative is to lower the Bunny pull-zone
"Cache Expiration Time" in the dashboard (Pull Zone → Caching), which forces
the edge to revalidate against the now-clean storage origin within minutes.
`);
  process.exit(1);
}

const t0 = Date.now();
const conn = await getConn();
const [rows] = await conn.query(
  `SELECT slug FROM articles WHERE status <> 'published'`,
);
console.log(`[edge-purge] queued+draft slugs to purge: ${rows.length}`);

let ok = 0;
let fail = 0;
const CONCURRENCY = 6;
const queue = [...rows];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const r = queue.shift();
    if (!r) break;
    const url = `${SITE.bunnyPullZone}/articles/${encodeURIComponent(r.slug)}.json`;
    try {
      const res = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(url)}`, {
        method: 'POST',
        headers: { AccessKey: ACCOUNT_KEY },
      });
      if (res.ok) ok++; else { fail++; console.warn(`[edge-purge] FAIL ${r.slug} → ${res.status}`); }
    } catch (err) {
      fail++;
      console.warn(`[edge-purge] FAIL ${r.slug}: ${err.message}`);
    }
    if ((ok + fail) % 50 === 0) console.log(`[edge-purge] progress ok=${ok} fail=${fail}`);
  }
}));

await conn.end();
console.log(`[edge-purge] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ok=${ok}, fail=${fail}`);
