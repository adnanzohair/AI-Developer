import OpenAI from 'openai';
import type { AIProvider, Completion } from '../types.js';

export class OpenAIProvider implements AIProvider {
  async complete(input: Parameters<AIProvider['complete']>[0]): Promise<Completion> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: input.model ?? process.env.AI_MODEL ?? 'gpt-5.2',
      messages: input.messages.map(m => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content })),
      tools: input.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
    });
    const message = response.choices[0]?.message;
    return { content: message?.content ?? '', toolCalls: (message?.tool_calls ?? []).filter(c=>c.type==='function').map(c => ({ id: c.id, name: c.function.name, arguments: JSON.parse(c.function.arguments) })) };
  }
}
