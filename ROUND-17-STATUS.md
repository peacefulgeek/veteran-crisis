# Round 17 — BacklinkWebsites Final Pass: Status Report

Generated: 2026-05-28

## Summary

The Veteran Crisis (veterancrisis.com) has completed the BacklinkWebsites Final Pass. All public-facing content reads from Bunny CDN with no database on the hot path. Article generation is now Claude-first with a deterministic fallback chain. AI/LLM discoverability files are live for 25 named crawlers. The published library spans the prior 90 days with 34 articles and a 466-article queue ready for daily publication.

## Status Table

| Area | Status | Detail |
|------|--------|--------|
| Writing engine: Claude primary | FIXED | `article-writer.mjs` tries `claude-sonnet-4-5-20250929` first, falls back to OpenAI/DeepSeek, then template; 56/56 vitest green including a live Claude API test |
| `CLAUDE_API_KEY` in sandbox | FIXED | Wired in dev env; **operator action: add to Railway environment variables before next deploy** |
| Em-dash sweep | FIXED | Removed across `template-article.mjs`, `prompts.mjs`, `supplements-catalog.mjs`, `assessments.mjs`, `site-routes.mjs`, `Author.tsx`, `Home.tsx`, `index.html` |
| Banned words/phrases gate | FIXED | `article-quality-gate.mjs` enforces full union list; published articles re-checked nightly via new quarterly-refresh cron |
| TL;DR + intro variants | FIXED | 12 TL;DR templates and 10 intro openers; all 500 articles retemplated |
| Author byline (The Oracle Lover) | VERIFIED | Present on all 34 published articles with `datetime` attribute matching `publishedAt` |
| JSON-on-Bunny architecture | VERIFIED | All public routes (`/api/articles`, `/api/articles/:slug`, `/sitemap.xml`, `/feed.xml`, `/llms.txt`, `/llms-full.txt`) read from `https://veteran-crisis.b-cdn.net`; database accessed only by crons + form submissions |
| `articleMetaInjector` | FIXED | Rewritten to fetch from Bunny CDN. Emits Article + BreadcrumbList + (conditional) FAQPage + SpeakableSpecification JSON-LD. Validated against GPTBot UA |
| `/llms.txt` | FIXED | Markdown manifest with editorial pillars + 50 most-recent articles; reads from Bunny |
| `/llms-full.txt` | FIXED | Full markdown index grouped by category, reads from Bunny `articles/index.json`; no longer 502s |
| `/robots.txt` | FIXED | 25 named AI/social crawlers allow-listed (GPTBot, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, OAI-SearchBot, ChatGPT-User, anthropic-ai, cohere-ai, Applebot, Applebot-Extended, Bytespider, CCBot, Diffbot, FacebookBot, facebookexternalhit, ImagesiftBot, meta-externalagent, Meta-ExternalFetcher, Omgilibot, PetalBot, Scrapy, Timpibot, YouBot, Amazonbot) plus sitemap + feed pointers |
| `/sitemap.xml` | VERIFIED | 302 to Bunny CDN; lists all 34 published articles with ISO-8601 `<lastmod>`, newest-first |
| `/feed.xml` | VERIFIED | RSS 2.0 with content:encoded + dc:creator + atom:link + lastBuildDate |
| Per-article JSON-LD (client) | VERIFIED | `ArticleDetail.tsx` emits Article (with SpeakableSpecification), BreadcrumbList, FAQPage when ≥2 Q/A pairs found, UTM-stripped canonical |
| Sitewide JSON-LD | VERIFIED | `client/index.html` includes Organization + WebSite (with SearchAction) |
| Article counts | VERIFIED | 34 published (target 30-100), 466 queued (target 400-500) |
| Backdating across 90 days | FIXED | All 34 published articles spread Feb 27 → May 28, 2026 with deterministic ±6h jitter; `lastModifiedAt` set to `publishedAt + 0–48h` |
| SOVRN code | VERIFIED CLEAN | Zero references in code or in 34 published article bodies |
| paulwagner.com leakage | VERIFIED CLEAN | Zero references in code or in 34 published article bodies |
| Newsletter signup | FIXED | `/api/newsletter` endpoint accepts validated email, logs to `cron_runs`. No SOVRN, no third-party form |
| Quarterly refresh cron | FIXED | `runQuarterlyRefresh` runs nightly at 04:00 in TZ; sweeps every published article through `runQualityGate`; logs pass/fail counts to `cron_runs` |
| Tests | VERIFIED | 56/56 vitest passing (auth.logout, claude-client live, master-scope §1A-§33) |
| Manus dependencies | VERIFIED CLEAN | None in runtime code |
| Amazon affiliate tag | VERIFIED | `spankyspinola-20` enforced in `site-config.mjs`; quality gate accepts `/dp/` and `/s?k=` |

## Deferred (low-priority, not blocking)

| Item | Reason |
|------|--------|
| HowTo JSON-LD on instructional articles | Deferred — adds value but requires per-article step structure detection; current Article + BreadcrumbList + FAQPage is sufficient for AEO |
| AboutPage JSON-LD on `/about` | Deferred — page needs content audit first |
| CollectionPage + ItemList JSON-LD on `/articles` | Deferred — index page already crawl-friendly via sitemap |
| Person JSON-LD on `/author/the-oracle-lover` | Deferred — author URL already linked in Article JSON-LD `author.url` |

## Live URLs validated

```
GET https://veterancrisis.com/robots.txt              → 200, 25 AI crawlers
GET https://veterancrisis.com/sitemap.xml             → 302 → Bunny, 34 entries
GET https://veterancrisis.com/feed.xml                → 302 → Bunny, RSS 2.0
GET https://veterancrisis.com/llms.txt                → 200, markdown manifest
GET https://veterancrisis.com/llms-full.txt           → 200, full markdown index
GET https://veterancrisis.com/api/articles            → 200, JSON proxy of Bunny index
GET https://veterancrisis.com/api/articles/<slug>     → 200, JSON proxy of per-slug Bunny file
GET https://veterancrisis.com/articles/<slug> (UA: GPTBot) → 200 with full SSR head + JSON-LD
```

## Operator actions required

1. **Add `CLAUDE_API_KEY` to Railway environment variables.** The sandbox has it; production article generation will fall back to OpenAI/template until Railway is updated.
2. Optional: purge Bunny edge cache for fresh content (`scripts/purge-bunny-edge-cache.mjs` requires `BUNNY_ACCOUNT_API_KEY`).

## Files changed this round

- `server/lib/site-routes.mjs` — full rewrite of `articleMetaInjector`, `/llms.txt`, `/llms-full.txt`, `/robots.txt`; added `/api/newsletter`; legacy DB handlers preserved for tests
- `server/lib/cron-jobs.mjs` — added `runQuarterlyRefresh` cron
- `server/lib/article-writer.mjs` — Claude → OpenAI → template fallback chain
- `server/lib/claude-client.mjs` — new Anthropic SDK wrapper
- `server/lib/template-article.mjs` — 12 TL;DR + 10 intro variants, em-dashes removed
- `server/lib/article-quality-gate.mjs` — banned union enforced; accepts `/s?k=` Amazon URLs
- `client/src/pages/ArticleDetail.tsx` — UTM-strip canonical, Article + Breadcrumb + FAQ + Speakable JSON-LD
- `client/src/pages/Author.tsx`, `Home.tsx`, `client/index.html` — em-dashes removed; Organization + WebSite JSON-LD added
- `scripts/seed-bunny-json.mjs`, `scripts/retemplate-all-articles.mjs`, `scripts/backdate-published.mjs`, `scripts/check-dates.mjs`
- `server/master-scope.test.ts` — 56 tests
- `todo.md` — Round 17 items completed
- `ROUND-17-AUDIT.md` — initial audit
- `ROUND-17-STATUS.md` — this report
