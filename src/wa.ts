import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket
} from 'baileys';
import { rmSync } from 'node:fs';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { t } from './i18n.ts';

const logger = pino({ level: 'silent' });
let sock: WASocket | undefined;

export async function connect(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ logger, version, auth: state });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'open') console.log(t('connected'));
    if (connection === 'close') {
      const code = (lastDisconnect?.error as undefined | { output?: { statusCode?: number } })?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error(t('loggedOut'));
        rmSync('auth', { force: true, recursive: true });
      }
      connect().catch(console.error);
    }
  });
  return sock;
}

export const wa = (): WASocket | undefined => sock;
