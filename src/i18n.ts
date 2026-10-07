const messages = {
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
};

type Locale = keyof typeof messages;

export const t = (key: keyof typeof messages.en, locale = process.env.LOCALE ?? 'en'): string =>
  (messages[locale as Locale] ?? messages.en)[key];
