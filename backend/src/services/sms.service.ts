import axios from 'axios';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const smsService = {
  /**
   * Telefon numarasına 6 haneli SMS doğrulama kodu gönderir.
   * SORUN-59: Stub'dan Prod (NetGSM) entegrasyonuna geçildi.
   */
  async sendVerificationSms(phone: string, code: string): Promise<void> {
    try {
      // NetGSM için numara formatı temizliği (başındaki 0 veya +90'ı silebiliriz, api.netgsm 10 haneli ister)
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('90')) formattedPhone = formattedPhone.substring(2);
      if (formattedPhone.startsWith('0')) formattedPhone = formattedPhone.substring(1);

      if (env.NODE_ENV !== 'production' && !env.NETGSM_USER) {
        logger.info(`[SMS STUB] Tel: +90 ${formattedPhone} | KOD: [ ${code} ]`);
        return;
      }

      const response = await axios.get('https://api.netgsm.com.tr/sms/send/get', {
        params: {
          usercode: env.NETGSM_USER || 'TEST_USER',
          password: env.NETGSM_PASSWORD || 'TEST_PASS',
          gsmno: formattedPhone,
          message: `Etiya Projesi doğrulama kodunuz: ${code}`,
          msgheader: env.NETGSM_HEADER || 'ETIYA_PRJ'
        },
        timeout: 5000
      });

      logger.info(`[SMS PROD] SMS gönderildi. Tel: ${formattedPhone} - Sonuç: ${response.data}`);
    } catch (err) {
      logger.error('SMS gönderim hatası (NetGSM):', err);
    }
  }
};
