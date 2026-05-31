#!/usr/bin/env node
// Sample N article hero images from Bunny and verify each returns 200 + image/webp.
import { getConn } from '../server/lib/articles-db.mjs';

async function main() {
  const conn = await getConn();
  const [rows] = await conn.query(
    `SELECT id, slug, heroUrl FROM articles WHERE heroUrl IS NOT NULL ORDER BY RAND() LIMIT 20`,
  );
  let ok = 0, bad = 0, missing = 0;
  for (const r of rows) {
    if (!r.heroUrl) { missing++; continue; }
    try {
      const res = await fetch(r.heroUrl, { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('image/webp')) {
        ok++;
        console.log(`OK   id=${r.id}  ${r.heroUrl}`);
      } else {
        bad++;
        console.log(`BAD  id=${r.id}  ${res.status} ${type}  ${r.heroUrl}`);
      }
    } catch (e) {
      bad++;
      console.log(`ERR  id=${r.id}  ${e.message}  ${r.heroUrl}`);
    }
  }
  console.log(`\nsample 20 -> ok=${ok} bad=${bad} missing=${missing}`);
  await conn.end();
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
