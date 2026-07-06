import { prisma } from '../../config/database';

export default async () => {
  // Veritabanını temizle
  console.log('\n[E2E Setup] Veritabanı temizleniyor...');
  await prisma.issue.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
};
