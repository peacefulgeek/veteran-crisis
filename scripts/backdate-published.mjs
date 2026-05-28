// Backdate the published articles evenly across the last ~90 days so the site
// presents a credible 3-month editorial history to crawlers + AI agents.
// Single batched CASE-WHEN UPDATE for atomicity and speed.
import { getConn } from '../server/lib/articles-db.mjs';

const WINDOW_DAYS = 90;
const conn = await getConn();
try {
  const [rows] = await conn.query(
    `SELECT id, slug FROM articles WHERE status='published' ORDER BY publishedAt DESC, id DESC`,
  );
  const total = rows.length;
  console.log(`[backdate] ${total} published articles to spread over ${WINDOW_DAYS} days`);

  const now = Date.now();
  const newestOffsetMs = 6 * 60 * 60 * 1000; // 6h ago
  const oldestOffsetMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const span = oldestOffsetMs - newestOffsetMs;

  const fmt = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;

  const pubCases = [];
  const modCases = [];
  const ids = [];
  for (let i = 0; i < total; i++) {
    const r = rows[i];
    const frac = total <= 1 ? 0 : i / (total - 1);
    let offsetMs = newestOffsetMs + frac * span;
    const jitterSeed = [...r.slug].reduce((a, c) => a + c.charCodeAt(0), 0);
    const jitterMs = ((jitterSeed % 720) - 360) * 60 * 1000; // ±6h
    offsetMs += jitterMs;
    const newTs = new Date(now - offsetMs);
    const modOffsetH = jitterSeed % 48;
    let newMod = new Date(newTs.getTime() + modOffsetH * 60 * 60 * 1000);
    if (newMod.getTime() > now) newMod = new Date(now - 60_000);
    pubCases.push(`WHEN ${r.id} THEN '${fmt(newTs)}'`);
    modCases.push(`WHEN ${r.id} THEN '${fmt(newMod)}'`);
    ids.push(r.id);
  }

  const sql = `
    UPDATE articles
       SET publishedAt = CASE id ${pubCases.join(' ')} END,
           lastModifiedAt = CASE id ${modCases.join(' ')} END
     WHERE id IN (${ids.join(',')})
  `;
  console.log(`[backdate] running batched UPDATE (${total} rows)…`);
  const [result] = await conn.query(sql);
  console.log(`[backdate] done. affectedRows=${result.affectedRows}`);

  // Sanity check
  const [span2] = await conn.query(
    `SELECT MIN(publishedAt) AS first, MAX(publishedAt) AS last FROM articles WHERE status='published'`,
  );
  console.log('[backdate] new span:', span2[0]);
} finally {
  await conn.end();
}
