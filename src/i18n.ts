import { I18n } from 'i18n-js';

export const i18n = new I18n(
  {
    en: {
      notFound: 'not found',
      connected: 'WhatsApp connected',
      notOnWhatsApp: 'not on WhatsApp',
      notConnected: 'WhatsApp not connected',
      loggedOut: 'Logged out: delete the auth/ folder and restart'
    },
    'pt-BR': {
      notFound: 'não encontrado',
      connected: 'WhatsApp conectado',
      notOnWhatsApp: 'não está no WhatsApp',
      notConnected: 'WhatsApp não conectado',
      loggedOut: 'Deslogado: apague a pasta auth/ e reinicie'
    }
  },
  { defaultLocale: 'en', enableFallback: true, locale: process.env.LOCALE ?? 'en' }
);

export const t = (key: string, locale?: string): string => i18n.t(key, { locale });
