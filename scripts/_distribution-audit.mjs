import 'dotenv/config';
import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);

const [days] = await c.query("SELECT DATE(publishedAt) d, COUNT(*) n FROM articles WHERE status='published' GROUP BY DATE(publishedAt) ORDER BY d");
const counts = days.map(r => r.n);
console.log('distinct days:', days.length, '| max/day:', Math.max(...counts), '| min/day:', Math.min(...counts));
console.log('day-by-day:', counts.join(','));

const [statuses] = await c.query("SELECT status, COUNT(*) n FROM articles GROUP BY status");
console.log('queue:', statuses.map(r => `${r.status}:${r.n}`).join(' | '));

const [bl] = await c.query("SELECT COUNT(*) n FROM articles WHERE body LIKE '%theoraclelover.com%'");
const [tot] = await c.query("SELECT COUNT(*) n FROM articles");
console.log(`oraclelover backlinks: ${bl[0].n}/${tot[0].n} = ${(bl[0].n / tot[0].n * 100).toFixed(1)}%`);

await c.end();
process.exit(0);
