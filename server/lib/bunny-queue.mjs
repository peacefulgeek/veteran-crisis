// Round 19: queue lives on Bunny CDN, not in the DB body column.
//
// Path convention: `${SITE.bunnyQueuePrefix}/${slug}.json` (e.g.
// queue-3f7a2c8b9d/some-slug.json). The prefix is unguessable + the storage
// zone has no directory listing, so the queue is effectively private as long
// as the prefix doesn't leak. If it does, rotate BUNNY_QUEUE_PREFIX in Railway.
//
// Each queue JSON contains the full draft payload — title, body, metaDescription,
// category, tags, plus a `_queued: true` marker so any accidental public-side
// reader can spot it. Promotion = read this JSON, write to `articles/{slug}.json`,
// delete this copy.

import { putJsonToBunny, getJsonFromBunny, deleteFromBunny } from './bunny.mjs';
import { SITE } from './site-config.mjs';

function queuePath(slug) {
  return `${SITE.bunnyQueuePrefix}/${slug}.json`;
}

export async function putQueuedToBunny(slug, payload) {
  // Always stamp `_queued: true` and `_queuedAt` so the JSON is self-describing.
  const body = { ...payload, slug, _queued: true, _queuedAt: new Date().toISOString() };
  return putJsonToBunny(queuePath(slug), body, 'private, max-age=0, no-store');
}

export async function getQueuedFromBunny(slug) {
  return getJsonFromBunny(queuePath(slug));
}

export async function deleteQueuedFromBunny(slug) {
  return deleteFromBunny(queuePath(slug));
}

export function queuePathFor(slug) {
  return queuePath(slug);
}
