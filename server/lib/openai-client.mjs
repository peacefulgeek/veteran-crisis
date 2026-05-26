import OpenAI from 'openai';

// Writing engine: pure OpenAI/DeepSeek client. No Manus FORGE fallback.
// Default endpoint is OpenAI; set OPENAI_BASE_URL=https://api.deepseek.com to use DeepSeek.
const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const baseURL =
  process.env.OPENAI_BASE_URL ||
  (process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY
    ? 'https://api.deepseek.com'
    : 'https://api.openai.com/v1');

export const MODEL = process.env.OPENAI_MODEL || (baseURL.includes('deepseek') ? 'deepseek-chat' : 'gpt-4o-mini');

export const openai = new OpenAI({ apiKey, baseURL });

let _modelUsable = Boolean(apiKey);
export function llmConfigured() { return _modelUsable; }
export function markModelUnusable(reason) {
  if (_modelUsable) {
    _modelUsable = false;
    console.warn('[openai-client] disabled for this process:', reason);
  }
}
