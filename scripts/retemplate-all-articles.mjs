// Round 16: regenerate bodies for ALL 500 articles using the diversified
// template (12 TLDR variants + 10 intro variants + Amazon /s?k= search links).
// This kills the "every article opens with the same identity-problem boilerplate"
// problem and the dead-ASIN /dp/ links in the in-article product library.
//
// Idempotent: safe to re-run; updates body, wordCount, readingTime, asinsUsed,
// internalLinksUsed, lastModifiedAt. Status, slug, hero, etc. are untouched.

import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import { generateTemplateArticle } from '../server/lib/template-article.mjs';

function countWords(html) {
  return (html.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
}

const c = await createConnection(process.env.DATABASE_URL);

// Pull all rows we need to retemplate plus minimal per-article context.
const [rows] = await c.query(
  `SELECT id, slug, title, category, tags, openerType, conclusionType
   FROM articles ORDER BY id ASC`
);

// Build the relatedArticles pool once so internal-link selection has full set.
const relatedPool = rows.map(r => ({ slug: r.slug, title: r.title }));

let updated = 0, errors = 0;
const startedAt = Date.now();

for (const r of rows) {
  try {
    const tags = typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || []);
    // Exclude self from internal-link candidates.
    const related = relatedPool.filter(x => x.slug !== r.slug);
    const includeBacklink = (r.id % 100) < 23; // ~23% per master scope §11

    const out = generateTemplateArticle({
      topic: r.title,
      category: r.category,
      tags,
      relatedArticles: related,
      openerType: r.openerType || 'gut-punch',
      conclusionType: r.conclusionType || 'reflection',
      includeBacklink,
      today: new Date().toISOString().slice(0, 10),
    });

    const wc = countWords(out.body);
    const reading = Math.max(1, Math.round(wc / 220));

    await c.query(
      `UPDATE articles
       SET body = ?, wordCount = ?, readingTime = ?, asinsUsed = ?, internalLinksUsed = ?, lastModifiedAt = NOW()
       WHERE id = ?`,
      [
        out.body,
        wc,
        reading,
        JSON.stringify(out.productsUsed || []),
        JSON.stringify(out.internalLinksUsed || []),
        r.id,
      ]
    );
    updated++;
    if (updated % 50 === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`  [${updated}/${rows.length}] retemplated in ${elapsed}s`);
    }
  } catch (e) {
    errors++;
    console.error(`  ERROR on id=${r.id} slug=${r.slug}: ${e.message}`);
    if (errors > 10) {
      console.error('Too many errors, aborting.');
      break;
    }
  }
}

const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n✓ updated ${updated}/${rows.length} articles in ${totalSec}s (errors: ${errors})`);

// Quick TLDR-uniqueness verification.
const [check] = await c.query(
  `SELECT SUBSTRING_INDEX(SUBSTRING(body, LOCATE('<p>', body) + 3, 80), '.', 1) AS opener_8, COUNT(*) cnt
   FROM articles GROUP BY opener_8 ORDER BY cnt DESC LIMIT 6`
);
console.log('\nopener variant distribution (top 6):');
console.table(check);

await c.end();
