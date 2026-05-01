#!/usr/bin/env node
// Validates OPENAI_API_KEY against api.openai.com (NOT deepseek base).
// Lightweight: lists models, returns first 5.
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('NO_KEY'); process.exit(2); }
const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
const j = await r.json().catch(() => ({}));
if (!r.ok) { console.error('FAIL', r.status, JSON.stringify(j).slice(0, 500)); process.exit(1); }
const ids = (j.data || []).map(m => m.id).slice(0, 8);
console.log('OK', JSON.stringify(ids));
