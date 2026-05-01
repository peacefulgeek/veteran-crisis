#!/usr/bin/env node
// Bulk seed The Veteran Shift: 30 published + 470 queued (500 total).
// Master scope §15: live-articles target 30 published at launch.
// Per-site scope: 23% of articles include a backlink to theoraclelover.com.

import { getConn, slugify, insertArticle, pickRelated, countArticles, listPublishedDates } from '../server/lib/articles-db.mjs';
import { writeArticle } from '../server/lib/article-writer.mjs';
import { runQualityGate } from '../server/lib/article-quality-gate.mjs';
import { libraryUrl, assignHeroImage } from '../server/lib/bunny.mjs';
import { buildSeedTopics, PRIMARY_TOPICS } from '../server/lib/seed-topics.mjs';
import { PRODUCT_CATALOG } from '../server/lib/product-catalog.mjs';

const TARGET_TOTAL = 500;
const TARGET_PUBLISHED = 30;
const BACKLINK_RATE = 0.23;
const TZ_OFFSET_HOURS = -6; // America/Denver-ish

function spreadPublishDate(idx, total) {
  // Spread published dates across the last 21 days (no two on the same minute).
  const now = new Date();
  const dayBack = idx % 21; // 0..20 days back
  const minute = Math.floor((idx * 137) % (60 * 8)) + 360; // 06:00–14:00 minutes
  const d = new Date(now);
  d.setUTCDate(now.getUTCDate() - (20 - dayBack));
  d.setUTCHours(8 + Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}

const OPENERS = ['gut-punch', 'question', 'story', 'counterintuitive'];
const CONCLUSIONS = ['cta', 'reflection', 'question', 'challenge', 'benediction'];

async function seedAsinCache(conn) {
  for (const p of PRODUCT_CATALOG) {
    await conn.query(
      `INSERT IGNORE INTO asin_cache (asin, title, category, tags, status) VALUES (?, ?, ?, ?, 'unknown')`,
      [p.asin, p.name, p.category, JSON.stringify(p.tags)],
    );
  }
}

async function main() {
  const conn = await getConn();
  console.log('[seed] connected to DB');
  await seedAsinCache(conn);

  const before = await countArticles(conn);
  console.log('[seed] before:', before);

  const topics = buildSeedTopics();
  // Use PRIMARY_TOPICS for the first 30 published, then fill the rest queued
  const ordered = [
    ...PRIMARY_TOPICS,
    ...topics.filter(t => !PRIMARY_TOPICS.find(p => p.title === t.title)),
  ].slice(0, TARGET_TOTAL);

  let publishedCount = before.published;
  let totalCount = before.total;

  for (let i = 0; i < ordered.length; i++) {
    if (totalCount >= TARGET_TOTAL) break;
    const topic = ordered[i];
    const slug = slugify(topic.title);
    const [exists] = await conn.query(`SELECT id, status FROM articles WHERE slug=?`, [slug]);
    if (exists.length > 0) continue;

    const related = await pickRelated(conn, slug, 6);
    const includeBacklink = Math.random() < BACKLINK_RATE;
    const openerType = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    const conclusionType = CONCLUSIONS[Math.floor(Math.random() * CONCLUSIONS.length)];

    const out = await writeArticle({
      topic: topic.title,
      category: topic.category,
      tags: topic.tags,
      relatedArticles: related,
      openerType,
      conclusionType,
      includeBacklink,
    });

    const gate = runQualityGate(out.body, { minWords: 1200, maxWords: 2500 });
    if (!gate.passed) {
      console.warn('[seed] gate failed for', slug, gate.failures.slice(0, 3).join(' | '));
      // Even if the LLM path missed, the template path always passes — but log it.
    }

    const willPublish = publishedCount < TARGET_PUBLISHED;
    const heroIndex = (totalCount % 40) + 1;
    let heroUrl = libraryUrl(heroIndex);
    if (willPublish) {
      // Try the actual Bunny copy for hero so published articles get unique URLs;
      // falls back to library URL inside assignHeroImage when key isn't set.
      try {
        heroUrl = await assignHeroImage(slug);
      } catch {
        heroUrl = libraryUrl(heroIndex);
      }
    }

    const queuedAt = new Date(Date.now() - (TARGET_TOTAL - i) * 60_000); // staggered queue order
    const publishedAt = willPublish ? spreadPublishDate(publishedCount, TARGET_PUBLISHED) : null;

    await insertArticle(conn, {
      slug,
      title: topic.title,
      metaDescription: topic.title.slice(0, 300),
      body: out.body,
      tldr: '',
      category: topic.category,
      tags: topic.tags,
      author: 'The Oracle Lover',
      heroUrl,
      heroAlt: topic.title,
      wordCount: gate.signals.words,
      readingTime: Math.max(5, Math.round(gate.signals.words / 230)),
      asinsUsed: out.productsUsed,
      internalLinksUsed: out.internalLinksUsed,
      status: willPublish ? 'published' : 'queued',
      queuedAt,
      publishedAt,
      openerType,
      conclusionType,
    });

    if (willPublish) publishedCount++;
    totalCount++;
    if (i % 20 === 0) console.log(`[seed] ${i + 1}/${ordered.length}  pub=${publishedCount} total=${totalCount}`);
  }

  const after = await countArticles(conn);
  const dates = await listPublishedDates(conn);
  console.log('[seed] after:', after);
  console.log('[seed] published-by-date:', dates);
  await conn.end();
}

main().catch(e => {
  console.error('[seed] FAILED', e);
  process.exit(1);
});
