import { getConn } from '../server/lib/articles-db.mjs';
const conn = await getConn();
const [byDate] = await conn.query(
  `SELECT DATE(publishedAt) AS d, COUNT(*) AS n FROM articles WHERE status='published' GROUP BY d ORDER BY d DESC`,
);
console.log('Published by date:');
for (const r of byDate) console.log(' ', r.d, '→', r.n);
const [counts] = await conn.query(`SELECT status, COUNT(*) AS n FROM articles GROUP BY status`);
console.log('By status:', counts);
const [span] = await conn.query(
  `SELECT MIN(publishedAt) AS first, MAX(publishedAt) AS last FROM articles WHERE status='published'`,
);
console.log('Span:', span[0]);
await conn.end();
