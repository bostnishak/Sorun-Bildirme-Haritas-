import { PrismaClient, Category, IssueStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Root dizindeki veya backend dizindeki env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.example') }); // Fallback

// Docker kullanmadan (lokalden) çalıştırılıyorsa RUN_LOCAL=1 verilebilir
if (process.env.RUN_LOCAL === 'true' && process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@localhost:');
}

const prisma = new PrismaClient();

async function main() {
  console.log('Veritabanı temizleniyor...');
  await prisma.$executeRaw`TRUNCATE TABLE issues CASCADE;`;
  await prisma.user.deleteMany();

  console.log('Test kullanıcıları oluşturuluyor...');
  const hashedPassword = await bcrypt.hash('Etiya2026!', 10);
  const user = await prisma.user.create({
    data: {
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      email: 'ahmet@example.com',
      passwordHash: hashedPassword,
      role: 'CITIZEN',
      isVerified: true,
    },
  });

  const officer = await prisma.user.create({
    data: {
      tcKimlikHash: '22222222222',
      firstName: 'Zeynep',
      lastName: 'Kaya',
      email: 'yetkili@istanbul.bel.tr',
      passwordHash: hashedPassword,
      role: 'INSTITUTION_OFFICER',
    },
  });

  const admin = await prisma.user.create({
    data: {
      tcKimlikHash: '33333333333',
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
      email: 'admin@chaosmap.com',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Gerçekçi sorunlar ekleniyor...');

  const issues = [
    {
      title: 'Turan Güneş Bulvarı Çukur',
      description: 'Yolun sağ şeridinde derin bir çukur var.',
      category: 'TRANSPORTATION',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Turan Güneş Bulvarı',
      latitude: 39.8654,
      longitude: 32.8402,
    },
    {
      title: 'Dikmen Caddesi Su Patlağı',
      description: 'Ana su borusu patladı.',
      category: 'INFRASTRUCTURE',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Dikmen Caddesi',
      latitude: 39.8789,
      longitude: 32.8315,
    }
  ];

  for (const issue of issues) {
    await prisma.$executeRaw`
      INSERT INTO issues (
        id, title, description, category, priority, status,
        location, latitude, longitude, city, district, address,
        exif_verified, llm_guard_passed, reported_by_id, ip_address,
        created_at, updated_at
      ) VALUES (
        uuid_generate_v4(),
        ${issue.title}, ${issue.description}, ${issue.category}::"Category",
        ${issue.priority}::"Priority", ${issue.status}::"IssueStatus",
        ST_SetSRID(ST_MakePoint(${issue.longitude}, ${issue.latitude}), 4326),
        ${issue.latitude}, ${issue.longitude}, ${issue.city}, ${issue.district},
        ${issue.address},
        false, true, ${user.id}::uuid, '127.0.0.1',
        NOW(), NOW()
      )
    `;
  }

  console.log('Seed başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
