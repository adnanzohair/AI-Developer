import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, Completion } from '../types.js';
export class AnthropicProvider implements AIProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  async complete(input: Parameters<AIProvider['complete']>[0]): Promise<Completion> {
    const system = input.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
    const response = await this.client.messages.create({ model: input.model ?? process.env.AI_MODEL ?? 'claude-sonnet-4-5', max_tokens: 4096, system, messages: input.messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content})), tools: input.tools.map(t=>({name:t.name,description:t.description,input_schema:t.inputSchema as Anthropic.Tool.InputSchema})) });
    return { content: response.content.filter(b=>b.type==='text').map(b=>b.text).join('\n'), toolCalls: response.content.filter(b=>b.type==='tool_use').map(b=>({id:b.id,name:b.name,arguments:b.input as Record<string,unknown>})) };
  }
}
