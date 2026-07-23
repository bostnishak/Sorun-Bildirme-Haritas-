import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import nodemailer from 'nodemailer';
import puppeteer, { Browser } from 'puppeteer';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface ReportJobData {
  institutionId: string;
  date: string; // ISO date string
}

// E-posta transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export const reportGeneratorWorker = new Worker<ReportJobData>(
  'report-generation',
  async (job: Job<ReportJobData>) => {
    const { institutionId } = job.data;
    const yesterday = subDays(new Date(), 1);

    logger.info(`[ReportWorker] Rapor hazırlanıyor: ${institutionId}`);

    // Kurumu al
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, city: true, district: true, emailAddress: true },
    });

    if (!institution) return;

    // Kurumun sınırı içindeki dünkü çözülmemiş sorunlar
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const issues = await prisma.$queryRaw<any[]>`
      SELECT
        i.id, i.title, i.description, i.category, i.priority, i.status,
        i.city, i.district, i.address,
        i.latitude, i.longitude, i.created_at
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE
        ST_Within(i.location, inst.boundary)
        AND i.status != 'RESOLVED'::"IssueStatus"
        AND i.status != 'REJECTED'::"IssueStatus"
        AND i.created_at BETWEEN ${startOfYesterday} AND ${endOfYesterday}
      ORDER BY
        CASE i.priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END, i.created_at DESC
    `;

    if (issues.length === 0) {
      logger.info(`[ReportWorker] Rapor atlandı (sorun yok): ${institutionId}`);
      return;
    }

    // PDF üret
    const pdfBuffer = await generatePDFReport(issues, institution, yesterday);

    // E-posta gönder
    const dateStr = format(yesterday, 'dd MMMM yyyy', { locale: tr });
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: institution.emailAddress,
      subject: `Etiya Project - ${dateStr} Günlük Sorun Raporu | ${institution.name}`,
      html: generateEmailHTML(issues.length, institution.name, dateStr),
      attachments: [{
        filename: `etiya-project-rapor-${format(yesterday, 'yyyy-MM-dd')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    logger.info(`[ReportWorker] Rapor gönderildi`, {
      institutionId,
      email: institution.emailAddress,
      issueCount: issues.length,
    });
  },
  {
    connection: redis as any,
    concurrency: 1,
  },
);

async function generatePDFReport(
  issues: any[],
  institution: any,
  date: Date,
): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ],
    });

    const page = await browser.newPage();
    const dateStr = format(date, 'dd MMMM yyyy', { locale: tr });

    const priorityLabels: Record<string, string> = {
      CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük',
    };
    const categoryLabels: Record<string, string> = {
      WATER_SANITATION: 'Su ve Kanalizasyon',
      TRANSPORTATION: 'Yol / Ulaşım',
      ENVIRONMENT: 'Çevre ve Temizlik',
      INFRASTRUCTURE: 'Altyapı',
      SECURITY: 'Güvenlik',
      LIGHTING: 'Aydınlatma',
      PARKS: 'Park ve Yeşil Alan',
    };

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { border-bottom: 3px solid #0f62fe; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; color: #0f62fe; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
    .summary-item { text-align: center; }
    .summary-num { font-size: 28px; font-weight: bold; color: #0f62fe; }
    .summary-label { font-size: 12px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: left; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .priority-CRITICAL { color: #dc2626; font-weight: bold; }
    .priority-HIGH { color: #ea580c; font-weight: bold; }
    .priority-MEDIUM { color: #d97706; }
    .priority-LOW { color: #16a34a; }
    .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Etiya Project — Günlük Sorun Bildirim Raporu</div>
    <div class="subtitle">${institution.name} | ${dateStr}</div>
  </div>

  <div class="summary-box">
    <div class="summary-item">
      <div class="summary-num">${issues.length}</div>
      <div class="summary-label">Toplam Açık Sorun</div>
    </div>
    <div class="summary-item">
      <div class="summary-num" style="color:#dc2626;">${issues.filter(i => i.priority === 'CRITICAL').length}</div>
      <div class="summary-label">Kritik Öncelikli</div>
    </div>
    <div class="summary-item">
      <div class="summary-num" style="color:#ea580c;">${issues.filter(i => i.priority === 'HIGH').length}</div>
      <div class="summary-label">Yüksek Öncelikli</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Başlık & Kategori</th>
        <th>Konum</th>
        <th>Öncelik</th>
        <th>Bildirim Saati</th>
      </tr>
    </thead>
    <tbody>
      ${issues.map((issue, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${issue.title}</strong><br/>
            <span style="color:#64748b; font-size:11px;">${categoryLabels[issue.category] || issue.category}</span>
          </td>
          <td>${issue.district ? `${issue.district}, ${issue.city}` : issue.city || 'Belirtilmedi'}</td>
          <td class="priority-${issue.priority}">${priorityLabels[issue.priority] || issue.priority}</td>
          <td>${format(new Date(issue.created_at), 'HH:mm', { locale: tr })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Bu rapor Etiya Project sistemi tarafından otomatik olarak oluşturulmuştur. Tarih: ${format(new Date(), 'dd.MM.yyyy HH:mm')}
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdfBytes);
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('[ReportWorker] Puppeteer tarayıcı başarıyla kapatıldı.');
      } catch (closeErr) {
        logger.error('[ReportWorker] Tarayıcı kapatılırken hata, zombi process imhası deneniyor:', { error: String(closeErr) });
      } finally {
        const browserProcess = browser.process();
        if (browserProcess && browserProcess.pid) {
          try {
            process.kill(browserProcess.pid, 'SIGKILL');
            logger.warn(`[ReportWorker] Zombi Puppeteer süreci imha edildi (PID: ${browserProcess.pid})`);
          } catch (killErr) {
            // Process zaten durmuş olabilir, yok sayılır
          }
        }
      }
    }
  }
}

function generateEmailHTML(issueCount: number, institutionName: string, dateStr: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#f1f5f9; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#0f62fe); padding:30px; color:white;">
      <h1 style="margin:0; font-size:22px;">[RAPOR] Etiya Project</h1>
      <p style="margin:8px 0 0; opacity:0.8;">Günlük Sorun Raporu</p>
    </div>
    <div style="padding:30px;">
      <p>Sayın <strong>${institutionName}</strong>,</p>
      <p style="margin:16px 0;">${dateStr} tarihine ait günlük sorun raporu ekte sunulmaktadır.</p>
      <div style="background:#f8fafc; border-left:4px solid #0f62fe; padding:16px; border-radius:4px; margin:20px 0;">
        <p style="margin:0; font-size:18px; font-weight:bold; color:#0f62fe;">${issueCount} yeni sorun</p>
        <p style="margin:4px 0 0; color:#64748b; font-size:13px;">işlem bekliyor</p>
      </div>
      <p>Detaylar için ekteki PDF'i inceleyebilir ya da <a href="https://etiya-project.tr/portal" style="color:#0f62fe;">platform portalına</a> giriş yapabilirsiniz.</p>
    </div>
    <div style="background:#f1f5f9; padding:16px; text-align:center; font-size:12px; color:#94a3b8;">
      Etiya Project — Türkiye Sorun Bildirim Platformu | etiya-project.tr
    </div>
  </div>
</body>
</html>`;
}

reportGeneratorWorker.on('failed', (job, err) => {
  console.error(`[ReportWorker] Başarısız: ${job?.id}`, err.message);
});
