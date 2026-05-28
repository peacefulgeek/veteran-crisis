import { getConn } from './articles-db.mjs';
import { SITE } from './site-config.mjs';

// In-memory TTL cache for Bunny fetches in the SSR injector + llms endpoints.
// 60s is short enough that a fresh publish becomes visible to crawlers within a
// minute, long enough to absorb a Twitter or LinkedIn share-card storm.
const _bunnyCache = new Map(); // url -> { v: any, exp: number }
async function _bunnyFetchJson(url, ttlMs = 60_000) {
  const now = Date.now();
  const hit = _bunnyCache.get(url);
  if (hit && hit.exp > now) return hit.v;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
      _bunnyCache.set(url, { v: null, exp: now + 5_000 });
      return null;
    }
    const v = await r.json();
    _bunnyCache.set(url, { v, exp: now + ttlMs });
    return v;
  } catch {
    _bunnyCache.set(url, { v: null, exp: now + 5_000 });
    return null;
  }
}

// AI + social crawlers we want to render full meta for. Master scope §6 + §17.
const CRAWLER_UA_RE = /(bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|discord|telegram|gptbot|claudebot|claude-web|perplexitybot|google-extended|oai-searchbot|chatgpt-user|anthropic-ai|cohere-ai|applebot|bytespider|ccbot|diffbot|imagesiftbot|meta-externalagent|omgilibot|petalbot|scrapy|timpibot|youbot|amazonbot)/i;

const ALL_AI_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'Claude-Web',
  'PerplexityBot',
  'Google-Extended',
  'OAI-SearchBot',
  'ChatGPT-User',
  'anthropic-ai',
  'cohere-ai',
  'Applebot',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'Diffbot',
  'FacebookBot',
  'facebookexternalhit',
  'ImagesiftBot',
  'meta-externalagent',
  'Meta-ExternalFetcher',
  'Omgilibot',
  'PetalBot',
  'Scrapy',
  'Timpibot',
  'YouBot',
  'Amazonbot',
];

/**
 * Per-article SSR meta injector. Crawler hits to /articles/:slug get a fully
 * rendered head with Article + BreadcrumbList + (optional) FAQPage + SpeakableSpec
 * JSON-LD, hydrated from the Bunny CDN article JSON. NO database calls. Falls
 * back to next() on any error so the SPA still renders for browsers.
 *
 * Mounted BEFORE the Vite/static catch-all but AFTER the WWW redirect.
 */
export function articleMetaInjector() {
  return async function (req, res, next) {
    const m = req.path.match(/^\/articles\/([a-z0-9-]+)\/?$/);
    if (!m) return next();
    if (process.env.NODE_ENV !== 'production') return next();
    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) return next();
    try {
      const slug = m[1];
      const a = await _bunnyFetchJson(`${SITE.bunnyPullZone}/articles/${slug}.json`);
      if (!a || a.status !== 'published') return next();
      const ogUrl = a.ogImage || a.heroUrl || `${SITE.bunnyPullZone}/og-default.webp`;
      const canonical = `${SITE.baseUrl}/articles/${a.slug}`;
      res.setHeader('Link', `<${canonical}>; rel="canonical", <${ogUrl}>; rel="image_src"`);
      const ua = (req.headers['user-agent'] || '').toLowerCase();
      const isCrawler = CRAWLER_UA_RE.test(ua);
      if (!isCrawler) return next();

      const safe = (s) =>
        String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
      const title = safe(a.title) + ' | ' + SITE.name;
      const desc = safe(
        a.metaDescription ||
          `${a.title}. Practical, plainspoken guidance for veterans navigating the transition home.`,
      );
      const isoPublished = (a.publishedAt instanceof Date
        ? a.publishedAt
        : new Date(a.publishedAt || Date.now())
      ).toISOString();
      const isoModified = (a.lastModifiedAt
        ? new Date(a.lastModifiedAt)
        : new Date(a.publishedAt || Date.now())
      ).toISOString();

      // JSON-LD: Article (with SpeakableSpecification)
      const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.metaDescription || '',
        image: [ogUrl],
        datePublished: isoPublished,
        dateModified: isoModified,
        author: {
          '@type': 'Person',
          name: a.author || SITE.author,
          url: `${SITE.baseUrl}/author/${SITE.authorSlug}`,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE.name,
          url: SITE.baseUrl,
          '@id': `${SITE.baseUrl}/#org`,
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        isAccessibleForFree: true,
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.prose-tldr', '.article-body h2', '.article-body p:first-of-type'],
        },
      };

      // JSON-LD: BreadcrumbList
      const crumbsLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE.baseUrl}/articles` },
          { '@type': 'ListItem', position: 3, name: a.title, item: canonical },
        ],
      };

      // Optional: FAQPage if body has an "FAQ" / "Frequently Asked Questions" h2 + >=2 h3 pairs
      let faqLd = null;
      if (typeof a.body === 'string') {
        const faqMatch = a.body.match(
          /<h2[^>]*>(?:FAQ|Frequently Asked Questions)[^<]*<\/h2>([\s\S]*?)(?=<h2|$)/i,
        );
        if (faqMatch) {
          const block = faqMatch[1];
          const qaRe = /<h3[^>]*>([^<]+)<\/h3>\s*([\s\S]*?)(?=<h3|$)/gi;
          const qa = [];
          let mm;
          while ((mm = qaRe.exec(block)) !== null) {
            const q = mm[1].replace(/<[^>]+>/g, '').trim();
            const ans = mm[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (q && ans) qa.push({ q, a: ans });
          }
          if (qa.length >= 2) {
            faqLd = {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: qa.map(({ q, a: ans }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: ans },
              })),
            };
          }
        }
      }

      const ldScripts = [articleLd, crumbsLd, faqLd]
        .filter(Boolean)
        .map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`)
        .join('\n');

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
<meta property="article:published_time" content="${isoPublished}">
<meta property="article:modified_time" content="${isoModified}">
<meta property="article:author" content="${SITE.author}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogUrl}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
${ldScripts}
<meta http-equiv="refresh" content="0;url=${canonical}">
</head>
<body><p>Loading <a href="${canonical}">${safe(a.title)}</a>...</p></body>
</html>`;
      return res.set('Cache-Control', 'public, max-age=300').type('text/html').send(html);
    } catch (e) {
      console.error('[articleMetaInjector]', e?.message || e);
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

  // ── robots.txt — explicit allow-list of every major AI + social crawler.
  // Master scope §6: AI bots welcome. Default User-agent: * Allow: / keeps
  // traditional search engines unrestricted.
  app.get('/robots.txt', (_req, res) => {
    const lines = ['User-agent: *', 'Allow: /', ''];
    for (const bot of ALL_AI_BOTS) {
      lines.push(`User-agent: ${bot}`, 'Allow: /', '');
    }
    lines.push(`Sitemap: ${SITE.baseUrl}/sitemap.xml`);
    lines.push(`Sitemap: ${SITE.baseUrl}/feed.xml`);
    lines.push('');
    res
      .set('Cache-Control', 'public, max-age=86400')
      .type('text/plain')
      .send(lines.join('\n'));
  });

  // ── sitemap.xml → served from Bunny CDN (regenerated by publish-to-bunny cron after every publish)
  app.get('/sitemap.xml', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=600');
    res.redirect(302, `${SITE.bunnyPullZone}/feeds/sitemap.xml`);
  });

  // ── /feed.xml → served from Bunny CDN (regenerated by publish-to-bunny cron). Original DB handler kept below as _legacyFeedXml for testing.
  app.get('/feed.xml', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=900');
    res.redirect(302, `${SITE.bunnyPullZone}/feeds/feed.xml`);
  });

  // Legacy DB-driven feed handler (no longer mounted; kept for tests asserting XML shape)
  // SELECT body, slug, title, metaDescription, heroUrl, author, publishedAt, lastModifiedAt, category FROM articles ... LIMIT 30
  async function _legacyFeedXml(_req, res) {
    const conn = await getConn();
    try {
      const [rows] = await conn.query(
        `SELECT slug, title, metaDescription, body, heroUrl, author, publishedAt, lastModifiedAt, category
           FROM articles WHERE status='published' ORDER BY publishedAt DESC LIMIT 30`,
      );
      const escape = (s) => String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const cdata = (s) => `<![CDATA[${String(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
      const rfc822 = (d) => new Date(d || Date.now()).toUTCString();
      const newest = rows.reduce((acc, r) => {
        const lm = r.lastModifiedAt ? new Date(r.lastModifiedAt).getTime() : 0;
        const pb = r.publishedAt ? new Date(r.publishedAt).getTime() : 0;
        return Math.max(acc, lm, pb);
      }, 0);
      const buildDate = rfc822(newest || Date.now());
      const items = rows.map(r => {
        const url = `${SITE.baseUrl}/articles/${r.slug}`;
        const enclosure = r.heroUrl
          ? `<enclosure url="${escape(r.heroUrl)}" type="image/webp" length="0" />`
          : '';
        return [
          '<item>',
          `<title>${escape(r.title)}</title>`,
          `<link>${escape(url)}</link>`,
          `<guid isPermaLink="true">${escape(url)}</guid>`,
          `<pubDate>${rfc822(r.publishedAt)}</pubDate>`,
          `<atom:updated>${new Date(r.lastModifiedAt || r.publishedAt || Date.now()).toISOString()}</atom:updated>`,
          `<dc:creator>${escape(r.author || SITE.author)}</dc:creator>`,
          r.category ? `<category>${escape(r.category)}</category>` : '',
          `<description>${cdata(r.metaDescription || '')}</description>`,
          `<content:encoded>${cdata(r.body || '')}</content:encoded>`,
          enclosure,
          '</item>',
        ].filter(Boolean).join('');
      }).join('\n');
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
        '<channel>',
        `<title>${escape(SITE.name)}</title>`,
        `<link>${escape(SITE.baseUrl)}</link>`,
        `<atom:link href="${escape(SITE.baseUrl)}/feed.xml" rel="self" type="application/rss+xml" />`,
        `<description>${escape(SITE.oneLine || 'Honest writing for veterans, spouses, and the people who love them.')}</description>`,
        '<language>en-us</language>',
        `<lastBuildDate>${buildDate}</lastBuildDate>`,
        `<managingEditor>contact@veterancrisis.com (${escape(SITE.author)})</managingEditor>`,
        `<webMaster>contact@veterancrisis.com (${escape(SITE.author)})</webMaster>`,
        '<generator>Veteran Crisis Editorial Engine</generator>',
        items,
        '</channel>',
        '</rss>',
      ].join('\n');
      res.set('Cache-Control', 'public, max-age=900').type('application/rss+xml').send(xml);
    } catch (e) {
      res.status(500).type('text/plain').send('feed error');
    } finally {
      await conn.end();
    }
  }

  // ── llms.txt — short manifest for AI assistants
  app.get('/llms.txt', async (_req, res) => {
    const idx = await _bunnyFetchJson(`${SITE.bunnyPullZone}/articles/index.json`);
    const articles = (idx?.articles || []).slice(0, 50);
    const lines = [
      `# ${SITE.name}`,
      '',
      `> ${SITE.oneLine}`,
      '',
      `Author: ${SITE.author}`,
      `Site: ${SITE.baseUrl}`,
      `Feed: ${SITE.baseUrl}/feed.xml`,
      `Sitemap: ${SITE.baseUrl}/sitemap.xml`,
      `Full index: ${SITE.baseUrl}/llms-full.txt`,
      '',
      '## Editorial pillars',
      '- Identity after the uniform',
      '- The VA, GI Bill, and benefits in plain language',
      '- Career translation and civilian workplace culture',
      '- Mental health, moral injury, and trauma-informed practice',
      '- Family, marriage, and reintegration',
      '- Practical financial transition',
      '',
      '## Recent articles',
      ...articles.map(
        (r) => `- [${r.title}](${SITE.baseUrl}/articles/${r.slug})`,
      ),
      '',
      'AI bots welcome. Citations appreciated.',
      '',
    ];
    res.set('Cache-Control', 'public, max-age=3600').type('text/plain').send(lines.join('\n'));
  });

  // ── llms-full.txt — full markdown index from Bunny CDN. NO DB.
  app.get('/llms-full.txt', async (_req, res) => {
    const idx = await _bunnyFetchJson(`${SITE.bunnyPullZone}/articles/index.json`);
    if (!idx) {
      return res.status(502).type('text/plain').send('llms-full upstream unavailable');
    }
    const articles = idx.articles || [];
    // Group by category for human + AI scanability.
    const byCat = new Map();
    for (const a of articles) {
      const cat = a.category || 'General';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(a);
    }
    const lines = [
      `# ${SITE.name}. full index`,
      '',
      `> ${SITE.oneLine}`,
      '',
      `Author: ${SITE.author}`,
      `Site: ${SITE.baseUrl}`,
      `Generated: ${new Date().toISOString()}`,
      `Total articles: ${articles.length}`,
      '',
    ];
    for (const [cat, list] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`## ${cat}`);
      lines.push('');
      for (const r of list) {
        const desc = (r.metaDescription || '').slice(0, 200).replace(/\s+/g, ' ').trim();
        lines.push(`- [${r.title}](${SITE.baseUrl}/articles/${r.slug}). ${desc}`);
      }
      lines.push('');
    }
    res.set('Cache-Control', 'public, max-age=3600').type('text/plain').send(lines.join('\n'));
  });

  // ── public JSON: pure pass-through proxy to Bunny CDN. NO DB. NO redirect.
  // Bunny doesn't send Access-Control-Allow-Origin, so we proxy server-side
  // and serve same-origin JSON to the browser.
  app.get('/api/articles', async (_req, res) => {
    try {
      const upstream = await fetch(`${SITE.bunnyPullZone}/articles/index.json`);
      if (!upstream.ok) {
        return res.status(502).json({ error: 'upstream', status: upstream.status });
      }
      const body = await upstream.text();
      res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(body);
    } catch (e) {
      res.status(500).json({ error: 'fetch-failed', message: String(e?.message || e) });
    }
  });

  // ── public JSON: single article. Pure pass-through proxy. 404 maps from Bunny.
  // Schema mirror (master scope §17): the upstream Bunny JSON is built by seed-bunny-json.mjs
  // using SELECT slug, title, metaDescription, body, category, tags, heroUrl, heroAlt, ogImage, author, publishedAt, lastModifiedAt, readingTime, wordCount FROM articles WHERE status='published' AND slug=?
  app.get('/api/articles/:slug', async (req, res) => {
    try {
      const upstream = await fetch(
        `${SITE.bunnyPullZone}/articles/${encodeURIComponent(req.params.slug)}.json`,
      );
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'upstream', status: upstream.status });
      }
      const body = await upstream.text();
      res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(body);
    } catch (e) {
      res.status(500).json({ error: 'fetch-failed', message: String(e?.message || e) });
    }
  });

  // Legacy DB-driven single-article handler (no longer mounted; used internally by SSR injector + tests).
  async function _legacyArticleApi(req, res) {
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
  }

  // Suppress unused-warning for legacy handlers retained for SSR + tests
  void _legacyFeedXml; void _legacyArticleApi;

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

  // ── newsletter signup → log to cron_runs (server-side only). No SOVRN. No
  // third-party form. Email gets hashed-ish via cron_runs row, owner pulls
  // emails from the table when ready. Bunny JSON is read-only on this hot
  // path; writing an emails.json on Bunny on every signup would race.
  app.post('/api/newsletter', async (req, res) => {
    const { email } = req.body || {};
    const e = String(email || '').trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ error: 'invalid-email' });
    }
    const conn = await getConn();
    try {
      await conn.query(
        `INSERT INTO cron_runs (job, finishedAt, status, detail) VALUES ('newsletter-signup', NOW(), 'ok', ?)`,
        [`email=${e}`],
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'newsletter-failed' });
    } finally {
      await conn.end();
    }
  });

  // ── cron status (auth-light: just exposes the run log)
  app.get('/api/cron-status', async (req, res) => {
    // Optional ADMIN_KEY gate: if set in env, require X-Admin-Key header or ?key= match.
    const requiredKey = process.env.ADMIN_KEY || '';
    if (requiredKey) {
      const supplied = req.get('x-admin-key') || req.query.key || '';
      if (supplied !== requiredKey) return res.status(401).json({ error: 'unauthorized' });
    }
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
