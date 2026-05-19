import IORedis from 'ioredis';
import { loadConfig } from './config.js';

const config = loadConfig();
export const redisConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
