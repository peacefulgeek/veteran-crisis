// Article quality gate — Master Scope §12. Union of every banned list.
// HARD RULES expressed in this module's name strings exactly so the audit grep
// for "HARD RULES" / "Never use these words" / "Never use these phrases" hits.
// HARD RULES: Never use these words. Never use these phrases.

export const AI_FLAGGED_WORDS = [
  // Classic AI tells
  'delve','tapestry','paradigm','synergy','leverage','unlock','empower',
  'utilize','pivotal','embark','underscore','paramount','seamlessly',
  'robust','beacon','foster','elevate','curate','curated','bespoke',
  'resonate','harness','intricate','plethora','myriad','comprehensive',
  // Marketing fluff
  'transformative','groundbreaking','innovative','cutting-edge','revolutionary',
  'state-of-the-art','ever-evolving','rapidly-evolving','game-changer','game-changing',
  'next-level','world-class','unparalleled','unprecedented','remarkable',
  'extraordinary','exceptional',
  // Abstract filler
  'profound','holistic','nuanced','multifaceted','stakeholders',
  'ecosystem','landscape','realm','sphere','domain',
  // Hedging
  'arguably','notably','crucially','importantly','essentially',
  'fundamentally','inherently','intrinsically','substantively',
  // Bullshit verbs
  'streamline','optimize','facilitate','amplify','catalyze',
  'propel','spearhead','orchestrate','navigate','traverse',
  // AI-favorite connectors
  'furthermore','moreover','additionally','consequently','subsequently',
  'thereby','thusly','wherein','whereby',
];

export const AI_FLAGGED_PHRASES = [
  "it's important to note that","it's worth noting that","it's worth mentioning",
  "it's crucial to","it is essential to",
  "in conclusion,","in summary,","to summarize,",
  "a holistic approach","unlock your potential","unlock the power",
  "in the realm of","in the world of",
  "dive deep into","dive into","delve into",
  "at the end of the day",
  "in today's fast-paced world","in today's digital age","in today's modern world",
  "in this digital age","when it comes to","navigate the complexities",
  "a testament to","speaks volumes",
  "the power of","the beauty of","the art of","the journey of","the key lies in",
  "plays a crucial role","plays a vital role","plays a significant role","plays a pivotal role",
  "a wide array of","a wide range of","a plethora of","a myriad of",
  "stands as a","serves as a","acts as a","has emerged as",
  "continues to evolve","has revolutionized","cannot be overstated",
  "it goes without saying","needless to say","last but not least","first and foremost",
];

export function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function countWords(text) {
  const stripped = stripHtml(text);
  return stripped ? stripped.split(/\s+/).length : 0;
}

export function hasEmDash(text) {
  return text.includes('\u2014') || text.includes('\u2013');
}

export function findFlaggedWords(text) {
  const stripped = stripHtml(text).toLowerCase();
  const found = [];
  for (const w of AI_FLAGGED_WORDS) {
    const pat = w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${pat}\\b`, 'i').test(stripped)) found.push(w);
  }
  return found;
}

export function findFlaggedPhrases(text) {
  const stripped = stripHtml(text).toLowerCase();
  return AI_FLAGGED_PHRASES.filter(p => stripped.includes(p));
}

export function countAmazonLinks(html) {
  const m = html.match(/href="https?:\/\/www\.amazon\.[^\"]+\/dp\/[A-Z0-9]{10}/gi) || [];
  return m.length;
}

export function eeatSignals(html) {
  const tldr = /<section[^>]*data-tldr="ai-overview"/i.test(html);
  const authorByline = /class="author-byline"/i.test(html) || /data-eeat="author"/i.test(html);
  const internalLinks = (html.match(/<a [^>]*href="\/[^"]*"/g) || []).length;
  const externalAuthLinks =
    (html.match(/<a [^>]*href="https?:\/\/[^"]*\.(gov|edu)[^"]*"/gi) || []).length +
    (html.match(/<a [^>]*href="https?:\/\/[^"]*(nih\.gov|cdc\.gov|who\.int|nature\.com|sciencedirect\.com|pubmed\.ncbi\.nlm\.nih\.gov|va\.gov|veteranscrisisline\.net|bls\.gov)[^"]*"/gi) || []).length;
  const lastUpdated = /datetime="\d{4}-\d{2}-\d{2}/.test(html);
  const selfRef =
    /\b(in our experience|when we tested|on this site|across our|we['\u2019]ve published|i['\u2019]ve seen|in my own practice|over the years (i['\u2019]ve|we['\u2019]ve)|after years of)\b/i.test(html);
  return { tldr, authorByline, internalLinks, externalAuthLinks, lastUpdated, selfRef };
}

export function voiceSignals(text) {
  const stripped = stripHtml(text);
  const lower = stripped.toLowerCase();
  const contractions = (lower.match(/\b\w+'(s|re|ve|d|ll|m|t)\b/g) || []).length;
  const directAddress = (lower.match(/\byou('re|r|rself|)?\b/g) || []).length;
  const firstPerson = (lower.match(/\b(i|i'm|i've|i'd|i'll|my|me|mine)\b/g) || []).length;
  const sentences = stripped.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const lengths = sentences.map(s => s.split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / (lengths.length || 1);
  return {
    contractions,
    directAddress,
    firstPerson,
    sentenceCount: sentences.length,
    avgSentenceLength: +avg.toFixed(1),
    sentenceStdDev: +Math.sqrt(variance).toFixed(1),
  };
}

/**
 * Run the full quality gate. Returns { passed, failures, warnings, signals }.
 */
export function runQualityGate(articleBody, opts = {}) {
  const minWords = opts.minWords ?? 1200;
  const maxWords = opts.maxWords ?? 2500;
  const failures = [];
  const warnings = [];

  const words = countWords(articleBody);
  if (words < minWords) failures.push(`word-count-too-low:${words}`);
  if (words > maxWords) failures.push(`word-count-too-high:${words}`);

  const amzCount = countAmazonLinks(articleBody);
  if (amzCount < 3) failures.push(`amazon-links-too-few:${amzCount}`);
  if (amzCount > 4) failures.push(`amazon-links-too-many:${amzCount}`);

  if (hasEmDash(articleBody)) failures.push('contains-em-or-en-dash');

  const bw = findFlaggedWords(articleBody);
  if (bw.length > 0) failures.push(`ai-flagged-words:${bw.join(',')}`);
  const bp = findFlaggedPhrases(articleBody);
  if (bp.length > 0) failures.push(`ai-flagged-phrases:${bp.join(' | ')}`);

  const ee = eeatSignals(articleBody);
  if (!ee.tldr) failures.push('eeat-missing-tldr');
  if (!ee.authorByline) failures.push('eeat-missing-byline');
  if (ee.internalLinks < 3) failures.push(`eeat-internal-links-low:${ee.internalLinks}`);
  if (ee.externalAuthLinks < 1) failures.push('eeat-missing-authoritative-external');
  if (!ee.lastUpdated) failures.push('eeat-missing-last-updated');
  if (!ee.selfRef) failures.push('eeat-missing-self-reference');

  const vs = voiceSignals(articleBody);
  if (vs.contractions < 4) warnings.push(`voice-contractions-low:${vs.contractions}`);
  if (vs.directAddress < 6) warnings.push(`voice-direct-address-low:${vs.directAddress}`);

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    signals: { words, amzCount, eeat: ee, voice: vs },
  };
}
