// Backfill: inject a 2-3 sentence TheOracleLover.com author blurb into every
// existing article body, replacing the old bio-card-mid block.
import 'dotenv/config';
import mysql from 'mysql2/promise';

const SITE_AUTHOR = 'The Oracle Lover';
const SITE_URL = 'https://theoraclelover.com';

const BLURBS = [
  `<strong><a href="${SITE_URL}" target="_blank" rel="noopener">${SITE_AUTHOR}</a></strong> writes the long-form work behind this site at <a href="${SITE_URL}" target="_blank" rel="noopener">theoraclelover.com</a>, a quiet, fiercely honest body of writing about identity, devotion, and the slow work of becoming yourself again. Veterans, spouses, and the people who love them have been finding their way through her pages for years. If anything in this article opened something in you, that is where the deeper conversation continues.`,
  `This piece is part of a larger conversation <strong><a href="${SITE_URL}" target="_blank" rel="noopener">${SITE_AUTHOR}</a></strong> has been holding for years at <a href="${SITE_URL}" target="_blank" rel="noopener">theoraclelover.com</a>. Her work sits at the intersection of devotion, identity, and the long return home, the exact territory most veterans walk after the uniform comes off. If this site is the practical map, theoraclelover.com is the inner one.`,
  `<strong><a href="${SITE_URL}" target="_blank" rel="noopener">${SITE_AUTHOR}</a></strong> is the writer behind <a href="${SITE_URL}" target="_blank" rel="noopener">theoraclelover.com</a>, where she has been mapping the inner work of transition, devotion, and self-recovery for the better part of a decade. Veteran Crisis is her plainspoken sister project for the people who served and the people who love them. The two sites together are the full picture: the inner shift and the outer one.`,
  `If this article landed somewhere tender, that is on purpose. <strong><a href="${SITE_URL}" target="_blank" rel="noopener">${SITE_AUTHOR}</a></strong> writes the deeper companion work at <a href="${SITE_URL}" target="_blank" rel="noopener">theoraclelover.com</a>. Essays on devotion, identity, and how a person actually rebuilds a life from the inside out. Read a few pieces there alongside the practical work here. They are written for each other.`,
];

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.query("SELECT id, body FROM articles");
console.log('articles to backfill:', rows.length);

const oldAsideRe = /<aside\s+class="bio-card-mid"[^>]*>[\s\S]*?<\/aside>\s*/g;
let updated = 0;
let skipped = 0;
for (const r of rows) {
  const blurb = BLURBS[r.id % BLURBS.length];
  const newAside = `<aside class="bio-card-mid" data-bio-mid="true" data-eeat="author-blurb">\n<p>${blurb}</p>\n</aside>\n`;
  let newBody;
  if (oldAsideRe.test(r.body)) {
    newBody = r.body.replace(oldAsideRe, newAside);
    oldAsideRe.lastIndex = 0; // reset for the .test()/replace combo
  } else {
    // No existing bio-card-mid -> inject after 4th <h2> closing block
    const parts = r.body.split('<h2>');
    if (parts.length < 5) {
      skipped++;
      continue;
    }
    parts.splice(5, 0, newAside + '<h2>');
    newBody = parts.join('<h2>').replace('<h2><h2>', '<h2>');
  }
  if (newBody !== r.body) {
    await c.query("UPDATE articles SET body = ? WHERE id = ?", [newBody, r.id]);
    updated++;
  }
}

console.log(`updated: ${updated}, skipped: ${skipped}`);

// Verify: count articles whose body now contains the canonical theoraclelover.com link
const [verify] = await c.query("SELECT COUNT(*) n FROM articles WHERE body LIKE '%theoraclelover.com%'");
console.log(`articles with theoraclelover.com link: ${verify[0].n}/500`);

await c.end();
process.exit(0);
