import type { Contact } from './contact.ts';

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
