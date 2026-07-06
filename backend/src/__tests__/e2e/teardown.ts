import { prisma } from '../../config/database';
import { redis } from '../../config/redis';

export default async () => {
  console.log('\n[E2E Teardown] Bağlantılar kapatılıyor...');
  await prisma.$disconnect();
  redis.disconnect();
};
