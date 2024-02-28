import { Redis } from 'ioredis';
import { logger } from './logger';
import { REDIS_DATABASE, REDIS_HOST, REDIS_PORT } from '../config/redis';

export const redisClient = new Redis({
  port: REDIS_PORT,
  host: REDIS_HOST,
  db: REDIS_DATABASE,
});

export async function connectRedis(): Promise<void> {
  redisClient.on('connect', () => {
    logger.info('REDIS_CONNECTED');
  });
  redisClient.on('error', (_) => {
    logger.info('REDIS_ERROR');
  });
}
