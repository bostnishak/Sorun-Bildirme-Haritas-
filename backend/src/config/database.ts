import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Veritabanı bağlantı havuzu (connection pool) limitlerini garantile
function getDatabaseUrlWithPoolLimit(url: string, defaultLimit = 20, defaultTimeout = 10): string {
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.searchParams.has('connection_limit')) {
      parsedUrl.searchParams.set('connection_limit', defaultLimit.toString());
    }
    if (!parsedUrl.searchParams.has('pool_timeout')) {
      parsedUrl.searchParams.set('pool_timeout', defaultTimeout.toString());
    }
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrlWithPoolLimit(env.DATABASE_URL, env.NODE_ENV === 'production' ? 25 : 10),
      },
    },
    log: env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    errorFormat: 'minimal',
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
