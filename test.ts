import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { run } from './src/server.ts';
import { t } from './src/i18n.ts';
import type { Job, Sender } from './src/models/batch.ts';

const sent: [string, string][] = [];
const sock = {
  sendMessage: async (jid: string, m: { text: string }) => sent.push([jid, m.text]),
  onWhatsApp: async (n: string) => [{ exists: n !== '000', jid: `${n}@s.whatsapp.net` }]
} as unknown as Sender;
const job: Job = {
  id: '1',
  sent: [],
  failed: [],
  delayMs: [0, 0],
  status: 'queued',
  message: 'hi {name}',
  contacts: [{ name: 'Ana', number: '+55 11 99999-0001' }, { number: '000' }]
};
await run(job, sock, 'pt-BR');

assert.deepEqual(sent, [['5511999990001@s.whatsapp.net', 'hi Ana']]);
assert.deepEqual(job.sent, [{ name: 'Ana', number: '+55 11 99999-0001' }]);
assert.deepEqual(job.failed, [{ number: '000', error: 'não está no WhatsApp' }]);
assert.equal(job.status, 'done');
assert.equal(t('notFound'), 'not found');
assert.equal(t('notFound', 'pt-PT'), 'not found'); // unknown locale falls back to en

const lines = readFileSync('test-sends.log', 'utf8').trim().split('\n').map(l => JSON.parse(l));
rmSync('test-sends.log');
assert.equal(lines.length, 2);
assert.deepEqual([lines[0].msg, lines[0].name, lines[1].msg, lines[1].error], ['sent', 'Ana', 'failed', 'não está no WhatsApp']);
console.log('ok');
