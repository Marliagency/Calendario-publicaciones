import { pino } from 'pino';

export const logger = pino({
  name: 'creative-studio',
  level: process.env.LOG_LEVEL ?? 'info',
});
