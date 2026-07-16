import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from '../utils/logger';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.ethereal.email',
  port: env.SMTP_PORT || 587,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

transporter.verify().then(() => {
  logger.info('[OK] SMTP bağlantısı başarılı');
}).catch(err => {
  logger.error('[ERROR] SMTP bağlantı hatası:', err);
});
