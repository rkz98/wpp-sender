import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { dedupe, run } from './src/server.ts';
import { t } from './src/i18n.ts';
import type { Job } from './src/models/batch.ts';
import type { Sender } from './src/models/sender.ts';

const sent: [string, string][] = [];
const sock = {
  user: { id: 'me' },
  sendMessage: async (jid: string, m: { text: string }) => sent.push([jid, m.text]),
  onWhatsApp: async (n: string) => [{ exists: n !== '000', jid: `${n}@s.whatsapp.net` }]
} as unknown as Sender;
const job: Job = {
  id: '1',
  sent: [],
  failed: [],
  delayMs: [0, 0],
  status: 'queued',
  message: 'hi {name} from {city}{missing}',
  contacts: [{ city: 'SP', name: 'Ana', number: '+55 11 99999-0001' }, { number: '000' }]
};
await run(job, () => sock, 'pt-BR');

assert.deepEqual(sent, [['5511999990001@s.whatsapp.net', 'hi Ana from SP']]);
assert.deepEqual(job.sent, [{ city: 'SP', name: 'Ana', number: '+55 11 99999-0001' }]);
assert.deepEqual(job.failed, [{ number: '000', error: 'não está no WhatsApp' }]);
assert.equal(job.status, 'done');
assert.equal(t('notFound'), 'not found');
assert.equal(t('notFound', 'pt-PT'), 'not found'); // unknown locale falls back to en

const cancelled: Job = { ...job, id: '2', sent: [], failed: [], status: 'cancelled' };
await run(cancelled, () => sock);
assert.deepEqual([cancelled.status, cancelled.sent, cancelled.failed, sent.length], ['cancelled', [], [], 1]);

assert.deepEqual(dedupe([{ number: '+55 11 1' }, { number: '55111' }, { number: '2' }]).map(c => c.number), ['55111', '2']);

const lines = readFileSync('test-sends.log', 'utf8').trim().split('\n').map(l => JSON.parse(l));
rmSync('test-sends.log');
assert.equal(lines.length, 2);
assert.deepEqual([lines[0].msg, lines[0].name, lines[1].msg, lines[1].error], ['sent', 'Ana', 'failed', 'não está no WhatsApp']);
console.log('ok');
