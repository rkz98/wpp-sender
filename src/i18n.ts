const messages = {
  en: {
    notFound: 'not found',
    unauthorized: 'unauthorized',
    closed: 'Connection closed:',
    connected: 'WhatsApp connected',
    notOnWhatsApp: 'not on WhatsApp',
    notConnected: 'WhatsApp not connected',
    loggedOut: 'Logged out: auth/ cleared, scan the QR code again'
  },
  'pt-BR': {
    notFound: 'não encontrado',
    closed: 'Conexão fechada:',
    unauthorized: 'não autorizado',
    connected: 'WhatsApp conectado',
    notOnWhatsApp: 'não está no WhatsApp',
    notConnected: 'WhatsApp não conectado',
    loggedOut: 'Deslogado: auth/ apagada, escaneie o QR code de novo'
  }
};

export const t = (key: keyof typeof messages.en, locale = process.env.LOCALE ?? 'en'): string =>
  (messages[locale as keyof typeof messages] ?? messages.en)[key];
