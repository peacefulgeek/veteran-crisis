import mysql from 'mysql2/promise';
const u = new URL(process.env.DATABASE_URL);
const c = await mysql.createConnection({
  host: u.hostname, port: +u.port,
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: u.pathname.slice(1), ssl: { rejectUnauthorized: true },
});
await c.query('TRUNCATE TABLE articles');
console.log('truncated articles');
await c.end();
process.exit(0);
