import { logger } from '../utils/logger';

export const smsService = {
  /**
   * Telefon numarasına 6 haneli SMS doğrulama kodu gönderir
   * Not: Ücretsiz ve gerçek zamanlı SMS gönderimi için Türkiye'de Netgsm Test Hesabı,
   * İletiMerkezi Sandbox, Mutlucell veya Twilio Trial Sandbox entegrasyonları kullanılabilir.
   */
  async sendVerificationSms(phone: string, code: string): Promise<void> {
    logger.info(`[SMS] [SIMULATION / LOG] SMS Doğrulama Kodu Gönderildi -> Tel: +90 ${phone} | SMS KODU: [ ${code} ]`);

    // Geliştiriciler için Ücretsiz SMS Entegrasyon rehberi bilgisi
    logger.info(`[NOTE] Bilgi: Gerçek SMS gönderimi yapmak için ücretsiz test kredisi veren servisler:
      1. Netgsm (Test hesabı ile API üzerinden ücretsiz 10-50 SMS gönderimi)
      2. İletiMerkezi (Geliştirici Sandbox hesabı ile ücretsiz test)
      3. Twilio Trial Account (Doğrulanmış numaralara ücretsiz uluslararası SMS)`);

    // Gerçek SMS API entegrasyonu aktif edilmek istendiğinde burada Netgsm veya Twilio HTTP isteği tetiklenebilir:
    /*
    try {
      await axios.get('https://api.netgsm.com.tr/sms/send/get', {
        params: {
          usercode: process.env.NETGSM_USER,
          password: process.env.NETGSM_PASSWORD,
          gsmno: phone,
          message: `Sorun Haritası doğrulama kodunuz: ${code}`,
          msgheader: 'SORUNMAP'
        }
      });
    } catch (err) {
      logger.error('SMS gönderim hatası:', err);
    }
    */
  }
};
