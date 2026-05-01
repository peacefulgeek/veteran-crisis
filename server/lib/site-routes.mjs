import { getConn } from './articles-db.mjs';
import { SITE } from './site-config.mjs';

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
        `SELECT slug, title, metaDescription, body, category, tags, heroUrl, heroAlt, author, publishedAt, lastModifiedAt, readingTime, wordCount
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
