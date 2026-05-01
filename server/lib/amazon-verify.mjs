import { SITE } from './site-config.mjs';

export function buildAmazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${SITE.amazonTag}`;
}

export function countAmazonLinks(html) {
  const m = html.match(/href="https?:\/\/www\.amazon\.[^\"]+\/dp\/[A-Z0-9]{10}/gi) || [];
  return m.length;
}

export function extractAsinsFromText(text) {
  const out = new Set();
  const re = /\/dp\/([A-Z0-9]{10})/g;
  let m;
  while ((m = re.exec(text))) out.add(m[1]);
  return [...out];
}

/**
 * HTTP GET an ASIN to check it is live. Best-effort: Amazon often blocks bots, so
 * a 200 OR a 503 with non-empty body is treated as "probably exists"; only outright
 * 404 / 410 mark the ASIN dead.
 */
export async function verifyAsin(asin, opts = {}) {
  const url = buildAmazonUrl(asin);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(t);
    if (res.status === 404 || res.status === 410) {
      return { asin, valid: false, reason: `http-${res.status}` };
    }
    return { asin, valid: true, reason: `http-${res.status}` };
  } catch (e) {
    clearTimeout(t);
    return { asin, valid: false, reason: e.message };
  }
}

export async function verifyAsinBatch(asins, { delayMs = 2500, onProgress } = {}) {
  const results = [];
  let i = 0;
  for (const asin of asins) {
    results.push(await verifyAsin(asin));
    i++;
    if (onProgress) onProgress(i, asins.length);
    await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}
