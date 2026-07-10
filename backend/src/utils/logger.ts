import winston from 'winston';
import path from 'path';
import fs from 'fs';
import LokiTransport from 'winston-loki';
import { env } from '../config/env';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json(),
  ),
  defaultMeta: { service: 'etiya-project-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// Loki Transport (Grafana için)
if (process.env.LOKI_HOST) {
  logger.add(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      labels: { app: 'etiya-project-backend' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
    })
  );
}

// Development: console'a da yaz
if (env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
  );
}

export default logger;
