import type { Contact } from './contact.ts';

export interface BatchBody {
  message: string;
  contacts: Contact[];
  callbackUrl?: string;
  delayMs: [number, number];
}

export interface Job extends BatchBody {
  id: string;
  sent: Contact[];
  failed: (Contact & { error: string })[];
  status: 'done' | 'queued' | 'running' | 'cancelled';
}
