import Fastify, { type FastifyRequest } from 'fastify';
import { setTimeout as sleep } from 'node:timers/promises';
import pino from 'pino';
import { connect, wa } from './wa.ts';
import { t } from './i18n.ts';
import type { BatchBody, Job } from './models/batch.ts';
import type { Sender } from './models/sender.ts';

const app = Fastify({ logger: true });
const jobs = new Map<string, Job>();
const log = pino({ base: null }, pino.destination(process.env.LOG_FILE ?? 'sends.log'));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const locale = (req: FastifyRequest) => req.headers['accept-language']?.split(',')[0];
let queue = Promise.resolve(); // ponytail: one job at a time so delays stay honest; jobs die on restart

export const run = async (job: Job, sock: Sender, lang?: string): Promise<void> => {
  job.status = 'running';
  for (const contact of job.contacts) {
    try {
      const [check] = (await sock.onWhatsApp(contact.number.replace(/\D/g, ''))) ?? [];
      if (!check?.exists) throw new Error(t('notOnWhatsApp', lang));
      await sock.sendMessage(check.jid, { text: job.message.replaceAll('{name}', contact.name ?? '') });
      job.sent.push(contact);
      log.info({ job: job.id, ...contact }, 'sent');
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      job.failed.push({ ...contact, error });
      log.warn({ job: job.id, ...contact, error }, 'failed');
    }
    await sleep(rand(job.delayMs[0], job.delayMs[1]));
  }
  job.status = 'done';
};

const schema = {
  body: {
    type: 'object',
    required: ['contacts', 'message'],
    properties: {
      message: { minLength: 1, type: 'string' },
      delayMs: {
        minItems: 2,
        maxItems: 2,
        type: 'array',
        default: [3000, 8000],
        items: { minimum: 0, type: 'integer' }
      },
      contacts: {
        minItems: 1,
        type: 'array',
        maxItems: 500,
        items: {
          type: 'object',
          required: ['number'],
          properties: { name: { type: 'string' }, number: { minLength: 8, type: 'string' } }
        }
      }
    }
  }
};

app.addHook('onRequest', async (req, reply) => {
  const key = process.env.API_KEY;
  if (!key || req.headers['x-api-key'] !== key) return reply.code(401).send({ error: t('unauthorized', locale(req)) });
});

app.post<{ Body: BatchBody }>('/batch', { schema }, async (req, reply) => {
  const sock = wa();
  if (!sock?.user) return reply.code(503).send({ error: t('notConnected', locale(req)) });
  const job: Job = { sent: [], failed: [], status: 'queued', id: crypto.randomUUID(), ...req.body };
  jobs.set(job.id, job);
  queue = queue.then(() => run(job, wa() ?? sock, locale(req)));
  return reply.code(202).send({ id: job.id, total: job.contacts.length });
});

app.get('/batch', async () => [...jobs.values()]);

app.get<{ Params: { id: string } }>('/batch/:id', async (req, reply) =>
  jobs.get(req.params.id) ?? await reply.code(404).send({ error: t('notFound', locale(req)) })
);

app.get('/status', async () => ({ user: wa()?.user ?? null, connected: Boolean(wa()?.user) }));

if (import.meta.main) {
  if (!process.env.API_KEY) throw new Error('API_KEY not configured');
  await connect();
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3000 });
}
