import type { AIProvider, Completion } from '../types.js';

type OllamaResponse = {
  message?: {
    content?: string;
    tool_calls?: Array<{ function?: { name?: string; arguments?: Record<string, unknown> } }>;
  };
  error?: string;
};

export class OllamaProvider implements AIProvider {
  async complete(input: Parameters<AIProvider['complete']>[0]): Promise<Completion> {
    const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model ?? process.env.AI_MODEL ?? 'qwen2.5-coder:7b',
        stream: false,
        format: 'json',
        messages: input.messages,
        tools: input.tools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
      }),
    });
    const body = await response.json() as OllamaResponse;
    if (!response.ok) throw new Error(body.error ?? `Ollama returned HTTP ${response.status}`);
    return {
      content: body.message?.content ?? '',
      toolCalls: (body.message?.tool_calls ?? []).map((call, index) => ({
        id: `ollama-${index}`,
        name: call.function?.name ?? '',
        arguments: call.function?.arguments ?? {},
      })).filter(call => call.name !== ''),
    };
  }
}
