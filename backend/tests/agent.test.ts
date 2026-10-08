import { describe, expect, it } from 'vitest';
import { AgentService } from '../src/services/agent.js';
import type { AIProvider } from '../src/types.js';

describe('AgentService', () => {
  it('creates a reviewable plan without executing tools', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({ summary:'Create a page', risk:'low', steps:['Inspect','Draft','Validate'], proposedTools:[{name:'get_site_info',arguments:{}}] }), toolCalls:[] }) };
    const service = new AgentService(fake);
    const task = await service.plan({siteUrl:'https://example.test',projectId:1,prompt:'Create an About page'});
    expect(task.status).toBe('awaiting_approval');
    expect(task.plan?.steps).toHaveLength(3);
  });

  it('fails closed on malformed provider output', async () => {
    const fake: AIProvider = { complete: async () => ({ content:'not-json', toolCalls:[] }) };
    const task = await new AgentService(fake).plan({siteUrl:'https://example.test',projectId:1,prompt:'Do work'});
    expect(task.status).toBe('failed');
  });

  it('keeps supported content actions in a reviewable plan', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({
      summary: 'Duplicate a post', risk: 'low', steps: ['Find the post', 'Duplicate it'],
      proposedTools: [],
      actions: [{ tool: 'duplicate_post', arguments: { source: { id: 42 }, new_title: 'test' } }]
    }), toolCalls: [] }) };
    const task = await new AgentService(fake).plan({siteUrl:'https://example.test',projectId:1,prompt:'Duplicate post 42 as test'});
    expect(task.status).toBe('awaiting_approval');
    expect(task.plan?.actions).toEqual([{ tool: 'duplicate_post', arguments: { source: { id: 42 }, new_title: 'test' } }]);
  });

  it('accepts provider actions that use the existing name field', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({
      summary: 'Duplicate a post', risk: 'low', steps: ['Find the post', 'Duplicate it'],
      proposedTools: [],
      actions: [{ name: 'duplicate_post', arguments: { source: { title: 'Original' }, new_title: 'test' } }]
    }), toolCalls: [] }) };
    const task = await new AgentService(fake).plan({siteUrl:'https://example.test',projectId:1,prompt:'Duplicate Original as test'});
    expect(task.status).toBe('awaiting_approval');
    expect(task.plan?.actions[0]?.tool).toBe('duplicate_post');
  });

  it('derives a document-duplicate action when a provider returns prose actions', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({ summary:'Duplicate', risk:'low', steps:['Copy'], proposedTools:[], actions:['Find the post', 'Duplicate it'] }), toolCalls:[] }) };
    const task = await new AgentService(fake).plan({ siteUrl:'https://example.test', projectId:1, prompt:'Duplicate post ID 66 from the uploaded document as a draft.', context: JSON.stringify({ attachments:[{id:99,kind:'document'}] }) });
    expect(task.status).toBe('awaiting_approval');
    expect(task.plan?.actions).toEqual([{ tool:'duplicate_blog_from_document', arguments:{ source:{id:66}, document_attachment_id:99 } }]);
  });

  it('derives a document-draft action when a provider returns prose actions', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({ summary:'Import', risk:'low', steps:['Import'], proposedTools:[], actions:['Create a draft'] }), toolCalls:[] }) };
    const task = await new AgentService(fake).plan({ siteUrl:'https://example.test', projectId:1, prompt:'Create a draft from the uploaded document.', context: JSON.stringify({ attachments:[{id:19,kind:'document'}] }) });
    expect(task.plan?.actions).toEqual([{ tool:'import_document_draft', arguments:{ document_attachment_id:19 } }]);
  });

  it('derives a document-draft action when provider object arguments are invalid', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({
      summary:'Import', risk:'low', steps:['Import'], proposedTools:[],
      actions:[{ tool:'duplicate_blog_from_document', arguments:{ document_attachment_id:19 } }]
    }), toolCalls:[] }) };
    const task = await new AgentService(fake).plan({ siteUrl:'https://example.test', projectId:1, prompt:'Create a new draft blog from the uploaded document.', context: JSON.stringify({ attachments:[{id:19,kind:'document'}] }) });
    expect(task.status).toBe('awaiting_approval');
    expect(task.plan?.actions).toEqual([{ tool:'import_document_draft', arguments:{ document_attachment_id:19 } }]);
  });

  it('derives a document-duplicate action when provider object arguments are invalid', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({
      summary:'Duplicate', risk:'low', steps:['Copy'], proposedTools:[],
      actions:[{ tool:'duplicate_blog_from_document', arguments:{ post_id:66, document_id:99, unknown:'value' } }]
    }), toolCalls:[] }) };
    const task = await new AgentService(fake).plan({ siteUrl:'https://example.test', projectId:1, prompt:'Duplicate post ID 66 from the uploaded document as a draft.', context: JSON.stringify({ attachments:[{id:99,kind:'document'}] }) });
    expect(task.status).toBe('awaiting_approval');
    expect(task.plan?.actions).toEqual([{ tool:'duplicate_blog_from_document', arguments:{ source:{id:66}, document_attachment_id:99 } }]);
  });

  it('fails closed when a plan includes an unsupported action', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({
      summary: 'Run a command', risk: 'high', steps: ['Run it'], proposedTools: [],
      actions: [{ tool: 'run_shell', arguments: { command: 'whoami' } }]
    }), toolCalls: [] }) };
    const task = await new AgentService(fake).plan({siteUrl:'https://example.test',projectId:1,prompt:'Run a command'});
    expect(task.status).toBe('failed');
  });

  it('starts an iterative run with a manifest-approved inspection action', async () => {
    let suppliedTools: unknown[] = ['not called'];
    const fake: AIProvider = { complete: async (input) => { suppliedTools = input.tools; return ({ content: JSON.stringify({
      status: 'continue', summary: 'Inspect the homepage first.', risk: 'low',
      steps: ['Inspect homepage'], actions: [{ tool: 'inspect_homepage', arguments: {} }]
    }), toolCalls: [] }); } };
    const run = await new AgentService(fake).startRun({
      siteUrl: 'https://example.test', projectId: 1, prompt: 'How is the homepage built?',
      capabilities: [{ name: 'inspect_homepage', description: 'Inspect the homepage', risk: 'safe', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }]
    });
    expect(run.status).toBe('running');
    expect(run.instruction?.actions).toEqual([{ tool: 'inspect_homepage', arguments: {} }]);
    expect(suppliedTools).toEqual([]);
  });

  it('rejects an iterative run action not advertised by the capability manifest', async () => {
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify({
      status: 'continue', summary: 'Run shell', risk: 'high', steps: ['Run it'],
      actions: [{ tool: 'run_shell', arguments: {} }]
    }), toolCalls: [] }) };
    const run = await new AgentService(fake).startRun({
      siteUrl: 'https://example.test', projectId: 1, prompt: 'Do work', capabilities: []
    });
    expect(run.status).toBe('failed');
    expect(run.error).toContain('not available');
  });

  it('advances an iterative run from an inspection result to a final report', async () => {
    const replies = [
      { status: 'continue', summary: 'Inspect site.', risk: 'low', steps: ['Inspect'], actions: [{ tool: 'inspect_site', arguments: {} }] },
      { status: 'finished', summary: 'The site uses a block theme.', risk: 'low', steps: ['Report'], actions: [], message: 'The homepage is built with blocks.' }
    ];
    const fake: AIProvider = { complete: async () => ({ content: JSON.stringify(replies.shift()), toolCalls: [] }) };
    const service = new AgentService(fake);
    const run = await service.startRun({ siteUrl: 'https://example.test', projectId: 1, prompt: 'Inspect site', capabilities: [{ name: 'inspect_site', description: 'Inspect site', risk: 'safe', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }] });
    const advanced = await service.advanceRun(run.id, [{ type: 'result', tool: 'inspect_site', result: { theme: 'Twenty Twenty-Five' } }]);
    expect(advanced.status).toBe('completed');
    expect(advanced.instruction?.message).toBe('The homepage is built with blocks.');
  });
});
