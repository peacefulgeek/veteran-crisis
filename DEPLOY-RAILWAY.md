# Deploying Veteran Crisis to Railway

This document is the complete, opinionated, **battle-tested** checklist for taking the project from this repository to a live Railway deployment serving `veterancrisis.com`. Every recommendation in this doc has been hardened against the nine real-world failures that broke a prior deploy of a sibling project, so the steps below are written to avoid those traps from the start rather than rediscover them.

## 1. Architectural snapshot

The stack is **GitHub → Railway → Bunny CDN**. Zero Manus dependencies remain. The application is a single Node.js process that serves the React SPA, redirects all public read endpoints (`/api/articles`, `/api/articles/:slug`, `/sitemap.xml`, `/feed.xml`) to Bunny CDN as 302s, and runs six internal cron jobs (top-up, publish, sitemap-ping, asin-health, health-beacon, **publish-to-bunny**). The `publish-to-bunny` cron regenerates `articles/index.json`, `articles/{slug}.json`, `feeds/sitemap.xml`, and `feeds/feed.xml` to Bunny on a 6-hour cadence plus immediately after every successful publish. All hero, OG, and article-body content lives on Bunny CDN at `https://veteran-crisis.b-cdn.net/...`, which is exactly what Railway needs because Railway's filesystem is ephemeral. The build emits a single `dist/index.js` plus a Vite-built `dist/public/` SPA, and `pnpm start` runs both via `node dist/index.js`.

## 2. Why this project uses **Railpack**, not Nixpacks, not Dockerfile

Railway has three available builders and choosing wrong is the single most common cause of "the deploy succeeds but the URL never responds." This repo's `railway.json` explicitly pins `"builder": "RAILPACK"`, and the project intentionally ships **no Dockerfile**, for the following reasons learned the hard way:

> **Lesson 1 — Nixpacks injects Caddy.** When Nixpacks detects a static-site build output it silently inserts a Caddy reverse proxy in front of your Express server. Caddy grabs `$PORT` first, your Express bind silently fails because the port is already taken, and the deploy then fails the healthcheck. Pinning to `RAILPACK` skips the static-site detection and leaves Express owning the port.

> **Lesson 7 — `startCommand` + Dockerfile `CMD` ambiguity.** When both are present, Railway uses `startCommand` and ignores `CMD`, but environment-variable injection differs between the two execution paths, producing intermittent "this works on my machine" outcomes. The repo therefore has **no Dockerfile** at all and relies on `railway.json`'s `startCommand: pnpm start`.

> **Lesson 8 — Stale Docker layer cache.** Once a Dockerfile has been built by Railway, even deleting it does not force a clean rebuild for several deploys because Railway aggressively caches image layers. Keeping the repo Dockerfile-free from day one avoids the multi-deploy cache-bust dance.

If you ever need a Dockerfile (rare; only for native binary dependencies that Railpack can't satisfy), copy `patches/` into the build context *before* `pnpm install` runs (**Lesson 2** — the `pnpm-lock.yaml` references `patches/wouter@3.7.1.patch` style entries and the lockfile integrity check fails silently if patches are missing) and pin pnpm to the exact version declared in `packageManager`, not `pnpm@latest` (**Lesson 3**).

## 3. Required environment variables

Configure these in Railway's project **Variables** panel. Required values must be set before the first deploy; optional ones have sensible defaults in code.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | TiDB/MySQL connection string, e.g. `mysql://user:pass@host:port/db?ssl={"rejectUnauthorized":true}`. Use the same TiDB Cloud cluster as dev to keep the 500 articles. |
| `OPENAI_API_KEY` | yes | OpenAI key for publish/top-up crons and article generation. **Rotate the one pasted in chat earlier.** |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini`. Override to `deepseek-chat`, `gpt-4o`, etc. |
| `OPENAI_BASE_URL` | optional | Defaults to `https://api.openai.com/v1`. Override to `https://api.deepseek.com` if using DeepSeek. |
| `VITE_APP_TITLE` | optional | Browser tab title. Defaults to "Veteran Crisis". |
| `VITE_APP_LOGO` | optional | URL to the favicon/logo. |
| `AUTO_GEN_ENABLED` | optional | Set to `false` to disable all crons. Defaults to enabled. |
| `ADMIN_KEY` | optional | When set, `/api/cron-status` requires `X-Admin-Key: <value>` header or `?key=<value>` query. When unset, the endpoint is open. |
| `NODE_ENV` | leave unset | Railway sets `NODE_ENV=production` automatically; the `start` script also sets it explicitly. |
| `PORT` | leave unset | Railway injects this. The server binds to it directly without scanning, and falls back to `8080` only if `NODE_ENV=production` and `PORT` is missing (**Lesson 5** — defaulting to `10000` or `3000` in production produces silent healthcheck failures when `PORT` is dropped from the environment). |

**Removed entirely:** `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`. The Manus OAuth flow, `/manus-storage` proxy, `vite-plugin-manus-runtime`, and FORGE LLM helpers are all stripped from the codebase. Public site uses Express routes only; tRPC remains mounted at `/api/trpc` for future internal admin endpoints.

The Bunny CDN credentials (`bunnyStorageZone`, `bunnyApiKey`, `bunnyHostname`, `bunnyPullZone`) are currently hardcoded in `server/lib/site-config.mjs`. To externalize them, move them to env vars (`BUNNY_STORAGE_ZONE`, `BUNNY_API_KEY`, `BUNNY_PULL_ZONE`) and update the import sites in `server/lib/bunny.mjs` and `scripts/gen-500-heroes.mjs`.

## 4. One-time Railway project setup

Create the project from the GitHub repository. In the Railway dashboard, click **New Project → Deploy from GitHub repo**, select `peacefulgeek/veteran-crisis`, and set the deploy branch to `main`. The bundled `railway.json` pins the build to `pnpm install --frozen-lockfile && pnpm build`, the start to `pnpm start`, and the builder to **RAILPACK**. The `engines.node = ">=22"` field in `package.json` plus the `.nvmrc` file ensure Railpack provisions Node 22.

Once the build succeeds the first time, paste in the environment variables from §3 and trigger a redeploy. Cold start should take 60–90 seconds (Vite build + esbuild server bundle) and the server should log `Server running on http://0.0.0.0:<PORT>/` within 5 seconds of process start.

## 5. Healthcheck strategy — intentionally disabled

> **Lesson 6 — Healthcheck timeouts kill slow boots.** A configured healthcheck with the default 30-second timeout will mark a deploy `failed` if the server takes longer than that to begin serving 200 on `/health`. Synchronous startup work (large in-memory caches, DB schema introspection, JSON-file loading) can easily exceed 30 seconds in a cold container.

This project's `railway.json` therefore **omits `healthcheckPath` and `healthcheckTimeout` entirely.** Railway will mark the deploy `success` as soon as the container survives 10 seconds without crashing, which is appropriate because our boot is fast (no synchronous JSON loading; all reads are 302 redirects to Bunny). The `/health` endpoint still exists and returns `{ok: true}` — wire it as an external uptime monitor (Better Stack, UptimeRobot, etc.) instead of a Railway-managed probe, which gives you alerting without making the deploy itself dependent on a probe-pass within an arbitrary window.

If you ever add slow synchronous startup work, do not re-enable the Railway healthcheck without also setting `healthcheckTimeout: 300`.

## 6. Custom domain wiring and DNS

Point `veterancrisis.com` (apex) to Railway by adding the domain in the project's **Settings → Domains** panel. Railway issues a Let's Encrypt cert automatically. The app already 301-redirects `www.veterancrisis.com → veterancrisis.com` via the `wwwToApexRedirect` middleware mounted first in `server/_core/index.ts`, so add the `www` subdomain CNAME pointing at the same Railway service to let that redirect fire on the edge.

> **Lesson 9 — When all the code looks right and the URL still 404s, it's DNS.** After every fix in the previous eight lessons was correct on a sibling project, the deploy was actually succeeding but the custom domain pointed nowhere. The resolution was to delete the existing DNS records at the registrar entirely and recreate them fresh against the new Railway target. Stale records cached at the registrar or in Cloudflare/Bunny DNS layers can silently override new ones. If `curl -v https://<your-domain>` returns Railway's `404 Application not found` page even after the Railway dashboard shows the domain as `Active`, delete and recreate the apex `A` (or `ALIAS`/`ANAME`) record and the `www` `CNAME` record at the registrar before assuming the code is broken.

## 7. Cron behavior on Railway

All six crons run inside the same web process; no separate worker dyno is needed. The `publish-to-bunny` cron is the linchpin: every 6 hours, plus immediately after each successful `publish` run, it regenerates the Bunny JSON artifacts that all public read endpoints redirect to. Railway's web service does not sleep on the Hobby plan as long as it receives at least one request per ~10 minutes; the `health-beacon` cron pings `/health` internally every 30 minutes which is enough to keep the container warm. On Pro with scale-to-zero, either disable scale-to-zero for this service or move the publish cron to a Railway Cron service that hits the publish endpoint externally. To disable all crons in a particular environment (for example a staging copy), set `AUTO_GEN_ENABLED=false`.

## 8. The 100-article publishing cap

This deploy enforces a hard cap of 100 published articles. The publish cron (`server/lib/cron-jobs.mjs:runPublishOne`) refuses to promote anything from `queued` to `published` once the database holds 100 rows with `status='published'`. Today the site has 31 published and 469 queued, so the next 69 will roll out at the existing pace (4 per day, 6am–7pm America/Edmonton) over roughly 18 days, after which the cron will idle on the cap. Queued articles are completely invisible to the public — the API returns 404 for their slugs and they do not appear in `/sitemap.xml`, `/feed.xml`, or `/api/articles`. To raise the cap later, edit the literal `100` in `cron-jobs.mjs` and redeploy.

## 9. Observability, crash reporting, and debugging

> **Lesson 4 — Silent crashes destroy deploys.** Without explicit `uncaughtException` and `unhandledRejection` handlers, an import-time error or a port-bind failure terminates the Node process with zero output to Railway logs, leaving you guessing for hours.

The server entry (`server/_core/index.ts`) now registers three crash surfaces as its very first lines:

1. `process.on('uncaughtException', ...)` logs the full stack to stderr with the `[fatal]` prefix, gives stdout 100 ms to flush, then exits with code 1.
2. `process.on('unhandledRejection', ...)` does the same for promise rejections.
3. `server.on('error', ...)` catches `EADDRINUSE` and related bind failures with the exact port number in the message.
4. The `startServer().catch(...)` block elevates any startup rejection through the same `[fatal]` channel.

Combine this with Railway's log viewer and external uptime monitoring on `/health` and you will know within seconds why a deploy died.

## 10. Database migrations on first deploy

The Drizzle schema in `drizzle/schema.ts` is already applied to the production TiDB cluster — the same cluster that holds the 500 articles. Railway does not need to run migrations on first deploy. To add new columns or tables later, edit `drizzle/schema.ts`, run `pnpm drizzle-kit generate` locally, copy the generated SQL into Railway's database via TiDB Cloud's SQL Editor, and redeploy. There is no `pnpm db:push` step in the start command precisely so a buggy migration cannot wedge a deploy.

## 11. Rollback plan

Every Railway deploy keeps the previous image. If the new build is broken, click the previous deploy in the **Deployments** tab and choose **Rollback**. Database state is unaffected by rollback because the schema is shared. For application-level rollback without redeploying, you can also use `webdev_rollback_checkpoint` in the local sandbox to revert source files, then push to GitHub which auto-triggers a fresh Railway build.

## 12. First-boot smoke test

After the first deploy succeeds, run this checklist against the public URL (replace `<host>` with the Railway-assigned hostname or the custom domain once wired):

| Check | Expected |
|---|---|
| `curl -sI https://<host>/health` | `HTTP/2 200`, JSON `{ok:true}` |
| `curl -sI https://<host>/sitemap.xml` | `HTTP/2 302` redirecting to `https://veteran-crisis.b-cdn.net/feeds/sitemap.xml` |
| `curl -sI https://<host>/feed.xml` | `HTTP/2 302` redirecting to `https://veteran-crisis.b-cdn.net/feeds/feed.xml` |
| `curl -sI https://<host>/api/articles` | `HTTP/2 302` redirecting to `https://veteran-crisis.b-cdn.net/articles/index.json` |
| `curl -s https://veteran-crisis.b-cdn.net/feeds/feed.xml \| grep -c '<item>'` | 30 |
| `curl -s https://veteran-crisis.b-cdn.net/articles/index.json \| jq '.articles \| length'` | 31 (current published count) |
| Browse `https://<host>/articles/the-identity-crisis-nobody-warned-you-about-after-discharge` | Renders fully with hero image |
| `curl -A 'facebookexternalhit/1.1' -s https://<host>/articles/the-identity-crisis-nobody-warned-you-about-after-discharge \| grep og:image` | Returns the per-article Bunny CDN OG image URL |
| Railway logs show no `[fatal]` lines after first successful boot | confirms crash handlers wired correctly |

If any check fails, the order of suspicion is: (1) Railway env vars missing or wrong, (2) DNS records stale at registrar (delete + recreate), (3) Bunny CDN credentials in `site-config.mjs` mismatched against the production storage zone.
