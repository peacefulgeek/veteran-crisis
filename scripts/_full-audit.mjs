// Sweeps every article in DB and reports EEAT/quality/banned-word stats
// per master scope §12B & §23.
import { getConn } from '../server/lib/articles-db.mjs';
import { runQualityGate } from '../server/lib/article-quality-gate.mjs';

const conn = await getConn();
const [rows] = await conn.query('SELECT slug, title, body, status, publishedAt, asinsUsed FROM articles');

let pass = 0, fail = 0;
let withBacklink = 0;
const failures = [];
const distribution = {};

for (const r of rows) {
  const gate = runQualityGate(r.body || '', { minWords: 1200, maxWords: 2500 });
  if (gate.passed) pass++;
  else { fail++; failures.push({ slug: r.slug, fails: gate.failures }); }
  if (/theoraclelover\.com/i.test(r.body || '')) withBacklink++;
  if (r.status === 'published') {
    const d = (r.publishedAt instanceof Date ? r.publishedAt : new Date(r.publishedAt)).toISOString().slice(0, 10);
    distribution[d] = (distribution[d] || 0) + 1;
  }
}

const totalPublished = rows.filter(r => r.status === 'published').length;
const totalQueued = rows.filter(r => r.status === 'queued').length;
const distributionDays = Object.keys(distribution).sort();
const maxPerDay = Math.max(...Object.values(distribution));
const minPerDay = Math.min(...Object.values(distribution));
const allOnOneDay = distributionDays.length === 1;

console.log(JSON.stringify({
  total: rows.length,
  published: totalPublished,
  queued: totalQueued,
  gatePassed: pass,
  gateFailed: fail,
  oraclelover_backlinks: `${withBacklink}/${rows.length} (${((withBacklink/rows.length)*100).toFixed(1)}%, target ~23%)`,
  publishedDistinctDays: distributionDays.length,
  publishedFirstDay: distributionDays[0],
  publishedLastDay: distributionDays[distributionDays.length - 1],
  maxPerDay,
  minPerDay,
  allOnOneDay,
  sampleFailures: failures.slice(0, 5),
}, null, 2));

await conn.end();
process.exit(0);
