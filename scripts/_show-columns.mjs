import 'dotenv/config';
import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [r] = await c.query('SHOW COLUMNS FROM articles');
console.log(r.map(x => x.Field).join(', '));
await c.end();
process.exit(0);
