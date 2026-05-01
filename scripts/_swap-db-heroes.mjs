// Swap every articles.heroUrl in DB from Unsplash/old-bunny to the live veteran-crisis Bunny zone.
import { getConn } from '../server/lib/articles-db.mjs';
import { SITE } from '../server/lib/site-config.mjs';
import { HERO_LIBRARY } from '../server/lib/bunny.mjs';

const PULL = SITE.bunnyPullZone; // https://veteran-crisis.b-cdn.net

function bunnyForIdx(i) {
  return `${PULL}/library/lib-${String(i + 1).padStart(2, '0')}.webp`;
}

const c = await getConn();
const [rows] = await c.query("SELECT id, slug, heroUrl, tags, title FROM articles");
let updated = 0;
for (const r of rows) {
  // pick deterministic by slug hash so same article keeps same image
  let h = 0;
  for (const ch of r.slug) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const idx = ((h % HERO_LIBRARY.length) + HERO_LIBRARY.length) % HERO_LIBRARY.length;
  const newUrl = bunnyForIdx(idx);
  if (r.heroUrl !== newUrl) {
    await c.query("UPDATE articles SET heroUrl=? WHERE id=?", [newUrl, r.id]);
    updated++;
  }
}
console.log(`updated heroUrl for ${updated} of ${rows.length} articles`);
await c.end();
process.exit(0);
