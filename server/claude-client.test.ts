// Validates that CLAUDE_API_KEY is present, the Anthropic SDK is wired,
// and the OpenAI-compatible shim returns a real response.
import { describe, it, expect } from 'vitest';

describe('claude-client', () => {
  it('reports configured when CLAUDE_API_KEY is set', async () => {
    const mod = await import('./lib/claude-client.mjs');
    const ok = mod.claudeConfigured();
    if (!process.env.CLAUDE_API_KEY) {
      expect(ok).toBe(false);
      return;
    }
    expect(ok).toBe(true);
    expect(typeof mod.CLAUDE_MODEL).toBe('string');
    expect(mod.CLAUDE_MODEL).toMatch(/^claude-sonnet-4/);
  });

  it.runIf(Boolean(process.env.CLAUDE_API_KEY))(
    'returns a real completion with ≤50 tokens (live API call)',
    async () => {
      const { claude } = await import('./lib/claude-client.mjs');
      const r = await claude.chat.completions.create({
        messages: [
          { role: 'system', content: 'Reply with exactly: OK.' },
          { role: 'user', content: 'health check' },
        ],
        max_tokens: 16,
        temperature: 0,
      });
      const text = r.choices?.[0]?.message?.content || '';
      expect(text.length).toBeGreaterThan(0);
      expect(r.usage).toBeDefined();
    },
    20_000,
  );
});
