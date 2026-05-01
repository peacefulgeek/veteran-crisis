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

## VeteranCrisis.com Migration (Round 2)
- [x] Swap apex from theveteranshift.com → veterancrisis.com everywhere (site-config, sitemap, robots, llms, OG/Twitter, JSON-LD, canonical, README, footer)
- [x] Update site name + tagline accordingly
- [x] Build /assessments page with 11 nurturing self-assessments
- [x] Build /supplements page (Herbs / TCM / Supplements) with 208 items, 3 sentences each, image, verified ASIN, my Amazon tag spankyspinola-20
- [x] Migrate every hero image to Bunny CDN as compressed WebP (zone: veteran-crisis), 40 AI-generated topic-routed heroes, no local storage afterwards
- [x] Migrate every supplement image to Bunny CDN as compressed WebP (60 lifestyle photos)
- [x] Update DB hero_url to Bunny URLs (500/500)
- [x] Confirm zero Manus dependencies in production runtime paths
- [x] Confirm crons are in-code (node-cron) only — no Manus scheduler
- [x] Confirm 500 articles seeded, 1800+ words, gates passing, distribution healthy (30 across 21 days, max 2/day)
- [x] Push to peacefulgeek/veteran-crisis (HTTPS+PAT, repo created via API)
- [x] Emit §22 audit + §23 report + push hashtag

## Round 3: Author Byline Blurb
- [x] Add 2–3 sentence TheOracleLover.com byline blurb to every article body (4 rotated variants)
- [x] Update template generator so future articles include it automatically
- [x] Backfill all 500 existing articles in DB (500/500)
- [x] Verify sample article renders the blurb, vitest 11/11 passes, gate 500/500 passes
- [x] Push to peacefulgeek/veteran-crisis main, save checkpoint

## Round 4: EEAT Author Hub + Anchor Variation + OG Images
- [ ] Generate Oracle Lover portrait, upload to Bunny CDN
- [ ] Build /author/the-oracle-lover with 6-paragraph long-form bio + portrait + EEAT JSON-LD
- [ ] Write 10–12 natural theoraclelover.com anchor-text variants
- [ ] Rewrite all 500 byline asides distributing the anchor variants (no two consecutive identical)
- [ ] Generate 30 OG share images (1200×630 WebP) for published articles
- [ ] Upload OG images to Bunny CDN
- [ ] Add ogImage column to articles, populate, wire og:image + twitter:image meta on article detail
- [ ] Verify, run vitest, commit + push to peacefulgeek/veteran-crisis, save checkpoint
