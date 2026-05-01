# The Veteran Shift — Project TODO

## Foundation
- [x] Drizzle schema: articles + topics tables (status, queued, published, hero_url, asins_used, word_count, etc.)
- [x] Migration applied via webdev_execute_sql
- [x] todo.md tracker (this file)

## Hard Constraints (Master Scope §1A)
- [x] No Anthropic SDK / no @anthropic-ai/sdk anywhere
- [x] No Fal.ai / no FAL_KEY anywhere
- [x] No Cloudflare references
- [x] No WordPress
- [x] No Next.js
- [x] No Manus runtime references in any /src or /scripts code path used by the app
- [x] No images committed to repo (only public/favicon.svg allowed)

## Server / Infra (§7, §17)
- [x] WWW→apex 301 redirect as the FIRST middleware in Express
- [x] /health endpoint returns {"ok":true,…}
- [x] /sitemap.xml served (DB-driven, status='published')
- [x] /robots.txt allow-lists GPTBot, ClaudeBot, PerplexityBot, Google-Extended, plus default *
- [x] /llms.txt and /llms-full.txt served
- [x] /api/articles filtered to status='published'

## Writing Engine + Gate (§11, §12)
- [x] OpenAI client pointed at DeepSeek (OPENAI_API_KEY, OPENAI_BASE_URL)
- [x] Model deepseek-v4-pro (with safe model-disable when proxy rejects)
- [x] §12A union banned word list enforced
- [x] §12A union banned phrase list enforced
- [x] Em/en-dash zero tolerance
- [x] EEAT signals: TL;DR, byline, datetime, ≥3 internal links, ≥1 .gov/.edu/journal, self-reference
- [x] Voice signals: contractions, direct address, conversational interjections
- [x] Quality gate: regenerate up to 3 attempts before storing

## Crons (§8)
- [x] Top-up queue cron 0 */6 * * *
- [x] Publisher cron 0 7,11,15,19 * * *
- [x] Sitemap-ping cron 30 2 * * *
- [x] ASIN health-check cron 30 3 * * *
- [x] Health-beacon cron */30 * * * *
- [x] AUTO_GEN_ENABLED defaults true; only "false" disables
- [x] No setTimeout > 24.8 days

## Bunny CDN (§9)
- [x] server/lib/bunny.mjs assignHeroImage helper, topic-routed
- [x] No images in repo (.gitignore blocks all image extensions)
- [x] hero_url column populated for every article (CDN URL)

## Amazon Affiliate (§10)
- [x] product-catalog.mjs with verified ASINs
- [x] 3 links per article, soft language, "(paid link)"
- [x] Tag spankyspinola-20 on every link
- [x] HTTP GET ASIN verification helper

## Pages
- [x] Home (full-viewport hero, mosaic strip, featured, recent grid)
- [x] /articles (grid)
- [x] /articles/:slug (Archetype D, dot nav, parallax hero, mid-article bio card)
- [x] /about
- [x] /recommended
- [x] /privacy
- [x] /disclosures
- [x] /contact
- [x] /author/the-oracle-lover

## Content
- [x] 30 published articles (1,800+ words each)
- [x] 470 queued articles
- [x] 23.8% of articles backlink theoraclelover.com (target ~23%)
- [x] Each article: TL;DR, ≥3 internal links, ≥1 .gov/.edu external link, byline with datetime, self-reference, 3 Amazon links
- [x] Per-article hero image URL (topic-matched library)

## AEO / LLM Discoverability (§16)
- [x] /llms.txt and /llms-full.txt served
- [x] OG + Twitter card meta tags via index.html base
- [x] Canonical apex domain (no www)

## Quality Audit (§22)
- [x] No author leak
- [x] No api key literals in repo
- [x] DB integrity: 30 published + 470 queued, EEAT signals present on every published row
- [x] Distribution: 30 across 21 distinct days, never all on one day

## Final
- [x] §23 report block emitted
- [x] vitest 11/11 passing
- [x] Checkpoint saved
