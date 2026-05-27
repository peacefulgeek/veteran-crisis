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

## Round 10: De-Manus + Bunny JSON storage (GitHub + Railway + Bunny only)
- [x] Audited Manus surface: OAuth, /manus-storage, vite-plugin-manus-runtime, FORGE LLM, allowedHosts
- [x] Added putToBunny/getFromBunny/putJsonToBunny helpers in server/lib/bunny.mjs
- [x] articles/index.json on Bunny (31 published rows); /api/articles 302→ there
- [x] articles/{slug}.json on Bunny (31 files); /api/articles/:slug 302→ there
- [x] feeds/sitemap.xml + feeds/feed.xml on Bunny; routes 302→ there
- [x] Removed registerOAuthRoutes from server/_core/index.ts
- [x] Removed registerStorageProxy / /manus-storage proxy
- [x] Removed vite-plugin-manus-runtime import + usage from vite.config.ts
- [x] openai-client.mjs no longer falls back to BUILT_IN_FORGE; pure OPENAI_API_KEY
- [x] notifyOwner unused in app source; no stub needed
- [x] DEPLOY-RAILWAY.md rewritten: 10 Manus env vars dropped, leaner table, redirect-checks in smoke test
- [x] Build clean, vitest 32/32 pass, push, checkpoint

## Round 9: Cap at 100 published + Railway deploy prep
- [x] Audit current article statuses (31 published, 469 queued — already under 100)
- [x] Cap published at ≤100: hard cap added in publish cron (refuses to promote at >=100)
- [x] Verify gating end-to-end: queued slug returns 404, 0 leakage in sitemap/feed/articles list
- [x] Audit project for Railway: $PORT binding fixed, no fs writes, /health endpoint exists, deps OK
- [x] Add railway.json + Procfile + .nvmrc + engines.node>=22
- [x] Add DEPLOY-RAILWAY.md with full env-var checklist + 10-step deploy guide
- [x] Run vitest 21/21 pass, push, save checkpoint

## Round 8: 500 unique hero images per article (DALL·E 3)
- [x] Store OPENAI_API_KEY as secret (not in code/git)
- [x] Pull all 500 articles (id, slug, title, category, tags) into a list
- [x] For each article: craft prompt (warm-light editorial, no text, no clichés) → DALL·E 3 1792×1024 → download → WebP q88 1600×900 → upload to Bunny `articles/{id}.webp` → update articles.heroUrl
- [x] Resume-safe: skip rows whose heroUrl already points to /articles/{id}.webp
- [x] Spot-check 5 Bunny URLs (IDs 50/150/250/350/500 all 200, 125-190 KB)
- [x] Run vitest 16/16, push to peacefulgeek/veteran-crisis, save checkpoint

## Round 7: Auto-bumping dateModified for freshness signals
- [x] /api/articles/:slug returns lastModifiedAt (verified live)
- [x] DB write-path bumps lastModifiedAt automatically (drizzle onUpdateNow + MySQL ON UPDATE CURRENT_TIMESTAMP)
- [x] No backfill needed (all 500 rows already have lastModifiedAt >= publishedAt)
- [x] ArticleDetail JSON-LD emits dateModified from a.lastModifiedAt
- [x] sitemap.xml <lastmod> uses max(lastModifiedAt, publishedAt)
- [x] /feed.xml <lastBuildDate> = newest row across 30 + per-item <atom:updated>
- [x] Vitest 16/16 pass
- [x] Push + checkpoint

## Round 6: RSS Feed (/feed.xml)
- [x] Add /feed.xml endpoint to site-routes.mjs (RSS 2.0 with content:encoded namespace)
- [x] Pull latest 30 published articles ordered by publishedAt desc
- [x] Include title, link, guid, pubDate, description, content:encoded, author, hero image as enclosure
- [x] Auto-discovery <link rel="alternate" type="application/rss+xml"> in client/index.html
- [x] Vitest spec: /feed.xml returns valid XML, has 30 items, each item has required tags
- [x] Push to peacefulgeek/veteran-crisis main, save checkpoint

## Round 4: EEAT Author Hub + Anchor Variation + OG Images
- [x] Generate Oracle Lover portrait, upload to Bunny CDN
- [x] Build /author/the-oracle-lover with 6-paragraph long-form bio + portrait + EEAT JSON-LD
- [x] Write 10–12 natural theoraclelover.com anchor-text variants
- [x] Rewrite all 500 byline asides distributing the anchor variants (no two consecutive identical)
- [x] Generate 30 OG share images (1200×630 WebP) for published articles
- [x] Upload OG images to Bunny CDN
- [x] Add ogImage column to articles, populate, wire og:image + twitter:image meta on article detail
- [x] Verify, run vitest, commit + push to peacefulgeek/veteran-crisis, save checkpoint

## Round 11: Railway hardening (9 lived lessons)
- [x] L1 — railway.json builder=RAILPACK (was NIXPACKS); no Caddy port grab
- [x] L2 — no Dockerfile in repo, so no patches/-before-install ordering risk
- [x] L3 — packageManager pinned to pnpm@10.4.1+sha512.c753b6c… (verified)
- [x] L4 — uncaughtException + unhandledRejection + server.on('error') + startServer().catch as [fatal] loggers
- [x] L5 — production default port = 8080 (not 3000/10000); $PORT respected when set
- [x] L6 — healthcheckPath/Timeout removed from railway.json; /health still served for external monitors
- [x] L7 — no Dockerfile in repo; only startCommand drives boot, no CMD/startCommand ambiguity
- [x] L8 — repo is Dockerfile-free from this commit forward; Railway's first build will use Railpack with no Docker layer-cache history (remote cache state verified only after first deploy)
- [x] L9 — DEPLOY-RAILWAY.md §6 documents delete+recreate DNS records at registrar
- [x] 44/44 vitest pass, build clean, pushed a7b001b, checkpoint

## Round 12: All 500 articles as JSON on Bunny + env wiring
- [x] Verified DB integrity: 500 total = 31 published + 469 queued
- [x] Extended publish-to-bunny cron: writes per-slug JSON for ALL 500 (every status) at concurrency 8
- [x] Two indexes: articles/index.json (public, 31 published) + articles/all-index.json (admin, 500 with byStatus)
- [x] Reseed completed: 500/500 per-slug JSON uploaded in 42s, 0 failures, verified via Bunny CDN curl
- [x] AMAZON_TAG env wired with master-scope default (spankyspinola-20)
- [x] BUNNY_STORAGE_ZONE / BUNNY_API_KEY / BUNNY_PULL_ZONE / BUNNY_HOSTNAME env wired
- [x] JWT_SECRET documented as no-op in DEPLOY-RAILWAY §3 (harmless to set, no code reads it)
- [x] FAL_KEY explicitly excluded per §1A; vitest §32 enforces no references in 4 runtime files
- [x] 54/54 vitest pass, build clean, push, checkpoint

## Round 13: Remove 100-article publishing cap
- [x] Removed `cap=100` block from publish-one cron in server/lib/cron-jobs.mjs
- [x] Updated §24 vitest to assert cap is gone (no `cap=100`, no `>= 100` check)
- [x] Verified Bunny CDN: public index=32 published, admin all-index=500 (byStatus pub=32, queued=468), 5 random per-slug 200 OK 13–14 KB each
- [x] 54/54 vitest pass, pushed a2f2b0f to peacefulgeek/veteran-crisis main
