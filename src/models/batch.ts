import type { WASocket } from 'baileys';

export interface Contact {
  name?: string;
  number: string;
}

export interface BatchBody {
  message: string;
  contacts: Contact[];
  delayMs: [number, number];
}

export interface Job extends BatchBody {
  id: string;
  sent: Contact[];
  status: 'done' | 'queued' | 'running';
  failed: (Contact & { error: string })[];
}

export type Sender = Pick<WASocket, 'onWhatsApp' | 'sendMessage'>;
