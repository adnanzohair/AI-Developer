import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { provider } from "./providers/index.js";
import { AgentService } from "./services/agent.js";

const app = Fastify({
  logger: {
    redact: ["req.headers.authorization", "req.headers.x-aiwa-secret"],
  },
  bodyLimit: 2 * 1024 * 1024,
});
const origins = (
  process.env.ALLOWED_WORDPRESS_ORIGINS ?? "http://localhost"
).split(",");
await app.register(cors, { origin: origins });
await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
const agent = new AgentService(provider());
app.addHook("onRequest", async (req, reply) => {
  if (req.url === "/health") return;
  const expected = process.env.AIWA_SHARED_SECRET;
  if (!expected || req.headers["x-aiwa-secret"] !== expected)
    return reply.code(401).send({ error: "Unauthorized" });
});
app.get("/health", async () => ({ ok: true, version: "0.1.0" }));
app.post("/v1/tasks", async (req, reply) => {
  const parsed = z
    .object({
      siteUrl: z.string().url(),
      projectId: z.number().int().positive(),
      prompt: z.string().min(1).max(50000),
      context: z.string().max(200000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return reply
      .code(400)
      .send({ error: "Invalid request", details: parsed.error.flatten() });
  return reply.code(202).send(await agent.plan(parsed.data));
});
const runRequest = z.object({
  siteUrl: z.string().url(), projectId: z.number().int().positive(), prompt: z.string().min(1).max(50000),
  context: z.string().max(200000).optional(),
  capabilities: z.array(z.object({ name: z.string().min(1), description: z.string(), risk: z.enum(['safe', 'confirm', 'blocked']), inputSchema: z.record(z.unknown()) })).max(250)
});
app.post('/v1/runs', async (req, reply) => {
  const parsed = runRequest.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid run request', details: parsed.error.flatten() });
  return reply.code(202).send(await agent.startRun(parsed.data));
});
app.post<{ Params: { id: string } }>('/v1/runs/:id/advance', async (req, reply) => {
  const body = z.object({ events: z.array(z.object({ type: z.enum(['inspection', 'result', 'verification', 'error']), tool: z.string().optional(), result: z.record(z.unknown()).optional(), message: z.string().max(20000).optional() })).max(50) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: 'Invalid run events', details: body.error.flatten() });
  const run = await agent.advanceRun(req.params.id, body.data.events);
  return run ?? reply.code(404).send({ error: 'Run not found' });
});
app.get<{ Params: { id: string } }>("/v1/tasks/:id", async (req, reply) => {
  const task = agent.get(req.params.id);
  return task ?? reply.code(404).send({ error: "Task not found" });
});
app.post<{ Params: { id: string } }>(
  "/v1/tasks/:id/approve",
  async (req, reply) => {
    const task = agent.approve(req.params.id);
    return task ?? reply.code(404).send({ error: "Task not found" });
  },
);
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
await app.listen({ port, host });
