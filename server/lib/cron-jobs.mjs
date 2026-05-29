import cron from 'node-cron';
import { getConn, countArticles } from './articles-db.mjs';
import { runQualityGate } from './article-quality-gate.mjs';
import { putToBunny, putJsonToBunny, assignHeroImage, getJsonFromBunny } from './bunny.mjs';
import { getQueuedFromBunny, deleteQueuedFromBunny } from './bunny-queue.mjs';
import { verifyAsin } from './amazon-verify.mjs';
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

// Round 18: the entire publishing flow is two crons.
//   1. runPublishOne  — 1 article per weekday (Mon-Fri 09:00 MT), promotes the
//      oldest queued article to published. When the queue is empty, it logs
//      'queue-empty' and exits cleanly. No fallback generation — when the 500
//      bulk-seeded articles are exhausted, the cron simply stops doing anything.
//   2. runQuarterlyRefresh — nightly quality-gate sweep over every published
//      article. Failures are logged so the operator can decide what to do.
//
// All bulk article generation is a one-shot offline job (scripts/bulk-seed.mjs)
// run by hand. There is no auto-top-up cron and there will not be one.
async function runPublishOne() {
  // Round 19 flow:
  //   1. Pick oldest queued DB row (status='queued', ordered by queuedAt).
  //   2. Fetch full draft JSON from Bunny at queue-{prefix}/{slug}.json.
  //   3. Stamp publishedAt + reassign hero image (final, slug-keyed).
  //   4. Write final JSON to articles/{slug}.json on Bunny (public).
  //   5. Delete the queue copy on Bunny.
  //   6. Update DB row: status='published', publishedAt=NOW(), heroUrl=final.
  //   7. Trigger runPublishToBunny to rebuild articles/index.json + sitemap + feed.
  // If queue is empty: log 'queue-empty' and exit. No regeneration, ever.
  const conn = await getConn();
  let pickedSlug = null;
  try {
    const [rows] = await conn.query(
      `SELECT id, slug, title, category FROM articles WHERE status='queued' ORDER BY queuedAt ASC LIMIT 1`,
    );
    if (rows.length === 0) {
      await logRun(conn, 'publish-one', 'skipped', 'queue-empty');
      return;
    }
    const a = rows[0];
    pickedSlug = a.slug;

    // 2. Pull the queued draft from Bunny.
    const draft = await getQueuedFromBunny(a.slug);
    if (!draft) {
      await logRun(
        conn,
        'publish-one',
        'error',
        `queue-miss slug=${a.slug} (no JSON on Bunny at queue prefix)`,
      );
      return;
    }

    // 3. Final hero (slug-keyed). assignHeroImage is idempotent + caches.
    const heroUrl = await assignHeroImage(a.slug, a.title || a.category || '');

    // 4. Write the public article JSON.
    const publishedAtIso = new Date().toISOString();
    const finalPayload = {
      ...draft,
      slug: a.slug,
      heroUrl,
      heroAlt: draft.heroAlt || a.title,
      status: 'published',
      publishedAt: publishedAtIso,
      lastModifiedAt: publishedAtIso,
      _queued: undefined,
      _queuedAt: undefined,
    };
    delete finalPayload._queued;
    delete finalPayload._queuedAt;
    await putJsonToBunny(`articles/${a.slug}.json`, finalPayload);

    // 5. Delete the queue copy.
    try {
      await deleteQueuedFromBunny(a.slug);
    } catch (e) {
      // Non-fatal: the next purge sweep can clean up. Log so it's visible.
      console.warn('[publish-one] queue-delete failed (non-fatal):', a.slug, e.message);
    }

    // 6. DB row: mark published, stash hero, record body length so the
    //    quarterly-refresh job can still gate on word count.
    await conn.query(
      `UPDATE articles SET status='published', publishedAt=NOW(),
              lastModifiedAt=NOW(), heroUrl=?, body=NULL WHERE id=?`,
      [heroUrl, a.id],
    );

    await logRun(conn, 'publish-one', 'ok', `slug=${a.slug}`);
  } catch (e) {
    await logRun(
      conn,
      'publish-one',
      'error',
      `${pickedSlug ? `slug=${pickedSlug} ` : ''}${String(e.message || e)}`,
    );
  } finally {
    await conn.end();
  }
  // 7. Rebuild the public index + sitemap + feed.
  try { await runPublishToBunny(); } catch (e) { console.error('[publish-to-bunny] post-publish run failed:', e); }
}

// ── Bunny publisher: regenerates articles/index.json, articles/{slug}.json,
//    feeds/sitemap.xml, feeds/feed.xml on Bunny CDN. Runs after every publish
//    and on a 6-hour cadence so the public CDN is always within minutes of DB.
async function runPublishToBunny() {
  const conn = await getConn();
  try {
    // Round 19: bodies no longer live in DB. Pull published rows for metadata,
    // then for the feed body merge in body text from Bunny articles/{slug}.json.
    const [all] = await conn.query(
      `SELECT id, slug, title, metaDescription, category, tags, heroUrl, heroAlt, ogImage,
              author, status, queuedAt, publishedAt, lastModifiedAt, readingTime, wordCount
         FROM articles WHERE status='published'
         ORDER BY publishedAt DESC, id ASC`,
    );
    const safe = (v) => { if (v == null) return []; if (Array.isArray(v) || typeof v === 'object') return v; if (typeof v !== 'string') return []; try { return JSON.parse(v); } catch { return []; } };
    const decorated = all.map(r => ({ ...r, tags: safe(r.tags) }));

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

    // 2. Per-article JSON — Round 19: each article's full body already lives at
    // articles/{slug}.json on Bunny (written by runPublishOne). This loop is now
    // a metadata-refresh pass that re-stamps lastModifiedAt + ensures the JSON
    // exists. If a JSON is missing (e.g. backfill), we skip and log so the
    // operator can re-run scripts/seed-bunny-json.mjs.
    let perOk = 0;
    let perMiss = 0;
    const CONCURRENCY = 8;
    const queue = [...decorated];
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const r = queue.shift();
        if (!r) break;
        try {
          const existing = await getJsonFromBunny(`articles/${r.slug}.json`);
          if (!existing || !existing.body) { perMiss++; continue; }
          const merged = {
            ...existing,
            // Refresh metadata fields from the DB pointer row.
            heroUrl: r.heroUrl || existing.heroUrl,
            heroAlt: r.heroAlt || existing.heroAlt,
            publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : existing.publishedAt,
            lastModifiedAt: r.lastModifiedAt ? new Date(r.lastModifiedAt).toISOString() : (existing.lastModifiedAt || existing.publishedAt),
            readingTime: r.readingTime || existing.readingTime,
            wordCount: r.wordCount || existing.wordCount,
          };
          await putJsonToBunny(`articles/${r.slug}.json`, merged);
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

    // 4. feed.xml (RSS 2.0, top 30). Bodies fetched from Bunny so we don't
    //    need to round-trip through MySQL for full text.
    const top30 = decorated.slice(0, 30);
    const bodyByslug = new Map();
    await Promise.all(top30.map(async r => {
      try {
        const j = await getJsonFromBunny(`articles/${r.slug}.json`);
        if (j && j.body) bodyByslug.set(r.slug, j.body);
      } catch {}
    }));
    const escape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const cdata = (s) => `<![CDATA[${String(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
    const rfc822 = (d) => new Date(d || Date.now()).toUTCString();
    const newest = top30.reduce((acc, r) => Math.max(acc, new Date(r.lastModifiedAt || r.publishedAt || 0).getTime()), 0);
    const items = top30.map(r => {
      const url = `${SITE.baseUrl}/articles/${r.slug}`;
      const enclosure = r.heroUrl ? `<enclosure url="${escape(r.heroUrl)}" type="image/webp" length="0" />` : '';
      return ['<item>', `<title>${escape(r.title)}</title>`, `<link>${escape(url)}</link>`, `<guid isPermaLink="true">${escape(url)}</guid>`, `<pubDate>${rfc822(r.publishedAt)}</pubDate>`, `<atom:updated>${new Date(r.lastModifiedAt || r.publishedAt || Date.now()).toISOString()}</atom:updated>`, `<dc:creator>${escape(r.author || SITE.author)}</dc:creator>`, r.category ? `<category>${escape(r.category)}</category>` : '', `<description>${cdata(r.metaDescription || '')}</description>`, `<content:encoded>${cdata(bodyByslug.get(r.slug) || '')}</content:encoded>`, enclosure, '</item>'].filter(Boolean).join('');
    }).join('\n');
    const feedXml = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">', '<channel>', `<title>${escape(SITE.name)}</title>`, `<link>${escape(SITE.baseUrl)}</link>`, `<atom:link href="${escape(SITE.baseUrl)}/feed.xml" rel="self" type="application/rss+xml" />`, `<description>${escape(SITE.oneLine || '')}</description>`, '<language>en-us</language>', `<lastBuildDate>${rfc822(newest || Date.now())}</lastBuildDate>`, '<generator>Veteran Crisis Editorial Engine</generator>', items, '</channel>', '</rss>'].join('\n');
    await putToBunny('feeds/feed.xml', feedXml, 'application/rss+xml; charset=utf-8', 'public, max-age=300');

    await logRun(conn, 'publish-to-bunny', 'ok', `pub-index(${decorated.length})+${perOk}/${decorated.length} per-article(missing=${perMiss})+sitemap+feed`);
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
      `SELECT id, slug, title, metaDescription FROM articles WHERE status='published'`,
    );
    let pass = 0;
    let fail = 0;
    const failures = [];
    for (const r of rows) {
      // Round 19: body lives on Bunny, not in DB.
      let body = '';
      try {
        const j = await getJsonFromBunny(`articles/${r.slug}.json`);
        body = (j && j.body) || '';
      } catch {}
      const result = runQualityGate(body);
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

  // Editorial: 1 article per weekday at 09:00 America/Denver. Cron expression
  // '0 9 * * 1-5' = at minute 0 of hour 9 on Mon-Fri. When the queue is empty
  // the job logs 'queue-empty' and does nothing else. No fallback generation.
  cron.schedule('0 9 * * 1-5', () => runPublishOne().catch(console.error), { timezone: TZ });

  // Editorial: nightly quality-gate sweep over every published article.
  cron.schedule('0 4 * * *', () => runQuarterlyRefresh().catch(console.error), { timezone: TZ });

  // Operational (kept — these don't generate content):
  //   Refresh Bunny-cached JSON/XML every 6h so the public CDN never drifts.
  cron.schedule('15 */6 * * *', () => runPublishToBunny().catch(console.error), { timezone: TZ });
  //   Sitemap ping (Google + Bing) once per day.
  cron.schedule('30 2 * * *', () => runSitemapPing().catch(console.error), { timezone: TZ });
  //   ASIN health check — verify Amazon affiliate links still resolve.
  cron.schedule('30 3 * * *', () => runAsinHealthCheck().catch(console.error), { timezone: TZ });
  //   Health beacon every 30 minutes for observability.
  cron.schedule('*/30 * * * *', () => runHealthBeacon().catch(console.error), { timezone: TZ });

  // Boot-time: log a beacon + push the latest article state to Bunny so a
  // Railway redeploy lands with a fresh CDN.
  setTimeout(() => runHealthBeacon().catch(console.error), 5_000);
  setTimeout(() => runPublishToBunny().catch(console.error), 10_000);

  console.log(
    '[cron] 6 crons scheduled (publish-one Mon-Fri 09:00 MT, quarterly-refresh, publish-to-bunny, sitemap-ping, asin-health, health-beacon)',
  );
}

export const _internal = { runPublishOne, runSitemapPing, runAsinHealthCheck, runHealthBeacon, runPublishToBunny, runQuarterlyRefresh };
