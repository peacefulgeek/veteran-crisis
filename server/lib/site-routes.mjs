import { getConn } from './articles-db.mjs';
import { SITE } from './site-config.mjs';

/**
 * Per-article SSR meta injector. When a crawler hits /articles/:slug, we
 * rewrite the title / description / canonical / og:image / twitter:image so
 * Facebook, LinkedIn, X, and Slack render a real share card with the
 * Bunny-hosted 1200x630 OG image we built. SPA hydration still runs after.
 *
 * Mounted BEFORE the Vite/static catch-all but AFTER the WWW redirect.
 */
export function articleMetaInjector() {
  return async function (req, res, next) {
    const m = req.path.match(/^\/articles\/([a-z0-9-]+)\/?$/);
    if (!m) return next();
    // In dev mode, Vite middlewares wrap everything; the SSR injector is a no-op there.
    // Crawlers in prod path get the meta card; SPA users get full hydration regardless.
    if (process.env.NODE_ENV !== 'production') return next();
    // Only intercept HTML navigations
    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) return next();
    try {
      const conn = await getConn();
      const [rows] = await conn.query(
        "SELECT slug, title, excerpt, ogImage, heroUrl, publishedAt FROM articles WHERE slug=? AND status='published' LIMIT 1",
        [m[1]]
      );
      const row = rows[0];
      if (!row) return next();
      // Stash on req so the SPA bootstrap (Vite middleware) can read it; we
      // also set Link rel="canonical" header for crawlers that don't run JS.
      const ogUrl = row.ogImage || row.heroUrl;
      const canonical = `${SITE.baseUrl}/articles/${row.slug}`;
      res.setHeader('Link', `<${canonical}>; rel="canonical", <${ogUrl}>; rel="image_src"`);
      // Inject meta via response interception. We let next() run, then in 'finish'
      // we have nothing to do; the cleanest path is to ship a small HTML shim
      // for crawler UAs only.
      const ua = (req.headers['user-agent'] || '').toLowerCase();
      const isCrawler = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|discord|telegram/.test(ua);
      if (isCrawler) {
        const safe = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const title = safe(row.title) + ' | ' + SITE.name;
        const desc = safe(row.excerpt || `${row.title}. Practical, plainspoken guidance for veterans navigating the transition home.`);
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="article:published_time" content="${(row.publishedAt instanceof Date ? row.publishedAt : new Date(row.publishedAt)).toISOString()}">
<meta property="article:author" content="${SITE.author}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogUrl}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: row.title,
          image: ogUrl,
          datePublished: (row.publishedAt instanceof Date ? row.publishedAt : new Date(row.publishedAt)).toISOString(),
          author: { '@type': 'Person', name: SITE.author, url: `${SITE.baseUrl}/author/the-oracle-lover` },
          publisher: { '@type': 'Organization', name: SITE.name, url: SITE.baseUrl },
          mainEntityOfPage: canonical,
        })}</script>
<meta http-equiv="refresh" content="0;url=${canonical}">
</head>
<body><p>Loading <a href="${canonical}">${safe(row.title)}</a>…</p></body>
</html>`;
        return res.set('Cache-Control', 'public, max-age=300').type('text/html').send(html);
      }
      return next();
    } catch (e) {
      console.error('[articleMetaInjector]', e.message);
      return next();
    }
  };
}

/**
 * Master scope §2 + §6: the WWW->apex 301 must be the FIRST middleware. We export
 * it separately so server/_core/index.ts can mount it before anything else.
 */
export function wwwToApexRedirect() {
  return function (req, res, next) {
    const host = (req.headers.host || '').toLowerCase();
    if (host.startsWith('www.')) {
      const apex = host.replace(/^www\./, '');
      return res.redirect(301, `https://${apex}${req.originalUrl}`);
    }
    next();
  };
}

/**
 * All public site routes. Mount AFTER the WWW redirect, BEFORE the OAuth/tRPC layer.
 */
export function registerSiteRoutes(app) {
  // ── health
  app.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({
      ok: true,
      site: SITE.name,
      apex: SITE.apex,
      time: new Date().toISOString(),
    });
  });

  app.get('/api/health', (_req, res) => res.redirect(307, '/health'));

  // ── robots.txt
  app.get('/robots.txt', (_req, res) => {
    res
      .set('Cache-Control', 'public, max-age=86400')
      .type('text/plain')
      .send(
        [
          'User-agent: *',
          'Allow: /',
          '',
          'User-agent: GPTBot',
          'Allow: /',
          '',
          'User-agent: ClaudeBot',
          'Allow: /',
          '',
          'User-agent: PerplexityBot',
          'Allow: /',
          '',
          'User-agent: Google-Extended',
          'Allow: /',
          '',
          `Sitemap: ${SITE.baseUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      );
  });

  // ── sitemap.xml (DB-driven, full)
  app.get('/sitemap.xml', async (_req, res) => {
    const conn = await getConn();
    try {
      const [rows] = await conn.query(
        `SELECT slug, lastModifiedAt, publishedAt FROM articles WHERE status='published' ORDER BY publishedAt DESC LIMIT 5000`,
      );
      const staticPaths = [
        '/', '/articles', '/about', '/recommended',
        '/privacy', '/disclosures', '/contact',
        `/author/${SITE.authorSlug}`,
      ];
      const today = new Date().toISOString().slice(0, 10);
      const urls = [
        ...staticPaths.map(p => `<url><loc>${SITE.baseUrl}${p}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`),
        ...rows.map(r => {
          const d = (r.publishedAt || r.lastModifiedAt || new Date()).toISOString().slice(0, 10);
          return `<url><loc>${SITE.baseUrl}/articles/${r.slug}</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
        }),
      ].join('\n');
      res
        .set('Cache-Control', 'public, max-age=600')
        .type('application/xml')
        .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
    } catch (e) {
      res.status(500).type('text/plain').send('sitemap error');
    } finally {
      await conn.end();
    }
  });

  // ── llms.txt + llms-full.txt
  app.get('/llms.txt', (_req, res) => {
    res
      .set('Cache-Control', 'public, max-age=86400')
      .type('text/plain')
      .send(
        [
          `# ${SITE.name}`,
          '',
          `> ${SITE.oneLine}`,
          '',
          `Author: ${SITE.author}`,
          `Site: ${SITE.baseUrl}`,
          '',
          '## Editorial pillars',
          '- Identity after the uniform',
          '- The VA, GI Bill, and benefits in plain language',
          '- Career translation and civilian workplace culture',
          '- Mental health, moral injury, and trauma-informed practice',
          '- Family, marriage, and reintegration',
          '- Practical financial transition',
          '',
          'AI bots welcome.',
          '',
        ].join('\n'),
      );
  });

  app.get('/llms-full.txt', async (_req, res) => {
    const conn = await getConn();
    try {
      const [rows] = await conn.query(
        `SELECT slug, title, metaDescription, category, tags, publishedAt
           FROM articles WHERE status='published' ORDER BY publishedAt DESC LIMIT 1000`,
      );
      const lines = [
        `# ${SITE.name} — full index`,
        '',
        `Author: ${SITE.author}`,
        `Site: ${SITE.baseUrl}`,
        '',
        '## Articles',
        ...rows.map(
          r =>
            `- [${r.title}](${SITE.baseUrl}/articles/${r.slug}) — ${r.category} — ${(r.metaDescription || '').slice(0, 200)}`,
        ),
      ];
      res.set('Cache-Control', 'public, max-age=3600').type('text/plain').send(lines.join('\n'));
    } catch (e) {
      res.status(500).type('text/plain').send('llms-full error');
    } finally {
      await conn.end();
    }
  });

  // ── public JSON: list of published articles
  app.get('/api/articles', async (req, res) => {
    const conn = await getConn();
    try {
      const limit = Math.min(parseInt(req.query.limit) || 60, 200);
      const [rows] = await conn.query(
        `SELECT slug, title, metaDescription, category, tags, heroUrl, heroAlt, author, publishedAt, readingTime
           FROM articles WHERE status='published' ORDER BY publishedAt DESC LIMIT ?`,
        [limit],
      );
      const safe = v => { if (v == null) return []; if (Array.isArray(v) || typeof v === 'object') return v; if (typeof v !== 'string') return []; try { return JSON.parse(v); } catch { return []; } };
      res.set('Cache-Control', 'public, max-age=120').json({
        articles: rows.map(r => ({ ...r, tags: safe(r.tags) })),
      });
    } catch (e) {
      res.status(500).json({ error: 'list-articles-failed' });
    } finally {
      await conn.end();
    }
  });

  // ── public JSON: single article
  app.get('/api/articles/:slug', async (req, res) => {
    const conn = await getConn();
    try {
      const [rows] = await conn.query(
        `SELECT slug, title, metaDescription, body, category, tags, heroUrl, heroAlt, ogImage, author, publishedAt, lastModifiedAt, readingTime, wordCount
           FROM articles WHERE status='published' AND slug=?`,
        [req.params.slug],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not-found' });
      const a = rows[0];
      const safe = v => { if (v == null) return []; if (Array.isArray(v) || typeof v === 'object') return v; if (typeof v !== 'string') return []; try { return JSON.parse(v); } catch { return []; } };
      res.set('Cache-Control', 'public, max-age=300').json({
        ...a,
        tags: safe(a.tags),
      });
    } catch (e) {
      res.status(500).json({ error: 'article-fetch-failed' });
    } finally {
      await conn.end();
    }
  });

  // ── product catalog (Veteran Transition Library)
  app.get('/api/products', async (_req, res) => {
    try {
      const m = await import('./product-catalog.mjs');
      res.set('Cache-Control', 'public, max-age=600').json({ products: m.PRODUCT_CATALOG });
    } catch (e) {
      res.status(500).json({ error: 'products-failed' });
    }
  });

  // ── supplements / TCM / herbs catalog (208 verified ASINs, tag spankyspinola-20)
  app.get('/api/supplements', async (_req, res) => {
    try {
      const m = await import('./supplements-catalog.mjs');
      res.set('Cache-Control', 'public, max-age=600').json({
        supplements: m.SUPPLEMENTS,
        categories: m.SUPPLEMENT_CATEGORIES,
        count: m.SUPPLEMENT_COUNT,
      });
    } catch (e) {
      res.status(500).json({ error: 'supplements-failed' });
    }
  });

  // ── assessments (nurturing, non-clinical self-checks for veterans)
  app.get('/api/assessments', async (_req, res) => {
    try {
      const m = await import('./assessments.mjs');
      res.set('Cache-Control', 'public, max-age=600').json({ assessments: m.ASSESSMENTS });
    } catch (e) {
      res.status(500).json({ error: 'assessments-failed' });
    }
  });

  // ── contact form (in-DB log via cron_runs as a simple bin)
  app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'missing-fields' });
    if (String(message).length > 8000) return res.status(413).json({ error: 'too-long' });
    const conn = await getConn();
    try {
      await conn.query(
        `INSERT INTO cron_runs (job, finishedAt, status, detail) VALUES ('contact-form', NOW(), 'ok', ?)`,
        [`from=${name} <${email}>: ${String(message).slice(0, 60000)}`],
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'contact-failed' });
    } finally {
      await conn.end();
    }
  });

  // ── cron status (auth-light: just exposes the run log)
  app.get('/api/cron-status', async (_req, res) => {
    const conn = await getConn();
    try {
      const [rows] = await conn.query(
        `SELECT job, status, startedAt, finishedAt, detail FROM cron_runs ORDER BY id DESC LIMIT 80`,
      );
      const [pubByDate] = await conn.query(
        `SELECT DATE(publishedAt) AS d, COUNT(*) AS n
           FROM articles WHERE status='published' AND publishedAt IS NOT NULL
          GROUP BY DATE(publishedAt) ORDER BY d DESC LIMIT 30`,
      );
      const [counts] = await conn.query(`SELECT status, COUNT(*) AS n FROM articles GROUP BY status`);
      res.json({ runs: rows, publishedByDate: pubByDate, counts });
    } catch (e) {
      res.status(500).json({ error: 'cron-status-failed' });
    } finally {
      await conn.end();
    }
  });
}
