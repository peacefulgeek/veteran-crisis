# Deploying Veteran Crisis to Railway

This document is the complete, opinionated checklist for taking the project from this repository to a live Railway deployment serving `veterancrisis.com`. Every step has been validated against the current build (Node 22, Vite 7, Express 4, Drizzle on MySQL/TiDB, Bunny CDN for assets).

## 1. Architectural snapshot

The stack is **GitHub → Railway → Bunny CDN**. Zero Manus dependencies remain. The application is a single Node.js process that serves the React SPA, redirects all public read endpoints (`/api/articles`, `/api/articles/:slug`, `/sitemap.xml`, `/feed.xml`) to Bunny CDN as 302s, and runs six internal cron jobs (top-up, publish, sitemap-ping, asin-health, health-beacon, **publish-to-bunny**). The new `publish-to-bunny` cron regenerates `articles/index.json`, `articles/{slug}.json`, `feeds/sitemap.xml`, and `feeds/feed.xml` to Bunny on a 6-hour cadence and immediately after every successful publish. All hero/OG/article-body content lives on Bunny CDN at `https://veteran-crisis.b-cdn.net/...` — which is exactly what Railway needs because Railway's filesystem is ephemeral. The build emits a single `dist/index.js` plus a Vite-built `dist/public/` SPA, and `pnpm start` runs both via `node dist/index.js`.

## 2. Required environment variables

Configure these in Railway's project Variables panel. Anything marked **required** must be set before the first deploy; anything marked optional has a sensible default in code.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | TiDB/MySQL connection string. Format: `mysql://user:pass@host:port/db?ssl={"rejectUnauthorized":true}`. Use the same TiDB Cloud cluster as dev to keep the 500 articles. |
| `OPENAI_API_KEY` | yes | OpenAI key for the publish/top-up cron and article generation. **Rotate the one pasted in chat earlier.** |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini`. Override to `deepseek-chat`, `gpt-4o`, etc. |
| `OPENAI_BASE_URL` | optional | Defaults to `https://api.openai.com/v1`. Override to `https://api.deepseek.com` if using DeepSeek. |
| `VITE_APP_TITLE` | optional | Browser tab title. Defaults to "Veteran Crisis". |
| `VITE_APP_LOGO` | optional | URL to the favicon/logo. |
| `AUTO_GEN_ENABLED` | optional | Set to `false` to disable all crons. Defaults to enabled. |
| `ADMIN_KEY` | optional | Optional shared secret. When set, `/api/cron-status` requires `X-Admin-Key: <value>` header or `?key=<value>` query. When unset, the endpoint is open. |
| `NODE_ENV` | leave unset | Railway sets `NODE_ENV=production` automatically; the `start` script also sets it explicitly. |
| `PORT` | leave unset | Railway injects this. The server now binds to it directly without scanning. |

**Removed entirely:** `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`. The Manus OAuth flow, `/manus-storage` proxy, `vite-plugin-manus-runtime`, and the FORGE LLM helpers are all stripped from the codebase. Public site uses Express routes only; tRPC remains mounted at `/api/trpc` for any future internal admin endpoints.

The Bunny CDN credentials (`bunnyStorageZone`, `bunnyApiKey`, `bunnyHostname`, `bunnyPullZone`) are still hardcoded in `server/lib/site-config.mjs` per master scope §9. If you want to externalize them later for security hygiene, move them to env vars and update the import sites in `server/lib/bunny.mjs` and `scripts/gen-500-heroes.mjs`.

## 3. One-time Railway project setup

Create the project from the GitHub repository. In the Railway dashboard, click **New Project → Deploy from GitHub repo**, select `peacefulgeek/veteran-crisis`, and set the deploy branch to `main`. Railway will auto-detect Nixpacks but the bundled `railway.json` already pins the build to `pnpm install --frozen-lockfile && pnpm build` and the start to `pnpm start`, with `/health` as the HTTP healthcheck. The `engines.node = ">=22"` field in `package.json` plus the `.nvmrc` file ensure Nixpacks provisions Node 22.

Once the build succeeds the first time, paste in the environment variables from §2. Trigger a redeploy. The first cold start should take 60–90 seconds (Vite build + esbuild server bundle) and the healthcheck should pass within 5 seconds of the server logging `Server running on http://localhost:$PORT/`.

## 4. Custom domain wiring

Point `veterancrisis.com` (apex) to Railway by adding the domain in the project's **Settings → Domains** panel. Railway will issue a Let's Encrypt cert automatically. The app already 301-redirects `www.veterancrisis.com → veterancrisis.com` via the `wwwToApexRedirect` middleware mounted first in `server/_core/index.ts`, so set up the `www` subdomain CNAME pointing at the same Railway service to let that redirect fire on the edge.

## 5. Cron behavior on Railway

The six crons run inside the same web process (no separate worker dyno needed). The new `publish-to-bunny` cron is the most important one for this architecture: every 6 hours, plus immediately after each successful `publish` run, it regenerates `articles/index.json`, every `articles/{slug}.json`, `feeds/sitemap.xml`, and `feeds/feed.xml`, and PUTs them to Bunny CDN. Railway's web service does not sleep on the Hobby plan as long as it receives at least one request per ~10 minutes; the `health-beacon` cron pings `/health` internally every 5 minutes which is enough to keep the dyno warm. If you put the project on Pro and scale to zero, you'll need to either disable scale-to-zero for this service or move the publish cron to a Railway Cron service that hits `/api/cron-status` style endpoints externally. To disable all crons in a particular environment (for example a staging copy), set `AUTO_GEN_ENABLED=false`.

## 6. The 100-article publishing cap

This deploy enforces a hard cap of 100 published articles. The publish cron (`server/lib/cron-jobs.mjs:runPublishOne`) refuses to promote anything from `queued` to `published` once the database holds 100 rows with `status='published'`. Today the site has 31 published and 469 queued, so the next 69 will roll out at the existing pace (4 per day, 6am–7pm America/Edmonton) over roughly 18 days, after which the cron will idle on the cap. Queued articles are completely invisible to the public — the API returns 404 for their slugs and they do not appear in `/sitemap.xml`, `/feed.xml`, or `/api/articles`. To raise the cap later, edit the literal `100` in `cron-jobs.mjs:73` and redeploy.

## 7. Health, observability, and debugging

The `/health` endpoint returns JSON with `{ ok: true, ts, uptimeS }` and is set as the Railway healthcheck path. Railway streams stdout to its log viewer; the cron lines (`[cron] 5 crons scheduled`, `[publish-one] ok`, `[health-beacon] ok`) and the request log lines from Express middleware will appear there. For deeper introspection, hit `/api/cron-status` after authenticating — it returns the last 100 cron runs grouped by job, plus published-by-date counts for the last 30 days. Bookmark this URL after deploy.

## 8. Database migrations on first deploy

The Drizzle schema in `drizzle/schema.ts` is already applied to the production TiDB cluster — the same cluster that holds the 500 articles. Railway does not need to run migrations on first deploy. If you add new columns or tables later, the workflow is: edit `drizzle/schema.ts`, run `pnpm drizzle-kit generate` locally, copy the generated SQL into Railway's database via TiDB Cloud's SQL Editor, redeploy. There is no `pnpm db:push` step in the start command precisely so a buggy migration cannot wedge a deploy.

## 9. Rollback plan

Every Railway deploy keeps the previous image. If the new build is broken, click the previous deploy in the **Deployments** tab and choose **Rollback**. Database state is unaffected by rollback because the schema is shared. For application-level rollback without redeploying, you can also use `webdev_rollback_checkpoint` in the local sandbox to revert source files, then push to GitHub which auto-triggers a fresh Railway build.

## 10. First-boot smoke test

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

If any check fails, the most likely culprit is a missing env var. Check Railway's deploy logs for the exact stack trace.
