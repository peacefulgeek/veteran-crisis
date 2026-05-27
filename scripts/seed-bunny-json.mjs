#!/usr/bin/env node
// Standalone seeder: pushes ALL 500 articles to Bunny CDN as JSON.
// - articles/index.json       → published only (public API redirects here)
// - articles/all-index.json   → every status (admin visibility into the 469 gated)
// - articles/{slug}.json      → one file per article, all 500
// - feeds/sitemap.xml         → published only
// - feeds/feed.xml            → top 30 published
import { getConn } from '../server/lib/articles-db.mjs';
import { putToBunny, putJsonToBunny } from '../server/lib/bunny.mjs';
import { SITE } from '../server/lib/site-config.mjs';

const t0 = Date.now();
const conn = await getConn();

console.log('[seed-bunny] querying ALL articles (every status)...');
const [all] = await conn.query(
  `SELECT id, slug, title, metaDescription, body, category, tags, heroUrl, heroAlt, ogImage,
          author, status, queuedAt, publishedAt, lastModifiedAt, readingTime, wordCount
     FROM articles ORDER BY publishedAt IS NULL, publishedAt DESC, id ASC`,
);
console.log(`[seed-bunny] got ${all.length} rows`);

const safe = (v) => { if (v == null) return []; if (Array.isArray(v) || typeof v === 'object') return v; if (typeof v !== 'string') return []; try { return JSON.parse(v); } catch { return []; } };
const decoratedAll = all.map(r => ({ ...r, tags: safe(r.tags) }));
const decorated = decoratedAll.filter(r => r.status === 'published');

const byStatus = decoratedAll.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
console.log('[seed-bunny] by status:', byStatus);

// 1a. Public index (published only)
const indexPayload = {
  generatedAt: new Date().toISOString(),
  total: decorated.length,
  articles: decorated.map(r => ({
    slug: r.slug, title: r.title, metaDescription: r.metaDescription,
    category: r.category, tags: r.tags, heroUrl: r.heroUrl, heroAlt: r.heroAlt,
    author: r.author, publishedAt: r.publishedAt, readingTime: r.readingTime,
  })),
};
console.log('[seed-bunny] uploading articles/index.json ...');
console.log('[seed-bunny]   →', await putJsonToBunny('articles/index.json', indexPayload));

// 1b. Admin index (every row, lightweight)
const adminIndexPayload = {
  generatedAt: new Date().toISOString(),
  total: decoratedAll.length,
  byStatus,
  articles: decoratedAll.map(r => ({
    id: r.id, slug: r.slug, title: r.title, status: r.status,
    category: r.category, tags: r.tags, heroUrl: r.heroUrl,
    author: r.author, queuedAt: r.queuedAt, publishedAt: r.publishedAt,
    lastModifiedAt: r.lastModifiedAt, readingTime: r.readingTime,
  })),
};
console.log('[seed-bunny] uploading articles/all-index.json ...');
console.log('[seed-bunny]   →', await putJsonToBunny('articles/all-index.json', adminIndexPayload));

// 2. Per-article JSON for ALL 500 — parallel upload
let perOk = 0;
let perFail = 0;
const CONCURRENCY = 10;
const queue = [...decoratedAll];
const total = queue.length;
await Promise.all(Array.from({ length: CONCURRENCY }, async (_, workerId) => {
  while (queue.length) {
    const r = queue.shift();
    if (!r) break;
    try {
      await putJsonToBunny(`articles/${r.slug}.json`, r);
      perOk++;
      if (perOk % 25 === 0 || perOk === total) {
        console.log(`[seed-bunny] per-article ${perOk}/${total} (ok=${perOk}, fail=${perFail})`);
      }
    } catch (err) {
      perFail++;
      console.warn(`[seed-bunny] FAIL ${r.slug}: ${err.message}`);
    }
  }
}));

// 3. sitemap.xml (published only)
const today = new Date().toISOString().slice(0, 10);
const staticPaths = ['/', '/articles', '/about', '/recommended', '/privacy', '/disclosures', '/contact', `/author/${SITE.authorSlug}`];
const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...staticPaths.map(p => `<url><loc>${SITE.baseUrl}${p}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`),
  ...decorated.map(r => {
    const lm = r.lastModifiedAt ? new Date(r.lastModifiedAt).getTime() : 0;
    const pb = r.publishedAt ? new Date(r.publishedAt).getTime() : 0;
    const stamp = Math.max(lm, pb) || Date.now();
    const d = new Date(stamp).toISOString().slice(0, 10);
    return `<url><loc>${SITE.baseUrl}/articles/${r.slug}</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
  }),
  '</urlset>',
].join('\n');
console.log('[seed-bunny] uploading feeds/sitemap.xml ...');
console.log('[seed-bunny]   →', await putToBunny('feeds/sitemap.xml', sitemapXml, 'application/xml; charset=utf-8'));

// 4. feed.xml (top 30 published)
const top30 = decorated.slice(0, 30);
const escape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const cdata = (s) => `<![CDATA[${String(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const rfc822 = (d) => new Date(d || Date.now()).toUTCString();
const newest = top30.reduce((acc, r) => Math.max(acc, new Date(r.lastModifiedAt || r.publishedAt || 0).getTime()), 0);
const items = top30.map(r => {
  const url = `${SITE.baseUrl}/articles/${r.slug}`;
  const enclosure = r.heroUrl ? `<enclosure url="${escape(r.heroUrl)}" type="image/webp" length="0" />` : '';
  return ['<item>', `<title>${escape(r.title)}</title>`, `<link>${escape(url)}</link>`, `<guid isPermaLink="true">${escape(url)}</guid>`, `<pubDate>${rfc822(r.publishedAt)}</pubDate>`, `<atom:updated>${new Date(r.lastModifiedAt || r.publishedAt || Date.now()).toISOString()}</atom:updated>`, `<dc:creator>${escape(r.author || SITE.author)}</dc:creator>`, r.category ? `<category>${escape(r.category)}</category>` : '', `<description>${cdata(r.metaDescription || '')}</description>`, `<content:encoded>${cdata(r.body || '')}</content:encoded>`, enclosure, '</item>'].filter(Boolean).join('');
}).join('\n');
const feedXml = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">', '<channel>', `<title>${escape(SITE.name)}</title>`, `<link>${escape(SITE.baseUrl)}</link>`, `<atom:link href="${escape(SITE.baseUrl)}/feed.xml" rel="self" type="application/rss+xml" />`, `<description>${escape(SITE.oneLine || '')}</description>`, '<language>en-us</language>', `<lastBuildDate>${rfc822(newest || Date.now())}</lastBuildDate>`, '<generator>Veteran Crisis Editorial Engine</generator>', items, '</channel>', '</rss>'].join('\n');
console.log('[seed-bunny] uploading feeds/feed.xml ...');
console.log('[seed-bunny]   →', await putToBunny('feeds/feed.xml', feedXml, 'application/rss+xml; charset=utf-8'));

await conn.end();
console.log(`[seed-bunny] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — per-article ok=${perOk}/${total}, fail=${perFail}, byStatus=${JSON.stringify(byStatus)}`);
