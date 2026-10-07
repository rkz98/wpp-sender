import assert from 'node:assert/strict';
import { run } from './src/server.ts';
import type { Job, Sender } from './src/models/batch.ts';
import { t } from './src/i18n.ts';

const sent: [string, string][] = [];
const sock = {
  sendMessage: async (jid: string, m: { text: string }) => sent.push([jid, m.text]),
  onWhatsApp: async (n: string) => [{ exists: n !== '000', jid: `${n}@s.whatsapp.net` }]
} as unknown as Sender;
const job: Job = {
  id: '1',
  sent: [],
  failed: [],
  message: 'hi',
  delayMs: [0, 0],
  status: 'running',
  numbers: ['+55 11 99999-0001', '000']
};
await run(job, sock, 'pt-BR');

assert.deepEqual(sent, [['5511999990001@s.whatsapp.net', 'hi']]);
assert.deepEqual(job.sent, ['+55 11 99999-0001']);
assert.deepEqual(job.failed, [{ number: '000', error: 'não está no WhatsApp' }]);
assert.equal(job.status, 'done');
assert.equal(t('notFound'), 'not found');
assert.equal(t('notFound', 'pt-PT'), 'not found'); // unknown locale falls back to en
console.log('ok');
