import type { WASocket } from 'baileys';

export interface BatchBody {
  message: string
  numbers: string[]
  delayMs: [number, number]
}

export interface Job extends BatchBody {
  id: string
  sent: string[]
  status: 'done' | 'running'
  failed: { error: string; number: string; }[]
}

export type Sender = Pick<WASocket, 'onWhatsApp' | 'sendMessage'>;
