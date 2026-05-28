// Claude writing engine - master scope final pass requires claude-sonnet-4-6.
// Exports an OpenAI-compatible shim so article-writer.mjs doesn't have to care
// which provider it talks to. Falls back to OpenAI/DeepSeek client if no
// CLAUDE_API_KEY is present.

import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.CLAUDE_API_KEY || '';
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

let _modelUsable = Boolean(apiKey);
let _disableReason = '';

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export function claudeConfigured() { return _modelUsable && anthropic !== null; }
export function markClaudeUnusable(reason) {
  if (_modelUsable) {
    _modelUsable = false;
    _disableReason = String(reason || 'unknown');
    console.warn('[claude-client] disabled for this process:', _disableReason);
  }
}

/**
 * Convert OpenAI-style { role, content } messages to Anthropic-style.
 * Anthropic puts the system message in a top-level field, not in messages.
 */
function _split(messages) {
  let system = '';
  const turns = [];
  for (const m of messages) {
    if (m.role === 'system') {
      system += (system ? '\n\n' : '') + String(m.content || '');
    } else {
      turns.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') });
    }
  }
  return { system, turns };
}

/**
 * OpenAI-compatible shape: returns { choices: [ { message: { content } } ] }
 * so existing call sites don't have to change.
 */
export const claude = {
  chat: {
    completions: {
      async create(opts) {
        if (!anthropic) throw new Error('claude-client: no API key');
        const { system, turns } = _split(opts.messages || []);
        const max_tokens = opts.max_tokens ?? 4096;
        const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.7;
        const model = opts.model || CLAUDE_MODEL;
        const resp = await anthropic.messages.create({
          model,
          max_tokens,
          temperature,
          system,
          messages: turns.length ? turns : [{ role: 'user', content: '' }],
        });
        const text = (resp.content || [])
          .filter(b => b.type === 'text')
          .map(b => b.text || '')
          .join('');
        return {
          choices: [{
            message: { role: 'assistant', content: text },
            finish_reason: resp.stop_reason || 'stop',
          }],
          model: resp.model,
          usage: resp.usage,
        };
      },
    },
  },
};

export default claude;
