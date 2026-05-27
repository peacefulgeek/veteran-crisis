#!/usr/bin/env node
// One-shot: delete articles/all-index.json off Bunny CDN to stop today's library-size leak.
import { SITE } from '../server/lib/site-config.mjs';

const url = `https://${SITE.bunnyHostname}/${SITE.bunnyStorageZone}/articles/all-index.json`;
console.log('[delete] DELETE', url);
const res = await fetch(url, {
  method: 'DELETE',
  headers: { AccessKey: SITE.bunnyApiKey },
});
console.log('[delete] status', res.status);
const body = await res.text();
console.log('[delete] body', body.slice(0, 200));
