export type Role = 'system' | 'user' | 'assistant' | 'tool';
export interface Message { role: Role; content: string }
export interface ToolDefinition { name: string; description: string; inputSchema: Record<string, unknown>; permission: 'read'|'development'|'administrative' }
export interface Completion { content: string; toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> }
export interface AIProvider { complete(input: { messages: Message[]; tools: ToolDefinition[]; model?: string }): Promise<Completion> }
export interface AgentTask { id: string; siteUrl: string; projectId: number; prompt: string; status: 'queued'|'planning'|'awaiting_approval'|'executing'|'completed'|'failed'; plan?: Plan; error?: string }
export interface PlannedAction { tool: string; arguments: Record<string, unknown> }
export interface Plan { summary: string; risk: 'low'|'medium'|'high'; steps: string[]; proposedTools: Array<{name:string;arguments:Record<string,unknown>}>; actions: PlannedAction[] }
export type CapabilityRisk = 'safe' | 'confirm' | 'blocked';
export interface CapabilityManifestEntry { name: string; description: string; risk: CapabilityRisk; inputSchema: Record<string, unknown> }
export interface AgentRunEvent { type: 'inspection' | 'result' | 'verification' | 'error'; tool?: string; result?: Record<string, unknown>; message?: string }
export interface AgentRunInstruction { status: 'continue' | 'finished'; summary: string; risk: 'low'|'medium'|'high'; steps: string[]; actions: PlannedAction[]; message?: string }
export interface AgentRun { id: string; siteUrl: string; projectId: number; prompt: string; status: 'running'|'completed'|'failed'; turn: number; capabilities: CapabilityManifestEntry[]; instruction?: AgentRunInstruction; error?: string }
