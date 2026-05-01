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
  it("redirects www.theveteranshift.com to https://theveteranshift.com with 301", async () => {
    const mw = wwwToApexRedirect();
    const req = fakeReq("www.theveteranshift.com", "/articles/x");
    const res = fakeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    expect(res.statusCode).toBe(301);
    expect(res.headers.Location).toBe("https://theveteranshift.com/articles/x");
    expect(nextCalled).toBe(false);
  });
  it("does NOT redirect apex requests", async () => {
    const mw = wwwToApexRedirect();
    const req = fakeReq("theveteranshift.com", "/");
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
  it("apex domain", () => { expect(SITE.apex).toBe("theveteranshift.com"); });
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
    expect(body).toContain("Sitemap: https://theveteranshift.com/sitemap.xml");
  });
});
