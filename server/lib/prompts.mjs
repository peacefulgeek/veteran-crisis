import { SITE, VOICE, RESEARCHERS, AUTH_SOURCES } from './site-config.mjs';
import { AI_FLAGGED_WORDS, AI_FLAGGED_PHRASES } from './article-quality-gate.mjs';

export function buildVoiceSpecPrompt() {
  return `VOICE SPEC — The Oracle Lover (this site: ${SITE.name})
${VOICE.guide}

NICHE MODIFIER:
${VOICE.nicheModifier}

Use 3 to 5 of these signature phrases (vary across articles, never copy verbatim):
${VOICE.signaturePhrases.map(p => `- ${p}`).join('\n')}

Niche-specific phrases to draw on:
${VOICE.nichePhrases.map(p => `- ${p}`).join('\n')}

Researchers you may cite (rotate; never lean on one more than ~25%):
${RESEARCHERS.join(', ')}.`;
}

export function buildEEATPrompt() {
  return `EEAT REQUIREMENTS (every article):
1. Open with a 3-sentence TL;DR wrapped in:
   <section data-tldr="ai-overview" aria-label="In short">...</section>
2. Use a self-referencing line ("In our experience...", "Across the dozens of articles we\u2019ve published on this site...", "When I tested...", "Over the years I\u2019ve seen...", "In my own practice...", "After years of working with veterans on this..."). Vary across articles.
3. Weave in at least 3 internal links to other articles on this site (use the candidates supplied in HARD RULES).
4. Include at least one external authoritative link to .gov / .edu / NIH / CDC / VA / journal source.
5. Include a last-updated <time datetime="YYYY-MM-DD">YYYY-MM-DD</time> inside the byline.
6. End with the byline block exactly:
<aside class="author-byline" data-eeat="author">
  <p><strong>Reviewed by ${SITE.author}</strong>, ${SITE.authorCred}. Last updated <time datetime="\${today}">\${today}</time>.</p>
  <p>One or two warm sentences of self-referencing context.</p>
</aside>`;
}

export function buildHardRulesPrompt({ products = [], internalLinks = [], today, openerHint, conclusionHint, externalSource, includeBacklink } = {}) {
  const productLines = products
    .map(
      p =>
        `- ${p.name} (ASIN ${p.asin}) \u2014 use a soft conversational lead-in like "One option that helps with this is" and link as <a href="https://www.amazon.com/dp/${p.asin}?tag=${SITE.amazonTag}" target="_blank" rel="nofollow sponsored noopener">${p.name}</a> (paid link).`,
    )
    .join('\n');

  const internalLines = internalLinks.length
    ? internalLinks
        .map(l => `- /articles/${l.slug} \u2014 anchor like "${l.title}" or a varied phrase`)
        .join('\n')
    : '- (none yet — invent up to 3 plausible internal slugs from this site\u2019s niche, e.g. /articles/identity-after-discharge, /articles/va-disability-101, /articles/civilian-resume-translation)';

  const ext = externalSource || AUTH_SOURCES[Math.floor(Math.random() * AUTH_SOURCES.length)];

  return `HARD RULES (zero tolerance — failing any rule means the article will be rejected):
- Length: 1,200 to 2,500 words. Target 1,800 to 2,000.
- No em-dashes (\u2014) and no en-dashes (\u2013). Use periods or commas.
- Never use these words (case-insensitive): ${AI_FLAGGED_WORDS.join(', ')}.
- Never use these phrases (case-insensitive): ${AI_FLAGGED_PHRASES.map(p => `"${p}"`).join(', ')}.
- Output: pure HTML body, no <html>/<head>/<body> wrappers, no markdown.
- Structure: TL;DR section first, then 3 to 5 H2 sections (with H3s where helpful), then a closing section, then the author byline.
- Opener type: ${openerHint || 'gut-punch statement'}. No marketing voice; sound human.
- Conclusion type: ${conclusionHint || 'reflection'}. End with one Sanskrit-style closing line in <em>...</em>.
- Use 3 to 4 of the products listed below as Amazon links. Each ends with "(paid link)".
- Use 3 internal links to articles on this site (anchor text varies per article).
- Use 1 external authoritative link to: ${ext.name} \u2014 ${ext.url}. Format: <a href="${ext.url}" target="_blank" rel="nofollow noopener">descriptive anchor</a>.
${includeBacklink ? `- Include exactly one natural mention of The Oracle Lover\u2019s site, varied anchor text, linking to ${SITE.authorUrl}.` : ''}

PRODUCTS (pick 3-4):
${productLines}

INTERNAL-LINK CANDIDATES:
${internalLines}

TODAY\u2019S DATE: ${today}.`;
}
