import cron from 'node-cron';
import { getConn, insertArticle, slugify, pickRelated, countArticles } from './articles-db.mjs';
import { writeArticle } from './article-writer.mjs';
import { runQualityGate } from './article-quality-gate.mjs';
import { assignHeroImage, putToBunny, putJsonToBunny } from './bunny.mjs';
import { verifyAsin } from './amazon-verify.mjs';
import { buildSeedTopics } from './seed-topics.mjs';
import { SITE } from './site-config.mjs';

const TZ = 'America/Denver';

async function logRun(conn, job, status, detail) {
  try {
    await conn.query(
      `INSERT INTO cron_runs (job, finishedAt, status, detail) VALUES (?, NOW(), ?, ?)`,
      [job, status, (detail || '').slice(0, 65000)],
    );
  } catch {}
}

async function runTopUpQueue() {
  const conn = await getConn();
  try {
    const c = await countArticles(conn);
    if (c.queued >= 470) return logRun(conn, 'top-up-queue', 'skipped', `queued=${c.queued}`);
    const need = Math.min(470 - c.queued, 6);
    const topics = buildSeedTopics();
    const [existing] = await conn.query(`SELECT slug FROM articles`);
    const have = new Set(existing.map(r => r.slug));
    let added = 0;
    for (const t of topics) {
      if (added >= need) break;
      const slug = slugify(t.title);
      if (have.has(slug)) continue;
      const related = await pickRelated(conn, slug, 6);
      const include = Math.random() < 0.23;
      const out = await writeArticle({
        topic: t.title, category: t.category, tags: t.tags,
        relatedArticles: related,
        openerType: ['gut-punch', 'question', 'story', 'counterintuitive'][Math.floor(Math.random() * 4)],
        conclusionType: ['cta', 'reflection', 'question', 'challenge', 'benediction'][Math.floor(Math.random() * 5)],
        includeBacklink: include,
      });
      const gate = runQualityGate(out.body, { minWords: 1200, maxWords: 2500 });
      const heroUrl = await assignHeroImage(slug);
      await insertArticle(conn, {
        slug, title: t.title, metaDescription: t.title.slice(0, 300),
        body: out.body, tldr: '', category: t.category, tags: t.tags,
        author: 'The Oracle Lover', heroUrl, heroAlt: t.title,
        wordCount: gate.signals.words,
        readingTime: Math.max(5, Math.round(gate.signals.words / 230)),
        asinsUsed: out.productsUsed, internalLinksUsed: out.internalLinksUsed,
        status: 'queued',
      });
      added++;
    }
    await logRun(conn, 'top-up-queue', 'ok', `added=${added}`);
  } catch (e) {
    await logRun(conn, 'top-up-queue', 'error', String(e.stack || e.message || e));
  } finally { await conn.end(); }
}

async function runPublishOne() {
  const conn = await getConn();
  try {
    const hour = new Date().toLocaleString('en-US', { timeZone: TZ, hour: '2-digit', hour12: false });
    const h = parseInt(hour, 10);
    if (h < 6 || h >= 19) return logRun(conn, 'publish-one', 'skipped', `hour=${h}`);
    // 100-cap removed (Round 13). Cron will continue promoting queued articles
    // until the queue is empty. Per-day limit (~4) still applies, see below.
    const [todayRows] = await conn.query(
      `SELECT COUNT(*) AS n FROM articles
        WHERE status='published'
          AND DATE(CONVERT_TZ(publishedAt, '+00:00', '-06:00'))
              = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))`,
    );
    if (Number(todayRows[0].n) >= 4) return logRun(conn, 'publish-one', 'skipped', `already=${todayRows[0].n}`);
    const [rows] = await conn.query(
      `SELECT id, slug FROM articles WHERE status='queued' ORDER BY queuedAt ASC LIMIT 1`,
    );
    if (rows.length === 0) return logRun(conn, 'publish-one', 'skipped', 'queue-empty');
    const a = rows[0];
    await conn.query(`UPDATE articles SET status='published', publishedAt=NOW() WHERE id=?`, [a.id]);
    await logRun(conn, 'publish-one', 'ok', `slug=${a.slug}`);
  } catch (e) { await logRun(conn, 'publish-one', 'error', String(e.message || e)); }
  finally { await conn.end(); }
  // Re-publish JSON+XML to Bunny so the public CDN reflects the new state.
  // Done outside the conn try/finally so a Bunny hiccup never blocks publishing.
  try { await runPublishToBunny(); } catch (e) { console.error('[publish-to-bunny] post-publish run failed:', e); }
}

// ── Bunny publisher: regenerates articles/index.json, articles/{slug}.json,
//    feeds/sitemap.xml, feeds/feed.xml on Bunny CDN. Runs after every publish
//    and on a 6-hour cadence so the public CDN is always within minutes of DB.
async function runPublishToBunny() {
  const conn = await getConn();
  try {
    // Pull ALL articles regardless of status so every one of the 500 has a JSON
    // on Bunny. Public surfaces still filter to status='published'.
    const [all] = await conn.query(
      `SELECT id, slug, title, metaDescription, body, category, tags, heroUrl, heroAlt, ogImage,
              author, status, queuedAt, publishedAt, lastModifiedAt, readingTime, wordCount
         FROM articles ORDER BY publishedAt IS NULL, publishedAt DESC, id ASC`,
    );
    const safe = (v) => { if (v == null) return []; if (Array.isArray(v) || typeof v === 'object') return v; if (typeof v !== 'string') return []; try { return JSON.parse(v); } catch { return []; } };
    const decoratedAll = all.map(r => ({ ...r, tags: safe(r.tags) }));
    const decorated = decoratedAll.filter(r => r.status === 'published');

    // 1a. Public index JSON — only published rows, used by /api/articles
    const indexPayload = {
      generatedAt: new Date().toISOString(),
      total: decorated.length,
      articles: decorated.map(r => ({
        slug: r.slug, title: r.title, metaDescription: r.metaDescription,
        category: r.category, tags: r.tags, heroUrl: r.heroUrl, heroAlt: r.heroAlt,
        author: r.author, publishedAt: r.publishedAt, readingTime: r.readingTime,
      })),
    };
    await putJsonToBunny('articles/index.json', indexPayload);
    // (Round 14) Admin all-index removed: never publish total/byStatus library size to a public CDN.
    // Admins query MySQL directly when they need the queue overview.

    // 2. Per-article JSON — PUBLISHED ONLY. Queued slugs MUST NOT be uploaded
    // to the public CDN: that would let crawlers and any visitor enumerate the
    // queue, leaking library size and unfinished drafts. Admin tooling must
    // query MySQL directly for queued content (Round 15 security fix).
    let perOk = 0;
    const CONCURRENCY = 8;
    const queue = [...decorated];
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const r = queue.shift();
        if (!r) break;
        try {
          await putJsonToBunny(`articles/${r.slug}.json`, r);
          perOk++;
        } catch (err) {
          console.warn('[publish-to-bunny] per-article failed', r.slug, err.message);
        }
      }
    }));

    // 3. sitemap.xml
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
    await putToBunny('feeds/sitemap.xml', sitemapXml, 'application/xml; charset=utf-8', 'public, max-age=300');

    // 4. feed.xml (RSS 2.0, top 30)
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
    await putToBunny('feeds/feed.xml', feedXml, 'application/rss+xml; charset=utf-8', 'public, max-age=300');

    await logRun(conn, 'publish-to-bunny', 'ok', `pub-index(${decorated.length})+${perOk}/${decorated.length} per-article(published-only)+sitemap+feed`);
  } catch (e) {
    await logRun(conn, 'publish-to-bunny', 'error', String(e.stack || e.message || e));
  } finally { await conn.end(); }
}

async function runSitemapPing() {
  const conn = await getConn();
  try {
    const url = `https://veterancrisis.com/sitemap.xml`;
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`).catch(() => null);
    await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(url)}`).catch(() => null);
    await logRun(conn, 'sitemap-ping', 'ok', url);
  } catch (e) { await logRun(conn, 'sitemap-ping', 'error', String(e.message || e)); }
  finally { await conn.end(); }
}

async function runAsinHealthCheck() {
  const conn = await getConn();
  try {
    const [rows] = await conn.query(`SELECT asin FROM asin_cache ORDER BY lastChecked ASC LIMIT 5`);
    let ok = 0, bad = 0;
    for (const { asin } of rows) {
      const r = await verifyAsin(asin);
      await conn.query(`UPDATE asin_cache SET status=?, lastChecked=NOW() WHERE asin=?`,
        [r.valid ? 'valid' : 'invalid', asin]);
      r.valid ? ok++ : bad++;
    }
    await logRun(conn, 'asin-health-check', 'ok', `ok=${ok} bad=${bad}`);
  } catch (e) { await logRun(conn, 'asin-health-check', 'error', String(e.message || e)); }
  finally { await conn.end(); }
}

async function runHealthBeacon() {
  const conn = await getConn();
  try {
    const c = await countArticles(conn);
    await logRun(conn, 'health-beacon', 'ok', `total=${c.total} queued=${c.queued} published=${c.published}`);
  } catch (e) { await logRun(conn, 'health-beacon', 'error', String(e.message || e)); }
  finally { await conn.end(); }
}

// Quarterly refresh: walk every PUBLISHED article through the quality gate to
// catch any drift introduced by gate hardening over time. Articles that fail
// the gate get a 'needs-refresh' flag in cron_runs.detail so the operator (or
// a future top-up worker) can regenerate them via the Claude-first writer.
// Runs once per day at 04:00 — "quarterly" in editorial intent, not in cron
// frequency: cheap enough to run nightly, fail-fast on first issue.
async function runQuarterlyRefresh() {
  const conn = await getConn();
  try {
    const [rows] = await conn.query(
      `SELECT id, slug, title, body, metaDescription FROM articles WHERE status='published'`,
    );
    let pass = 0;
    let fail = 0;
    const failures = [];
    for (const r of rows) {
      const result = runQualityGate(r.body || '');
      if (result && result.failures && result.failures.length === 0) {
        pass++;
      } else {
        fail++;
        const fl = (result?.failures || ['unknown-failure']).slice(0, 2).join('|');
        failures.push(`${r.slug}:${fl}`);
      }
    }
    const detail =
      `pass=${pass} fail=${fail}` +
      (failures.length ? ` first-failures=${failures.slice(0, 5).join(';').slice(0, 400)}` : '');
    await logRun(conn, 'quarterly-refresh', fail === 0 ? 'ok' : 'partial', detail);
  } catch (e) {
    await logRun(conn, 'quarterly-refresh', 'error', String(e.message || e));
  } finally {
    await conn.end();
  }
}

export function startCrons({ enabled } = {}) {
  // Default ON. Only AUTO_GEN_ENABLED="false" disables.
  const explicitlyOff = process.env.AUTO_GEN_ENABLED === 'false';
  if (explicitlyOff || enabled === false) {
    console.log('[cron] disabled (AUTO_GEN_ENABLED=false)');
    return;
  }
  cron.schedule('0 */6 * * *', () => runTopUpQueue().catch(console.error), { timezone: TZ });
  cron.schedule('0 7,11,15,19 * * *', () => runPublishOne().catch(console.error), { timezone: TZ });
  cron.schedule('30 2 * * *', () => runSitemapPing().catch(console.error), { timezone: TZ });
  cron.schedule('30 3 * * *', () => runAsinHealthCheck().catch(console.error), { timezone: TZ });
  cron.schedule('*/30 * * * *', () => runHealthBeacon().catch(console.error), { timezone: TZ });
  // Refresh Bunny-cached JSON/XML every 6 hours (in addition to post-publish run).
  cron.schedule('15 */6 * * *', () => runPublishToBunny().catch(console.error), { timezone: TZ });
  // Quarterly refresh: nightly quality-gate sweep over every published article.
  cron.schedule('0 4 * * *', () => runQuarterlyRefresh().catch(console.error), { timezone: TZ });
  // Boot-time health beacon + initial Bunny push so the CDN is in sync after a Railway redeploy.
  setTimeout(() => runHealthBeacon().catch(console.error), 5_000);
  setTimeout(() => runPublishToBunny().catch(console.error), 10_000);
  console.log('[cron] 7 crons scheduled (top-up, publish, sitemap-ping, asin-health, health-beacon, publish-to-bunny, quarterly-refresh)');
}

export const _internal = { runTopUpQueue, runPublishOne, runSitemapPing, runAsinHealthCheck, runHealthBeacon, runPublishToBunny, runQuarterlyRefresh };
