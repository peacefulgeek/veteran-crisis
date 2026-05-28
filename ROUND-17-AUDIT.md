# Round 17 — BacklinkWebsites Final Pass: Audit Report

Date: 2026-05-28

## Verdict per scope item

| Item | State | Action |
|---|---|---|
| Writing engine on Claude | NO — currently OpenAI/DeepSeek client | Add Anthropic SDK + `claude-client.mjs`, route writer through it |
| `CLAUDE_API_KEY` secret | NO | Request via `webdev_request_secrets` |
| Em-dashes in source | YES — 25+ files contain `—` or `–` | Sweep + replace with `" - "` (or appropriate punctuation) |
| Banned words enforced | YES — 60+ words in `article-quality-gate.mjs` | Already aligned with §12A |
| Banned phrases enforced | YES — 50+ phrases | Already aligned |
| EEAT 6 signals | YES — TL;DR, byline, ≥3 internal, ≥1 .gov/.edu, lastUpdated, selfRef | Already aligned |
| Voice signals | YES — contractions, direct address, sentence variance | Already aligned |
| Quality gate regen loop | YES — 3 attempts before fallback | Aligned |
| Article body in DB | YES — `body: text` column | KEEP for now (DB is source of truth for crons); JSON-on-Bunny is the **read** path |
| `/api/articles` reads from Bunny JSON | YES — pure proxy, no DB | OK |
| `/api/articles/:slug` reads from Bunny JSON | YES — pure proxy | OK |
| `/sitemap.xml` from Bunny | YES — 302 redirect | OK |
| `/feed.xml` from Bunny | YES — 302 redirect | OK |
| `/robots.txt` lists AI crawlers | PARTIAL — only 4 named (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) | EXPAND to 18 named crawlers per spec |
| `/llms.txt` content | Stub markdown — not full per-article index | REWRITE to include every published article grouped by category, served from Bunny |
| `/llms-full.txt` | **502 Bad Gateway** — requires DB which doesn't exist on Railway | REWRITE to fetch from Bunny `articles/index.json` |
| Per-article SSR head | BROKEN — `articleMetaInjector` requires DB, silently no-ops in prod → crawlers get generic SPA shell with 0 JSON-LD blocks | REWRITE to fetch from Bunny |
| JSON-LD on /articles/:slug | Article + Person + Publisher only | EXPAND: BreadcrumbList, FAQPage (auto-extracted), HowTo (where applicable), SpeakableSpecification |
| WebSite + SearchAction on / | UNKNOWN — verify in client/index.html or SSR | ADD if missing |
| Organization JSON-LD sitewide | UNKNOWN | ADD |
| AboutPage on /about | UNKNOWN | ADD |
| CollectionPage + ItemList on /articles | UNKNOWN | ADD |
| Robots meta `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` | partial in injector | EXPAND |
| Canonical strips UTM/fbclid/gclid/mc_eid | UNKNOWN | VERIFY + fix |
| Backdate published_at across last 3 months | UNKNOWN — check distribution | VERIFY + redistribute if needed |
| Newsletter → JSON on Bunny | UNKNOWN — references in main.tsx + schema.ts | LOCATE + replace |
| SOVRN code | NONE — already clean | OK |
| Paul Wagner / paulwagner.com leakage | NONE in code | OK |
| Quarterly refresh cron via Claude | UNKNOWN — verify cron list | UPDATE |

## Hard blockers

1. **Per-article SSR head requires DB** — the most damaging single bug for AEO. AI crawlers see nothing.
2. **`/llms-full.txt` returns 502** — same root cause.
3. **`/sitemap.xml` is the only DB-free public route that "works" for crawlers** — but its 302 redirect to Bunny may confuse some crawlers.

## Plan execution order

1. Phase 2: Claude swap. Add `claude-client.mjs` wrapping Anthropic SDK, route `article-writer.mjs` through it. Request `CLAUDE_API_KEY`. Verify with one synthetic article generation that hits the gate.
2. Phase 3: Sitemap/llms.txt/llms-full.txt all on Bunny. Same generation cron now produces them.
3. Phase 4: Quality gate already aligned — no change unless regen reveals gaps.
4. Phase 5: Per-article SSR head from Bunny JSON. Add WebSite/Organization/Person/AboutPage/CollectionPage/ItemList JSON-LD. Add BreadcrumbList + FAQPage + HowTo per article.
5. Phase 6: `/llms.txt` proper markdown index served from Bunny. `/robots.txt` full crawler list.
6. Phase 7: Article counts + backdating verification.
7. Phase 8: Newsletter signup writes JSON to Bunny. SOVRN cleanup (already clean).
8. Phase 9: Quarterly refresh cron via Claude.
9. Phase 10: Final validation — vitest, GPTBot UA curl, schema validator.

## Em-dash sweep targets (25 files)

```
client/index.html
client/src/components/SiteChrome.tsx
client/src/pages/ArticleDetail.tsx
client/src/pages/Author.tsx
client/src/pages/Home.tsx
scripts/_build-og-local.mjs (one-shot, low priority)
scripts/_migrate-heroes-to-bunny.mjs (one-shot)
scripts/_reup-library.mjs (one-shot)
scripts/bulk-seed.mjs
scripts/seed-bunny-json.mjs
scripts/purge-bunny-queued-jsons.mjs
scripts/README.md
scripts/purge-bunny-edge-cache.mjs
server/_core/env.ts
server/_core/index.ts
server/lib/article-quality-gate.mjs
server/lib/assessments.mjs
server/lib/bunny.mjs
server/lib/cron-jobs.mjs
server/lib/prompts.mjs
server/lib/site-config.mjs
server/lib/site-routes.mjs
server/lib/supplements-catalog.mjs
server/lib/template-article.mjs
server/master-scope.test.ts
DEPLOY-RAILWAY.md
```

Em-dashes in **comments and tests** are fine (don't ship to users). But em-dashes in `template-article.mjs`, `prompts.mjs`, `assessments.mjs`, `supplements-catalog.mjs`, `cron-jobs.mjs`, and any client-rendered string are user-visible and must be replaced.
