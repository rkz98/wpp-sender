import makeWASocket, { DisconnectReason, useMultiFileAuthState, type WASocket } from 'baileys';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { t } from './i18n.ts';
import { phone, stdout } from './log.ts';

let sock: WASocket;
const RETRY_MS = 5000;
const logger = pino({ level: 'silent' });
const out = pino({ base: null }, stdout);

export const connect = async (): Promise<WASocket> => {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  sock = makeWASocket({ logger, auth: state, syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      console.clear(); // ponytail: QR rotates every ~20s; clearing keeps a stale one off-screen
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') out.info(`${t('connected')}: ${sock.user?.name ?? ''} +${phone(sock.user?.id)}`);
    if (connection === 'close') {
      const code = (lastDisconnect?.error as undefined | { output?: { statusCode?: number } })?.output?.statusCode;
      out.error(`${t('closed')} ${code} ${lastDisconnect?.error?.message}`);
      if (code === DisconnectReason.loggedOut) {
        out.error(t('loggedOut'));
        rmSync('auth', { force: true, recursive: true });
      }
      sleep(RETRY_MS).then(connect).catch((e: unknown) => out.error(e)); // ponytail: retry forever; a dead socket is worse than noisy logs
    }
  });
  return sock;
};

export const close = (): void => {
  sock?.ev.removeAllListeners('connection.update'); // otherwise the close event schedules a reconnection
  sock?.end(undefined).then();
};

export const wa = (): WASocket => sock;
