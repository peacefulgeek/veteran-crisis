// DeepSeek-aware article writer (master scope §11) with §12A regen loop.
// On any failure (no API key, network, gate fails 3x) falls back to the
// deterministic template generator that passes the gate by construction.

import { openai, MODEL, llmConfigured, markModelUnusable } from './openai-client.mjs';
import { SITE, AUTH_SOURCES } from './site-config.mjs';
import { runQualityGate } from './article-quality-gate.mjs';
import { buildVoiceSpecPrompt, buildEEATPrompt, buildHardRulesPrompt } from './prompts.mjs';
import { generateTemplateArticle } from './template-article.mjs';
import { matchProducts } from './product-catalog.mjs';

export async function writeArticle(opts) {
  const {
    topic,
    category,
    tags = [],
    relatedArticles = [],
    openerType = 'gut-punch',
    conclusionType = 'reflection',
    includeBacklink = false,
    today = new Date().toISOString().slice(0, 10),
  } = opts;

  // Always pre-pick products and external source so prompts and template stay in sync
  const products = matchProducts({
    articleTitle: topic,
    articleTags: tags,
    articleCategory: category,
    minLinks: 3,
    maxLinks: 4,
  });
  const ext = AUTH_SOURCES[Math.floor(Math.random() * AUTH_SOURCES.length)];

  // If no LLM is configured, go straight to template
  if (!llmConfigured()) {
    return _fallback({ topic, category, tags, relatedArticles, openerType, conclusionType, includeBacklink, today });
  }

  const system = `${buildVoiceSpecPrompt()}\n\n${buildEEATPrompt()}\n\n${buildHardRulesPrompt({
    products,
    internalLinks: relatedArticles.slice(0, 6),
    today,
    openerHint: openerType,
    conclusionHint: conclusionType,
    externalSource: ext,
    includeBacklink,
  })}`;

  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        temperature: attempt === 1 ? 0.7 : 0.5,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content:
              `Write the article on this topic for ${SITE.name}: "${topic}". Category: ${category}. ` +
              `Tags: ${tags.join(', ')}. Output pure HTML, no markdown, no <html> wrapper.`,
          },
        ],
      });
      const html = (res.choices?.[0]?.message?.content || '').trim();
      const gate = runQualityGate(html, { minWords: 1200, maxWords: 2500 });
      last = { html, gate };
      if (gate.passed) {
        return {
          body: html,
          productsUsed: products.map(p => p.asin),
          internalLinksUsed: relatedArticles.slice(0, 3).map(a => a.slug),
          source: 'deepseek',
          attempts: attempt,
        };
      }
    } catch (e) {
      const msg = String(e.message || e);
      last = { html: '', error: msg };
      // If the upstream proxy says the model is unsupported, give up on the LLM
      // for the rest of this process and fall back to template (master scope
      // forbids switching to gpt-4.1-mini/nano/gemini).
      if (/Unsupported model|model.*not allowed|invalid_model/i.test(msg)) {
        markModelUnusable(msg);
        break;
      }
    }
  }

  console.warn('[article-writer] DeepSeek failed gate after 3 attempts:', last?.gate?.failures || last?.error);
  return _fallback({ topic, category, tags, relatedArticles, openerType, conclusionType, includeBacklink, today });
}

function _fallback(ctx) {
  const tpl = generateTemplateArticle(ctx);
  return { ...tpl, source: 'template', attempts: 1 };
}
