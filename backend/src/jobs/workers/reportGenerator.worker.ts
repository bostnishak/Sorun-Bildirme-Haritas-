import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
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
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 12px; }
    .header { background: linear-gradient(135deg, #1e3a5f, #0f62fe); color: white; padding: 30px; }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header p { opacity: 0.8; margin-top: 4px; }
    .meta { display: flex; gap: 20px; margin-top: 16px; }
    .meta-item { background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; }
    .content { padding: 24px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-card .number { font-size: 32px; font-weight: 700; color: #0f62fe; }
    .stat-card .label { color: #64748b; margin-top: 4px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1e3a5f; color: white; padding: 10px 12px; text-align: left; font-size: 11px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block; }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #ea580c; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🗺️ Etiya Project — Günlük Sorun Raporu</h1>
    <p>${institution.name} | ${dateStr}</p>
    <div class="meta">
      <div class="meta-item">📍 ${institution.city} / ${institution.district}</div>
      <div class="meta-item">📅 ${dateStr}</div>
      <div class="meta-item">📊 ${issues.length} yeni sorun</div>
    </div>
  </div>
  <div class="content">
    <div class="summary">
      <div class="stat-card">
        <div class="number">${issues.length}</div>
        <div class="label">Toplam Yeni Sorun</div>
      </div>
      <div class="stat-card">
        <div class="number" style="color:#dc2626">${issues.filter((i: any) => i.priority === 'CRITICAL' || i.priority === 'HIGH').length}</div>
        <div class="label">Yüksek / Kritik Öncelikli</div>
      </div>
      <div class="stat-card">
        <div class="number" style="color:#16a34a">${[...new Set(issues.map((i: any) => i.district))].length}</div>
        <div class="label">Etkilenen İlçe Sayısı</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Başlık</th>
          <th>Kategori</th>
          <th>Öncelik</th>
          <th>İlçe</th>
          <th>Saat</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map((issue: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${issue.title}</td>
            <td>${categoryLabels[issue.category] ?? issue.category}</td>
            <td>
              <span class="badge badge-${issue.priority.toLowerCase()}">
                ${priorityLabels[issue.priority] ?? issue.priority}
              </span>
            </td>
            <td>${issue.district}</td>
            <td>${format(new Date(issue.created_at), 'HH:mm')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <div class="footer">
    Bu rapor Etiya Project platformu tarafından otomatik olarak oluşturulmuştur. |
    etiya-project.tr | © ${new Date().getFullYear()}
  </div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBytes = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  return Buffer.from(pdfBytes);
}

function generateEmailHTML(issueCount: number, institutionName: string, dateStr: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#f1f5f9; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#0f62fe); padding:30px; color:white;">
      <h1 style="margin:0; font-size:22px;">🗺️ Etiya Project</h1>
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
