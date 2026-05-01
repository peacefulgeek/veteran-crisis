// Reassign hero URLs for every article using the topic-aware library.
import { getConn } from '../server/lib/articles-db.mjs';
import { assignHeroImage } from '../server/lib/bunny.mjs';

const conn = await getConn();
const [rows] = await conn.query('SELECT id, slug, title FROM articles');
let n = 0;
for (const r of rows) {
  const url = await assignHeroImage(r.slug, r.title);
  await conn.query('UPDATE articles SET heroUrl=?, heroAlt=? WHERE id=?', [url, r.title, r.id]);
  n++;
  if (n % 50 === 0) console.log(`refreshed ${n}/${rows.length}`);
}
console.log(`refreshed ${n} hero URLs`);
await conn.end();
process.exit(0);
