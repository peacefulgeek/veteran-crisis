// 30 hand-curated topics from per-site scope, then expand to 500 with composable variants.
export const PRIMARY_TOPICS = [
  { title: 'The Identity Crisis Nobody Warned You About After Discharge', category: 'Identity', tags: ['identity','transition','culture-shock'] },
  { title: "Why Civilian Life Feels Wrong (It's Not You, It's Culture Shock)", category: 'Identity', tags: ['culture-shock','transition','identity'] },
  { title: 'The Belonging Problem: Why Veterans Miss It and How to Find It Again', category: 'Identity', tags: ['belonging','community','transition'] },
  { title: 'What Sebastian Junger Got Right (and Wrong) About Military Belonging', category: 'Identity', tags: ['belonging','community','researchers'] },
  { title: 'Moral Injury vs. PTSD: The Distinction That Changes Treatment', category: 'Mental Health', tags: ['moral-injury','ptsd','therapy'] },
  { title: 'Military-to-Civilian Resume Translation: The Actual Words That Work', category: 'Career', tags: ['resume','career','transition'] },
  { title: 'The MOS Crosswalk: Finding Civilian Equivalents for Military Roles', category: 'Career', tags: ['mos','career','resume'] },
  { title: 'LinkedIn for Veterans: What Actually Works', category: 'Career', tags: ['linkedin','career','networking'] },
  { title: 'Industries That Genuinely Value Military Experience', category: 'Career', tags: ['career','industries','transition'] },
  { title: 'The Federal Hiring Preference: How It Works and How to Use It', category: 'Career', tags: ['federal','hiring','career'] },
  { title: 'The MBA After Military: Realistic ROI Analysis', category: 'Education', tags: ['mba','education','career'] },
  { title: 'Franchising After Service: Why Veterans Excel and the Real Numbers', category: 'Career', tags: ['franchise','entrepreneur','career'] },
  { title: 'The Contractor vs. Direct-Hire Question', category: 'Career', tags: ['contractor','career','transition'] },
  { title: 'GI Bill: Post-9/11 vs. Montgomery, and How to Maximize Each', category: 'Education', tags: ['gi-bill','education','benefits'] },
  { title: "VR&E (Vocational Rehabilitation): The Benefit Most Veterans Don't Use", category: 'VA', tags: ['vre','va','benefits'] },
  { title: 'VA Disability Rating: How to File, What to Document', category: 'VA', tags: ['disability','va','claims'] },
  { title: 'The VSO Advantage: Why You Should Work With a Veterans Service Organization', category: 'VA', tags: ['vso','va','claims'] },
  { title: 'VA Healthcare Enrollment: Understanding Your Tier and Benefits', category: 'VA', tags: ['healthcare','va','benefits'] },
  { title: 'VA Home Loan: The Actual Value Most Veterans Leave on the Table', category: 'Finance', tags: ['va-loan','finance','housing'] },
  { title: "Discharge Upgrades: When It's Worth Pursuing and How", category: 'VA', tags: ['discharge','va','legal'] },
  { title: 'The First Year After Discharge: What Helps and What Hurts', category: 'Identity', tags: ['transition','first-year','identity'] },
  { title: 'Navigating Civilian Workplace Culture: A Field Manual', category: 'Career', tags: ['workplace','culture','career'] },
  { title: 'How to Talk to Civilians About Service Without Losing Your Mind', category: 'Identity', tags: ['communication','culture-shock','identity'] },
  { title: 'Veteran Entrepreneurship: The Statistic and the Reality', category: 'Career', tags: ['entrepreneur','business','career'] },
  { title: 'Military Spouses in Transition: The Overlooked Half', category: 'Family', tags: ['family','spouse','transition'] },
  { title: 'Children and Military Transition: What They Need From You', category: 'Family', tags: ['family','children','transition'] },
  { title: 'PTSD Treatment That Works: EMDR, CPT, and Prolonged Exposure', category: 'Mental Health', tags: ['ptsd','therapy','emdr'] },
  { title: 'Physical Fitness After Service: Adapting When the Mission Is Gone', category: 'Fitness', tags: ['fitness','training','identity'] },
  { title: 'Financial Transition: From Military Pay Structure to Civilian Compensation', category: 'Finance', tags: ['finance','pay','transition'] },
  { title: 'Building a Post-Military Life That Means Something', category: 'Identity', tags: ['identity','meaning','transition'] },
];

const VARIANTS = [
  { title: 'A Practical Guide to {x}', category: 'Identity' },
  { title: 'What Nobody Tells You About {x}', category: 'Identity' },
  { title: 'How to Actually Handle {x}', category: 'Identity' },
  { title: 'The Veteran\u2019s Field Manual for {x}', category: 'Career' },
  { title: 'Real Numbers Behind {x}', category: 'Finance' },
  { title: 'The Quiet Truth of {x}', category: 'Mental Health' },
  { title: 'What I Wish I Knew About {x}', category: 'Identity' },
  { title: '{x}: Stop Overthinking It', category: 'Career' },
  { title: '{x} for Combat Veterans', category: 'Mental Health' },
  { title: 'Why {x} Hits Veterans Differently', category: 'Identity' },
  { title: '{x} Without Burning Out', category: 'Fitness' },
  { title: '{x}: A Reframe That Works', category: 'Career' },
  { title: 'The Honest Version of {x}', category: 'Identity' },
  { title: 'Doing {x} Without the BS', category: 'Career' },
  { title: '{x} After the Uniform', category: 'Identity' },
  { title: 'Walking Through {x} on Purpose', category: 'Identity' },
];

const CORES = [
  'reintegration with family',
  'civilian banking and credit',
  'finding a real mentor',
  'rebuilding daily structure',
  'sleep after combat',
  'eating well on a civilian schedule',
  'rejoining civilian gym culture',
  'starting a podcast as a veteran',
  'writing your own story',
  'making civilian friends',
  'deciding when to use the GI Bill',
  'when to skip the MBA',
  'asking for help without losing rank',
  'learning to rest',
  'finding faith again or for the first time',
  'returning to the body after service',
  'dating after deployment',
  'parenting after deployment',
  'managing anger that has nowhere to go',
  'living with survivor\u2019s guilt',
  'naming the shift you\u2019re going through',
  'redefining duty',
  'redefining honor in civilian life',
  'finding a chosen tribe',
  'rebuilding self-trust',
  'walking away from a job that\u2019s killing you',
  'setting boundaries with people who don\u2019t understand',
  'using a journal to process service',
  'reading the right books for transition',
  'building a morning that holds you',
  'rebuilding routines without orders',
  'asking the VA the right questions',
  'preparing for your C&P exam',
  'understanding the Blue Water Navy ruling',
  'using the SkillBridge program well',
  'choosing a mentor over a guru',
  'opting out of the toxic veteran narrative',
  'reading Carl Jung as a veteran',
  'finding meaning in ordinary work',
  'admitting you\u2019re not done growing',
  'recognizing moral injury early',
  'using meditation without going woo',
  'practicing gratitude that isn\u2019t hollow',
  'forgiving yourself for what you did',
  'forgiving yourself for what you didn\u2019t do',
  'the difference between resilience and avoidance',
  'spotting a fake therapist',
  'finding a therapist who actually gets veterans',
];

export function buildSeedTopics() {
  const out = PRIMARY_TOPICS.slice();
  const seen = new Set(out.map(t => t.title));
  // Cartesian product of every VARIANT × every CORE.
  for (const v of VARIANTS) {
    for (const c of CORES) {
      if (out.length >= 500) break;
      const title = v.title.replace('{x}', c);
      if (seen.has(title)) continue;
      seen.add(title);
      out.push({
        title,
        category: v.category,
        tags: [c.split(' ')[0].replace(/[^a-z0-9]/gi, ''), v.category.toLowerCase()],
      });
    }
    if (out.length >= 500) break;
  }
  // If still short, append numbered "Part N" expansions until we hit 500.
  let part = 2;
  while (out.length < 500) {
    for (const v of VARIANTS) {
      for (const c of CORES) {
        if (out.length >= 500) break;
        const title = `${v.title.replace('{x}', c)} (Part ${part})`;
        if (seen.has(title)) continue;
        seen.add(title);
        out.push({
          title,
          category: v.category,
          tags: [c.split(' ')[0].replace(/[^a-z0-9]/gi, ''), v.category.toLowerCase()],
        });
      }
      if (out.length >= 500) break;
    }
    part++;
    if (part > 50) break;
  }
  return out.slice(0, 500);
}
