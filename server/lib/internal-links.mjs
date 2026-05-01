export function pickInternalLinks({ topic = '', tags = [], pool = [], take = 4 } = {}) {
  const tagSet = new Set((tags || []).map(t => t.toLowerCase()));
  const lowerTopic = topic.toLowerCase();
  const scored = (pool || [])
    .filter(p => p && p.slug)
    .map(p => {
      let score = 0;
      const ptags = (p.tags || []).map(t => String(t).toLowerCase());
      for (const t of ptags) if (tagSet.has(t)) score += 2;
      if (p.category && p.category.toLowerCase().includes(lowerTopic.split(' ')[0])) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.p);

  const seen = new Set();
  const picks = [];
  for (const p of scored) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    picks.push(p);
    if (picks.length >= take) break;
  }
  return picks;
}
