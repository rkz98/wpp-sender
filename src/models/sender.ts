import type { WASocket } from 'baileys';

export type Sender = Pick<WASocket, 'user' | 'onWhatsApp' | 'sendMessage'>;
