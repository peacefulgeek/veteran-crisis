import { SITE } from './site-config.mjs';

const BUNNY_STORAGE_ZONE = SITE.bunnyStorageZone;
const BUNNY_API_KEY = SITE.bunnyApiKey;
const BUNNY_PULL_ZONE = SITE.bunnyPullZone;
const BUNNY_HOSTNAME = SITE.bunnyHostname;

// 40-image hero library — warm, hopeful, light-tone photography that matches
// veteran-transition themes: morning runs, family kitchens, classroom shots,
// open roads, harbors, mountains, mentors, workshops, journals, hands at work.
// All hosted on Unsplash CDN (no repo images per master scope §3). When Bunny
// credentials are provided, the assignHeroImage path below mirrors each photo
// into the Bunny pull zone and returns the Bunny URL instead.
export const HERO_LIBRARY = [
  // Morning / new chapter
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb',     // misty mountain dawn
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef',     // open road golden hour
  'https://images.unsplash.com/photo-1519681393784-d120267933ba',     // mountains at sunrise
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e',     // forest sunrise rays
  // Family / coming home
  'https://images.unsplash.com/photo-1511895426328-dc8714191300',     // family hug
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e',     // father child garden
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205',     // dad reading to kid
  'https://images.unsplash.com/photo-1513735492246-483525079686',     // hands holding tea
  // Work / civilian career
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7',        // bright open office
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902',     // co-workers laughing
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',     // notebook + pen workspace
  'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc',     // resume on desk
  // School / GI Bill
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',     // student desk window
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc',     // graduation cap toss
  'https://images.unsplash.com/photo-1606761568499-6d2451b23c66',     // college library
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952',     // group study coffee
  // Health / mental
  'https://images.unsplash.com/photo-1518611012118-696072aa579a',     // morning trail run
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',     // yoga sunrise
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b',     // strength gym warm light
  'https://images.unsplash.com/photo-1540206395-68808572332f',        // therapy office plant
  // Marriage / relationships
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e',     // couple kitchen morning
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131',     // couple walking field
  'https://images.unsplash.com/photo-1543946207-39bd91e70ca7',     // couple dinner table
  // Mentor / community
  'https://images.unsplash.com/photo-1521791136064-7986c2920216',     // mentor shaking hands
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0',        // workshop classroom
  'https://images.unsplash.com/photo-1543269865-cbf427effbad',        // brainstorm team table
  // Faith / meaning
  'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65',     // open journal hands
  'https://images.unsplash.com/photo-1507692049790-de58290a4334',     // chapel light beam
  'https://images.unsplash.com/photo-1518770660439-4636190af475',     // circuit detail (skills)
  // Outdoor / restoration
  'https://images.unsplash.com/photo-1551632811-561732d1e306',     // hiker pause vista
  'https://images.unsplash.com/photo-1500964757637-c85e8a162699',     // dock at dawn
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',     // beach lone walker
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a',     // dog on field
  // Hands / craft
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122',     // wood workshop hands
  'https://images.unsplash.com/photo-1454165205744-3b78555e5572',     // chef cooking warm
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601',     // bread on table
  // Money / benefits
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f',        // notebook calculator
  'https://images.unsplash.com/photo-1554224154-26032ffc0d07',        // ledger pen
  // Identity / reflection
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',     // portrait warm light
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330',     // smiling woman portrait
];

// Topic-keyword routing — maps each article topic to one of 12 hero themes
// rotated across slots 1-40. Each theme key has 3-4 slot indexes (0-based).
//   1/13/25/37 = dawn         | 2/14/26/38 = family
//   3/15/27/39 = career       | 4/16/28/40 = school
//   5/17/29     = running     | 6/18/30     = mentor
//   7/19/31     = circle      | 8/20/32     = journal
//   9/21/33     = workshop    | 10/22/34    = couple
//   11/23/35    = paperwork   | 12/24/36    = boots
const TOPIC_ROUTES = [
  { match: /(family|spouse|marriage|kids|children|partner|relationship|marriage|love)/i, indexes: [1, 13, 25, 37, 9, 21, 33] },
  { match: /(career|job|resume|interview|hire|work|leadership|salary|civilian (?:work|job))/i, indexes: [2, 14, 26, 38] },
  { match: /(gi bill|school|college|certificate|degree|education|study|tuition|class|campus)/i, indexes: [3, 15, 27, 39] },
  { match: /(sleep|fitness|gym|run|move|body|nutrition|workout|exercise|morning routine)/i, indexes: [4, 16, 28] },
  { match: /(mentor|coach|guide|advice from)/i, indexes: [5, 17, 29] },
  { match: /(community|tribe|veteran service|nonprofit|brotherhood|sisterhood|peer|support group)/i, indexes: [6, 18, 30] },
  { match: /(faith|meaning|purpose|spiritual|grief|loss|reflection|journal|writing|story|identity)/i, indexes: [7, 19, 31, 0, 12, 24, 36] },
  { match: /(workshop|craft|build|woodwork|garden|repair|hands|trade|skilled)/i, indexes: [8, 20, 32] },
  { match: /(outdoor|hike|trail|nature|forest|mountain|adventure|fishing|hunting)/i, indexes: [0, 12, 24, 36] },
  { match: /(va |health|therapy|ptsd|trauma|moral injury|crisis|mental health|counsel)/i, indexes: [10, 22, 34, 11, 23, 35] },
  { match: /(money|finance|budget|disability|benefit|claim|paperwork|appeal|denial)/i, indexes: [10, 22, 34] },
  { match: /(first year|civilian life|coming home|transition|culture shock|coming back|day one|reintegration|new chapter|starting over|boots)/i, indexes: [11, 23, 35, 0, 12, 24, 36] },
];

function pickByTopic(topic = '') {
  const t = String(topic).toLowerCase();
  for (const r of TOPIC_ROUTES) if (r.match.test(t)) {
    return r.indexes[Math.floor(Math.random() * r.indexes.length)];
  }
  return Math.floor(Math.random() * HERO_LIBRARY.length);
}

function bunnyUrlForIndex(idx, _opts = {}) {
  // Always serve from Bunny pull zone. Unsplash is never hotlinked at runtime.
  return `${BUNNY_PULL_ZONE}/library/lib-${String(idx + 1).padStart(2, '0')}.webp`;
}

/**
 * Pick a topic-matched library image; if Bunny is wired, mirror to the pull
 * zone keyed by slug. Returns a public hero URL the UI can render immediately.
 * Master scope §3: zero images in repo — every hero must be a CDN URL.
 */
export async function assignHeroImage(slug, topic = '') {
  const idx = pickByTopic(topic || slug.replace(/-/g, ' '));
  const sourceUrl = bunnyUrlForIndex(idx);

  if (!BUNNY_API_KEY || BUNNY_API_KEY.startsWith('PLACEHOLDER')) {
    return sourceUrl;
  }

  const destFile = `${slug}.webp`;
  try {
    const downloadRes = await fetch(sourceUrl);
    if (!downloadRes.ok) throw new Error(`download ${downloadRes.status}`);
    const imageBuffer = await downloadRes.arrayBuffer();
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/images/${destFile}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': 'image/webp' },
      body: imageBuffer,
    });
    if (!uploadRes.ok) throw new Error(`upload ${uploadRes.status}`);
    return `${BUNNY_PULL_ZONE}/images/${destFile}`;
  } catch (err) {
    console.warn('[bunny] hero copy failed, falling back to library URL:', err.message);
    return sourceUrl;
  }
}

export function libraryUrl(index) {
  const idx = ((index - 1) % HERO_LIBRARY.length + HERO_LIBRARY.length) % HERO_LIBRARY.length;
  return bunnyUrlForIndex(idx);
}

export function heroForIndex(i, opts) { return bunnyUrlForIndex(i % HERO_LIBRARY.length, opts); }
export const HERO_COUNT = HERO_LIBRARY.length;
