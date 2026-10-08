import Fastify, { type FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import pino from 'pino';
import { close, connect, wa } from './wa.ts';
import { t } from './i18n.ts';
import type { Contact } from './models/contact.ts';
import type { BatchBody, Job } from './models/batch.ts';
import type { Sender } from './models/sender.ts';
import schema from './schema.ts';

const MAX_JOBS = 100;
const app = Fastify({ logger: true });

const jobs = new Map<string, Job>();
const digits = (n: string) => n.replace(/\D/g, '');
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const locale = (req: FastifyRequest) => req.headers['accept-language']?.split(/[,;]/)[0];
const log = pino({ base: null }, pino.destination(process.env.LOG_FILE ?? 'sends.log'));
let queue = Promise.resolve(); // ponytail: one job at a time so delays stay honest; jobs die on restart

const keyOk = (given: unknown): boolean => {
  const [a, b] = [Buffer.from(String(given ?? '')), Buffer.from(process.env.API_KEY ?? '')];
  return a.length === b.length && timingSafeEqual(a, b);
};

export const dedupe = (contacts: Contact[]): Contact[] =>
  [...new Map(contacts.map(c => [digits(c.number), c])).values()];

export const run = async (job: Job, sender: () => Sender | undefined, lang?: string): Promise<void> => {
  if (job.status === 'queued') job.status = 'running';
  for (const contact of job.contacts) {
    while (job.status === 'running' && !sender()?.user) await sleep(1000); // ponytail: pause while WhatsApp is down, resume on reconnect
    const sock = sender();
    if (job.status !== 'running' || !sock) break;
    try {
      const [check] = (await sock.onWhatsApp(digits(contact.number))) ?? [];
      if (!check?.exists) throw new Error(t('notOnWhatsApp', lang));
      await sock.sendMessage(check.jid, { text: job.message.replace(/\{(\w+)\}/g, (_, k: string) => contact[k] ?? '') });
      job.sent.push(contact);
      log.info({ job: job.id, ...contact }, 'sent');
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      job.failed.push({ ...contact, error });
      log.warn({ job: job.id, ...contact, error }, 'failed');
    }
    await sleep(rand(job.delayMs[0], job.delayMs[1]));
  }
  if (job.status === 'running') job.status = 'done';
  if (job.callbackUrl) await fetch(job.callbackUrl, {
    method: 'POST',
    body: JSON.stringify(job),
    headers: { 'content-type': 'application/json' }
  })
    .catch((e: unknown) => log.warn({ job: job.id, error: String(e) }, 'callback failed'));
};

app.addHook('onRequest', async (req, reply) => {
  if (req.routeOptions.url === '/health') return;
  if (!keyOk(req.headers['x-api-key'])) return reply.code(401).send({ error: t('unauthorized', locale(req)) });
});

app.get('/health', async () => ({ connected: Boolean(wa()?.user) }));

app.post<{ Body: BatchBody }>('/batch', { schema }, async (req, reply) => {
  if (!wa()?.user) return reply.code(503).send({ error: t('notConnected', locale(req)) });
  const job: Job = {
    sent: [],
    failed: [],
    status: 'queued',
    id: crypto.randomUUID(), ...req.body,
    contacts: dedupe(req.body.contacts)
  };
  jobs.set(job.id, job);
  for (const [id, j] of jobs) if (jobs.size > MAX_JOBS && (j.status === 'done' || j.status === 'cancelled')) jobs.delete(id);
  queue = queue.then(() => run(job, wa, locale(req)));
  return reply.code(202).send({ id: job.id, total: job.contacts.length });
});

app.get('/batch', async () => [...jobs.values()]);

app.get<{ Params: { id: string } }>('/batch/:id', async (req, reply) =>
  jobs.get(req.params.id) ?? await reply.code(404).send({ error: t('notFound', locale(req)) })
);

app.delete<{ Params: { id: string } }>('/batch/:id', async (req, reply) => {
  const job = jobs.get(req.params.id);
  if (!job) return reply.code(404).send({ error: t('notFound', locale(req)) });
  if (job.status !== 'done') job.status = 'cancelled';
  return job;
});

app.get('/status', async () => ({ user: wa()?.user ?? null, connected: Boolean(wa()?.user) }));

if (import.meta.main) {
  if (!process.env.API_KEY) throw new Error('API_KEY not configured');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    close();
    void app.close().then(() => process.exit(0));
  });
  await connect();
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3000 });
}
