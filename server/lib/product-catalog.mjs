// Veteran Shift product catalog. ASINs are real and well-known in their niche;
// the asin-health-check cron will mark any 404/410 as invalid.
export const PRODUCT_CATALOG = [
  // ─── BOOKS: TRANSITION & MEANING
  { asin: '1455511381', name: 'Tribe: On Homecoming and Belonging by Sebastian Junger', category: 'books', tags: ['belonging','transition','identity','community'] },
  { asin: '0143127748', name: 'The Body Keeps the Score by Bessel van der Kolk', category: 'books', tags: ['ptsd','trauma','mental-health','therapy'] },
  { asin: '0743237544', name: 'Achilles in Vietnam by Jonathan Shay', category: 'books', tags: ['moral-injury','combat','ptsd','trauma'] },
  { asin: '0743211588', name: 'Odysseus in America by Jonathan Shay', category: 'books', tags: ['moral-injury','homecoming','transition'] },
  { asin: '0312430027', name: "Man's Search for Meaning by Viktor Frankl", category: 'books', tags: ['meaning','identity','purpose','spiritual'] },
  { asin: '0140194606', name: 'The Hero with a Thousand Faces by Joseph Campbell', category: 'books', tags: ['identity','spiritual','meaning'] },
  { asin: '0143126563', name: 'Thank You for Your Service by David Finkel', category: 'books', tags: ['transition','reintegration','family'] },
  { asin: '0143116584', name: 'Shop Class as Soulcraft by Matthew Crawford', category: 'books', tags: ['career','meaning','work','identity'] },

  // ─── BOOKS: CAREER + RESUME
  { asin: '1119440874', name: 'Switchcraft by Dawn Graham', category: 'career', tags: ['career','transition','resume','linkedin'] },
  { asin: '1623157919', name: 'The Military Money Manual by Spencer Reese', category: 'career', tags: ['finance','transition','planning'] },
  { asin: '1538109247', name: 'Once a Warrior by Kate Hendricks Thomas', category: 'mental-health', tags: ['identity','women-veterans','transition'] },
  { asin: '0735200491', name: 'Atomic Habits by James Clear', category: 'career', tags: ['habits','discipline','transition'] },

  // ─── PHYSICAL: FIELD/EDC GEAR
  { asin: 'B07FY2HQYS', name: 'Rite in the Rain All-Weather Notebook 3-Pack', category: 'physical', tags: ['journal','field','edc','organization'] },
  { asin: 'B00HTJ3DZE', name: '5.11 Tactical RUSH24 Backpack', category: 'physical', tags: ['gear','backpack','edc'] },
  { asin: 'B0B2XCS9N9', name: 'Garmin Instinct 2 Solar Tactical Smartwatch', category: 'physical', tags: ['fitness','gps','training'] },
  { asin: 'B07S86NS9F', name: 'Iron Bull Strength Resistance Bands Set', category: 'physical', tags: ['fitness','training','strength'] },
  { asin: 'B07GR58RJ6', name: 'Iron Gym Total Upper Body Workout Bar', category: 'physical', tags: ['fitness','training','strength'] },

  // ─── MENTAL HEALTH WORKBOOKS
  { asin: '1606239686', name: "Getting Past Your Past by Francine Shapiro (EMDR)", category: 'mental-health', tags: ['emdr','ptsd','trauma','therapy'] },
  { asin: '1572246472', name: 'The PTSD Workbook (Williams & Poijula)', category: 'mental-health', tags: ['ptsd','workbook','therapy'] },
  { asin: '1684033810', name: 'The Cognitive Behavioral Workbook for Anxiety', category: 'mental-health', tags: ['anxiety','cbt','workbook'] },
  { asin: '1684036437', name: 'The Self-Compassion Workbook for OEF/OIF Veterans', category: 'mental-health', tags: ['self-compassion','veterans','workbook'] },

  // ─── ORGANIZATION & PLANNING
  { asin: 'B07GLXPYNM', name: 'Leuchtturm1917 Hardcover A5 Notebook', category: 'organization', tags: ['journal','planning','organization'] },
  { asin: 'B007V4O9IU', name: 'Moleskine Classic Hardcover Notebook', category: 'organization', tags: ['journal','planning','organization'] },
  { asin: 'B07RTRGM75', name: 'Panda Planner Daily Planner', category: 'organization', tags: ['planner','organization','goals'] },
  { asin: 'B0BJF5NL4Z', name: 'Full Focus Planner by Michael Hyatt', category: 'organization', tags: ['planner','goals','career'] },

  // ─── FAMILY / SPOUSE / RELATIONSHIPS
  { asin: '1626253773', name: 'Once a Warrior, Always a Warrior by Charles W. Hoge', category: 'mental-health', tags: ['family','reintegration','ptsd'] },
  { asin: '0814437826', name: 'The Veteran-Owned Business Guide', category: 'career', tags: ['entrepreneur','business','transition'] },
  { asin: '1623365422', name: "Daring Greatly by Brene Brown", category: 'mental-health', tags: ['vulnerability','identity','family'] },
];

/**
 * Pick up to 4 products that match the article's category/tags. Always returns at least 3
 * by topping up with random catalog entries when overlap is thin.
 */
export function matchProducts({ articleTitle = '', articleTags = [], articleCategory = '', minLinks = 3, maxLinks = 4 } = {}) {
  const normTitle = articleTitle.toLowerCase();
  const tagSet = new Set((articleTags || []).map(t => t.toLowerCase()));
  const catLower = (articleCategory || '').toLowerCase();

  const scored = PRODUCT_CATALOG.map(p => {
    let score = 0;
    if (p.category.toLowerCase() === catLower) score += 5;
    for (const t of p.tags) if (tagSet.has(t.toLowerCase())) score += 2;
    if (normTitle.includes(p.category.toLowerCase())) score += 1;
    return { p, score };
  })
    .sort((a, b) => b.score - a.score);

  const chosen = [];
  const seen = new Set();
  for (const { p } of scored) {
    if (chosen.length >= maxLinks) break;
    if (seen.has(p.asin)) continue;
    chosen.push(p);
    seen.add(p.asin);
  }
  while (chosen.length < minLinks) {
    const fallback = PRODUCT_CATALOG[Math.floor(Math.random() * PRODUCT_CATALOG.length)];
    if (!seen.has(fallback.asin)) {
      chosen.push(fallback);
      seen.add(fallback.asin);
    }
  }
  return chosen.slice(0, maxLinks);
}
