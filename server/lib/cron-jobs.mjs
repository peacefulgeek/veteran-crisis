import cron from 'node-cron';
import { getConn, insertArticle, slugify, pickRelated, countArticles } from './articles-db.mjs';
import { writeArticle } from './article-writer.mjs';
import { runQualityGate } from './article-quality-gate.mjs';
import { assignHeroImage } from './bunny.mjs';
import { verifyAsin } from './amazon-verify.mjs';
import { buildSeedTopics } from './seed-topics.mjs';

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
}

async function runSitemapPing() {
  const conn = await getConn();
  try {
    const url = `https://theveteranshift.com/sitemap.xml`;
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
  // Boot-time health beacon so /api/cron-status shows life immediately
  setTimeout(() => runHealthBeacon().catch(console.error), 5_000);
  console.log('[cron] 5 crons scheduled (top-up, publish, sitemap-ping, asin-health, health-beacon)');
}

export const _internal = { runTopUpQueue, runPublishOne, runSitemapPing, runAsinHealthCheck, runHealthBeacon };
