#!/usr/bin/env node
// Smoke test: generate the first 3 hero images so we can verify the full pipeline.
process.env.SMOKE_LIMIT = '3';
import('./gen-500-heroes.mjs');
