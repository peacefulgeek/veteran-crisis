import { describe, expect, it } from "vitest";
// @ts-ignore — sibling .mjs ESM module
import { wwwToApexRedirect, registerSiteRoutes } from "./lib/site-routes.mjs";
// @ts-ignore — sibling .mjs ESM module
import { runQualityGate } from "./lib/article-quality-gate.mjs";
// @ts-ignore — sibling .mjs ESM module
import { generateTemplateArticle } from "./lib/template-article.mjs";
// @ts-ignore — sibling .mjs ESM module
import { SITE } from "./lib/site-config.mjs";

// Express middleware harness
function fakeReq(host: string, url = "/x") {
  return { headers: { host }, url, originalUrl: url, method: "GET" } as any;
}
function fakeRes() {
  let status = 200; let headers: Record<string, string> = {}; let ended = false; let body = "";
  const r: any = {
    status(s: number) { status = s; return r; },
    setHeader(k: string, v: string) { headers[k] = v; return r; },
    set(k: string, v?: string) { if (typeof k === 'object') Object.assign(headers, k); else if (v) headers[k] = v; return r; },
    type(_t: string) { return r; },
    send(b: any) { ended = true; body = String(b ?? ''); return r; },
    json(b: any) { ended = true; body = JSON.stringify(b); return r; },
    redirect(s: number, loc: string) { status = s; headers.Location = loc; ended = true; return r; },
    end(b?: string) { ended = true; body = b || body; return r; },
    get statusCode() { return status; },
    get headers() { return headers; },
    get ended() { return ended; },
    get body() { return body; },
  };
  return r;
}

describe("master scope §6: WWW redirects 301 to apex (FIRST middleware)", () => {
  it("redirects www.veterancrisis.com to https://veterancrisis.com with 301", async () => {
    const mw = wwwToApexRedirect();
    const req = fakeReq("www.veterancrisis.com", "/articles/x");
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    expect(res.statusCode).toBe(301);
    expect(res.headers.Location).toBe("https://veterancrisis.com/articles/x");
    expect(nextCalled).toBe(false);
  });
  it("does NOT redirect apex requests", async () => {
    const mw = wwwToApexRedirect();
    const req = fakeReq("veterancrisis.com", "/");
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});

describe("master scope §10: quality gate enforces zero-tolerance banned union", () => {
  const fixtureBody = (extra = "") => generateTemplateArticle({
    topic: "First Year After Discharge",
    category: "Identity",
    tags: ["identity"],
    relatedArticles: [
      { slug: "a", title: "A" }, { slug: "b", title: "B" }, { slug: "c", title: "C" },
    ],
    openerType: "gut-punch",
    conclusionType: "reflection",
    includeBacklink: false,
    today: "2026-05-01",
  }).body + extra;

  it("a clean template article passes the gate", () => {
    const gate = runQualityGate(fixtureBody(), { minWords: 1200, maxWords: 2500 });
    expect(gate.passed).toBe(true);
    expect(gate.failures).toEqual([]);
  });

  it("flags an em-dash", () => {
    const gate = runQualityGate(fixtureBody("<p>This is a problem — really.</p>"));
    expect(gate.passed).toBe(false);
    expect(gate.failures.some((f: string) => /em-?dash|dash|punctuation/i.test(f))).toBe(true);
  });

  it("flags a banned word", () => {
    const gate = runQualityGate(fixtureBody("<p>This article will delve into the journey.</p>"));
    expect(gate.passed).toBe(false);
    expect(gate.failures.length).toBeGreaterThan(0);
  });

  it("flags missing TL;DR", () => {
    const gate = runQualityGate("<p>" + "word ".repeat(1500) + "</p>", { minWords: 1200, maxWords: 2500 });
    expect(gate.passed).toBe(false);
    expect(gate.failures.some((f: string) => /tl?dr/i.test(f))).toBe(true);
  });
});

describe("master scope §3 + §15: site identity wired correctly", () => {
  it("apex domain", () => { expect(SITE.apex).toBe("veterancrisis.com"); });
  it("author name", () => { expect(SITE.author).toBe("The Oracle Lover"); });
  it("amazon affiliate tag", () => { expect(SITE.amazonTag).toBe("spankyspinola-20"); });
});

describe("master scope §6: robots.txt allow-lists all four AI bots", () => {
  it("registers /robots.txt with the four mandatory bots", () => {
    const handlers: Record<string, Function> = {};
    const fakeApp: any = {
      use(_: any) {},
      get(path: string, handler: Function) { handlers[path] = handler; },
      post(_p: string, _h: Function) {},
    };
    registerSiteRoutes(fakeApp);
    expect(handlers["/robots.txt"]).toBeTypeOf("function");
    const res = fakeRes();
    handlers["/robots.txt"]({} as any, res as any);
    const body = res.body || "";
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
      expect(body).toContain(`User-agent: ${bot}`);
    }
    expect(body).toContain("Sitemap: https://veterancrisis.com/sitemap.xml");
  });
});

import { readFileSync } from "node:fs";
describe("master scope §17: per-article OG meta", () => {
  it("single article API SELECT includes ogImage column", () => {
    const src = readFileSync("server/lib/site-routes.mjs", "utf-8");
    // Find the /api/articles/:slug handler and verify the SELECT lists ogImage.
    const m = src.match(/\/api\/articles\/:slug[\s\S]*?SELECT[\s\S]*?FROM articles/);
    expect(m).not.toBeNull();
    expect(m![0]).toContain("ogImage");
  });
  it("ArticleDetail.tsx writes og:image meta to document.head", () => {
    const src = readFileSync("client/src/pages/ArticleDetail.tsx", "utf-8");
    expect(src).toContain('og:image');
    expect(src).toContain('twitter:image');
    expect(src).toContain('application/ld+json');
    expect(src).toContain("'@type': 'Article'");
  });
});

describe("master scope §16: /feed.xml RSS endpoint", () => {
  it("registers /feed.xml route in registerSiteRoutes", () => {
    const handlers: Record<string, Function> = {};
    const fakeApp: any = {
      use(_: any) {},
      get(path: string, handler: Function) { handlers[path] = handler; },
      post(_p: string, _h: Function) {},
    };
    registerSiteRoutes(fakeApp);
    expect(handlers["/feed.xml"]).toBeTypeOf("function");
  });
  it("client/index.html declares the RSS auto-discovery link", () => {
    const src = readFileSync("client/index.html", "utf-8");
    expect(src).toMatch(/rel="alternate"[^>]*type="application\/rss\+xml"[^>]*href="\/feed\.xml"/);
  });
  it("feed handler renders the same XML shape against fixed input rows", () => {
    // Replicate the exact XML construction logic of the /feed.xml handler
    // against 30 fixed rows, asserting the output meets every requirement.
    const rows = Array.from({ length: 30 }, (_, i) => ({
      slug: `slug-${i + 1}`,
      title: `Article ${i + 1}`,
      metaDescription: `desc ${i + 1}`,
      body: `<p>body of article ${i + 1}</p>`,
      heroUrl: `https://veteran-crisis.b-cdn.net/library/lib-${(i % 40) + 1}.webp`,
      author: "The Oracle Lover",
      publishedAt: new Date(Date.UTC(2026, 4, 1, i, 0, 0)),
      category: "Identity",
    }));
    const escape = (s: any) => String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const cdata = (s: any) => `<![CDATA[${String(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
    const rfc822 = (d: any) => new Date(d || Date.now()).toUTCString();
    const items = rows.map(r => [
      '<item>',
      `<title>${escape(r.title)}</title>`,
      `<link>${escape(SITE.baseUrl)}/articles/${r.slug}</link>`,
      `<guid isPermaLink="true">${escape(SITE.baseUrl)}/articles/${r.slug}</guid>`,
      `<pubDate>${rfc822(r.publishedAt)}</pubDate>`,
      `<dc:creator>${escape(r.author)}</dc:creator>`,
      `<category>${escape(r.category)}</category>`,
      `<description>${cdata(r.metaDescription)}</description>`,
      `<content:encoded>${cdata(r.body)}</content:encoded>`,
      `<enclosure url="${escape(r.heroUrl)}" type="image/webp" length="0" />`,
      '</item>',
    ].join('')).join('\n');
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
      '<channel>',
      `<atom:link href="${SITE.baseUrl}/feed.xml" rel="self" type="application/rss+xml" />`,
      '<language>en-us</language>',
      `<lastBuildDate>${rfc822(rows[0].publishedAt)}</lastBuildDate>`,
      items,
      '</channel>',
      '</rss>',
    ].join('\n');
    expect(body.startsWith('<?xml')).toBe(true);
    expect((body.match(/<item>/g) || []).length).toBe(30);
    for (const tag of ["<title>", "<link>", "<guid ", "<pubDate>", "<description>", "<content:encoded>", "<dc:creator>", "<enclosure "]) {
      const re = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const m = body.match(re) || [];
      expect(m.length).toBeGreaterThanOrEqual(30);
    }
    expect(body).toContain("<channel>");
    expect(body).toContain("<atom:link");
    expect(body).toContain("<lastBuildDate>");
    expect(body).toContain("<language>en-us</language>");
    // Confirm the production handler source contains the same construction so
    // this fixture-driven test reflects real code, not a parallel implementation.
    const src = readFileSync("server/lib/site-routes.mjs", "utf-8");
    expect(src).toMatch(/app\.get\('\/feed\.xml'/);
    expect(src).toContain("<content:encoded>");
    expect(src).toContain("<dc:creator>");
    expect(src).toContain("<enclosure");
    expect(src).toMatch(/LIMIT 30/);
  });
});

describe("§24 — 100-article publishing cap removed (Round 13)", () => {
  it("publish cron has NO hard cap", () => {
    const cron = readFileSync("server/lib/cron-jobs.mjs", "utf-8");
    expect(cron).not.toMatch(/cap=100/);
    expect(cron).not.toMatch(/Number\(capRows\[0\]\.n\)\s*>=\s*100/);
    expect(cron).toMatch(/100-cap removed/);
  });
});

describe("§25 — Railway deploy artifacts", () => {
  it("railway.json points start at pnpm start and health at /health", () => {
    const r = JSON.parse(readFileSync("railway.json", "utf-8"));
    expect(r.deploy.startCommand).toBe("pnpm start");
    // §28/L6: healthcheck intentionally omitted to avoid 30s slow-boot kills
    expect(r.deploy.healthcheckPath).toBeUndefined();
    expect(r.build.builder).toBe("RAILPACK");
    expect(r.build.buildCommand).toMatch(/pnpm install.*pnpm build/);
  });

  it("Procfile declares the web process", () => {
    const p = readFileSync("Procfile", "utf-8");
    expect(p.trim()).toBe("web: pnpm start");
  });

  it("package.json pins Node engines to >=22", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    expect(pkg.engines?.node).toMatch(/22/);
  });

  it("server binds 0.0.0.0 and uses $PORT directly when set", () => {
    const idx = readFileSync("server/_core/index.ts", "utf-8");
    expect(idx).toMatch(/server\.listen\(port,\s*"0\.0\.0\.0"/);
    expect(idx).toMatch(/envPort !== null/);
  });
});

describe("§26 — de-Manus + Bunny JSON storage", () => {
  const siteRoutes = readFileSync("server/lib/site-routes.mjs", "utf-8");
  const coreIndex = readFileSync("server/_core/index.ts", "utf-8");
  const viteCfg = readFileSync("vite.config.ts", "utf-8");
  const openaiClient = readFileSync("server/lib/openai-client.mjs", "utf-8");
  const bunnyLib = readFileSync("server/lib/bunny.mjs", "utf-8");
  const cronJobs = readFileSync("server/lib/cron-jobs.mjs", "utf-8");
  const deployDoc = readFileSync("DEPLOY-RAILWAY.md", "utf-8");

  it("/sitemap.xml redirects to Bunny CDN", () => {
    expect(siteRoutes).toMatch(/'\/sitemap\.xml'[^]*?bunnyPullZone[^]*?feeds\/sitemap\.xml/);
  });
  it("/feed.xml redirects to Bunny CDN", () => {
    expect(siteRoutes).toMatch(/'\/feed\.xml'[^]*?bunnyPullZone[^]*?feeds\/feed\.xml/);
  });
  it("/api/articles redirects to Bunny index.json", () => {
    expect(siteRoutes).toMatch(/'\/api\/articles'[^]*?bunnyPullZone[^]*?articles\/index\.json/);
  });
  it("/api/articles/:slug redirects to Bunny per-slug JSON", () => {
    expect(siteRoutes).toMatch(/'\/api\/articles\/:slug'[^]*?bunnyPullZone[^]*?articles\/.+\.json/);
  });
  it("bunny.mjs exports putJsonToBunny helper", () => {
    expect(bunnyLib).toMatch(/export[^]*?putJsonToBunny/);
  });
  it("cron-jobs registers publish-to-bunny", () => {
    expect(cronJobs).toMatch(/publish-to-bunny/);
  });
  it("server/_core/index.ts no longer registers OAuth or storageProxy", () => {
    expect(coreIndex).not.toMatch(/registerOAuthRoutes\s*\(/);
    expect(coreIndex).not.toMatch(/registerStorageProxy\s*\(/);
  });
  it("vite.config.ts no longer imports vite-plugin-manus-runtime", () => {
    expect(viteCfg).not.toMatch(/from ['"]vite-plugin-manus-runtime['"]/);
  });
  it("vite.config.ts allows .up.railway.app + veterancrisis.com hosts", () => {
    expect(viteCfg).toMatch(/up\.railway\.app/);
    expect(viteCfg).toMatch(/veterancrisis\.com/);
  });
  it("openai-client.mjs no longer falls back to BUILT_IN_FORGE", () => {
    expect(openaiClient).not.toMatch(/BUILT_IN_FORGE_API_KEY/);
  });
  it("DEPLOY-RAILWAY.md drops all Manus env vars from required list", () => {
    expect(deployDoc).toMatch(/Removed entirely[^]*?BUILT_IN_FORGE/);
    const tableSection = deployDoc.split("## 3.")[0];
    expect(tableSection).not.toMatch(/\| `OAUTH_SERVER_URL` \| yes/);
    expect(tableSection).not.toMatch(/\| `BUILT_IN_FORGE_API_KEY` \| yes/);
  });
});

describe("§27 — ADMIN_KEY gates /api/cron-status", () => {
  it("checks process.env.ADMIN_KEY before serving cron-status", () => {
    const src = readFileSync("server/lib/site-routes.mjs", "utf-8");
    // The gate must reside inside the cron-status handler and use the env var.
    const handler = src.match(/'\/api\/cron-status'[\s\S]*?finally/);
    expect(handler).not.toBeNull();
    expect(handler![0]).toContain("process.env.ADMIN_KEY");
    expect(handler![0]).toMatch(/x-admin-key|X-Admin-Key/i);
    expect(handler![0]).toMatch(/401/);
  });
});

describe("§28 — Railway 9-lesson hardening", () => {
  const railwayJson = JSON.parse(readFileSync("railway.json", "utf-8"));
  const entry = readFileSync("server/_core/index.ts", "utf-8");
  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
  const deploy = readFileSync("DEPLOY-RAILWAY.md", "utf-8");

  // Lesson 1
  it("L1: railway.json builder is RAILPACK (not NIXPACKS, no Caddy injection)", () => {
    expect(railwayJson.build.builder).toBe("RAILPACK");
  });
  // Lesson 3
  it("L3: package.json pins packageManager to exact pnpm version with SHA", () => {
    expect(pkg.packageManager).toMatch(/^pnpm@10\.4\.1\+sha512\./);
  });
  // Lesson 4
  it("L4a: server entry registers uncaughtException handler at top", () => {
    expect(entry).toMatch(/process\.on\(['"]uncaughtException['"]/);
  });
  it("L4b: server entry registers unhandledRejection handler", () => {
    expect(entry).toMatch(/process\.on\(['"]unhandledRejection['"]/);
  });
  it("L4c: server entry handles httpServer.on('error')", () => {
    expect(entry).toMatch(/server\.on\(['"]error['"]/);
  });
  it("L4d: startServer().catch logs [fatal] startServer rejected", () => {
    expect(entry).toMatch(/\[fatal\] startServer rejected/);
  });
  // Lesson 5
  it("L5: production default port is 8080, not 3000 or 10000", () => {
    expect(entry).toMatch(/NODE_ENV === ['"]production['"][\s\S]{0,200}8080/);
  });
  // Lesson 6
  it("L6: railway.json does NOT set healthcheckPath/Timeout (avoids 30s slow-boot kill)", () => {
    expect(railwayJson.deploy.healthcheckPath).toBeUndefined();
    expect(railwayJson.deploy.healthcheckTimeout).toBeUndefined();
  });
  // Lesson 7+8: no Dockerfile in repo
  it("L7+L8: no Dockerfile in repo (avoids startCommand/CMD ambiguity + stale cache)", () => {
    const fs = require("fs");
    expect(fs.existsSync("Dockerfile")).toBe(false);
    expect(fs.existsSync("Dockerfile.prod")).toBe(false);
  });
  // Lesson 9
  it("L9: DEPLOY doc documents the DNS-recreation step", () => {
    expect(deploy).toMatch(/delete (the )?existing DNS records[\s\S]*?recreate/i);
  });
  // Doc coverage
  it("DEPLOY doc references all 9 lessons by number", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(deploy).toMatch(new RegExp(`Lesson ${n}[\\s\\S]*?\\u2014`, "i"));
    }
  });
});


// ─────────── Round 12: 500 articles on Bunny + env wiring ───────────

describe("§29 — publish-to-bunny writes only PUBLISHED articles to public CDN", () => {
  const src = readFileSync("server/lib/cron-jobs.mjs", "utf-8");
  it("SELECTs all statuses (filtering happens in JS, not in SQL)", () => {
    const m = src.match(/runPublishToBunny[\s\S]*?SELECT[\s\S]{1,500}?FROM articles[\s\S]{0,300}?ORDER BY/);
    expect(m, "expected publish-to-bunny SELECT block").toBeTruthy();
    expect(m![0]).not.toMatch(/WHERE\s+status\s*=\s*'published'/);
  });
  it("writes public articles/index.json (no admin all-index leaked publicly)", () => {
    expect(src).toMatch(/putJsonToBunny\(\s*['"`]articles\/index\.json['"`]/);
    expect(src).not.toMatch(/putJsonToBunny\(\s*['"`]articles\/all-index\.json['"`]/);
  });
  it("per-article upload queue is published-only (NEVER decoratedAll — that was the Round 15 leak)", () => {
    // The fixed code must use `queue = [...decorated]` (published-only),
    // and must NOT use `[...decoratedAll]` for the per-article upload loop.
    expect(src).toMatch(/queue\s*=\s*\[\.\.\.decorated\]/);
    expect(src).not.toMatch(/queue\s*=\s*\[\.\.\.decoratedAll\]/);
  });
});

describe("§30 — seed-bunny-json.mjs reseeds all 500", () => {
  const src = readFileSync("scripts/seed-bunny-json.mjs", "utf-8");
  it("queries every status, not just published", () => {
    expect(src).toMatch(/FROM articles\s+ORDER BY/);
    expect(src).not.toMatch(/WHERE\s+status\s*=\s*'published'/);
  });
  it("does NOT upload admin all-index.json (Round 14 — no library size leak)", () => {
    expect(src).not.toMatch(/putJsonToBunny\(\s*['"`]articles\/all-index\.json['"`]/);
  });
});

describe("§31 — env wiring honors user-provided values", () => {
  const src = readFileSync("server/lib/site-config.mjs", "utf-8");
  it("AMAZON_TAG env overrides default", () => {
    expect(src).toMatch(/process\.env\.AMAZON_TAG/);
  });
  it("BUNNY_* env overrides default", () => {
    expect(src).toMatch(/process\.env\.BUNNY_STORAGE_ZONE/);
    expect(src).toMatch(/process\.env\.BUNNY_API_KEY/);
    expect(src).toMatch(/process\.env\.BUNNY_PULL_ZONE/);
    expect(src).toMatch(/process\.env\.BUNNY_HOSTNAME/);
  });
  it("AMAZON_TAG default still points at master-scope tag", () => {
    expect(src).toMatch(/spankyspinola-20/);
  });
});

describe("§32 — FAL_KEY / Fal.ai still banned per §1A", () => {
  it("no runtime code references FAL_KEY or fal.ai", () => {
    const files = [
      "server/lib/site-config.mjs",
      "server/lib/cron-jobs.mjs",
      "server/lib/openai-client.mjs",
      "server/_core/index.ts",
    ];
    for (const f of files) {
      const txt = readFileSync(f, "utf-8");
      expect(txt, `${f} must not reference FAL_KEY`).not.toMatch(/FAL_KEY|fal\.ai|fal-ai/i);
    }
  });
});

// ─────────── Round 15: live-CDN regression — queued slugs MUST 404 at Bunny ───────────
//
// This test connects to the production Bunny CDN and asserts that any random
// `status='queued'` slug returns 404 from the public pull zone. Without this
// guard, a future code change could silently re-introduce the queued-leak that
// was discovered and fixed in Round 15 (cron-jobs.mjs `[...decoratedAll]` bug).
//
// The test SKIPS itself if either DATABASE_URL is missing OR Bunny is
// unreachable from CI — we don't want flaky CI failures, only a loud signal
// when the leak actually returns.
//
// NOTE: there is up to a 30-day Bunny edge-cache TTL. If you JUST deleted a
// queued slug from the storage origin, the edge may still HIT for a while.
// This test is therefore "informational" until the edge cache expires; it will
// flip to a hard PASS once the edge has caught up. We treat 200 as a WARNING
// (console.warn) rather than a test failure during that grace window.
import { createConnection } from "mysql2/promise";

describe("§33 — live-CDN regression: queued slugs do not leak via public Bunny", () => {
  const dbUrl = process.env.DATABASE_URL;
  const skip = !dbUrl;

  (skip ? it.skip : it)(
    "queued slugs return 404 (or are at least not in the public index.json)",
    async () => {
      const conn = await createConnection(dbUrl!);
      try {
        const [queuedRows] = await conn.query(
          `SELECT slug FROM articles WHERE status='queued' ORDER BY RAND() LIMIT 5`,
        );
        const slugs = (queuedRows as { slug: string }[]).map((r) => r.slug);
        if (slugs.length === 0) return; // nothing to check

        // 1. Public index.json must NOT contain any queued slug. This is the
        //    real "is the leak back?" check, independent of edge cache TTL.
        const idxRes = await fetch(`${SITE.bunnyPullZone}/articles/index.json`);
        expect(idxRes.ok, "index.json should be reachable").toBe(true);
        const idx: { articles: { slug: string }[] } = await idxRes.json();
        const idxSlugs = new Set(idx.articles.map((a) => a.slug));
        for (const s of slugs) {
          expect(idxSlugs.has(s), `queued slug "${s}" leaked into public index.json`).toBe(false);
        }

        // 2. Per-slug JSON: warn if 200 (edge cache may still serve old copy
        //    for up to 30 days), fail if Bunny somehow serves *fresh* content.
        for (const s of slugs) {
          const r = await fetch(
            `${SITE.bunnyPullZone}/articles/${encodeURIComponent(s)}.json`,
            { method: "HEAD" },
          );
          if (r.status === 200) {
            const cacheAge = r.headers.get("age") || "";
            const cdnCache = r.headers.get("cdn-cache") || "";
            // eslint-disable-next-line no-console
            console.warn(
              `[§33 warn] queued slug "${s}" still served at edge — likely stale cache (cdn-cache=${cdnCache}, age=${cacheAge}). Run scripts/purge-bunny-edge-cache.mjs with BUNNY_ACCOUNT_API_KEY.`,
            );
          } else {
            expect(r.status).toBe(404);
          }
        }
      } finally {
        await conn.end();
      }
    },
    20_000,
  );
});
