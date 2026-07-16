import { transporter } from '../config/nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const emailService = {
  /**
   * E-posta doğrulama kodu (OTP) gönderir
   */
  async sendVerificationEmail(email: string, firstName: string, code: string): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Sorun Haritası — E-posta Doğrulama</h2>
        <p>Merhaba <strong>${firstName}</strong>,</p>
        <p>Sorun Haritası platformuna kayıt olduğunuz için teşekkür ederiz. Hesabınızı aktifleştirmek için aşağıdaki 6 haneli doğrulama kodunu kullanabilirsiniz:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #64748b;">Bu kod 15 dakika boyunca geçerlidir. Eğer kayıt işlemini siz yapmadıysanız bu e-postayı dikkate almayınız.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sorun Haritası Türkiye — Bildirim & Çözüm Platformu</p>
      </div>
    `;

    logger.info(`[EMAIL] [SIMULATION / LOG] E-posta Doğrulama Kodu Gönderiliyor -> Kime: ${email} | Kod: [ ${code} ]`);

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM || '"Sorun Haritası" <noreply@etiya-project.tr>',
        to: email,
        subject: 'Sorun Haritası — E-posta Doğrulama Kodu: ' + code,
        html: htmlContent,
      });
      logger.info(`[EMAIL] E-posta başarıyla iletildi: ${email}`);
    } catch (err: any) {
      logger.warn(`[WARN] SMTP E-posta gönderilemedi (Geliştirme / Test modunda konsol kodu geçerlidir): ${err.message}`);
    }
  },

  /**
   * Şifre sıfırlama bağlantısı gönderir
   */
  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    // Frontend URL
    const frontendUrl = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0] : 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #ef4444; text-align: center;">Sorun Haritası — Şifre Sıfırlama</h2>
        <p>Merhaba <strong>${firstName}</strong>,</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Şifremi Sıfırla ->
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Eğer buton çalışmıyorsa aşağıdaki linki tarayıcınıza yapıştırabilirsiniz:</p>
        <p style="font-size: 12px; background: #f8fafc; padding: 8px; word-break: break-all; border-radius: 4px; color: #334155;">
          ${resetUrl}
        </p>
        <p style="font-size: 13px; color: #64748b;">Bu bağlantının süresi 1 saat sonra dolacaktır. Bu talebi siz yapmadıysanız lütfen şifrenizi güvenli tutun.</p>
      </div>
    `;

    logger.info(`[EMAIL] [SIMULATION / LOG] Şifre Sıfırlama Linki Gönderiliyor -> Kime: ${email} | Link: ${resetUrl}`);

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM || '"Sorun Haritası" <noreply@etiya-project.tr>',
        to: email,
        subject: 'Sorun Haritası — Şifre Sıfırlama Bağlantısı',
        html: htmlContent,
      });
      logger.info(`[EMAIL] Şifre sıfırlama e-postası başarıyla iletildi: ${email}`);
    } catch (err: any) {
      logger.warn(`[WARN] SMTP E-posta gönderilemedi (Geliştirme / Test modunda konsol linki geçerlidir): ${err.message}`);
    }
  }
};
