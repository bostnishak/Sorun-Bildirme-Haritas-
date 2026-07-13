import { Router, Request, Response } from 'express';
import { emailService } from '../../services/email.service';
import { logger } from '../../utils/logger';

export const legalRouter = Router();

/**
 * POST /api/v1/legal/contact
 * 5651 Sayılı Kanun Md.5 — İçerik Kaldırma & KVKK Md.11 Başvuru Formu
 * Yanıt süresi: 24 saat (5651 sk. gereği)
 */
legalRouter.post('/contact', async (req: Request, res: Response) => {
  const { subjectType, fullName, email, tcOrVergiNo, targetUrl, description } = req.body;

  if (!fullName || !email || !description || !subjectType) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Ad, e-posta, konu ve açıklama zorunludur.' },
    });
    return;
  }

  const refNo = 'TR-' + Math.floor(100000 + Math.random() * 900000);

  const SUBJECT_LABELS: Record<string, string> = {
    '5651_TAKEDOWN': '5651 Sayılı Kanun - İçerik Kaldırma Talebi',
    'KVKK_ERASURE': 'KVKK Madde 11 - Kişisel Veri Silme / Unutulma Hakkı',
    'AI_OBJECTION': 'Yapay Zeka Moderasyon Kararına İtiraz',
    'GENERAL_SUPPORT': 'Genel Destek & Öneri',
  };

  const subjectLabel = SUBJECT_LABELS[subjectType] || subjectType;

  // Platform sorumlusuna bildirim e-postası gönder
  const notifyHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:10px;">
      <h2 style="color:#dc2626;">⚖️ Yeni Hukuki Başvuru — ${subjectLabel}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">Başvuru No</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:700;color:#2563eb;">${refNo}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">Konu Türü</td><td style="padding:8px;border:1px solid #e2e8f0;">${subjectLabel}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">Başvurucu</td><td style="padding:8px;border:1px solid #e2e8f0;">${fullName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">E-posta</td><td style="padding:8px;border:1px solid #e2e8f0;">${email}</td></tr>
        ${tcOrVergiNo ? `<tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">TC/Vergi No</td><td style="padding:8px;border:1px solid #e2e8f0;">${tcOrVergiNo}</td></tr>` : ''}
        ${targetUrl ? `<tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">İlgili URL/ID</td><td style="padding:8px;border:1px solid #e2e8f0;">${targetUrl}</td></tr>` : ''}
        <tr><td style="padding:8px;font-weight:bold;background:#f8fafc;border:1px solid #e2e8f0;">Başvuru Zamanı</td><td style="padding:8px;border:1px solid #e2e8f0;">${new Date().toLocaleString('tr-TR')}</td></tr>
      </table>
      <div style="margin-top:16px;padding:16px;background:#fef3c7;border-radius:8px;">
        <strong>Açıklama / Gerekçe:</strong>
        <p style="margin:8px 0 0;">${description}</p>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
        ⚠️ 5651 Sayılı Kanun Md.5 uyarınca bu başvuruya <strong>24 saat</strong> içinde yanıt verilmesi zorunludur.
      </p>
    </div>
  `;

  // Başvurucuya otomatik onay e-postası
  const confirmHtml = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:10px;">
      <h2 style="color:#2563eb;">✅ Başvurunuz Alındı — ${refNo}</h2>
      <p>Sayın <strong>${fullName}</strong>,</p>
      <p><strong>${subjectLabel}</strong> konulu başvurunuz platformumuza ulaşmıştır.</p>
      <p>5651 Sayılı Kanun ve KVKK düzenlemeleri gereği talebiniz en geç <strong>24 saat</strong> içinde incelenerek bu e-posta adresine yazılı geri bildirim sağlanacaktır.</p>
      <p style="font-size:13px;color:#64748b;">Başvuru Takip Numaranız: <strong>${refNo}</strong></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="font-size:12px;color:#94a3b8;">Türkiye Sorun Bildirim Haritası — destek@sorunharitasi.tr</p>
    </div>
  `;

  try {
    const { transporter } = await import('../../config/nodemailer');
    const fromAddr = process.env.EMAIL_FROM || '"Sorun Haritası" <noreply@etiya-project.tr>';
    const adminAddr = process.env.ADMIN_EMAIL || fromAddr;

    // Platform yönetimine bildirim
    await transporter.sendMail({
      from: fromAddr,
      to: adminAddr,
      subject: `[${refNo}] Yeni Hukuki Başvuru: ${subjectLabel}`,
      html: notifyHtml,
    });

    // Başvurucuya onay
    await transporter.sendMail({
      from: fromAddr,
      to: email,
      subject: `Başvurunuz Alındı — Ref: ${refNo} | Sorun Haritası`,
      html: confirmHtml,
    });

    logger.info(`5651/KVKK başvurusu kaydedildi`, { refNo, subjectType, email });
  } catch (err) {
    // E-posta gönderilemese bile başvuruyu logla ve refNo döndür
    logger.warn('Hukuki başvuru e-postası gönderilemedi, loglandı', {
      refNo, subjectType, email, error: (err as Error).message
    });
  }

  res.status(200).json({
    success: true,
    data: { referenceNo: refNo, message: '5651/KVKK başvurunuz alındı. 24 saat içinde yanıt verilecektir.' },
  });
});
