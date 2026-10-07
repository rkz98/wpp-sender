import { I18n } from 'i18n-js';

export const i18n = new I18n(
  {
    en: {
      notFound: 'not found',
      unauthorized: 'unauthorized',
      connected: 'WhatsApp connected',
      notOnWhatsApp: 'not on WhatsApp',
      notConnected: 'WhatsApp not connected',
      loggedOut: 'Logged out: auth/ cleared, scan the QR code again'
    },
    'pt-BR': {
      notFound: 'não encontrado',
      unauthorized: 'não autorizado',
      connected: 'WhatsApp conectado',
      notOnWhatsApp: 'não está no WhatsApp',
      notConnected: 'WhatsApp não conectado',
      loggedOut: 'Deslogado: auth/ apagada, escaneie o QR code de novo'
    }
  },
  { defaultLocale: 'en', enableFallback: true, locale: process.env.LOCALE ?? 'en' }
);

export const t = (key: string, locale?: string): string => i18n.t(key, { locale });
