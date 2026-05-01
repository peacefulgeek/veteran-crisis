import mysql from 'mysql2/promise';

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export async function getConn() {
  const url = new URL(process.env.DATABASE_URL);
  return mysql.createConnection({
    host: url.hostname,
    port: +url.port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });
}

export async function countArticles(conn) {
  const [rows] = await conn.query(
    `SELECT status, COUNT(*) AS n FROM articles GROUP BY status`,
  );
  const out = { total: 0, queued: 0, published: 0 };
  for (const r of rows) {
    out[r.status] = Number(r.n);
    out.total += Number(r.n);
  }
  return out;
}

export async function insertArticle(conn, a) {
  const sql = `INSERT INTO articles
    (slug, title, metaDescription, body, tldr, category, tags, author,
     heroUrl, heroAlt, wordCount, readingTime, asinsUsed, internalLinksUsed,
     status, queuedAt, publishedAt, openerType, conclusionType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      metaDescription = VALUES(metaDescription),
      body = VALUES(body),
      tldr = VALUES(tldr),
      heroUrl = COALESCE(VALUES(heroUrl), heroUrl),
      heroAlt = COALESCE(VALUES(heroAlt), heroAlt),
      wordCount = VALUES(wordCount),
      readingTime = VALUES(readingTime),
      asinsUsed = VALUES(asinsUsed),
      internalLinksUsed = VALUES(internalLinksUsed),
      status = VALUES(status),
      publishedAt = VALUES(publishedAt),
      lastModifiedAt = CURRENT_TIMESTAMP`;
  await conn.query(sql, [
    a.slug,
    a.title,
    a.metaDescription || '',
    a.body,
    a.tldr || null,
    a.category || 'General',
    JSON.stringify(a.tags || []),
    a.author || 'The Oracle Lover',
    a.heroUrl || null,
    a.heroAlt || a.title,
    a.wordCount || 0,
    a.readingTime || 8,
    JSON.stringify(a.asinsUsed || []),
    JSON.stringify(a.internalLinksUsed || []),
    a.status || 'queued',
    a.queuedAt || new Date(),
    a.publishedAt || null,
    a.openerType || 'gut-punch',
    a.conclusionType || 'reflection',
  ]);
}

function safeJSON(v, fallback) {
  if (v == null) return fallback;
  if (Array.isArray(v) || typeof v === 'object') return v;
  if (typeof v !== 'string') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

export async function pickRelated(conn, exceptSlug, take = 6) {
  const [rows] = await conn.query(
    `SELECT slug, title, category, tags FROM articles WHERE slug != ? ORDER BY RAND() LIMIT ?`,
    [exceptSlug || '', take],
  );
  return rows.map(r => ({
    slug: r.slug,
    title: r.title,
    category: r.category,
    tags: safeJSON(r.tags, []),
  }));
}

export async function listPublishedDates(conn) {
  const [rows] = await conn.query(
    `SELECT DATE(publishedAt) AS d, COUNT(*) AS n
       FROM articles
      WHERE status='published' AND publishedAt IS NOT NULL
      GROUP BY DATE(publishedAt)
      ORDER BY d`,
  );
  return rows.map(r => ({ date: r.d, count: Number(r.n) }));
}
