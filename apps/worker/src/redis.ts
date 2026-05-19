import IORedis from 'ioredis';
import { loadConfig } from './config.js';

const config = loadConfig();

/** BullMQ exige `maxRetriesPerRequest: null` y `enableReadyCheck: false`. */
export const redisConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
