import OpenAI from 'openai';

// Master scope §11: writing engine = DeepSeek V4-Pro through the OpenAI client.
// Falls back to the platform-injected forge LLM only if neither key is present.
const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  process.env.BUILT_IN_FORGE_API_KEY ||
  '';
const baseURL =
  process.env.OPENAI_BASE_URL ||
  (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY
    ? 'https://api.deepseek.com'
    : process.env.BUILT_IN_FORGE_API_URL || 'https://api.deepseek.com');

export const MODEL = process.env.OPENAI_MODEL || 'deepseek-v4-pro';

export const openai = new OpenAI({ apiKey, baseURL });

let _modelUsable = Boolean(apiKey);
export function llmConfigured() { return _modelUsable; }
export function markModelUnusable(reason) {
  if (_modelUsable) {
    _modelUsable = false;
    console.warn('[openai-client] disabled for this process:', reason);
  }
}
