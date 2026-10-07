import Fastify, { type FastifyRequest } from 'fastify';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, wa } from './wa.ts';
import { t } from './i18n.ts';
import type { BatchBody, Job, Sender } from './models/batch.ts';

const app = Fastify({ logger: true });
const jobs = new Map<string, Job>();
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const locale = (req: FastifyRequest) => req.headers['accept-language']?.split(',')[0];

// ponytail: in-memory queue; swap for SQLite if jobs must survive a restart
export async function run(job: Job, sock: Sender, lang?: string): Promise<void> {
  for (const number of job.numbers) {
    try {
      const [check] = (await sock.onWhatsApp(number.replace(/\D/g, ''))) ?? [];
      if (!check?.exists) throw new Error(t('notOnWhatsApp', lang));
      await sock.sendMessage(check.jid, { text: job.message });
      job.sent.push(number);
    } catch (e) {
      job.failed.push({ number, error: e instanceof Error ? e.message : String(e) });
    }
    await sleep(rand(job.delayMs[0], job.delayMs[1]));
  }
  job.status = 'done';
}

const schema = {
  body: {
    type: 'object',
    required: ['numbers', 'message'],
    properties: {
      message: { minLength: 1, type: 'string' },
      numbers: { minItems: 1, type: 'array', maxItems: 500, items: { minLength: 8, type: 'string' } },
      delayMs: {
        minItems: 2,
        maxItems: 2,
        type: 'array',
        default: [3000, 8000],
        items: { minimum: 0, type: 'integer' }
      }
    }
  }
};

app.post<{ Body: BatchBody }>('/batch', { schema }, async (req, reply) => {
  const sock = wa();
  if (!sock?.user) return reply.code(503).send({ error: t('notConnected', locale(req)) });
  const job: Job = { sent: [], failed: [], status: 'running', id: crypto.randomUUID(), ...req.body };
  jobs.set(job.id, job);
  run(job, sock, locale(req)).then();
  return reply.code(202).send({ id: job.id, total: job.numbers.length });
});

app.get<{ Params: { id: string } }>('/batch/:id', async (req, reply) =>
  jobs.get(req.params.id) ?? await reply.code(404).send({ error: t('notFound', locale(req)) })
);

app.get('/status', async () => ({ user: wa()?.user ?? null, connected: Boolean(wa()?.user) }));

if (process.argv[1]?.endsWith('server.ts')) {
  await connect();
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3000 });
}
