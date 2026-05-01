// Round 4 phase 2: distribute 12 natural anchor-text variants across the
// 500 byline asides (one per article) so the link profile to
// theoraclelover.com reads as organic editorial linking, not boilerplate.
//
// Strategy:
//   - Each article gets exactly ONE bio-card-mid aside containing exactly TWO
//     theoraclelover.com hyperlinks: one wrapping the author name "The Oracle
//     Lover" (the EEAT author signal) and one wrapping a varied anchor (the
//     editorial signal). The pen-name anchor is intentionally consistent.
//   - The varied anchor cycles through 12 natural-sounding phrases, balanced
//     across the corpus by article-id modulo. No two consecutive articles
//     (by id) carry the same varied anchor.
//   - We REUSE the 4 blurb structures already written, but inject the chosen
//     varied anchor into the second link slot of each blurb.

import 'dotenv/config';
import mysql from 'mysql2/promise';

const SITE_AUTHOR = 'The Oracle Lover';
const ORACLE = 'https://theoraclelover.com';

// 12 natural editorial anchors. They read like real linking, not SEO bait.
const VARIED_ANCHORS = [
  'theoraclelover.com',
  'her long-form essays',
  'her main body of work',
  'the inner companion to this site',
  'her writing on devotion and identity',
  'her decade of essays at theoraclelover.com',
  'the deeper conversation',
  'her essays on the long return home',
  'her writing on devotion',
  'the sister site to this one',
  'her notebook on identity and recovery',
  'her writing at theoraclelover.com',
];

// Author-name anchor (kept consistent for EEAT, no variation here).
const NAME_ANCHOR = (n) => `<strong><a href="${ORACLE}" target="_blank" rel="noopener">${n}</a></strong>`;
const VARIED_ANCHOR = (txt) => `<a href="${ORACLE}" target="_blank" rel="noopener">${txt}</a>`;

// 4 blurb structures, each with a {NAME} and {VARIED} placeholder.
const TEMPLATES = [
  ({name, varied}) =>
    `${name} writes the long-form work behind this site at ${varied}, a quiet, fiercely honest body of writing about identity, devotion, and the slow work of becoming yourself again. Veterans, spouses, and the people who love them have been finding their way through her pages for years. If anything in this article opened something in you, that is where the deeper conversation continues.`,
  ({name, varied}) =>
    `This piece is part of a larger conversation ${name} has been holding for years at ${varied}. Her work sits at the intersection of devotion, identity, and the long return home, the exact territory most veterans walk after the uniform comes off. If this site is the practical map, the inner one is hers.`,
  ({name, varied}) =>
    `${name} is the writer behind ${varied}, where she has been mapping the inner work of transition, devotion, and self-recovery for the better part of a decade. Veteran Crisis is her plainspoken sister project for the people who served and the people who love them. The two sites together are the full picture: the inner shift and the outer one.`,
  ({name, varied}) =>
    `If this article landed somewhere tender, that is on purpose. ${name} writes the deeper companion work at ${varied}. Essays on devotion, identity, and how a person actually rebuilds a life from the inside out. Read a few pieces there alongside the practical work here. They are written for each other.`,
];

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.query("SELECT id, body FROM articles ORDER BY id ASC");
console.log('articles to update:', rows.length);

// Build the rotation order: shuffle anchors per group of 12 so adjacent
// articles never collide, but every anchor still appears 500/12 ≈ 42 times.
function rotationFor(id) {
  // Deterministic rotation: picks anchor index from a Latin-square-ish pattern
  // that guarantees no two consecutive articles share an anchor.
  const groupOffset = Math.floor(id / 12) * 7; // 7 is coprime to 12
  return VARIED_ANCHORS[(id + groupOffset) % VARIED_ANCHORS.length];
}

const oldAsideRe = /<aside\s+class="bio-card-mid"[^>]*>[\s\S]*?<\/aside>\s*/g;
let updated = 0;
const dist = Object.fromEntries(VARIED_ANCHORS.map(a => [a, 0]));

for (const r of rows) {
  const tpl = TEMPLATES[r.id % TEMPLATES.length];
  const variedText = rotationFor(r.id);
  dist[variedText]++;
  const blurb = tpl({
    name: NAME_ANCHOR(SITE_AUTHOR),
    varied: VARIED_ANCHOR(variedText),
  });
  const newAside = `<aside class="bio-card-mid" data-bio-mid="true" data-eeat="author-blurb">\n<p>${blurb}</p>\n</aside>\n`;

  let newBody;
  if (r.body.match(oldAsideRe)) {
    newBody = r.body.replace(oldAsideRe, newAside);
  } else {
    const parts = r.body.split('<h2>');
    if (parts.length < 5) continue;
    parts.splice(5, 0, newAside + '<h2>');
    newBody = parts.join('<h2>').replace('<h2><h2>', '<h2>');
  }
  if (newBody !== r.body) {
    await c.query("UPDATE articles SET body = ? WHERE id = ?", [newBody, r.id]);
    updated++;
  }
}

console.log(`updated: ${updated}/${rows.length}`);
console.log('anchor distribution:');
for (const [a, n] of Object.entries(dist)) {
  console.log(`  ${String(n).padStart(3)} × "${a}"`);
}

// Verify: no two consecutive ids share the same anchor
const [verify] = await c.query("SELECT id, body FROM articles ORDER BY id ASC");
let consecutiveCollisions = 0;
let prev = null;
for (const r of verify) {
  const m = r.body.match(/<aside class="bio-card-mid"[\s\S]*?<a [^>]+>([^<]+)<\/a>\s*\.[\s\S]*?<a [^>]+>([^<]+)<\/a>/);
  // Pull all theoraclelover.com link anchor texts, take the second one
  const all = [...r.body.matchAll(/<aside class="bio-card-mid"[\s\S]*?<\/aside>/g)][0]?.[0] || '';
  const anchors = [...all.matchAll(/>([^<]+)<\/a>/g)].map(x => x[1]);
  const second = anchors[1];
  if (prev && second === prev) consecutiveCollisions++;
  prev = second;
}
console.log(`consecutive collisions: ${consecutiveCollisions} (target 0)`);

await c.end();
process.exit(0);
