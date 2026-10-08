import type { AIProvider } from '../types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';

export function provider(): AIProvider {
  const selected = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();
  if (selected === 'ollama') return new OllamaProvider();
  if (selected === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic');
    return new AnthropicProvider();
  }
  if (selected === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
    return new OpenAIProvider();
  }
  throw new Error(`Unsupported AI_PROVIDER: ${selected}`);
}
