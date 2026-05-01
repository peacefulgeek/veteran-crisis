#!/usr/bin/env node
const key = process.env.OPENAI_API_KEY;
const r = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'A solitary veteran in a worn flannel shirt sits on a wooden porch at golden hour, distant pine forest, warm light, documentary editorial photography, cinematic depth of field, soft film grain, no text, no logos.',
    n: 1,
    size: '1792x1024',
    quality: 'standard',
    response_format: 'url',
  }),
});
const j = await r.json().catch(() => ({}));
console.log('status', r.status);
if (j?.data?.[0]?.url) console.log('URL', j.data[0].url);
else console.log('BODY', JSON.stringify(j).slice(0, 600));
