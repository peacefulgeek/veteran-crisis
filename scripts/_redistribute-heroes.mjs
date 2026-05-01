// Redistribute hero URLs across all 500 articles using new topic routing.
// Optimized: groups article ids by target URL and runs one UPDATE per URL.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { libraryUrl } from '../server/lib/bunny.mjs';

const TOPIC_ROUTES = [
  { match: /(family|spouse|marriage|kids|children|partner|relationship|love)/i, indexes: [1, 13, 25, 37, 9, 21, 33] },
  { match: /(career|job|resume|interview|hire|work|leadership|salary|civilian (?:work|job))/i, indexes: [2, 14, 26, 38] },
  { match: /(gi bill|school|college|certificate|degree|education|study|tuition|class|campus)/i, indexes: [3, 15, 27, 39] },
  { match: /(sleep|fitness|gym|run|move|body|nutrition|workout|exercise|morning routine)/i, indexes: [4, 16, 28] },
  { match: /(mentor|coach|guide|advice from)/i, indexes: [5, 17, 29] },
  { match: /(community|tribe|veteran service|nonprofit|brotherhood|sisterhood|peer|support group)/i, indexes: [6, 18, 30] },
  { match: /(faith|meaning|purpose|spiritual|grief|loss|reflection|journal|writing|story|identity)/i, indexes: [7, 19, 31, 0, 12, 24, 36] },
  { match: /(workshop|craft|build|woodwork|garden|repair|hands|trade|skilled)/i, indexes: [8, 20, 32] },
  { match: /(outdoor|hike|trail|nature|forest|mountain|adventure|fishing|hunting)/i, indexes: [0, 12, 24, 36] },
  { match: /(va |health|therapy|ptsd|trauma|moral injury|crisis|mental health|counsel)/i, indexes: [10, 22, 34, 11, 23, 35] },
  { match: /(money|finance|budget|disability|benefit|claim|paperwork|appeal|denial)/i, indexes: [10, 22, 34] },
  { match: /(first year|civilian life|coming home|transition|culture shock|coming back|day one|reintegration|new chapter|starting over|boots)/i, indexes: [11, 23, 35, 0, 12, 24, 36] },
];
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0; return Math.abs(h); }
function pickIdx(title) {
  const t = title.toLowerCase();
  for (const r of TOPIC_ROUTES) if (r.match.test(t)) return r.indexes[hashStr(title) % r.indexes.length];
  return hashStr(title) % 40;
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query('SELECT id, title FROM articles');
console.log('articles:', rows.length);

const groups = new Map(); // url -> [ids]
for (const a of rows) {
  const url = libraryUrl(pickIdx(a.title) + 1);
  if (!groups.has(url)) groups.set(url, []);
  groups.get(url).push(a.id);
}

let updated = 0;
for (const [url, ids] of groups) {
  await conn.query('UPDATE articles SET heroUrl = ? WHERE id IN (?)', [url, ids]);
  updated += ids.length;
}
console.log('updated', updated, 'across', groups.size, 'distinct slots');
await conn.end();
process.exit(0);
