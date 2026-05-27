# scripts/

This directory holds two classes of Node scripts:

| Class | Filename pattern | Purpose | Safe to re-run? |
|---|---|---|---|
| **Active operational scripts** | (no leading underscore) | Used by current ops: seeding Bunny, purging stale CDN entries, verifying credentials, generating heroes. | Yes — idempotent or guarded. |
| **One-shot historical scripts** | `_<name>.mjs` | Were executed once during scaffolding/migrations (Round 6–14). Kept in-repo for forensic value but not part of the runtime path. | Some are destructive (e.g. `_truncate-articles.mjs`). Read before running. |

## Active scripts (verified Round 15)

| Script | Purpose | Last verified |
|---|---|---|
| `seed-bunny-json.mjs` | Re-publishes `articles/index.json`, per-slug JSON for **published only**, `feeds/sitemap.xml`, `feeds/feed.xml`. | Round 15 — runs end-to-end in 8.4s, uploads 33 published JSONs. |
| `purge-bunny-queued-jsons.mjs` | Deletes any `articles/<slug>.json` from Bunny storage origin where `status<>'published'`. Idempotent. | Round 15 — purged 467 leaked queued JSONs. |
| `bulk-seed.mjs` | Initial article seeder (DB writes only). | Round 6 — superseded by cron `top-up`, kept for cold-starts. |
| `check-openai-key.mjs` | Verifies `OPENAI_API_KEY` env can hit the API. | Round 9. |
| `delete-bunny-admin-index.mjs` | One-time removal of the leaked admin all-index JSON. | Round 14 — already executed, kept for audit trail. |
| `gen-500-heroes.mjs` | Generates the 500-image hero pool on Bunny. | Round 11. |
| `gen-heroes-smoke.mjs` | Smoke-test for hero generation pipeline. | Round 11. |
| `start-with-cron.mjs` | Local helper to start the Express server with crons enabled. | Round 8. |
| `test-dalle-one.mjs` | Smoke-test for DALLE image generation. | Round 11. |

## One-shot historical scripts (`_<name>.mjs`)

These are kept for forensic value (e.g. recreating a migration) but are NOT part of the runtime path. Read each script header comment before re-executing — many mutate the DB, Bunny, or both. Notable destructive ones:

- `_truncate-articles.mjs` — wipes the `articles` table. Never run in production.
- `_swap-db-heroes.mjs`, `_swap-hero-zone.mjs` — bulk hero URL replacement.
- `_apply-migration.mjs` — applies an old migration; superseded by Drizzle.
