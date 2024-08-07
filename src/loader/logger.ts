import winston from 'winston';
import TransportStream from 'winston-transport';
import { LOG_LEVEL } from '../config/logger';
import { NODE_ENV } from '../config/server';

const transports = new Array<TransportStream>();

if (NODE_ENV !== 'development') {
  transports.push(new winston.transports.Console());
} else {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.cli(), winston.format.splat()),
    }),
  );
}

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  transports,
});
