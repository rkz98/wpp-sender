import pino from 'pino';
import pretty from 'pino-pretty';

interface Line {
  n?: number;
  msg?: string;
  job?: string;
  name?: string;
  total?: number;
  error?: string;
  number?: string;
  responseTime?: number;
  res?: { statusCode: number };
  req?: { url: string; method: string };
}

export const phone = (id = ''): string => id.split(/[:@]/)[0];

export const stdout = pretty({
  ignore: 'name',
  hideObject: true,
  translateTime: 'HH:MM:ss',
  messageFormat: (raw, messageKey, _level, { colors }) => {
    const line = raw as Line;
    const msg = String(raw[messageKey] ?? '');
    if (line.number) {
      const who = [line.name, line.number].filter(Boolean).join(' ');
      const ok = line.msg === 'sent';
      return [
        ok ? colors.green('✔ sent  ') : colors.red('✖ failed'),
        colors.bold(who),
        colors.gray(`job ${line.job?.slice(0, 8)} ${line.n}/${line.total}`),
        line.error && colors.red(line.error)
      ].filter(Boolean).join('  ');
    }
    if (line.req) return colors.gray(`→ ${line.req.method} ${line.req.url}`);
    if (line.res) return colors.gray(`← ${line.res.statusCode} ${Math.round(line.responseTime ?? 0)}ms`);
    return msg;
  }
});

export const log = pino({ base: null }, pino.multistream([
  { stream: stdout },
  { stream: pino.destination(process.env.LOG_FILE ?? 'sends.log') }
]));
