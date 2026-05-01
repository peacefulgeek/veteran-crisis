// Per-site identity. Hardcoded by design (master scope §9, §13).
export const SITE = {
  name: 'Veteran Crisis',
  apex: 'veterancrisis.com',
  baseUrl: 'https://veterancrisis.com',
  niche: 'Military-to-Civilian Transition',
  oneLine:
    'The real resource for military-to-civilian transition: the identity piece, the culture shock, the VA maze, the career pivot, and the relationships that get strained when you become a different person.',
  author: 'The Oracle Lover',
  authorSlug: 'the-oracle-lover',
  authorUrl: 'https://theoraclelover.com',
  authorCred: 'Intuitive Educator & Oracle Guide',
  amazonTag: 'spankyspinola-20',
  // Bunny CDN — production credentials hardcoded per master scope §9.
  // Dedicated zone for veteran-crisis (peacefulgeek), NY region, public pull zone.
  bunnyStorageZone: 'veteran-crisis',
  bunnyApiKey: '42c5b84f-70e4-493c-98cacd9b0731-f166-4832',
  bunnyPullZone: 'https://veteran-crisis.b-cdn.net',
  bunnyHostname: 'ny.storage.bunnycdn.com',
};

export const VOICE = {
  guide:
    'Short punchy sentences (8-14 words). Practical directness. No fluff. No warming up. ' +
    `Direct address ("Look,", "Here's the thing,"). Demystifying. Grounded. Accessible. ` +
    `Researchers: Jung, Angeles Arrien, Rachel Pollack, Clarissa Pinkola Estes, Joseph Campbell. ` +
    `NEVER Amma, Rumi, Ramana, Krishnamurti, Alan Watts (other authors). NEVER "my friend", "sweetheart".`,
  signaturePhrases: [
    'Look, here\u2019s the thing.',
    'Stop overthinking this.',
    'This isn\u2019t mystical. It\u2019s mechanical.',
    'You already know the answer. You just don\u2019t like it.',
    'Let me demystify this for you.',
    'Here\u2019s what actually works.',
    'Nobody\u2019s coming to explain this to you. So I will.',
    'Less theory. More practice.',
  ],
  nicheModifier:
    'Deep respect for service. Zero patience for the patronizing "thank you for your service" that substitutes for actually helping. ' +
      `No military-worship. No civilian guilt-tripping. Direct, practical: "Here's what the transition actually requires. Nobody told you because the military doesn't teach this part."`,
  nichePhrases: [
    'The military gave you a complete identity. Civilian life doesn\u2019t have a replacement ready.',
    'This isn\u2019t about jobs. It\u2019s about who you are when you\u2019re not in uniform.',
    'The VA is complicated. Here\u2019s how to navigate it without losing your mind.',
    'Your civilian coworkers aren\u2019t weak. They\u2019re just using a different operating system.',
    'Combat experience is not a liability in civilian leadership. Here\u2019s how to reframe it.',
  ],
};

export const RESEARCHERS = [
  'Sebastian Junger',
  'Jonathan Shay',
  'Bessel van der Kolk',
  'David Finkel',
  "VA's National Center for PTSD",
  'Bob McDonald',
  'Thomas Brennan',
  'Matthew Crawford',
  'Joseph Campbell',
  'Victor Frankl',
  'Tara Brach',
  'Carl Jung',
];

export const AUTH_SOURCES = [
  { name: 'VA National Center for PTSD', url: 'https://www.ptsd.va.gov/' },
  { name: 'CDC Veteran Health', url: 'https://www.cdc.gov/veterans/' },
  { name: 'NIH PubMed: military transition', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=military+transition' },
  { name: 'U.S. Department of Veterans Affairs', url: 'https://www.va.gov/' },
  { name: 'Veterans Crisis Line', url: 'https://www.veteranscrisisline.net/' },
  { name: 'Bureau of Labor Statistics: Veteran employment', url: 'https://www.bls.gov/cps/cpsaat21.htm' },
  { name: 'NIH: Moral injury research', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6839642/' },
  { name: 'CDC: Suicide prevention among veterans', url: 'https://www.cdc.gov/suicide/groups/veterans.html' },
];

export const HEALTH_DISCLAIMER =
  'Content on veterancrisis.com is for educational purposes only. If you are experiencing mental health difficulties, please contact the Veterans Crisis Line: 988, then Press 1.';
