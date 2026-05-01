import 'dotenv/config';
import mysql from 'mysql2/promise';
const url = process.env.DATABASE_URL;
console.log('DBURL set:', !!url);
if (!url) process.exit(1);
const c = await mysql.createConnection(url);
const [r] = await c.query(
  "UPDATE articles SET heroUrl = REPLACE(heroUrl, 'veteran-shift.b-cdn.net', 'veteran-crisis.b-cdn.net') WHERE heroUrl LIKE '%veteran-shift.b-cdn.net%'"
);
console.log('updated:', r.affectedRows);
const [v] = await c.query("SELECT COUNT(*) c FROM articles WHERE heroUrl LIKE '%veteran-crisis.b-cdn.net%'");
console.log('on new zone:', v[0].c);
await c.end();
