// Article writer (master scope §11 + Final Pass) with §12A regen loop.
// Engine priority: Claude (claude-sonnet-4-5) -> OpenAI/DeepSeek -> template
// fallback. Each LLM gets up to 3 attempts before we move to the next.

import { claude, CLAUDE_MODEL, claudeConfigured, markClaudeUnusable } from './claude-client.mjs';
import { openai, MODEL as OPENAI_MODEL, llmConfigured, markModelUnusable } from './openai-client.mjs';
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

  const system = `${buildVoiceSpecPrompt()}\n\n${buildEEATPrompt()}\n\n${buildHardRulesPrompt({
    products,
    internalLinks: relatedArticles.slice(0, 6),
    today,
    openerHint: openerType,
    conclusionHint: conclusionType,
    externalSource: ext,
    includeBacklink,
  })}`;
  const userPrompt =
    `Write the article on this topic for ${SITE.name}: "${topic}". Category: ${category}. ` +
    `Tags: ${tags.join(', ')}. Output pure HTML, no markdown, no <html> wrapper.`;

  // Try Claude first (master scope final pass)
  if (claudeConfigured()) {
    const result = await _attemptWithClient({
      client: claude,
      model: CLAUDE_MODEL,
      sourceLabel: 'claude',
      system,
      userPrompt,
      onUnusable: markClaudeUnusable,
    });
    if (result.body) {
      return {
        ...result,
        productsUsed: products.map(p => p.asin),
        internalLinksUsed: relatedArticles.slice(0, 3).map(a => a.slug),
      };
    }
  }

  // Then OpenAI/DeepSeek
  if (llmConfigured()) {
    const result = await _attemptWithClient({
      client: openai,
      model: OPENAI_MODEL,
      sourceLabel: openai?.baseURL?.toString().includes('deepseek') ? 'deepseek' : 'openai',
      system,
      userPrompt,
      onUnusable: markModelUnusable,
    });
    if (result.body) {
      return {
        ...result,
        productsUsed: products.map(p => p.asin),
        internalLinksUsed: relatedArticles.slice(0, 3).map(a => a.slug),
      };
    }
  }

  // Fallback to deterministic template
  return _fallback({
    topic, category, tags, relatedArticles,
    openerType, conclusionType, includeBacklink, today,
  });
}

async function _attemptWithClient({ client, model, sourceLabel, system, userPrompt, onUnusable }) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model,
        temperature: attempt === 1 ? 0.7 : 0.5,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      });
      const html = (res.choices?.[0]?.message?.content || '').trim();
      const gate = runQualityGate(html, { minWords: 1200, maxWords: 2500 });
      last = { html, gate };
      if (gate.passed) {
        return {
          body: html,
          source: sourceLabel,
          attempts: attempt,
        };
      }
    } catch (e) {
      const msg = String(e?.message || e);
      last = { html: '', error: msg };
      if (/unsupported model|model.*not allowed|invalid_model|invalid_api_key|authentication/i.test(msg)) {
        onUnusable?.(msg);
        break;
      }
    }
  }
  console.warn(
    `[article-writer:${sourceLabel}] failed gate after 3 attempts:`,
    last?.gate?.failures || last?.error,
  );
  return { body: null };
}

function _fallback(ctx) {
  const tpl = generateTemplateArticle(ctx);
  return { ...tpl, source: 'template', attempts: 1 };
}
