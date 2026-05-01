import 'dotenv/config';
import mysql from 'mysql2/promise';

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [need] = await c.query(
  "SELECT id, slug FROM articles WHERE status='published' AND (ogImage IS NULL OR ogImage = '')"
);
console.log(`articles still missing ogImage: ${need.length}`);
let n = 0;
for (const r of need) {
  const url = `https://veteran-crisis.b-cdn.net/og/${r.slug}.webp`;
  await c.query("UPDATE articles SET ogImage = ? WHERE id = ?", [url, r.id]);
  n++;
}
const [v] = await c.query("SELECT COUNT(*) n FROM articles WHERE status='published' AND ogImage IS NOT NULL AND ogImage <> ''");
const [t] = await c.query("SELECT COUNT(*) n FROM articles WHERE status='published'");
console.log(`updated: ${n}, total published with ogImage: ${v[0].n}/${t[0].n}`);
await c.end();
