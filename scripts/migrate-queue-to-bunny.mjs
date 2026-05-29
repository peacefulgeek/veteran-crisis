// Round 19: one-shot migration. Walk every status='queued' article in MySQL,
// write its JSON payload to Bunny at queue-3f7a2c8b9d/{slug}.json, then NULL
// the body column so the DB only carries a pointer row.
//
// Idempotent: re-running just re-uploads + re-nulls. The DB pointer row stays.
// Safe to run while the publish cron is paused (and the publish cron only
// fires Mon-Fri 09:00 MT anyway).

import { getConn } from '../server/lib/articles-db.mjs';
import { putQueuedToBunny } from '../server/lib/bunny-queue.mjs';

const BATCH = 8;
const NULL_BODY = process.env.NULL_BODY !== 'false'; // default true

async function main() {
  const conn = await getConn();
  try {
    const [rows] = await conn.query(
      `SELECT id, slug, title, metaDescription, body, tldr, category, tags,
              heroUrl, heroAlt, ogImage, author, asinsUsed, internalLinksUsed,
              wordCount, readingTime, queuedAt
         FROM articles WHERE status='queued' ORDER BY id ASC`,
    );
    console.log(`[migrate] found ${rows.length} queued articles`);

    let ok = 0;
    let fail = 0;
    const queue = [...rows];

    async function worker() {
      while (queue.length) {
        const r = queue.shift();
        if (!r) break;
        try {
          // Re-hydrate JSON-shaped columns
          const tags = (() => {
            try { return Array.isArray(r.tags) ? r.tags : JSON.parse(r.tags || '[]'); } catch { return []; }
          })();
          const asinsUsed = (() => {
            try { return Array.isArray(r.asinsUsed) ? r.asinsUsed : JSON.parse(r.asinsUsed || '[]'); } catch { return []; }
          })();
          const internalLinksUsed = (() => {
            try { return Array.isArray(r.internalLinksUsed) ? r.internalLinksUsed : JSON.parse(r.internalLinksUsed || '[]'); } catch { return []; }
          })();

          const payload = {
            slug: r.slug,
            title: r.title,
            metaDescription: r.metaDescription,
            body: r.body,
            tldr: r.tldr,
            category: r.category,
            tags,
            heroUrl: r.heroUrl,
            heroAlt: r.heroAlt,
            ogImage: r.ogImage,
            author: r.author,
            asinsUsed,
            internalLinksUsed,
            wordCount: r.wordCount,
            readingTime: r.readingTime,
            queuedAt: r.queuedAt,
          };

          await putQueuedToBunny(r.slug, payload);

          if (NULL_BODY) {
            await conn.query(`UPDATE articles SET body=NULL WHERE id=? AND status='queued'`, [r.id]);
          }
          ok++;
          if (ok % 25 === 0) console.log(`[migrate] ${ok}/${rows.length} done`);
        } catch (e) {
          fail++;
          console.error(`[migrate] FAIL ${r.slug}:`, e.message || e);
        }
      }
    }

    await Promise.all(Array.from({ length: BATCH }, () => worker()));
    console.log(`[migrate] complete: ok=${ok} fail=${fail}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('[migrate] fatal:', e);
  process.exit(1);
});
